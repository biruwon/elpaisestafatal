import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { strFromU8, unzipSync } from 'fflate';

const SOURCE_URL = 'https://www.ine.es/ftp/microdatos/ecv/ecv_b2013/datos_2025.zip';
const PERSONAL_VARIABLES = ['PY090N', 'PY100N', 'PY110N', 'PY120N', 'PY130N'];
const { values } = parseArgs({ options: {
  input: { type: 'string' },
  output: { type: 'string' },
} });

const archive = values.input
  ? new Uint8Array(await readFile(values.input))
  : new Uint8Array(await (async () => {
    const response = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error(`INE microdata download returned HTTP ${response.status}`);
    return response.arrayBuffer();
  })());
const archiveSha256 = createHash('sha256').update(archive).digest('hex');

const selectedRows = (text, requiredColumns) => {
  const lines = text.trimEnd().split(/\r?\n/);
  const header = lines[0].split('\t').map((cell) => cell.replace(/^"|"$/g, ''));
  const indices = Object.fromEntries(requiredColumns.map((name) => {
    const index = header.indexOf(name);
    if (index < 0) throw new Error(`INE ECV file is missing ${name}`);
    return [name, index];
  }));
  return lines.slice(1).filter(Boolean).map((line) => {
    const cells = line.split('\t');
    return Object.fromEntries(requiredColumns.map((name) => [name, (cells[indices[name]] || '').replace(/^"|"$/g, '')]));
  });
};

const outer = unzipSync(archive, { filter: (entry) => ['ECV_Tr_2025.zip', 'ECV_Tp_2025.zip'].includes(entry.name) });
if (!outer['ECV_Tr_2025.zip'] || !outer['ECV_Tp_2025.zip']) throw new Error('INE ECV archive is missing its person or register microdata file');
const registerZip = unzipSync(outer['ECV_Tr_2025.zip'], { filter: (entry) => entry.name === 'CSV/ECV_Tr_2025.tab' });
const personsZip = unzipSync(outer['ECV_Tp_2025.zip'], { filter: (entry) => entry.name === 'CSV/ECV_Tp_2025.tab' });
const registerText = strFromU8(registerZip['CSV/ECV_Tr_2025.tab'] || new Uint8Array());
const personsText = strFromU8(personsZip['CSV/ECV_Tp_2025.tab'] || new Uint8Array());
if (!registerText || !personsText) throw new Error('INE ECV archive is missing a tabular microdata file');

const register = new Map(selectedRows(registerText, ['RB030', 'RB280', 'RB290'])
  .map((row) => [row.RB030, { birthplace: row.RB280, nationality: row.RB290 }]));
const definitions = [
  { id: 'birthplace-spain-personal-benefits', metricId: 'ecv_selected_personal_benefit_receipt_rate_by_birthplace', dimension: 'birthplace', group: 'Nacida en España', codes: ['1'] },
  { id: 'birthplace-abroad-personal-benefits', metricId: 'ecv_selected_personal_benefit_receipt_rate_by_birthplace', dimension: 'birthplace', group: 'Nacida fuera de España', codes: ['2', '3'] },
  { id: 'nationality-spanish-personal-benefits', metricId: 'ecv_selected_personal_benefit_receipt_rate_by_nationality', dimension: 'nationality', group: 'Nacionalidad española', codes: ['1'] },
  { id: 'nationality-foreign-personal-benefits', metricId: 'ecv_selected_personal_benefit_receipt_rate_by_nationality', dimension: 'nationality', group: 'Nacionalidad extranjera', codes: ['2', '3'] },
];
const totals = new Map(definitions.map(({ id }) => [id, { sampleSize: 0, weightedPopulation: 0, weightedRecipients: 0 }]));
for (const person of selectedRows(personsText, ['PB030', 'PB040', ...PERSONAL_VARIABLES])) {
  const group = register.get(person.PB030);
  if (!group || !['1', '2', '3'].includes(group.birthplace) || !['1', '2', '3'].includes(group.nationality)) continue;
  if ([person.PB040, ...PERSONAL_VARIABLES.map((name) => person[name])].some((value) => !/^\d+(?:\.\d+)?$/.test(value))) {
    throw new Error(`Missing or non-numeric weight or personal benefit value for INE ECV person ${person.PB030}`);
  }
  const weight = Number(person.PB040);
  const amounts = PERSONAL_VARIABLES.map((name) => Number(person[name]));
  if (!Number.isFinite(weight) || weight < 0 || amounts.some((amount) => !Number.isFinite(amount) || amount < 0)) {
    throw new Error(`Invalid weight or personal benefit value for ECV person ${person.PB030}`);
  }
  if (weight === 0) continue;
  const recipient = amounts.some((amount) => amount > 0);
  for (const definition of definitions) {
    const code = group[definition.dimension];
    if (!definition.codes.includes(code)) continue;
    const total = totals.get(definition.id);
    total.sampleSize += 1;
    total.weightedPopulation += weight;
    if (recipient) total.weightedRecipients += weight;
  }
}
for (const definition of definitions) {
  const total = totals.get(definition.id);
  if (!total.sampleSize || !Number.isFinite(total.weightedPopulation) || total.weightedPopulation <= 0
    || !Number.isFinite(total.weightedRecipients) || total.weightedRecipients > total.weightedPopulation) {
    throw new Error(`INE ECV derivation returned invalid weighted totals for ${definition.id}`);
  }
}

const retrievedAt = new Date().toISOString().slice(0, 10);
const output = {
  schemaVersion: '1',
  generatedAt: retrievedAt,
  source: {
    id: 'ine-ecv-2025-personal-benefit-receipt',
    title: 'Encuesta de Condiciones de Vida 2025 · microdatos transversales',
    publisher: 'Instituto Nacional de Estadística (INE)',
    url: SOURCE_URL,
    retrievedAt,
    archiveSha256,
  },
  method: {
    surveyYear: '2025',
    incomeReferenceYear: '2024',
    population: 'personas representadas de 16 años o más',
    denominator: 'personas de 16 años o más del mismo grupo, ponderadas con PB040',
    numerator: `personas con importe positivo en al menos una de estas variables personales: ${PERSONAL_VARIABLES.join(', ')}`,
    groupDefinitions: 'Lugar de nacimiento y nacionalidad son variables separadas. Los grupos nacida fuera de España y nacionalidad extranjera agrupan por separado los códigos 2 y 3 del INE; los valores no están estandarizados por edad.',
    limitations: 'Estimación propia a partir de microdatos públicos; no es una tabla publicada por el INE. Excluye transferencias del fichero de hogares y otros componentes de prestaciones; no se calcularon intervalos de confianza.',
  },
  records: definitions.map((definition) => {
    const total = totals.get(definition.id);
    return {
      id: `ine-ecv-2025-${definition.id}`,
      metricId: definition.metricId,
      period: '2024',
      surveyYear: '2025',
      groupDimension: definition.dimension,
      group: definition.group,
      value: Math.round((total.weightedRecipients / total.weightedPopulation) * 10_000) / 100,
      unit: 'percent',
      sampleSize: total.sampleSize,
      weightedPopulation: Math.round(total.weightedPopulation * 100) / 100,
      weightedRecipients: Math.round(total.weightedRecipients * 100) / 100,
    };
  }),
};
const serialized = `${JSON.stringify(output, null, 2)}\n`;
if (values.output) await writeFile(values.output, serialized);
else process.stdout.write(serialized);
console.error(`Derived four ECV personal-benefit rates from ${output.source.id}; SHA-256 ${archiveSha256}`);
