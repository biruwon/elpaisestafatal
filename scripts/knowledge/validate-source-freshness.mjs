import { sourceFreshness, staleSourceReason } from './source-freshness.mjs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const fixtureNow = Date.parse('2026-07-19T12:00:00Z');
if (sourceFreshness({ schedule: 'daily', retrievedAt: '2026-07-18T12:00:00Z' }, fixtureNow) !== 'fresh') throw new Error('Recent daily source was marked stale');
if (sourceFreshness({ schedule: 'hourly', retrievedAt: '2026-07-10T12:00:00Z' }, fixtureNow) !== 'stale') throw new Error('Old hourly source was not marked stale');
if (sourceFreshness({ schedule: 'weekly', retrievedAt: '2026-07-01T12:00:00Z' }, fixtureNow) !== 'fresh') throw new Error('Recent weekly source was marked stale');
if (sourceFreshness({ schedule: 'monthly', retrievedAt: '2026-04-10T12:00:00Z' }, fixtureNow) !== 'fresh') throw new Error('Recent monthly source was marked stale');
if (sourceFreshness({ schedule: 'quarterly', retrievedAt: '2025-12-31T12:00:00Z' }, fixtureNow) !== 'fresh') throw new Error('Recent quarterly source was marked stale');
if (sourceFreshness({ schedule: 'semiannual', retrievedAt: '2026-01-01T12:00:00Z' }, Date.parse('2026-07-01T12:00:00Z')) !== 'fresh') throw new Error('Semiannual source was marked stale before its next release');
if (sourceFreshness({ schedule: 'semiannual', retrievedAt: '2025-10-01T12:00:00Z' }, Date.parse('2026-07-01T12:00:00Z')) !== 'stale') throw new Error('Outdated semiannual source was not marked stale');
if (sourceFreshness({ schedule: 'yearly', retrievedAt: '2025-07-01T12:00:00Z' }, Date.parse('2026-07-19T12:00:00Z')) !== 'fresh') throw new Error('Annual source was marked stale before its next release');
if (sourceFreshness({ schedule: 'yearly', retrievedAt: '2025-07-01T12:00:00Z' }, Date.parse('2026-08-03T12:00:00Z')) !== 'fresh') throw new Error('Annual source was marked stale before its freshness window ended');
if (sourceFreshness({ schedule: 'daily' }, fixtureNow) !== 'unknown') throw new Error('Source without retrieval timestamp was not marked unknown');
if (!staleSourceReason({ schedule: 'hourly', retrievedAt: '2026-07-10T12:00:00Z' }, fixtureNow).includes('older')) throw new Error('Stale source reason was not informative');
if (sourceFreshness({ url: 'https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/BOE-A-2007-19814/metadatos', schedule: 'hourly', retrievedAt: '2026-07-19T12:00:00Z' }, Date.parse('2026-08-03T12:00:00Z')) !== 'fresh') throw new Error('Ad-hoc BOE legal discovery inherited the daily-summary cadence');
if (sourceFreshness({ sourceRegistryId: 'eurostat', retrievedAt: '2026-06-01T12:00:00Z' }, Date.parse('2026-08-03T12:00:00Z')) !== 'stale') throw new Error('Freshness fixture did not classify an old discovery snapshot');
const now = process.env.SOURCE_FRESHNESS_NOW ? Date.parse(process.env.SOURCE_FRESHNESS_NOW) : Date.now();
if (!Number.isFinite(now)) throw new Error('SOURCE_FRESHNESS_NOW must be a valid timestamp');
const allowPartialRefresh = process.argv.includes('--allow-partial-refresh');
const incompleteReportFailure = (label, report, allowPartial) => Number(report?.failed || 0) > 0 && !allowPartial
  ? `${label} refresh report records ${report.failed} failed feed(s)`
  : undefined;
if (!incompleteReportFailure('fixture', { failed: 2 }, false)
  || incompleteReportFailure('fixture', { failed: 2 }, true)
  || incompleteReportFailure('fixture', { failed: 0 }, false)) {
  throw new Error('Partial-refresh policy must allow successful snapshots while preserving strict validation by default');
}

const manifestDirectory = new URL('../../.local/source-warehouse/manifests/', import.meta.url).pathname;
let files = [];
try { files = (await readdir(manifestDirectory)).filter((file) => file.endsWith('.json')); } catch { /* A clean checkout has no derived snapshots yet. */ }
const failures = [];
const manifests = [];
for (const file of files) {
  try { manifests.push({ file, ...JSON.parse(await readFile(join(manifestDirectory, file), 'utf8')) }); }
  catch { failures.push(`${file}: invalid manifest`); }
}
const loadReport = async (relativePath) => {
  try { return { present: true, value: JSON.parse(await readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8')) }; }
  catch (error) { return error?.code === 'ENOENT' ? { present: false } : { present: true, error }; }
};
const [sourceReport, domainReport] = await Promise.all([
  loadReport('.local/source-refresh-report.json'),
  loadReport('.local/domain-refresh-report.json'),
]);
const reports = [
  { ...sourceReport, label: 'public source', kind: 'source' },
  { ...domainReport, label: 'domain source', kind: 'domain' },
];
const hasRefreshReport = reports.some((report) => report.present);
const normalizeUrl = (value) => { try { return new URL(value).href; } catch { return String(value || ''); } };
let checkedSnapshots = 0;

if (hasRefreshReport) {
  for (const report of reports) {
    if (!report.present) continue;
    if (report.error) {
      failures.push(`${report.label} refresh report is invalid: ${report.error.message}`);
      continue;
    }
    const value = report.value;
    if (!Array.isArray(value?.successes)) {
      failures.push(`${report.label} refresh report has no successes list`);
      continue;
    }
    const incompleteFailure = incompleteReportFailure(report.label, value, allowPartialRefresh);
    if (incompleteFailure) failures.push(incompleteFailure);
    else if (Number(value.failed || 0) > 0) console.warn(`${report.label} refresh report records ${value.failed} failed feed(s); validating successful snapshots and leaving failed feeds visible in the refresh report`);
    for (const success of value.successes) {
      const matches = manifests.filter((manifest) => report.kind === 'source'
        ? manifest.sourceRegistryId === success.sourceId
          && normalizeUrl(manifest.url) === normalizeUrl(success.url)
          && (!success.metricId || manifest.metricId === success.metricId)
        : manifest.domain === success.domain
          && normalizeUrl(manifest.landingUrl || manifest.url) === normalizeUrl(success.url));
      const latest = matches.sort((left, right) => (Date.parse(right.retrievedAt || '') || 0) - (Date.parse(left.retrievedAt || '') || 0))[0];
      const label = success.id || [success.sourceId, success.metricId, success.url].filter(Boolean).join(':');
      if (!latest) {
        failures.push(`${report.label} ${label}: successful refresh has no matching warehouse manifest`);
        continue;
      }
      checkedSnapshots += 1;
      if (sourceFreshness(latest, now) !== 'fresh') failures.push(`${latest.file}: ${staleSourceReason(latest, now)}`);
    }
  }
} else {
  // Discovery and archived source snapshots do not represent a current feed.
  // During scheduled refreshes, use the reports above to validate the latest
  // revision instead of making retained history fail the current-feed gate.
  for (const manifest of manifests) {
    if (!manifest.schedule && !manifest.metricId) continue;
    const status = sourceFreshness(manifest, now);
    if (status === 'stale' || status === 'invalid' || status === 'unknown') failures.push(`${manifest.file}: ${staleSourceReason(manifest, now)}`);
  }
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Source freshness validation passed: schedule-aware states are deterministic${checkedSnapshots ? ` and ${checkedSnapshots} snapshots from the latest refresh reports are current` : files.length ? ` across ${files.length} local manifest(s)` : ''}.`);
