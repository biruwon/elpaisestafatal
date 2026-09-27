import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { searchAliasesForMetric } from './metric-search-aliases.mjs';
import { sourceRegistry } from './source-registry.mjs';

const root = new URL('../../.local/source-warehouse/', import.meta.url).pathname;
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

const statements = ['/* Generated from .local/source-warehouse. Rebuild after every ingestion run. */'];
let sourceCount = 0;
let observationCount = 0;
for (const file of manifestFiles) {
  let manifest;
  try { manifest = JSON.parse(await readFile(join(root, 'manifests', file), 'utf8')); } catch { continue; }
  if (!manifest?.id || !manifest.url) continue;
  let payload;
  try { payload = manifest.recordPath ? JSON.parse(await readFile(manifest.recordPath, 'utf8')) : { records: [] }; } catch { payload = { records: [] }; }
  const source = payload.source || {};
  const publisher = manifest.publisher || source.publisher || 'unclassified';
  const title = manifest.title || source.title || publisher;
  const aliases = Array.isArray(manifest.aliases) ? manifest.aliases : Array.isArray(source.aliases) ? source.aliases : [];
  const sourceRegistryId = manifest.sourceRegistryId || source.sourceRegistryId || '';
  const schedule = source.schedule || sourceRegistry.find((item) => item.id === sourceRegistryId)?.schedule || null;
  const retrievedAt = manifest.retrievedAt || source.retrievedAt || new Date().toISOString();
  const trust = manifest.trust || source.trust;
  statements.push(`INSERT INTO source_documents (id, publisher, title, aliases_json, source_registry_id, schedule, url, content_type, published_at, retrieved_at, sha256, trust_tier, parser_version) VALUES (${sql(manifest.id)}, ${sql(publisher)}, ${sql(title)}, ${sql(JSON.stringify(aliases))}, ${sql(sourceRegistryId)}, ${sql(schedule)}, ${sql(manifest.url)}, ${sql(manifest.contentType || 'application/octet-stream')}, ${sql(manifest.publishedAt || source.publishedAt || null)}, ${sql(retrievedAt)}, ${sql(manifest.sha256 || source.sha256 || '')}, ${sql(trust === 'primary' || trust === 'approved-domain' ? 'primary' : 'discovery')}, ${sql(manifest.connector || source.connector || 'generic')}) ON CONFLICT (id) DO UPDATE SET publisher = excluded.publisher, title = excluded.title, aliases_json = excluded.aliases_json, source_registry_id = excluded.source_registry_id, schedule = excluded.schedule, url = excluded.url, content_type = excluded.content_type, published_at = excluded.published_at, retrieved_at = excluded.retrieved_at, sha256 = excluded.sha256, trust_tier = excluded.trust_tier, parser_version = excluded.parser_version;`);
  sourceCount += 1;
  for (const record of Array.isArray(payload.records) ? payload.records : []) {
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
    }).filter(([, value]) => value !== undefined));
    if (Buffer.byteLength(JSON.stringify(preserved), 'utf8') > 32_000) {
      preserved = {
        finding: { type: finding?.type, label: finding?.label, summary: String(finding?.summary || finding?.text || '').slice(0, 1500), truncated: true },
        propositionId: record.propositionId,
        clusterId: record.clusterId,
        support: record.support,
        status: record.status,
        stage: record.stage,
      };
    }
    const searchText = normalise([publisher, title, ...aliases, metricId, ...searchAliasesForMetric(metricId), record.datasetId, record.metric, excerpt, record.unit, record.period, record.geography, record.population, dimensions, dimensionLabels, url, JSON.stringify(finding || {}).slice(0, 4000)].filter(Boolean).join(' '));
    statements.push(`INSERT INTO datasets (id, source_document_id, title, metric, unit, geography, population, period_start, period_end, definition) VALUES (${sql(datasetId)}, ${sql(manifest.id)}, ${sql(record.datasetId || 'Observations')}, ${sql(record.metric || null)}, ${sql(record.unit || null)}, ${sql(record.geography || null)}, ${sql(record.population || null)}, ${sql(record.period || null)}, ${sql(record.period || null)}, ${sql(record.definition || null)}) ON CONFLICT (id) DO UPDATE SET title = excluded.title, metric = excluded.metric, unit = excluded.unit, geography = excluded.geography, population = excluded.population, period_start = excluded.period_start, period_end = excluded.period_end, definition = excluded.definition;`);
    statements.push(`INSERT INTO observations (id, dataset_id, source_document_id, metric, metric_id, value, unit, period, geography, population, dimensions_json, dimension_labels_json, kind, url, excerpt, search_text, payload_json) VALUES (${sql(record.id)}, ${sql(datasetId)}, ${sql(manifest.id)}, ${sql(record.metric || null)}, ${sql(metricId || null)}, ${number(record.value)}, ${sql(record.unit || null)}, ${sql(record.period || null)}, ${sql(record.geography || null)}, ${sql(record.population || null)}, ${sql(dimensions)}, ${sql(dimensionLabels)}, ${sql(record.kind || 'observation')}, ${sql(url)}, ${sql(excerpt)}, ${sql(searchText)}, ${sql(JSON.stringify(preserved))}) ON CONFLICT (id) DO UPDATE SET dataset_id = excluded.dataset_id, source_document_id = excluded.source_document_id, metric = excluded.metric, metric_id = excluded.metric_id, value = excluded.value, unit = excluded.unit, period = excluded.period, geography = excluded.geography, population = excluded.population, dimensions_json = excluded.dimensions_json, dimension_labels_json = excluded.dimension_labels_json, kind = excluded.kind, url = excluded.url, excerpt = excluded.excerpt, search_text = excluded.search_text, payload_json = excluded.payload_json;`);
    observationCount += 1;
  }
}
await writeFile(outputPath, `${statements.join('\n')}\n`);
console.log(`Warehouse SQL exported: ${sourceCount} sources and ${observationCount} observations → ${outputPath}`);
