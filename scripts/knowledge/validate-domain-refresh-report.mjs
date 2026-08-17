import { access, readFile } from 'node:fs/promises';

const path = process.env.DOMAIN_REFRESH_REPORT || '.local/domain-refresh-report.json';
try { await access(path); } catch { console.log('Domain refresh report not present; validation is deferred until a refresh runs.'); process.exit(0); }
const report = JSON.parse(await readFile(path, 'utf8'));
const errors = [];
if (report.schemaVersion !== '1' || !report.generatedAt || !['active', 'all', 'discovery'].includes(report.mode)) errors.push('refresh report header is malformed');
if (![report.attempted, report.succeeded, report.failed].every((value) => Number.isInteger(value) && value >= 0)) errors.push('refresh report counts are invalid');
if (report.succeeded + report.failed !== report.attempted) errors.push('refresh report counts do not reconcile');
if (!Array.isArray(report.successes) || !Array.isArray(report.failures)) errors.push('refresh report result lists are missing');
if (report.successes.length !== report.succeeded || report.failures.length !== report.failed) errors.push('refresh report result lists do not match counts');
for (const item of [...report.successes, ...report.failures]) if (!item.id || !item.domain || !item.url) errors.push('refresh report result is missing feed identity');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Domain refresh report valid: ${report.succeeded}/${report.attempted} feeds succeeded, ${report.failed} failed.`);
