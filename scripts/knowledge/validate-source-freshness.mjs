import { sourceFreshness, staleSourceReason } from './source-freshness.mjs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const now = Date.parse('2026-07-19T12:00:00Z');
if (sourceFreshness({ schedule: 'daily', retrievedAt: '2026-07-18T12:00:00Z' }, now) !== 'fresh') throw new Error('Recent daily source was marked stale');
if (sourceFreshness({ schedule: 'hourly', retrievedAt: '2026-07-10T12:00:00Z' }, now) !== 'stale') throw new Error('Old hourly source was not marked stale');
if (sourceFreshness({ schedule: 'weekly', retrievedAt: '2026-07-01T12:00:00Z' }, now) !== 'fresh') throw new Error('Recent weekly source was marked stale');
if (sourceFreshness({ schedule: 'daily' }, now) !== 'unknown') throw new Error('Source without retrieval timestamp was not marked unknown');
if (!staleSourceReason({ schedule: 'hourly', retrievedAt: '2026-07-10T12:00:00Z' }, now).includes('older')) throw new Error('Stale source reason was not informative');

const manifestDirectory = new URL('../../.local/source-warehouse/manifests/', import.meta.url).pathname;
let files = [];
try { files = (await readdir(manifestDirectory)).filter((file) => file.endsWith('.json')); } catch { /* A clean checkout has no derived snapshots yet. */ }
const failures = [];
for (const file of files) {
  try {
    const manifest = JSON.parse(await readFile(join(manifestDirectory, file), 'utf8'));
    const status = sourceFreshness(manifest);
    if (status === 'stale' || status === 'invalid') failures.push(`${file}: ${staleSourceReason(manifest)}`);
  } catch { failures.push(`${file}: invalid manifest`); }
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Source freshness validation passed: schedule-aware states are deterministic${files.length ? ` and ${files.length} local manifest(s) are current` : ''}.`);
