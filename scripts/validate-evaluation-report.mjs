import { readFile } from 'node:fs/promises';

const path = process.env.EVALUATION_REPORT || '.local/evaluation-latest.json';
const report = JSON.parse(await readFile(path, 'utf8'));
const numberEnv = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
};
const minimumKnownRecall = numberEnv('EVALUATION_MIN_KNOWN_RECALL', 0.97);
const minimumUnknownSafety = numberEnv('EVALUATION_MIN_UNKNOWN_SAFETY', 0.99);
const maximumIrrelevantMatches = numberEnv('EVALUATION_MAX_IRRELEVANT_MATCHES', 0);
const maximumUnsupportedRate = numberEnv('EVALUATION_MAX_UNSUPPORTED_RATE', 0.01);
const maximumTraceabilityFailures = numberEnv('EVALUATION_MAX_TRACEABILITY_FAILURES', 0);
const maximumP95Ms = numberEnv('EVALUATION_MAX_P95_MS', 15000);
const failures = [];
const knownRate = report.knownCases ? report.knownRetrievalRecall / report.knownCases : 0;
const unknownRate = report.unknownCases ? report.unknownSafety / report.unknownCases : 1;
const traceabilityFailures = Math.max(0, Number(report.traceability?.checked || 0) - Number(report.traceability?.passed || 0));
if (knownRate < minimumKnownRecall) failures.push(`known retrieval recall ${knownRate.toFixed(3)} is below ${minimumKnownRecall}`);
if (unknownRate < minimumUnknownSafety) failures.push(`unknown safety ${unknownRate.toFixed(3)} is below ${minimumUnknownSafety}`);
if (Number(report.irrelevantMatches || 0) > maximumIrrelevantMatches) failures.push(`irrelevant matches ${report.irrelevantMatches} exceeds ${maximumIrrelevantMatches}`);
if (Number(report.unsupportedConclusionRate || 0) > maximumUnsupportedRate) failures.push(`unsupported conclusion rate ${report.unsupportedConclusionRate} exceeds ${maximumUnsupportedRate}`);
if (traceabilityFailures > maximumTraceabilityFailures) failures.push(`traceability failures ${traceabilityFailures} exceeds ${maximumTraceabilityFailures}`);
if (Number(report.p95LatencyMs || 0) > maximumP95Ms) failures.push(`p95 latency ${report.p95LatencyMs}ms exceeds ${maximumP95Ms}ms`);
if (!report.cases || report.errors === report.cases) failures.push('evaluation report contains no successful cases');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Evaluation report passed: ${report.cases} cases; known recall ${knownRate.toFixed(3)}; unknown safety ${unknownRate.toFixed(3)}; p95 ${report.p95LatencyMs}ms.`);
