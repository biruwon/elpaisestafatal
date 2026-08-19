import { readFile } from 'node:fs/promises';

const catalogue = JSON.parse(await readFile('.local/catalogue-seed.json', 'utf8'));
const records = catalogue.records;
const normalize = (value) => value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const familyFor = (value) => {
  const text = normalize(value);
  if (/vivienda|alquiler|piso|casa/.test(text)) return 'vivienda';
  if (/roban|corrup|contratacion/.test(text)) return 'integrity';
  if (/politic|gobierno|presidente|pais/.test(text)) return 'government';
  return 'other';
};
const failures = [];
const fixtures = [
  ['la vivienda no para de subir', 'vivienda'],
  ['el precio de los pisos aumenta cada año', 'vivienda'],
  ['Pedro Sánchez está destruyendo el país', 'government'],
  ['los políticos nos roban', 'integrity'],
];
for (const [phrase, expected] of fixtures) if (familyFor(phrase) !== expected) failures.push(`${phrase}: family mismatch`);
for (const record of records.filter((item) => item.basis === 'model')) if (!record.canonicalId || !record.formulation) failures.push('model record missing routing fields');
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Semantic routing fixtures passed: ${fixtures.length} broad and paraphrased cases.`);
