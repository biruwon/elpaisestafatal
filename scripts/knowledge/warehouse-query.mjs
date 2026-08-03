import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { queryPostgresWarehouse, postgresEnabled } from './postgres-warehouse.mjs';
import { sourceFreshness } from './source-freshness.mjs';
import { searchAliasesForMetric } from './metric-search-aliases.mjs';

const root = new URL('../../.local/source-warehouse/', import.meta.url).pathname;
const recordCacheTtlMs = 60 * 1000;
let recordCache = { expiresAt: 0, records: [] };
let recordLoadPromise;
const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
const stopWords = new Set(['como', 'esta', 'este', 'para', 'pero', 'que', 'sus', 'tiene', 'una', 'uno', 'en', 'el', 'la', 'los', 'las', 'un', 'del', 'de', 'y', 'o', 'a', 'por', 'con', 'segun', 'dicen', 'grupo', 'insiste', 'hay', 'todo', 'va', 'peor', 'hace', 'ano', 'anos', 'año', 'años', 'diez', 'mas', 'más', 'menos', 'cada', 'vez', 'sube', 'subido', 'baja', 'bajado', 'crece', 'creciendo', 'historico', 'historica', 'histórico', 'histórica', 'actual', 'actualmente', 'anterior', 'periodo']);
const tokens = (value) => [...new Set(normalise(value).split(' ').filter((token) => token.length > 2 && !stopWords.has(token)))];
export const warehouseEvidenceFit = (score) => score >= 0.67 ? 'direct' : score >= 0.5 ? 'qualified' : 'weak';

const recordedOffenceCategories = [
  { terms: ['homicidio', 'asesinato'], labels: ['intentional homicide', 'attempted intentional homicide'] },
  { terms: ['agresion grave', 'lesion grave'], labels: ['serious assault'] },
  { terms: ['secuestro'], labels: ['kidnapping'] },
  { terms: ['violencia sexual'], labels: ['sexual violence'] },
  { terms: ['agresion sexual', 'agresiones sexuales'], labels: ['sexual assault'] },
  { terms: ['violacion'], labels: ['rape'] },
  { terms: ['agresion sexual'], labels: ['sexual assault'] },
  { terms: ['explotacion sexual'], labels: ['sexual exploitation'] },
  { terms: ['pornografia infantil'], labels: ['child pornography'] },
  { terms: ['robo', 'robos'], labels: ['robbery'] },
  { terms: ['hurto', 'hurtos'], labels: ['theft'] },
  { terms: ['robo vehiculo', 'robo coche', 'robo moto'], labels: ['theft of a motorized vehicle or parts thereof'] },
  { terms: ['allanamiento'], labels: ['burglary', 'burglary of private residential premises'] },
  { terms: ['drogas', 'trafico drogas'], labels: ['unlawful acts involving controlled drugs or precursors'] },
  { terms: ['fraude', 'fraudes', 'estafa', 'estafas'], labels: ['fraud'] },
  { terms: ['corrupcion'], labels: ['corruption'] },
  { terms: ['cohecho', 'soborno'], labels: ['bribery'] },
  { terms: ['blanqueo'], labels: ['money laundering'] },
  { terms: ['ciberdelincuencia', 'delitos informaticos'], labels: ['acts against computer systems'] },
];

export const recordedOffenceCategoryForQuery = (query) => {
  const normalized = normalise(query);
  return recordedOffenceCategories.find((category) => category.terms.some((term) => normalized.includes(normalise(term))));
};

const recordedOffenceSearchAliases = (record) => {
  if (record.metricId !== 'recorded_offences') return [];
  const label = normalise(record.dimensionLabels?.iccs || record.dimensions?.iccs || '');
  return recordedOffenceCategories.filter((category) => category.labels.some((candidate) => label.includes(normalise(candidate)))).flatMap((category) => [...category.terms, ...category.terms.map((term) => `${term}s`)]);
};

const filterRecordedOffenceObservations = (query, observations) => {
  const category = recordedOffenceCategoryForQuery(query);
  return observations.filter((item) => {
    if (item.metricId !== 'recorded_offences') return true;
    // Eurostat's current feed is category-level, not a national all-offence
    // total. Without a named category, returning its first series would be a
    // false answer to a broad “crime” question.
    if (!category) return false;
    const label = normalise(item.dimensionLabels?.iccs || item.dimensions?.iccs || '');
    return category.labels.some((candidate) => label.includes(normalise(candidate)));
  });
};

const filterForeignBornObservations = (observations) => observations.filter((item) => {
  if (item.metricId !== 'foreign_born_population') return true;
  // The feed contains one series per birth-country category plus a total.
  // Generic “born abroad” wording must use the total, never the first country
  // returned by the source ordering.
  const birthCategory = normalise(item.dimensionLabels?.c_birth || item.dimensions?.c_birth || '');
  return birthCategory === 'total' || birthCategory.includes('foreign country');
});

const populationVocabulary = [
  { aliases: ['inmigrante', 'inmigrantes', 'extranjero', 'extranjeros', 'foreign', 'migrant', 'migrants', 'nacido en el extranjero'], terms: ['inmigr', 'extranj', 'foreign', 'migr', 'born abroad'] },
  { aliases: ['residente', 'residentes', 'poblacion', 'habitantes', 'personas que viven', 'resident', 'population'], terms: ['resident', 'poblacion', 'habit', 'population'] },
  { aliases: ['hogar', 'hogares', 'familia', 'familias', 'household'], terms: ['hogar', 'famil', 'household'] },
  { aliases: ['trabajador', 'trabajadores', 'afiliados', 'ocupado', 'ocupados', 'empleado', 'empleados', 'worker', 'employment'], terms: ['trabaj', 'afiliad', 'ocupad', 'emplead', 'worker', 'employment', 'labour force'] },
  { aliases: ['parado', 'parados', 'desempleado', 'desempleados', 'unemployed'], terms: ['parad', 'desemple', 'unemploy'] },
  { aliases: ['beneficiario', 'beneficiarios', 'beneficiaria', 'beneficiarias', 'perceptor', 'perceptores', 'beneficiary', 'beneficiaries'], terms: ['benefici', 'perceptor', 'recipient'] },
  { aliases: ['condenado', 'condenados', 'convicted'], terms: ['conden', 'convict'] },
  { aliases: ['detenido', 'detenidos', 'investigado', 'investigados', 'arrested'], terms: ['deten', 'investig', 'arrest'] },
  { aliases: ['alumno', 'alumnos', 'estudiante', 'estudiantes', 'alumnado', 'student', 'students'], terms: ['alumn', 'estudiant', 'student'] },
  { aliases: ['paciente', 'pacientes', 'patient', 'patients'], terms: ['pacient', 'patient'] },
  { aliases: ['joven', 'jovenes', 'jóvenes', 'menor', 'menores', 'youth'], terms: ['joven', 'menor', 'youth'] },
  { aliases: ['mujer', 'mujeres', 'hombre', 'hombres', 'sex'], terms: ['mujer', 'hombre', 'female', 'male', 'sex'] },
];

const populationVocabularyFor = (value) => {
  const normalized = normalise(value);
  return populationVocabulary.find((entry) => entry.aliases.some((alias) => normalized.includes(normalise(alias)))) || null;
};

export const populationEvidenceFit = (requestedPopulation, record) => {
  if (!requestedPopulation) return 'not_requested';
  const requested = populationVocabularyFor(requestedPopulation);
  if (!requested) return 'unknown';
  const actual = normalise([record?.population, JSON.stringify(record?.dimensions || {}), JSON.stringify(record?.dimensionLabels || {})].filter(Boolean).join(' '));
  if (!actual || /\b(total|all|todos|todas|general)\b/.test(actual)) return 'context';
  return requested.terms.some((term) => actual.includes(normalise(term))) ? 'direct' : 'mismatch';
};

const readRecords = async () => {
  if (recordCache.expiresAt > Date.now()) return recordCache.records;
  if (recordLoadPromise) return recordLoadPromise;
  recordLoadPromise = (async () => {
    let files;
    try { files = (await readdir(join(root, 'records'))).filter((file) => file.endsWith('.json')); } catch { return []; }
    const records = [];
    for (const file of files.slice(0, 5000)) {
      try {
        const payload = JSON.parse(await readFile(join(root, 'records', file), 'utf8'));
        for (const record of Array.isArray(payload.records) ? payload.records : []) {
          const enriched = { ...record, metricId: record.metricId || payload.source?.metricId, source: payload.source };
          enriched.searchTokenSet = new Set(tokens(recordText(enriched)));
          records.push(enriched);
        }
      } catch { /* Validation reports malformed records separately. */ }
    }
    recordCache = { expiresAt: Date.now() + recordCacheTtlMs, records };
    return records;
  })();
  try { return await recordLoadPromise; } finally { recordLoadPromise = undefined; }
};

export const clearWarehouseRecordCache = () => { recordCache = { expiresAt: 0, records: [] }; recordLoadPromise = undefined; };

const recordText = (record) => [
  record.datasetId,
  record.metric,
  record.metricId,
  record.unit,
  record.period,
  record.source?.publisher,
  record.source?.title,
  ...(record.source?.aliases || []),
  record.source?.url,
  record.url,
  record.excerpt,
  ...searchAliasesForMetric(record.metricId),
  ...recordedOffenceSearchAliases(record),
  JSON.stringify(record.dimensions || {}),
  JSON.stringify(record.dimensionLabels || {}),
].join(' ');

export const rankWarehouseObservations = (query, records, limit = 12, { metricIds } = {}) => {
  const wanted = tokens(query);
  if (wanted.length < 2) return [];
  const scopedRecords = filterForeignBornObservations((metricIds?.size ? records.filter((record) => metricIds.has(record.metricId)) : records)).filter((record) => {
    if (record.metricId !== 'recorded_offences') return true;
    const category = recordedOffenceCategoryForQuery(query);
    if (!category) return false;
    const label = normalise(record.dimensionLabels?.iccs || record.dimensions?.iccs || '');
    return category.labels.some((candidate) => label.includes(normalise(candidate)));
  });
  return scopedRecords.map((record) => {
    const available = record.searchTokenSet instanceof Set ? record.searchTokenSet : new Set(tokens(recordText(record)));
    const matched = wanted.filter((token) => available.has(token));
    return { record, score: matched.length / wanted.length, matched: matched.length, matchedTokens: matched };
  }).filter(({ score, matched, record }) => score >= 0.34 && matched >= 2 && (typeof record.value === 'number' && Number.isFinite(record.value) || ['official_publication', 'legal_document', 'legal_rule'].includes(record.kind)))
    .sort((left, right) => right.score - left.score || right.matched - left.matched)
    .slice(0, limit)
    .map(({ record, score, matchedTokens }) => ({
      id: record.id,
      kind: record.kind,
      datasetId: record.datasetId,
      metric: record.metric,
      metricId: record.metricId,
      value: record.value,
      unit: record.unit,
      period: record.period,
      population: record.population,
      url: record.url,
      excerpt: record.excerpt,
      dimensions: record.dimensions || {},
      dimensionLabels: record.dimensionLabels || {},
      source: record.source ? { id: record.source.id, title: record.metric || record.source.title || record.source.publisher || record.source.url, url: record.url || record.source.url, aliases: record.source.aliases || [] } : undefined,
      score,
      matchedTerms: matchedTokens,
      evidenceFit: warehouseEvidenceFit(score),
      populationFit: 'not_requested',
      freshness: sourceFreshness(record.source),
    }));
};

export const findWarehouseObservations = async (query, limit = 12, { queryEmbedding, metricIds } = {}) => {
  if (postgresEnabled()) {
    const results = await queryPostgresWarehouse(query, limit, { queryEmbedding });
    if (results) return filterForeignBornObservations(filterRecordedOffenceObservations(query, results));
  }
  return filterForeignBornObservations(filterRecordedOffenceObservations(query, rankWarehouseObservations(query, await readRecords(), limit, { metricIds })));
};
