import { readFile } from 'node:fs/promises';
import { deterministicFallbackCompiler } from './fallback-compiler.mjs';
import { metricCandidatesDetailedForQuery } from './metric-query-hints.mjs';

const corpus = JSON.parse(await readFile(new URL('../../config/open-ended-coverage.json', import.meta.url), 'utf8'));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const timings = [];
let routingHits = 0;
let irrelevant = 0;
let familyPreservationPasses = 0;
let familyCases = 0;
for (const item of corpus.cases) {
  const started = performance.now();
  const compiler = deterministicFallbackCompiler(item.text);
  const candidates = metricCandidatesDetailedForQuery(item.text, compiler.concepts || [], 8).map((candidate) => candidate.metricId);
  timings.push(performance.now() - started);
  const hit = item.allowedMetricFamilies.length === 0 ? candidates.length === 0 : candidates.some((metricId) => item.allowedMetricFamilies.includes(metricId));
  if (hit) routingHits += 1;
  for (const forbidden of item.forbiddenMetricFamilies) if (candidates.includes(forbidden)) irrelevant += 1;
  if (item.concepts.length > 1) {
    familyCases += 1;
    const hasDistinctAllowedCoverage = item.concepts.every((concept) => concept === 'immigration'
      ? candidates.some((id) => ['foreign_born_population', 'foreign_citizenship_population', 'immigration_flows', 'asylum_applications'].includes(id))
      : concept === 'crime' ? candidates.some((id) => ['recorded_offences', 'standardised_homicide_rate'].includes(id)) : true);
    if (hasDistinctAllowedCoverage) familyPreservationPasses += 1;
  }
}
const routingRecall = routingHits / corpus.cases.length;
const irrelevantRate = irrelevant / corpus.cases.length;
const sorted = timings.sort((a, b) => a - b);
const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] || 0;
assert(routingRecall >= 0.9, `Open-ended routing recall ${(routingRecall * 100).toFixed(1)}% is below 90%`);
assert(irrelevantRate <= 0.05, `Irrelevant metric-family rate ${(irrelevantRate * 100).toFixed(1)}% exceeds 5%`);
assert(familyCases === 0 || familyPreservationPasses === familyCases, `Mixed-domain family preservation ${familyPreservationPasses}/${familyCases}`);
console.log(JSON.stringify({ corpus: corpus.cases.length, routingRecall, irrelevantRate, familyPreservation: familyCases ? familyPreservationPasses / familyCases : 1, medianMs: sorted[Math.floor(sorted.length / 2)] || 0, p95Ms: p95 }));
