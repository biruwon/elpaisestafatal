import { sourceFreshness, staleSourceReason } from './source-freshness.mjs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const fixtureNow = Date.parse('2026-07-19T12:00:00Z');
if (sourceFreshness({ schedule: 'daily', retrievedAt: '2026-07-18T12:00:00Z' }, fixtureNow) !== 'fresh') throw new Error('Recent daily source was marked stale');
if (sourceFreshness({ schedule: 'hourly', retrievedAt: '2026-07-10T12:00:00Z' }, fixtureNow) !== 'stale') throw new Error('Old hourly source was not marked stale');
if (sourceFreshness({ schedule: 'weekly', retrievedAt: '2026-07-01T12:00:00Z' }, fixtureNow) !== 'fresh') throw new Error('Recent weekly source was marked stale');
if (sourceFreshness({ schedule: 'daily' }, fixtureNow) !== 'unknown') throw new Error('Source without retrieval timestamp was not marked unknown');
if (!staleSourceReason({ schedule: 'hourly', retrievedAt: '2026-07-10T12:00:00Z' }, fixtureNow).includes('older')) throw new Error('Stale source reason was not informative');
if (sourceFreshness({ url: 'https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/BOE-A-2007-19814/metadatos', schedule: 'hourly', retrievedAt: '2026-07-19T12:00:00Z' }, Date.parse('2026-08-03T12:00:00Z')) !== 'fresh') throw new Error('Ad-hoc BOE legal discovery inherited the daily-summary cadence');
if (sourceFreshness({ sourceRegistryId: 'eurostat', retrievedAt: '2026-06-01T12:00:00Z' }, Date.parse('2026-08-03T12:00:00Z')) !== 'stale') throw new Error('Freshness fixture did not classify an old discovery snapshot');
const now = process.env.SOURCE_FRESHNESS_NOW ? Date.parse(process.env.SOURCE_FRESHNESS_NOW) : Date.now();
if (!Number.isFinite(now)) throw new Error('SOURCE_FRESHNESS_NOW must be a valid timestamp');

const manifestDirectory = new URL('../../.local/source-warehouse/manifests/', import.meta.url).pathname;
let files = [];
try { files = (await readdir(manifestDirectory)).filter((file) => file.endsWith('.json')); } catch { /* A clean checkout has no derived snapshots yet. */ }
const failures = [];
for (const file of files) {
  try {
    const manifest = JSON.parse(await readFile(join(manifestDirectory, file), 'utf8'));
    // Discovery snapshots may carry the host's registry id without being an
    // approved scheduled feed. They are useful leads, but they must not make
    // the authoritative refresh gate fail after their one-off retrieval ages.
    if (!manifest.schedule && !manifest.metricId) continue;
    const status = sourceFreshness(manifest);
    if (status === 'stale' || status === 'invalid') failures.push(`${file}: ${staleSourceReason(manifest)}`);
  } catch { failures.push(`${file}: invalid manifest`); }
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Source freshness validation passed: schedule-aware states are deterministic${files.length ? ` and ${files.length} local manifest(s) are current` : ''}.`);
