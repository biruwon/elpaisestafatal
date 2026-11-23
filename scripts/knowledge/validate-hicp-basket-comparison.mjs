import assert from 'node:assert/strict';
import { HICP_BASKET_SNAPSHOT } from '../../src/lib/knowledge/hicp-basket-snapshot.mjs';
import { hicpBasketComparisonPlan } from '../../src/lib/knowledge/hicp-basket-comparison.mjs';
import { focusedEvidencePlan } from '../../src/lib/knowledge/focused-evidence-plan.mjs';
import { validateAnswerPlan } from './answer-plan-validation.mjs';

const now = Date.parse('2026-11-23T12:00:00Z');
const claim = 'El IPC general no refleja bien lo que notan los hogares que gastan mucho en comida y alquiler';
const observations = HICP_BASKET_SNAPSHOT.observations.map((item) => ({ ...item, dataKind: 'observed' }));
const plan = hicpBasketComparisonPlan(claim, { observations, now });
assert.ok(plan, 'The aligned annual Eurostat series should produce a comparison');
assert.equal(plan.answerScope.family, 'household-inflation-basket');
assert.equal(plan.evidenceLevel, 'limited');
assert.deepEqual(plan.evidenceSummary.families.map((item) => item.familyId), ['annual_hicp_index', 'annual_hicp_food_index', 'annual_hicp_actual_rent_index', 'hicp-methodology']);
assert.ok(plan.sourceLinks.some((source) => source.id === 'eurostat-hicp-methodology-2026-11-23'), 'Method claims must have a linked official HICP source');
assert.match(plan.shareableReply, /índice armonizado general subió aproximadamente un 21,9 %/);
assert.match(plan.shareableReply, /alimentos y bebidas no alcohólicas, un 34,7 %/);
assert.match(plan.shareableReply, /alquileres efectivamente pagados, un 8,9 %/);
assert.match(plan.limitation, /no se calcula su inflación personal/);
assert.ok(validateAnswerPlan(plan).ok, JSON.stringify(validateAnswerPlan(plan).errors));

const foodOnlyClaim = 'La cesta de la compra ha subido más de lo que percibe quien mira solo el IPC general';
const foodOnlyPlan = hicpBasketComparisonPlan(foodOnlyClaim, { observations, now });
assert.ok(foodOnlyPlan, 'A food-basket comparison should not require a rent series when rent is not part of the claim');
assert.deepEqual(foodOnlyPlan.evidenceSummary.families.map((item) => item.familyId), ['annual_hicp_index', 'annual_hicp_food_index', 'hicp-methodology']);
assert.deepEqual(foodOnlyPlan.answerScope.directMetrics, ['annual_hicp_food_index']);
assert.match(foodOnlyPlan.shareableReply, /alimentos y bebidas no alcohólicas, un 34,7 %/);
assert.match(foodOnlyPlan.shareableReply, /índice armonizado general subió aproximadamente un 21,9 %/);
assert.match(foodOnlyPlan.shareableReply, /no lo que compra o percibe cada hogar/);
assert.doesNotMatch(foodOnlyPlan.shareableReply, /alquileres efectivamente pagados|8,9 %/);
assert.ok(!foodOnlyPlan.sourceLinks.some((source) => source.id === 'eurostat-annual-hicp-actual-rents-spain-2026-11-23'), 'A food-only claim must not cite rent data');
assert.ok(validateAnswerPlan(foodOnlyPlan).ok, JSON.stringify(validateAnswerPlan(foodOnlyPlan).errors));

const partialLiveBasket = observations.filter((item) => item.metricId === 'annual_hicp_index');
const reviewedAfterPartialRefresh = focusedEvidencePlan(claim, {
  observations: partialLiveBasket,
  now,
  allowReviewedSnapshotFallback: true,
});
assert.ok(reviewedAfterPartialRefresh, 'A partial live refresh should fall back to the complete reviewed basket');
assert.equal(reviewedAfterPartialRefresh.evidenceSummary.mode, 'snapshot', 'The result must use one reviewed source revision, not combine it with partial live rows');
assert.deepEqual(reviewedAfterPartialRefresh.evidenceSummary.families.filter((item) => item.familyId !== 'hicp-methodology').map((item) => item.dataKind), ['snapshot', 'snapshot', 'snapshot']);
assert.match(reviewedAfterPartialRefresh.shareableReply, /21,9 %.*34,7 %.*8,9 %/s);

const stale = observations.map((item) => item.metricId === 'annual_hicp_food_index' ? { ...item, freshness: 'stale' } : item);
assert.equal(hicpBasketComparisonPlan(claim, { observations: stale, now }), undefined, 'A stale component must not be joined into a current basket comparison');

const wrongGroup = observations.map((item) => item.metricId === 'annual_hicp_food_index'
  ? { ...item, dimensions: { ...item.dimensions, coicop18: 'TOTAL' } } : item);
assert.equal(hicpBasketComparisonPlan(claim, { observations: wrongGroup, now }), undefined, 'The overall index must not be mistaken for the food subgroup');

const mixedRevisions = observations.map((item) => item.metricId === 'annual_hicp_actual_rent_index'
  ? { ...item, source: { ...item.source, retrievedAt: '2026-11-20T12:00:00Z' } } : item);
assert.equal(hicpBasketComparisonPlan(claim, { observations: mixedRevisions, now }), undefined, 'Series from materially different refresh times must not be combined');
assert.ok(hicpBasketComparisonPlan(foodOnlyClaim, { observations: mixedRevisions, now }), 'An unrequested rent series must not block a food-only comparison');

const unsupportedPeriod = 'El IPC general no refleja cómo cambia la cesta de alimentos y alquileres entre 2018 y 2019';
assert.equal(hicpBasketComparisonPlan(unsupportedPeriod, { observations, now, allowReviewedSnapshot: true }), undefined, 'A missing interval must not be filled with a nearby period');
assert.equal(hicpBasketComparisonPlan(`${foodOnlyClaim} entre 2018 y 2019`, { observations, now, allowReviewedSnapshot: true }), undefined, 'A food-only claim must also keep the requested-period boundary');

console.log('HICP basket comparison validation passed: food-only and food/rent scope, single-revision partial-refresh fallback, aligned indices, source attribution, freshness, and missing-period boundaries.');
