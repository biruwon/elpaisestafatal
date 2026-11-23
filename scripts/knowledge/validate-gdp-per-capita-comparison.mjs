import assert from 'node:assert/strict';
import { claimFocusFor } from '../../src/lib/knowledge/claim-focus.mjs';
import { focusedEvidencePlan } from '../../src/lib/knowledge/focused-evidence-plan.mjs';
import { gdpPerCapitaComparisonPlan } from '../../src/lib/knowledge/gdp-per-capita-comparison.mjs';
import { GDP_REAL_PER_CAPITA_SNAPSHOT } from '../../src/lib/knowledge/gdp-real-per-capita-snapshot.mjs';
import { publicResolveResponse } from '../../src/lib/knowledge/public-response.mjs';
import { validateAnswerPlan } from './answer-plan-validation.mjs';

const now = Date.parse('2026-11-23T12:00:00Z');
const reviewedOptions = { now, allowReviewedSnapshotFallback: true };
const reviewedRows = GDP_REAL_PER_CAPITA_SNAPSHOT.observations;
const claims = [
  'España puede crecer en PIB total mientras el nivel de vida por persona mejora mucho menos',
  'El crecimiento del PIB real español se tradujo en una mejora menor del PIB real por habitante',
  'Entre 2019 y 2025, el PIB real total de España aumentó más que el PIB real por habitante',
];
const plans = claims.map((claim) => {
  assert.equal(claimFocusFor(claim)?.id, 'gdp-total-per-capita-comparison', claim);
  const plan = focusedEvidencePlan(claim, reviewedOptions);
  assert.equal(plan?.answerScope?.family, 'gdp-total-per-capita', claim);
  assert.equal(plan.evidenceLevel, 'limited');
  assert.match(plan.shareableReply, /2019 y 2025/);
  assert.match(plan.shareableReply, /10,0 %/);
  assert.match(plan.shareableReply, /4,9 %/);
  assert.match(plan.shareableReply, /5,1 puntos porcentuales/);
  assert.match(plan.shareableReply, /provisional/);
  assert.match(plan.shareableReply, /no mide la renta mediana ni el bienestar completo/);
  assert.doesNotMatch(plan.shareableReply, /el nivel de vida.*mejor[oó] un 4,9 %/i);
  assert.ok(validateAnswerPlan(plan).ok, JSON.stringify(validateAnswerPlan(plan).errors));
  const publicResult = publicResolveResponse({ status: 'complete', requestId: 'gdp-per-capita-test', result: plan });
  assert.ok(publicResult, 'A reviewed comparison should remain valid in the public response');
  return plan;
});
const sourceSignature = (plan) => [...plan.sourceIds].sort().join('|');
assert.equal(new Set(plans.map(sourceSignature)).size, 1, 'Paraphrases must use the same official series and metadata');
assert.equal(plans[0].blocks[0].items[0].verdict, 'mixed', 'Broad living-standard language is only partially measured by GDP per capita');
assert.equal(plans[1].blocks[0].items[0].verdict, 'mixed', 'A per-person output proxy must not be presented as observed personal welfare');
assert.equal(plans[2].blocks[0].items[0].verdict, 'supported', 'The explicit total-GDP vs per-capita direction matches the series');
assert.equal(plans[0].evidenceSummary.mode, 'snapshot');

const recentTwoYears = focusedEvidencePlan('El PIB total creció más que el PIB por habitante en los últimos dos años', reviewedOptions);
assert.match(recentTwoYears.shareableReply, /entre 2023 y 2025/i);
const annual = focusedEvidencePlan('En 2024 el PIB total creció más que el PIB por habitante', reviewedOptions);
assert.match(annual.shareableReply, /entre 2023 y 2024/i);
assert.match(annual.shareableReply, /provisional/);
assert.doesNotMatch(annual.shareableReply, /2025/, 'A 2023–2024 comparison must not describe 2025 as one of its values');

for (const neighbour of [
  'La productividad laboral aumentó más deprisa que el PIB total',
  'El crecimiento del PIB se debió al aumento de la población',
  'La renta mediana de los hogares avanzó menos que el PIB total',
  'El PIB por habitante de España creció más que el de la Unión Europea',
]) {
  assert.notEqual(claimFocusFor(neighbour)?.id, 'gdp-total-per-capita-comparison', `Nearby claim cross-routed into this family: ${neighbour}`);
}

const unavailableYear = focusedEvidencePlan('El PIB real total aumentó más que el PIB real por habitante entre 2018 y 2025', reviewedOptions);
assert.equal(unavailableYear.evidenceLevel, 'insufficient');
assert.deepEqual(unavailableYear.evidenceIds, [], 'An unsupported start year must not borrow a nearby period');
const ambiguousPeriod = focusedEvidencePlan('Desde el año pasado, el PIB real total aumentó más que el PIB real por habitante', reviewedOptions);
assert.equal(ambiguousPeriod.evidenceLevel, 'insufficient', 'An unresolvable relative period must not silently become the default window');
assert.deepEqual(ambiguousPeriod.evidenceIds, []);
const unavailableTerritory = focusedEvidencePlan('El PIB real total de Francia aumentó más que el PIB real por habitante entre 2019 y 2025', reviewedOptions);
assert.equal(unavailableTerritory.evidenceLevel, 'insufficient');
assert.deepEqual(unavailableTerritory.evidenceIds, [], 'Spanish observations must not answer a French claim');
assert.doesNotMatch(unavailableTerritory.shareableReply, /10,0 %|4,9 %/);

const incompleteLive = focusedEvidencePlan(claims[0], {
  ...reviewedOptions,
  observations: reviewedRows.filter((item) => item.metricId === 'gdp_real_annual'),
});
assert.equal(incompleteLive.evidenceLevel, 'insufficient', 'A single live series must not be completed with a different reviewed snapshot');
assert.deepEqual(incompleteLive.evidenceIds, []);
const expiredSnapshot = focusedEvidencePlan(claims[0], {
  now: Date.parse('2028-01-01T00:00:00Z'),
  allowReviewedSnapshotFallback: true,
});
assert.equal(expiredSnapshot.evidenceLevel, 'insufficient', 'An expired snapshot must not produce public numeric claims');
assert.deepEqual(expiredSnapshot.evidenceIds, []);

const differentRetrievalDays = reviewedRows.map((item) => item.metricId === 'gdp_real_annual'
  ? { ...item, source: { ...item.source, retrievedAt: '2026-11-15T12:00:00Z' } }
  : item);
assert.equal(gdpPerCapitaComparisonPlan(claims[0], { observations: differentRetrievalDays, now, allowReviewedSnapshot: true }), undefined,
  'Series fetched more than seven days apart must not be combined');

const stale = reviewedRows.map((item) => ({ ...item, source: { ...item.source, retrievedAt: '2026-10-01T12:00:00Z' } }));
assert.equal(gdpPerCapitaComparisonPlan(claims[0], { observations: stale, now }), undefined, 'Stale live series must not produce current numeric answers');
const brokenScope = reviewedRows.map((item) => item.metricId === 'gdp_real_per_capita_annual'
  ? { ...item, dimensions: { ...item.dimensions, geo: 'FR' } }
  : item);
assert.equal(gdpPerCapitaComparisonPlan(claims[0], { observations: brokenScope, now, allowReviewedSnapshot: true }), undefined,
  'A per-capita series for another territory must not be paired with Spain');

console.log('GDP comparison validation passed: paraphrases, direction, period, territory, denominator, provisional flags, revision alignment and nearby-claim boundaries.');
