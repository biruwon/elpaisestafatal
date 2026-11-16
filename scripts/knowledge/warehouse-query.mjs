import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { sourceFreshness } from './source-freshness.mjs';
import { searchAliasesForMetric } from './metric-search-aliases.mjs';
import { preferLatestSourceRevisions } from '../../src/lib/knowledge/source-revisions.mjs';
import { ageScopeMatcherFor } from '../../src/lib/knowledge/age-scope.mjs';
import { periodScopeMatcherFor } from '../../src/lib/knowledge/period-scope.mjs';
import { geographyScopeMatcherFor } from '../../src/lib/knowledge/geography-scope.mjs';

const root = new URL('../../.local/source-warehouse/', import.meta.url).pathname;
const recordCacheTtlMs = 60 * 1000;
const maxCachedRecords = 50_000;
let recordCache = { expiresAt: 0, key: '', records: [] };
const recordLoadPromises = new Map();
const recordFileLoadPromises = new Map();
let recordFileIndex = { expiresAt: 0, key: '', entries: [] };
let recordFileIndexPromise;
const legacyRecordIndexCache = new Map();
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

const filterForeignCitizenshipObservations = (observations) => observations.filter((item) => {
  if (item.metricId !== 'foreign_citizenship_population') return true;
  // The citizenship feed contains one series per country and several
  // aggregates. Generic foreign-nationality wording must use the explicit
  // foreign-country/stateless aggregate, never the first country returned.
  const citizenship = normalise(item.dimensionLabels?.citizen || item.dimensions?.citizen || '');
  return citizenship === 'foreign country and stateless' || citizenship === 'for stls';
});

const filterResidentPopulationObservations = (query, observations) => {
  const text = normalise(query);
  const asksAgeBreakdown = /\b(?:edad|edades|menor(?:es)?|mayor(?:es)?|joven(?:es)?|juvenil|infantil|ni[nñ]os?|adolescentes?|adultos?|65|18)\b/.test(text);
  const asksSexBreakdown = /\b(?:por sexo|por genero|por hombres y mujeres|por mujeres y hombres|cada sexo|ambos sexos)\b/.test(text);
  const asksWomen = /\b(?:mujeres?|femenin[oa]s?)\b/.test(text);
  const asksMen = /\b(?:hombres?|masculin[oa]s?)\b/.test(text);
  return observations.filter((item) => {
    if (item.metricId !== 'resident_population') return true;
    const age = normalise(item.dimensions?.age || item.dimensionLabels?.age || '');
    const sex = normalise(item.dimensions?.sex || item.dimensionLabels?.sex || '');
    // A general resident-population question means the full population, not
    // whichever age or sex category happens to rank first in the warehouse.
    if (!asksAgeBreakdown && age && !['total', 'all', 't'].includes(age)) return false;
    if (!asksSexBreakdown && !asksWomen && !asksMen && sex && !['total', 't', 'all'].includes(sex)) return false;
    if (asksWomen && !asksMen && !asksSexBreakdown && sex && !['f', 'female', 'females', 'women', 'mujeres'].includes(sex)) return false;
    if (asksMen && !asksWomen && !asksSexBreakdown && sex && !['m', 'male', 'males', 'men', 'hombres'].includes(sex)) return false;
    if ((asksSexBreakdown || asksWomen && asksMen) && sex && ['total', 't', 'all'].includes(sex)) return false;
    return true;
  });
};

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

export const indexWarehouseRecordFiles = (files, manifests) => {
  // Narrow by source family and metric, but retain every snapshot: an older
  // snapshot may contain a population or dimension omitted from a newer one.
  // Exact duplicate observations are resolved after retrieval.
  const entriesByFile = new Map();
  for (const manifest of manifests || []) {
    const file = manifest?.recordPath ? basename(manifest.recordPath) : '';
    if (!file) continue;
    const manifestMetricIds = Array.isArray(manifest.metricIds) ? manifest.metricIds : [];
    const aliases = Array.isArray(manifest.aliases) ? manifest.aliases : [];
    const metricIds = [manifest.metricId, ...manifestMetricIds].filter(Boolean);
    const entry = entriesByFile.get(file) || { file, metricIds: new Set(), sourceTokens: new Set(), manifested: true };
    for (const metricId of metricIds) {
      entry.metricIds.add(metricId);
    }
    for (const token of tokens([manifest.metricId, ...manifestMetricIds, manifest.title, ...aliases].join(' '))) entry.sourceTokens.add(token);
    entriesByFile.set(file, entry);
  }
  return files.map((file) => entriesByFile.get(file) || { file, metricIds: new Set(), sourceTokens: new Set(), manifested: false });
};

export const indexLegacyWarehouseRecordPayload = (file, payload) => {
  const source = payload?.source || {};
  const records = Array.isArray(payload?.records) ? payload.records : [];
  const metricIds = new Set([source.metricId, ...records.map((record) => record?.metricId)].filter(Boolean));
  const aliases = Array.isArray(source.aliases) ? source.aliases : [];
  const sourceTokens = new Set(tokens([source.id, source.title, source.publisher, source.url, source.domain, ...aliases, ...metricIds].join(' ')));
  for (const record of records) {
    for (const token of tokens(recordText({ ...record, metricId: record?.metricId || source.metricId, source }))) sourceTokens.add(token);
  }
  return {
    file,
    metricIds,
    sourceTokens,
    manifested: false,
    legacyIndexed: metricIds.size > 0 || sourceTokens.size >= 2,
  };
};

const loadRecordFileIndex = async (files) => {
  const key = files.join('|');
  if (recordFileIndex.key === key && recordFileIndex.expiresAt > Date.now()) return recordFileIndex.entries;
  if (recordFileIndexPromise?.key === key) return recordFileIndexPromise.promise;
  const promise = (async () => {
    let manifestFiles = [];
    try { manifestFiles = (await readdir(join(root, 'manifests'))).filter((file) => file.endsWith('.json')); } catch { /* The warehouse may only contain records in a degraded local setup. */ }
    const manifests = [];
    for (const file of manifestFiles) {
      try { manifests.push(JSON.parse(await readFile(join(root, 'manifests', file), 'utf8'))); } catch { /* Malformed manifests are handled by warehouse validation. */ }
    }
    const entries = indexWarehouseRecordFiles(files, manifests);
    const manifestCoverage = files.length ? entries.filter((entry) => entry.manifested).length / files.length : 1;
    // Older domain imports predate manifests. Index their source and metric
    // metadata once when the manifest index is otherwise authoritative, so
    // unrelated claims do not parse tens of megabytes of legacy records.
    if (manifestCoverage >= 0.9) {
      const seenLegacyFiles = new Set();
      for (let index = 0; index < entries.length; index += 1) {
        if (entries[index].manifested) continue;
        const file = entries[index].file;
        seenLegacyFiles.add(file);
        try {
          const metadata = await stat(join(root, 'records', file));
          const signature = `${metadata.size}:${metadata.mtimeMs}`;
          const cached = legacyRecordIndexCache.get(file);
          if (cached?.signature === signature) {
            entries[index] = cached.entry;
            continue;
          }
          const payload = await readRecordPayload(file);
          const entry = indexLegacyWarehouseRecordPayload(file, payload);
          legacyRecordIndexCache.set(file, { signature, entry });
          entries[index] = entry;
        } catch { /* Keep the legacy file in the compatibility scan if it cannot be indexed. */ }
      }
      for (const file of legacyRecordIndexCache.keys()) if (!seenLegacyFiles.has(file)) legacyRecordIndexCache.delete(file);
    }
    recordFileIndex = { expiresAt: Date.now() + recordCacheTtlMs * 5, key, entries };
    return entries;
  })();
  const pending = { key, promise };
  recordFileIndexPromise = pending;
  try { return await promise; } finally { if (recordFileIndexPromise === pending) recordFileIndexPromise = undefined; }
};

export const selectWarehouseRecordFiles = (files, fileIndex, { query = '', metricIds } = {}) => {
  const isIndexed = (entry) => entry.manifested || entry.legacyIndexed;
  const indexedCount = fileIndex.filter(isIndexed).length;
  const indexCoverage = files.length ? indexedCount / files.length : 1;
  // Old warehouse snapshots may predate manifests. Keep their compatibility
  // path, but use the manifest index as authoritative once it covers the
  // current records; otherwise a no-match query scans gigabytes of JSON.
  if (indexCoverage < 0.9) return files;

  const unindexedFiles = fileIndex.filter((entry) => !isIndexed(entry)).map((entry) => entry.file);
  const wanted = tokens(query);
  const overlapCount = (entry) => wanted.filter((token) => entry.sourceTokens.has(token)).length;
  const minimumOverlap = Math.min(2, wanted.length);

  if (metricIds?.size) {
    const directMetricFiles = fileIndex.filter((entry) => [...entry.metricIds].some((metricId) => metricIds.has(metricId)));
    const untypedMatches = wanted.length
      ? fileIndex.filter((entry) => isIndexed(entry) && entry.metricIds.size === 0 && overlapCount(entry) >= minimumOverlap)
      : [];
    return [...new Set([...directMetricFiles, ...untypedMatches].map((entry) => entry.file).concat(unindexedFiles))];
  }

  const queryMatches = wanted.length
    ? fileIndex.filter((entry) => isIndexed(entry) && overlapCount(entry) >= minimumOverlap)
    : [];
  return [...new Set([...queryMatches.map((entry) => entry.file), ...unindexedFiles])];
};

const readRecordPayload = async (file) => {
  const existing = recordFileLoadPromises.get(file);
  if (existing) return existing;
  const load = readFile(join(root, 'records', file), 'utf8').then((value) => JSON.parse(value));
  recordFileLoadPromises.set(file, load);
  try { return await load; } finally { if (recordFileLoadPromises.get(file) === load) recordFileLoadPromises.delete(file); }
};

const readRecords = async ({ query = '', metricIds } = {}) => {
  const cacheKey = `${query}|${metricIds ? [...metricIds].sort().join(',') : ''}`;
  if (recordCache.key === cacheKey && recordCache.expiresAt > Date.now()) return recordCache.records;
  const existingLoad = recordLoadPromises.get(cacheKey);
  if (existingLoad) return existingLoad;
  const load = (async () => {
    let files;
    try { files = (await readdir(join(root, 'records'))).filter((file) => file.endsWith('.json')); } catch { return []; }
    const fileIndex = await loadRecordFileIndex(files);
    files = selectWarehouseRecordFiles(files, fileIndex, { query, metricIds });
    const records = [];
    for (const file of files.slice(0, 5000)) {
      if (records.length >= maxCachedRecords) break;
      try {
        const payload = await readRecordPayload(file);
        const sourceMetricId = payload.source?.metricId;
        // A domain feed can materialise several metric families in one file;
        // the payload-level metricId is therefore not sufficient to prune it.
        // Let the per-record metric gate below decide, otherwise newly added
        // observations (such as IMV age) disappear from routed answers.
        for (const record of Array.isArray(payload.records) ? payload.records : []) {
          if (metricIds?.size && !metricIds.has(record.metricId || sourceMetricId)) continue;
          const enriched = { ...record, metricId: record.metricId || payload.source?.metricId, source: payload.source };
          enriched.searchTokenSet = new Set(tokens(recordText(enriched)));
          records.push(enriched);
          if (records.length >= maxCachedRecords) break;
        }
      } catch { /* Validation reports malformed records separately. */ }
    }
    recordCache = { expiresAt: Date.now() + recordCacheTtlMs, key: cacheKey, records };
    return records;
  })();
  recordLoadPromises.set(cacheKey, load);
  try { return await load; } finally { if (recordLoadPromises.get(cacheKey) === load) recordLoadPromises.delete(cacheKey); }
};

export const clearWarehouseRecordCache = () => { recordCache = { expiresAt: 0, key: '', records: [] }; recordFileIndex = { expiresAt: 0, key: '', entries: [] }; recordFileIndexPromise = undefined; legacyRecordIndexCache.clear(); recordLoadPromises.clear(); recordFileLoadPromises.clear(); };

const recordText = (record) => [
  record.datasetId,
  record.metric,
  record.metricId,
  record.unit,
  record.period,
  record.source?.publisher,
  record.source?.title,
  ...(Array.isArray(record.source?.aliases) ? record.source.aliases : []),
  record.source?.url,
  record.url,
  record.excerpt,
  record.finding,
  record.propositionId,
  record.clusterId,
  ...searchAliasesForMetric(record.metricId),
  ...recordedOffenceSearchAliases(record),
  JSON.stringify(record.dimensions || {}),
  JSON.stringify(record.dimensionLabels || {}),
].join(' ');

export const rankWarehouseObservations = (query, records, limit = 12, { metricIds } = {}) => {
  const wanted = tokens(query);
  if (wanted.length < 2 && !metricIds?.size) return [];
  const matchesAge = ageScopeMatcherFor(query);
  const matchesPeriod = periodScopeMatcherFor(query);
  const matchesGeography = geographyScopeMatcherFor(query);
  const scopedRecords = filterResidentPopulationObservations(query, filterForeignCitizenshipObservations(filterForeignBornObservations((metricIds?.size ? records.filter((record) => metricIds.has(record.metricId)) : records)))).filter((record) => matchesAge(record) && matchesPeriod(record) && matchesGeography(record)).filter((record) => {
    if (record.metricId !== 'recorded_offences') return true;
    const category = recordedOffenceCategoryForQuery(query);
    if (!category) return false;
    const label = normalise(record.dimensionLabels?.iccs || record.dimensions?.iccs || '');
    return category.labels.some((candidate) => label.includes(normalise(candidate)));
  });
  const ranked = scopedRecords.map((record) => {
    const available = record.searchTokenSet instanceof Set ? record.searchTokenSet : new Set(tokens(recordText(record)));
    const matched = wanted.filter((token) => available.has(token));
    const contract = metricIds?.has(record.metricId);
    return { record, score: Math.max(contract ? 0.5 : 0, wanted.length ? matched.length / wanted.length : 0), matched: matched.length, matchedTokens: matched, contract };
  }).filter(({ score, matched, record, contract }) => (contract || score >= 0.34 && matched >= 2) && (typeof record.value === 'number' && Number.isFinite(record.value) || record.value == null && String(record.status || '').toLowerCase().includes('b') || ['official_publication', 'legal_document', 'legal_rule'].includes(record.kind)))
    .map(({ record, score, matchedTokens }) => ({
      id: record.id,
      kind: record.kind,
      datasetId: record.datasetId,
      metric: record.metric,
      metricId: record.metricId,
      value: record.value,
      unit: record.unit,
      period: record.period,
      geography: record.geography,
      population: record.population,
      denominator: record.denominator,
      dataKind: record.dataKind,
      status: record.status,
      periodType: record.periodType,
      comparison: record.comparison,
      stage: record.stage,
      quantities: record.quantities,
      limitations: record.limitations,
      url: record.url,
      excerpt: record.excerpt,
      dimensions: record.dimensions || {},
      dimensionLabels: record.dimensionLabels || {},
      source: record.source ? { id: record.source.id, title: record.source.title || record.metric || record.source.publisher || record.source.url, url: record.url || record.source.url, publisher: record.source.publisher, publishedAt: record.source.publishedAt, retrievedAt: record.source.retrievedAt, aliases: record.source.aliases || [], schedule: record.source.schedule, sourceRegistryId: record.source.sourceRegistryId, trust: record.source.trust, domain: record.source.domain } : undefined,
      score,
      matchedTerms: matchedTokens,
      evidenceFit: warehouseEvidenceFit(score),
      populationFit: 'not_requested',
      freshness: sourceFreshness(record.source),
    }));
  return preferLatestSourceRevisions(ranked)
    .sort((left, right) => right.score - left.score || (Date.parse(right.source?.retrievedAt || '') || 0) - (Date.parse(left.source?.retrievedAt || '') || 0))
    .slice(0, limit);
};

export const findWarehouseObservations = async (query, limit = 12, { metricIds, records, useProvidedRecords = false } = {}) => {
  const rank = (candidates) => filterForeignCitizenshipObservations(filterForeignBornObservations(filterRecordedOffenceObservations(query, rankWarehouseObservations(query, candidates, limit, { metricIds }))));
  if (useProvidedRecords) {
    const fromD1 = rank(Array.isArray(records) ? records : []);
    if (fromD1.length) return fromD1;
  }
  return rank(await readRecords({ query, metricIds }));
};
