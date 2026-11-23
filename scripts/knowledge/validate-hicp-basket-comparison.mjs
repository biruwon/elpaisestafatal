import assert from 'node:assert/strict';
import { HICP_BASKET_SNAPSHOT } from '../../src/lib/knowledge/hicp-basket-snapshot.mjs';
import { hicpBasketComparisonPlan } from '../../src/lib/knowledge/hicp-basket-comparison.mjs';
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

const stale = observations.map((item) => item.metricId === 'annual_hicp_food_index' ? { ...item, freshness: 'stale' } : item);
assert.equal(hicpBasketComparisonPlan(claim, { observations: stale, now }), undefined, 'A stale component must not be joined into a current basket comparison');

const wrongGroup = observations.map((item) => item.metricId === 'annual_hicp_food_index'
  ? { ...item, dimensions: { ...item.dimensions, coicop18: 'TOTAL' } } : item);
assert.equal(hicpBasketComparisonPlan(claim, { observations: wrongGroup, now }), undefined, 'The overall index must not be mistaken for the food subgroup');

const mixedRevisions = observations.map((item) => item.metricId === 'annual_hicp_actual_rent_index'
  ? { ...item, source: { ...item.source, retrievedAt: '2026-11-20T12:00:00Z' } } : item);
assert.equal(hicpBasketComparisonPlan(claim, { observations: mixedRevisions, now }), undefined, 'Series from materially different refresh times must not be combined');

const unsupportedPeriod = 'El IPC general no refleja cómo cambia la cesta de alimentos y alquileres entre 2018 y 2019';
assert.equal(hicpBasketComparisonPlan(unsupportedPeriod, { observations, now, allowReviewedSnapshot: true }), undefined, 'A missing interval must not be filled with a nearby period');

console.log('HICP basket comparison validation passed: aligned indices, scope, freshness, refresh consistency, and missing-period boundaries.');
