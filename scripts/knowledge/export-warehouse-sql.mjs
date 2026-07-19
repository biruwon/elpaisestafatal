import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../../.local/source-warehouse/', import.meta.url).pathname;
const outputPath = join(root, 'warehouse-load.sql');
const sql = (value) => value === null || value === undefined ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
const number = (value) => typeof value === 'number' && Number.isFinite(value) ? String(value) : 'NULL';
let manifestFiles;
try { manifestFiles = (await readdir(join(root, 'manifests'))).filter((file) => file.endsWith('.json')); } catch { console.log('Warehouse export skipped: no manifests yet.'); process.exit(0); }

const statements = ['BEGIN;', '/* Generated from .local/source-warehouse. Rebuild after every ingestion run. */'];
let sourceCount = 0;
let observationCount = 0;
for (const file of manifestFiles) {
  let manifest;
  try { manifest = JSON.parse(await readFile(join(root, 'manifests', file), 'utf8')); } catch { continue; }
  if (!manifest?.id || !manifest.url) continue;
  statements.push(`INSERT INTO source_documents (id, publisher, url, content_type, retrieved_at, sha256, trust_tier, parser_version, object_path) VALUES (${sql(manifest.id)}, ${sql(manifest.publisher || 'unclassified')}, ${sql(manifest.url)}, ${sql(manifest.contentType || 'application/octet-stream')}, ${sql(manifest.retrievedAt || new Date().toISOString())}, ${sql(manifest.sha256 || '')}, ${sql(manifest.trust === 'approved-domain' ? 'primary' : 'discovery')}, ${sql(manifest.connector || 'generic')}, ${sql(manifest.objectPath || '')}) ON CONFLICT (id) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, sha256 = EXCLUDED.sha256, object_path = EXCLUDED.object_path;`);
  sourceCount += 1;
  if (!manifest.recordPath) continue;
  let payload;
  try { payload = JSON.parse(await readFile(manifest.recordPath, 'utf8')); } catch { continue; }
  for (const record of Array.isArray(payload.records) ? payload.records : []) {
    const datasetId = `${manifest.id}:${record.datasetId || 'observations'}`.slice(0, 240);
    const dimensions = JSON.stringify(record.dimensions || {});
    statements.push(`INSERT INTO datasets (id, source_document_id, title, metric, unit, geography, population, period_start, period_end, definition) VALUES (${sql(datasetId)}, ${sql(manifest.id)}, ${sql(record.datasetId || 'Observations')}, ${sql(record.metric || null)}, ${sql(record.unit || null)}, ${sql(record.geography || null)}, ${sql(record.population || null)}, ${sql(record.period || null)}, ${sql(record.period || null)}, NULL) ON CONFLICT (id) DO NOTHING;`);
    statements.push(`INSERT INTO observations (id, dataset_id, source_document_id, metric, value, unit, period, geography, population, dimensions_json) VALUES (${sql(record.id)}, ${sql(datasetId)}, ${sql(manifest.id)}, ${sql(record.metric || null)}, ${number(record.value)}, ${sql(record.unit || null)}, ${sql(record.period || null)}, ${sql(record.geography || null)}, ${sql(record.population || null)}, ${sql(dimensions)}) ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value, dimensions_json = EXCLUDED.dimensions_json;`);
    observationCount += 1;
  }
}
statements.push('COMMIT;');
await writeFile(outputPath, `${statements.join('\n')}\n`);
console.log(`Warehouse SQL exported: ${sourceCount} sources and ${observationCount} observations → ${outputPath}`);
