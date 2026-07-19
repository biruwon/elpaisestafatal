import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../../.local/source-warehouse/', import.meta.url).pathname;
const outputPath = join(root, 'warehouse-load.sql');
const sql = (value) => value === null || value === undefined ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
const number = (value) => typeof value === 'number' && Number.isFinite(value) ? String(value) : 'NULL';
const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
let manifestFiles;
try { manifestFiles = (await readdir(join(root, 'manifests'))).filter((file) => file.endsWith('.json')); } catch { console.log('Warehouse export skipped: no manifests yet.'); process.exit(0); }

const statements = ['BEGIN;', '/* Generated from .local/source-warehouse. Rebuild after every ingestion run. */'];
let sourceCount = 0;
let observationCount = 0;
for (const file of manifestFiles) {
  let manifest;
  try { manifest = JSON.parse(await readFile(join(root, 'manifests', file), 'utf8')); } catch { continue; }
  if (!manifest?.id || !manifest.url) continue;
  statements.push(`INSERT INTO source_documents (id, publisher, title, aliases_json, url, content_type, retrieved_at, sha256, trust_tier, parser_version, object_path) VALUES (${sql(manifest.id)}, ${sql(manifest.publisher || 'unclassified')}, ${sql(manifest.title || '')}, ${sql(JSON.stringify(manifest.aliases || []))}, ${sql(manifest.url)}, ${sql(manifest.contentType || 'application/octet-stream')}, ${sql(manifest.retrievedAt || new Date().toISOString())}, ${sql(manifest.sha256 || '')}, ${sql(manifest.trust === 'primary' || manifest.trust === 'approved-domain' ? 'primary' : 'discovery')}, ${sql(manifest.connector || 'generic')}, ${sql(manifest.objectPath || '')}) ON CONFLICT (id) DO UPDATE SET publisher = EXCLUDED.publisher, title = EXCLUDED.title, aliases_json = EXCLUDED.aliases_json, retrieved_at = EXCLUDED.retrieved_at, sha256 = EXCLUDED.sha256, trust_tier = EXCLUDED.trust_tier, parser_version = EXCLUDED.parser_version, object_path = EXCLUDED.object_path;`);
  sourceCount += 1;
  if (!manifest.recordPath) continue;
  let payload;
  try { payload = JSON.parse(await readFile(manifest.recordPath, 'utf8')); } catch { continue; }
  for (const record of Array.isArray(payload.records) ? payload.records : []) {
    const datasetId = `${manifest.id}:${record.datasetId || 'observations'}`.slice(0, 240);
    const dimensions = JSON.stringify(record.dimensions || {});
    const dimensionLabels = JSON.stringify(record.dimensionLabels || {});
    const searchText = normalise([manifest.publisher, manifest.title, ...(manifest.aliases || []), record.datasetId, record.metric, record.unit, record.period, record.geography, record.population, dimensions, dimensionLabels, record.url].filter(Boolean).join(' '));
    statements.push(`INSERT INTO datasets (id, source_document_id, title, metric, unit, geography, population, period_start, period_end, definition) VALUES (${sql(datasetId)}, ${sql(manifest.id)}, ${sql(record.datasetId || 'Observations')}, ${sql(record.metric || null)}, ${sql(record.unit || null)}, ${sql(record.geography || null)}, ${sql(record.population || null)}, ${sql(record.period || null)}, ${sql(record.period || null)}, NULL) ON CONFLICT (id) DO NOTHING;`);
    statements.push(`INSERT INTO observations (id, dataset_id, source_document_id, metric, value, unit, period, geography, population, dimensions_json, dimension_labels_json, kind, url, search_text) VALUES (${sql(record.id)}, ${sql(datasetId)}, ${sql(manifest.id)}, ${sql(record.metric || null)}, ${number(record.value)}, ${sql(record.unit || null)}, ${sql(record.period || null)}, ${sql(record.geography || null)}, ${sql(record.population || null)}, ${sql(dimensions)}, ${sql(dimensionLabels)}, ${sql(record.kind || 'observation')}, ${sql(record.url || null)}, ${sql(searchText)}) ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value, dimensions_json = EXCLUDED.dimensions_json, dimension_labels_json = EXCLUDED.dimension_labels_json, kind = EXCLUDED.kind, url = EXCLUDED.url, search_text = EXCLUDED.search_text;`);
    observationCount += 1;
  }
}
statements.push('COMMIT;');
await writeFile(outputPath, `${statements.join('\n')}\n`);
console.log(`Warehouse SQL exported: ${sourceCount} sources and ${observationCount} observations → ${outputPath}`);
