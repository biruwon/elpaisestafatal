import { access, readFile } from 'node:fs/promises';

const path = process.env.ROADMAP_STATUS || '.local/roadmap-status.json';
try { await access(path); } catch { console.log('Roadmap status not present; generate it with npm run knowledge:roadmap:status.'); process.exit(0); }
const report = JSON.parse(await readFile(path, 'utf8'));
const errors = [];
if (report.schemaVersion !== '1' || !report.generatedAt) errors.push('status header is malformed');
for (const section of ['coverage', 'refresh', 'model']) if (!report[section] || typeof report[section] !== 'object') errors.push(`status section missing: ${section}`);
if (!report.gapDetail || !Array.isArray(report.gapDetail.partialMetricIds) || !report.gapDetail.clusterClasses || !Array.isArray(report.gapDetail.domainContracts)) errors.push('gap detail is missing');
for (const contract of report.gapDetail?.domainContracts || []) if (!contract.id || !contract.domain || !Array.isArray(contract.missingFields) || !contract.nextEvidence) errors.push('domain contract detail is malformed');
const coverageFields = ['metrics', 'configuredFeeds', 'configuredMetrics', 'ready', 'partial', 'clusters', 'newlyCovered', 'trueGaps', 'sourceWorkItems'];
if (!coverageFields.every((field) => Number.isInteger(Number(report.coverage?.[field])) && Number(report.coverage[field]) >= 0)) errors.push('coverage status fields are invalid');
if (Number(report.coverage?.metrics) === 0) errors.push('coverage audit did not load the metric registry');
if (Number(report.coverage?.configuredMetrics) > Number(report.coverage?.metrics)) errors.push('configured metric count exceeds registry metric count');
if (!['qualified', 'rejected', 'not_run'].includes(report.model?.status)) errors.push('model qualification status is invalid');
if (!Array.isArray(report.model?.candidates)) errors.push('model candidates are missing');
if (!Array.isArray(report.model?.unavailable)) errors.push('model unavailable list is missing');
for (const model of report.model.candidates) if (!model.model || typeof model.passed !== 'boolean' || typeof model.complete !== 'boolean' || !Array.isArray(model.failureReasons)) errors.push('model candidate status is malformed');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Roadmap status valid: ${report.coverage.ready}/${report.coverage.metrics} metrics ready; refresh ${report.refresh.succeeded}/${report.refresh.attempted}; model ${report.model.status}.`);
