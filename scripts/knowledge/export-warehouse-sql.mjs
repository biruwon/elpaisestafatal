import { readdir, readFile, open, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { searchAliasesForMetric } from './metric-search-aliases.mjs';
import { sourceRegistry } from './source-registry.mjs';
import { warehouseUpsert } from './warehouse-upsert.mjs';
import { warehouseSourceMarker } from './warehouse-import.mjs';

const root = process.env.SOURCE_WAREHOUSE_ROOT || new URL('../../.local/source-warehouse/', import.meta.url).pathname;
const outputPath = join(root, 'warehouse-load.sql');
const sql = (value) => value === null || value === undefined ? 'NULL' : `'${String(value).replace(/[\r\n\u0000]+/g, ' ').replaceAll("'", "''")}'`;
const number = (value) => typeof value === 'number' && Number.isFinite(value) ? String(value) : 'NULL';
const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
const compact = (value, depth = 0) => {
  if (typeof value === 'string') return value.slice(0, 1000);
  if (value === null || typeof value !== 'object') return value;
  if (depth >= 4) return '[nested value omitted]';
  if (Array.isArray(value)) return value.slice(0, 40).map((item) => compact(item, depth + 1));
  return Object.fromEntries(Object.entries(value).slice(0, 40).map(([key, item]) => [key.slice(0, 100), compact(item, depth + 1)]));
};
let manifestFiles;
try { manifestFiles = (await readdir(join(root, 'manifests'))).filter((file) => file.endsWith('.json')); } catch { console.log('Warehouse export skipped: no manifests yet.'); process.exit(0); }

// Select the latest snapshot per resource and metric. Historical raw objects
// remain on disk for auditing; superseded revisions are not duplicate evidence.
const latestManifests = new Map();
for (const file of manifestFiles) {
  try {
    const manifest = JSON.parse(await readFile(join(root, 'manifests', file), 'utf8'));
    if (!manifest.id || !manifest.url) continue;
    const key = [manifest.url, manifest.metricId || '', manifest.domain || ''].join('|');
    const previous = latestManifests.get(key);
    if (!previous || String(manifest.retrievedAt || '') > String(previous.retrievedAt || '')) latestManifests.set(key, manifest);
  } catch { /* Invalid manifests are handled by warehouse validation. */ }
}
const output = await open(`${outputPath}.tmp`, 'w');
let buffered = [];
let bufferBytes = 0;
const flush = async () => { if (buffered.length) { await output.write(`${buffered.join('\n')}\n`); buffered = []; bufferBytes = 0; } };
const appendStatement = async (statement) => { buffered.push(statement); bufferBytes += Buffer.byteLength(statement); if (bufferBytes >= 1024 * 1024) await flush(); };
await appendStatement('/* Generated from latest source snapshots. Rebuild after every ingestion run. */');
let sourceCount = 0;
let observationCount = 0;
try {
for (const manifest of latestManifests.values()) {
  let payload;
  try { payload = manifest.recordPath ? JSON.parse(await readFile(manifest.recordPath, 'utf8')) : { records: [] }; } catch { payload = { records: [] }; }
  const source = payload.source || {};
  const publisher = manifest.publisher || source.publisher || 'unclassified';
  const title = manifest.title || source.title || publisher;
  const aliases = Array.isArray(manifest.aliases) ? manifest.aliases : Array.isArray(source.aliases) ? source.aliases : [];
  const sourceRegistryId = manifest.sourceRegistryId || source.sourceRegistryId || '';
  const schedule = source.schedule || sourceRegistry.find((item) => item.id === sourceRegistryId)?.schedule || null;
  const retrievedAt = manifest.retrievedAt || source.retrievedAt;
  if (!retrievedAt || !Number.isFinite(Date.parse(retrievedAt)) || Date.parse(retrievedAt) > Date.now() + 300_000) continue;
  const trust = manifest.trust || source.trust;
  const sourceSha256 = manifest.sha256 || source.sha256 || '';
  await appendStatement(warehouseUpsert({
    table: 'source_documents',
    columns: ['id', 'publisher', 'title', 'aliases_json', 'source_registry_id', 'schedule', 'url', 'content_type', 'published_at', 'retrieved_at', 'sha256', 'trust_tier', 'parser_version'],
    values: [sql(manifest.id), sql(publisher), sql(title), sql(JSON.stringify(aliases)), sql(sourceRegistryId), sql(schedule), sql(manifest.url), sql(manifest.contentType || 'application/octet-stream'), sql(manifest.publishedAt || source.publishedAt || null), sql(retrievedAt), sql(manifest.sha256 || source.sha256 || ''), sql(trust === 'primary' || trust === 'approved-domain' ? 'primary' : 'discovery'), sql(manifest.connector || source.connector || 'generic')],
    updateColumns: ['publisher', 'title', 'aliases_json', 'source_registry_id', 'schedule', 'url', 'content_type', 'published_at', 'retrieved_at', 'sha256', 'trust_tier', 'parser_version'],
  }));
  sourceCount += 1;
  await appendStatement(warehouseSourceMarker('data', manifest.id, sourceSha256));
  await appendStatement(warehouseUpsert({
    table: 'warehouse_source_imports',
    conflictColumn: 'source_id',
    columns: ['source_id', 'sha256', 'status', 'updated_at'],
    values: [sql(manifest.id), sql(sourceSha256), sql('in_progress'), sql(retrievedAt)],
    updateColumns: ['sha256', 'status', 'updated_at'],
  }));
  const emittedDatasets = new Set();
  for (const record of Array.isArray(payload.records) ? payload.records : []) {
    // Retain a break flag even when the corresponding statistical cell has no
    // value; otherwise downstream comparisons could silently cross the break.
    if (!(typeof record.value === 'number' && Number.isFinite(record.value)) && !String(record.status || '').toLowerCase().includes('b') && !['official_publication', 'legal_document', 'legal_rule'].includes(record.kind) && !record.finding) continue;
    const datasetId = `${manifest.id}:${record.datasetId || 'observations'}`.slice(0, 240);
    const dimensions = JSON.stringify(record.dimensions || {});
    const dimensionLabels = JSON.stringify(record.dimensionLabels || {});
    const metricId = record.metricId || manifest.metricId || source.metricId;
    const url = record.url || source.url || manifest.url;
    const excerpt = String(record.excerpt || '').replace(/\s+/g, ' ').slice(0, 1500) || null;
    const finding = compact(record.finding);
    let preserved = Object.fromEntries(Object.entries({
      finding,
      propositionId: record.propositionId,
      clusterId: record.clusterId,
      support: record.support,
      status: record.status,
      stage: record.stage,
      quantities: record.quantities,
      dataKind: record.dataKind,
      periodType: record.periodType,
      comparison: record.comparison,
      limitations: record.limitations,
      denominator: record.denominator,
      sourceDomain: source.domain,
    }).filter(([, value]) => value !== undefined));
    if (Buffer.byteLength(JSON.stringify(preserved), 'utf8') > 32_000) {
      preserved = {
        finding: { type: finding?.type, label: finding?.label, summary: String(finding?.summary || finding?.text || '').slice(0, 1500), truncated: true },
        propositionId: record.propositionId,
        clusterId: record.clusterId,
        support: record.support,
        status: record.status,
        stage: record.stage,
        dataKind: record.dataKind,
        periodType: record.periodType,
        comparison: compact(record.comparison),
        limitations: compact(record.limitations),
        denominator: record.denominator,
        sourceDomain: source.domain,
      };
    }
    const searchText = normalise([publisher, title, ...aliases, metricId, ...searchAliasesForMetric(metricId), record.datasetId, record.metric, excerpt, record.unit, record.period, record.geography, record.population, dimensions, dimensionLabels, url, JSON.stringify(finding || {}).slice(0, 4000)].filter(Boolean).join(' '));
    if (!emittedDatasets.has(datasetId)) await appendStatement(warehouseUpsert({
      table: 'datasets',
      columns: ['id', 'source_document_id', 'title', 'metric', 'unit', 'geography', 'population', 'period_start', 'period_end', 'definition'],
      values: [sql(datasetId), sql(manifest.id), sql(record.datasetId || 'Observations'), sql(record.metric || null), sql(record.unit || null), sql(record.geography || null), sql(record.population || null), sql(record.period || null), sql(record.period || null), sql(record.definition || null)],
      updateColumns: ['title', 'metric', 'unit', 'geography', 'population', 'period_start', 'period_end', 'definition'],
    }));
    emittedDatasets.add(datasetId);
    await appendStatement(warehouseUpsert({
      table: 'observations',
      columns: ['id', 'dataset_id', 'source_document_id', 'metric', 'metric_id', 'value', 'unit', 'period', 'geography', 'population', 'dimensions_json', 'dimension_labels_json', 'kind', 'url', 'excerpt', 'search_text', 'payload_json'],
      values: [sql(record.id), sql(datasetId), sql(manifest.id), sql(record.metric || null), sql(metricId || null), number(record.value), sql(record.unit || null), sql(record.period || null), sql(record.geography || null), sql(record.population || null), sql(dimensions), sql(dimensionLabels), sql(record.kind || 'observation'), sql(url), sql(excerpt), sql(searchText), sql(JSON.stringify(preserved))],
      updateColumns: ['dataset_id', 'source_document_id', 'metric', 'metric_id', 'value', 'unit', 'period', 'geography', 'population', 'dimensions_json', 'dimension_labels_json', 'kind', 'url', 'excerpt', 'search_text', 'payload_json'],
    }));
    observationCount += 1;
  }
  await appendStatement(warehouseUpsert({
    table: 'warehouse_source_imports',
    conflictColumn: 'source_id',
    columns: ['source_id', 'sha256', 'status', 'updated_at'],
    values: [sql(manifest.id), sql(sourceSha256), sql('complete'), sql(retrievedAt)],
    updateColumns: ['sha256', 'status', 'updated_at'],
  }));
  await appendStatement(warehouseSourceMarker('end', manifest.id, sourceSha256));
}
await flush();
} finally { await output.close(); }
await rename(`${outputPath}.tmp`, outputPath);
console.log(`Warehouse SQL exported: ${sourceCount} sources and ${observationCount} observations → ${outputPath}`);
