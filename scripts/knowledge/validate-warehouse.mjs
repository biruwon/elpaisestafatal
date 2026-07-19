import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { hasMetric } from './metric-registry.mjs';

const root = new URL('../../.local/source-warehouse/records/', import.meta.url).pathname;
let files;
try { files = (await readdir(root)).filter((file) => file.endsWith('.json')); } catch { console.log('Warehouse validation skipped: no local records yet.'); process.exit(0); }

const errors = [];
const seen = new Set();
for (const file of files) {
  let payload;
  try { payload = JSON.parse(await readFile(join(root, file), 'utf8')); } catch { errors.push(`${file}: invalid JSON`); continue; }
  if (!payload.source?.id) errors.push(`${file}: missing source id`);
  if (!Array.isArray(payload.records)) { errors.push(`${file}: missing records array`); continue; }
  for (const record of payload.records) {
    if (!record.id || seen.has(record.id)) errors.push(`${file}: duplicate or missing record id`);
    seen.add(record.id);
    if (record.sourceId !== payload.source.id) errors.push(`${file}: ${record.id} has mismatched source id`);
    if (record.metricId && !(await hasMetric(record.metricId))) errors.push(`${file}: ${record.id} references unknown metric ${record.metricId}`);
    if (record.value !== null && record.value !== undefined && typeof record.value !== 'number') errors.push(`${file}: ${record.id} has non-numeric value`);
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Warehouse validation passed: ${files.length} record files, ${seen.size} observations.`);
