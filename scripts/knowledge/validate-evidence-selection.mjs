import { readFile } from 'node:fs/promises';
import { deterministicFallbackCompiler } from './fallback-compiler.mjs';
import { metricCandidatesDetailedForQuery } from './metric-query-hints.mjs';
import { selectEvidence } from './evidence-selection.mjs';

const corpus = JSON.parse(await readFile(new URL('../../config/open-ended-coverage.json', import.meta.url), 'utf8'));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const syntheticObservation = (metricId, index = 0, freshness = 'fresh') => ({ id: `${metricId}-fixture-${index}`, metricId, metric: metricId, value: index + 1, unit: '%', period: `202${index + 3}`, evidenceFit: 'direct', freshness, source: { id: `${metricId}-source`, title: `${metricId} source`, url: 'https://example.org/source', sourceType: 'official', role: 'primary', retrievedAt: new Date().toISOString() } });

for (const item of corpus.cases) {
  const compiler = deterministicFallbackCompiler(item.text);
  for (const concept of item.concepts) assert((compiler.concepts || []).includes(concept), `${item.id}: missing concept ${concept}`);
  const candidates = metricCandidatesDetailedForQuery(item.text, compiler.concepts || [], 8).map((candidate) => candidate.metricId);
  for (const forbidden of item.forbiddenMetricFamilies) assert(!candidates.includes(forbidden), `${item.id}: forbidden metric selected ${forbidden}`);
  if (item.allowedMetricFamilies.length) assert(candidates.some((candidate) => item.allowedMetricFamilies.includes(candidate)), `${item.id}: no allowed metric selected`);
  if (!item.allowedMetricFamilies.length) assert(candidates.length === 0, `${item.id}: generic claim was assigned metrics`);
  if (item.requiredLimitations.includes('intención')) assert(compiler.rhetoricalProfile?.intent, `${item.id}: manipulation intent was not detected`);
  if (item.requiredLimitations.includes('invasion')) assert(compiler.rhetoricalProfile?.loaded, `${item.id}: loaded scale wording was not detected`);
  if (item.requiredLimitations.includes('experiencia')) assert(compiler.concepts?.includes('crime') && compiler.rhetoricalProfile?.loaded, `${item.id}: security experience was not routed`);
  if (item.requiredLimitations.includes('experiencia')) assert(compiler.rhetoricalProfile?.acts?.includes('collective_safety_experience') && compiler.rhetoricalProfile?.measurablePropositions?.includes('victimisation_or_perception'), `${item.id}: safety experience dimensions were not formalized`);
  if (item.requiredLimitations.includes('intención')) assert(compiler.rhetoricalProfile?.untestableImplications?.includes('deliberate_deception_or_intention'), `${item.id}: manipulation limitation was not formalized`);
  if (item.requiredLimitations.includes('causa')) assert(compiler.claimType === 'causal' || compiler.rhetoricalProfile?.requiresQualification, `${item.id}: causal/qualified interpretation was not retained`);
  const selected = selectEvidence({ query: item.text, observations: candidates.slice(0, 3).map((metricId) => syntheticObservation(metricId)), candidateIds: candidates, claimType: compiler.claimType });
  if (item.allowedMetricFamilies.length) assert(selected.selected.length > 0, `${item.id}: evidence selection returned nothing`);
  if (item.id === 'causal-safety') assert(!selected.selected.some((family) => family.direction === 'supports'), `${item.id}: causal claim was presented as supported`);
}

const stale = selectEvidence({ query: 'La tasa de paro', observations: [syntheticObservation('unemployment_rate', 0, 'stale')], candidateIds: ['unemployment_rate'], claimType: 'descriptive' });
assert(stale.selected[0]?.freshness === 'stale', 'stale evidence was not retained as limited context');
assert(stale.selected[0]?.limitation?.includes('fuente está stale'), 'stale evidence was not labelled');
const fallbackObservation = syntheticObservation('unemployment_rate');
delete fallbackObservation.freshness;
fallbackObservation.source = { ...fallbackObservation.source, schedule: 'monthly', retrievedAt: '2024-01-01T00:00:00Z' };
const fallbackOnly = selectEvidence({ query: 'La tasa de paro', observations: [fallbackObservation], candidateIds: ['unemployment_rate'], claimType: 'descriptive' });
assert(!fallbackOnly.selected.length, 'fallback-only stale evidence was incorrectly used as dynamic evidence');
assert(fallbackOnly.rejected.some((item) => item.metricId === 'unemployment_rate'), 'fallback-only rejection was not recorded');
console.log(`Evidence selection validation passed: ${corpus.cases.length} open-ended cases and stale-source labelling verified.`);
