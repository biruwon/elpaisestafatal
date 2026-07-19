import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../../.local/source-warehouse/', import.meta.url).pathname;
const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
const stopWords = new Set(['como', 'esta', 'este', 'para', 'pero', 'que', 'sus', 'tiene', 'una', 'uno', 'en', 'el', 'la', 'los', 'las', 'un', 'del', 'de', 'y', 'o', 'a', 'por', 'con', 'segun', 'dicen', 'grupo', 'insiste', 'hay', 'todo', 'va', 'peor', 'hace', 'ano', 'anos', 'año', 'años', 'diez', 'mas', 'más', 'menos', 'cada', 'vez', 'sube', 'subido', 'baja', 'bajado', 'crece', 'creciendo', 'historico', 'historica', 'histórico', 'histórica', 'actual', 'actualmente', 'anterior', 'periodo']);
const tokens = (value) => [...new Set(normalise(value).split(' ').filter((token) => token.length > 2 && !stopWords.has(token)))];

const readRecords = async () => {
  let files;
  try { files = (await readdir(join(root, 'records'))).filter((file) => file.endsWith('.json')); } catch { return []; }
  const records = [];
  for (const file of files.slice(0, 5000)) {
    try {
      const payload = JSON.parse(await readFile(join(root, 'records', file), 'utf8'));
      for (const record of Array.isArray(payload.records) ? payload.records : []) records.push({ ...record, source: payload.source });
    } catch { /* Validation reports malformed records separately. */ }
  }
  return records;
};

const recordText = (record) => [
  record.datasetId,
  record.metric,
  record.unit,
  record.period,
  record.source?.publisher,
  record.source?.title,
  ...(record.source?.aliases || []),
  record.source?.url,
  record.url,
  JSON.stringify(record.dimensions || {}),
  JSON.stringify(record.dimensionLabels || {}),
].join(' ');

export const rankWarehouseObservations = (query, records, limit = 12) => {
  const wanted = tokens(query);
  if (wanted.length < 2) return [];
  return records.map((record) => {
    const available = new Set(tokens(recordText(record)));
    const matched = wanted.filter((token) => available.has(token));
    return { record, score: matched.length / wanted.length, matched: matched.length };
  }).filter(({ score, matched, record }) => score >= 0.34 && matched >= 2 && (typeof record.value === 'number' && Number.isFinite(record.value) || record.kind === 'official_publication'))
    .sort((left, right) => right.score - left.score || right.matched - left.matched)
    .slice(0, limit)
    .map(({ record, score }) => ({
      id: record.id,
      kind: record.kind,
      datasetId: record.datasetId,
      metric: record.metric,
      value: record.value,
      unit: record.unit,
      period: record.period,
      url: record.url,
      dimensions: record.dimensions || {},
      dimensionLabels: record.dimensionLabels || {},
      source: record.source ? { id: record.source.id, title: record.metric || record.source.title || record.source.publisher || record.source.url, url: record.url || record.source.url, aliases: record.source.aliases || [] } : undefined,
      score,
    }));
};

export const findWarehouseObservations = async (query, limit = 12) => rankWarehouseObservations(query, await readRecords(), limit);
