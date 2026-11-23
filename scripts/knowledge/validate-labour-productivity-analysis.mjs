import assert from 'node:assert/strict';
import { claimFocusFor } from '../../src/lib/knowledge/claim-focus.mjs';
import { focusedEvidencePlan } from '../../src/lib/knowledge/focused-evidence-plan.mjs';
import { labourProductivityAnalysisPlan } from '../../src/lib/knowledge/labour-productivity-analysis.mjs';
import { LABOUR_PRODUCTIVITY_SNAPSHOT } from '../../src/lib/knowledge/labour-productivity-snapshot.mjs';
import { GDP_REAL_PER_CAPITA_SNAPSHOT } from '../../src/lib/knowledge/gdp-real-per-capita-snapshot.mjs';
import { publicResolveResponse } from '../../src/lib/knowledge/public-response.mjs';
import { validateAnswerPlan } from './answer-plan-validation.mjs';

const now = Date.parse('2026-11-23T12:00:00Z');
const reviewedOptions = { now, allowReviewedSnapshotFallback: true };
const reviewedRows = [...GDP_REAL_PER_CAPITA_SNAPSHOT.observations, ...LABOUR_PRODUCTIVITY_SNAPSHOT.observations];
const claims = [
  'El crecimiento basado en más población puede ocultar una productividad estancada',
  'La población explica una parte del crecimiento del PIB mientras la productividad por trabajador apenas avanza',
  'El PIB puede crecer con más población mientras la productividad laboral por persona ocupada permanece casi estable',
];
const plans = claims.map((claim) => {
  assert.equal(claimFocusFor(claim)?.id, 'labour-productivity-and-growth', claim);
  const plan = focusedEvidencePlan(claim, reviewedOptions);
  assert.equal(plan?.answerScope?.family, 'labour-productivity-and-growth', claim);
  assert.equal(plan.evidenceLevel, 'limited');
  assert.deepEqual(plan.answerScope.directMetrics, ['real_labour_productivity_per_person', 'real_labour_productivity_per_hour']);
  assert.ok(plan.answerScope.contextMetrics.includes('gdp_real_annual'));
  assert.ok(plan.answerScope.contextMetrics.includes('gdp_real_per_capita_annual'));
  assert.ok(!plan.answerScope.contextMetrics.includes('employment_persons_per_capita_national_accounts'));
  assert.match(plan.shareableReply, /2019 y 2025/);
  assert.match(plan.shareableReply, /persona ocupada.*baj[oó] aproximadamente un 0,8 %/s);
  assert.match(plan.shareableReply, /hora trabajada.*subi[oó] aproximadamente un 2,0 %/s);
  assert.match(plan.shareableReply, /10,0 %.*4,9 %.*4,8 %/s);
  assert.match(plan.shareableReply, /provisionales los datos de 2025/);
  assert.match(plan.shareableReply, /productividad total de los factores/);
  assert.ok(validateAnswerPlan(plan).ok, JSON.stringify(validateAnswerPlan(plan).errors));
  const publicResult = publicResolveResponse({ status: 'complete', requestId: 'labour-productivity-test', result: plan });
  assert.ok(publicResult, 'A reviewed productivity answer should satisfy the public response contract');
  return plan;
});
const sourceSignatures = plans.map((plan) => [...plan.sourceIds].sort().join('|'));
assert.equal(new Set(sourceSignatures).size, 1, 'Paraphrases must keep a stable source set');
assert.ok(plans.every((plan) => plan.blocks[0].items[0].verdict === 'mixed'), 'Broad stagnation and causal wording must remain qualified');
assert.equal(plans[0].evidenceSummary.mode, 'snapshot');
assert.ok(plans[0].evidenceIds.includes('eurostat-real-labour-productivity-per-person-spain-2026-11-23-2019'));
assert.ok(plans[0].evidenceIds.includes('eurostat-real-labour-productivity-per-hour-spain-2026-11-23-2025'));
assert.ok(plans[0].sourceIds.includes('eurostat-real-gdp-per-capita-definition'));

const annual = focusedEvidencePlan('En 2024 la productividad por hora aumentó', reviewedOptions);
assert.equal(annual.evidenceLevel, 'limited');
assert.match(annual.shareableReply, /entre 2023 y 2024/i);
assert.match(annual.shareableReply, /provisional/);
assert.doesNotMatch(annual.shareableReply, /2025/, 'A 2023–2024 comparison must not inherit 2025 values');
const productivityOnly = focusedEvidencePlan('La productividad por trabajador lleva demasiado tiempo avanzando lentamente', reviewedOptions);
assert.match(productivityOnly.shareableReply, /2019 y 2025/);
assert.match(productivityOnly.shareableReply, /Esta ventana de seis años no basta para juzgar/);
assert.doesNotMatch(productivityOnly.shareableReply, /10,0 %|4,9 %|4,8 %/, 'A productivity-only claim must not inherit GDP/population context it did not request');
const unspecifiedDenominator = focusedEvidencePlan('La productividad laboral está mejorando en España', reviewedOptions);
assert.match(unspecifiedDenominator.shareableReply, /por persona ocupada bajó; por hora subió/i);
assert.doesNotMatch(unspecifiedDenominator.shareableReply, /«Estancada»/, 'A neutral statement about improvement must not be reframed as a claim of stagnation');

const employmentClaims = [
  'El crecimiento económico español depende demasiado del aumento de empleo y poco de la productividad',
  'El crecimiento económico viene más de la creación de empleo que de las mejoras de productividad',
];
const employmentPlans = employmentClaims.map((claim) => {
  assert.equal(claimFocusFor(claim)?.id, 'labour-productivity-and-growth', claim);
  const plan = focusedEvidencePlan(claim, reviewedOptions);
  assert.equal(plan?.answerScope?.family, 'labour-productivity-and-growth', claim);
  assert.equal(plan.evidenceLevel, 'limited');
  assert.deepEqual(plan.answerScope.directMetrics, ['real_labour_productivity_per_person', 'real_labour_productivity_per_hour']);
  assert.deepEqual(plan.answerScope.contextMetrics, ['gdp_real_annual', 'employment_persons_per_capita_national_accounts']);
  assert.equal(plan.blocks[0].items[0].verdict, 'mixed', 'Aggregate indicators cannot establish the claimed causal contribution');
  assert.match(plan.shareableReply, /2019 y 2025/);
  assert.match(plan.shareableReply, /46,0 %.*43,5 %|43,5 %.*46,0 %/s);
  assert.match(plan.shareableReply, /2,5 puntos porcentuales/);
  assert.match(plan.shareableReply, /no cuantifican cuánto del crecimiento del PIB corresponde a más empleo frente a mejoras de productividad/);
  assert.match(plan.shareableReply, /provisionales los datos de 2025/);
  assert.ok(plan.evidenceSummary.families.some((family) => family.familyId === 'employment_persons_per_capita_national_accounts'));
  assert.ok(validateAnswerPlan(plan).ok, JSON.stringify(validateAnswerPlan(plan).errors));
  return plan;
});
assert.equal(new Set(employmentPlans.map((plan) => [...plan.sourceIds].sort().join('|'))).size, 1,
  'Employment-versus-productivity paraphrases must select the same evidence sources');

const employmentOnlyEvidence = focusedEvidencePlan('¿Qué proporción de empleo total por habitante registró España entre 2019 y 2025?', reviewedOptions);
assert.notEqual(claimFocusFor('¿Qué proporción de empleo total por habitante registró España entre 2019 y 2025?')?.id, 'labour-productivity-and-growth', 'A standalone employment-rate question must not enter the productivity family');
assert.notEqual(employmentOnlyEvidence?.answerScope?.family, 'labour-productivity-and-growth');

for (const neighbour of [
  'La productividad de las empresas españolas aumentó más deprisa que sus salarios',
  'Las empresas con más productividad pagan salarios más altos',
  'La productividad total de los factores no avanza en España',
  'La productividad de la construcción depende de la inversión en maquinaria',
  'El mercado laboral español premia más la antigüedad que la productividad',
]) {
  assert.notEqual(claimFocusFor(neighbour)?.id, 'labour-productivity-and-growth', `Nearby claim crossed into the national labour-productivity family: ${neighbour}`);
}

const unsupportedYear = focusedEvidencePlan('La productividad por trabajador aumentó entre 2015 y 2025', reviewedOptions);
assert.equal(unsupportedYear.evidenceLevel, 'insufficient');
assert.deepEqual(unsupportedYear.evidenceIds, [], 'An unsupported start year must not borrow the closest period');
const ambiguousTime = focusedEvidencePlan('La productividad por trabajador cambia desde hace mucho tiempo', reviewedOptions);
assert.equal(ambiguousTime.evidenceLevel, 'insufficient', 'An unresolvable relative period must not silently become the reference window');
assert.deepEqual(ambiguousTime.evidenceIds, []);
const otherTerritory = focusedEvidencePlan('La productividad por hora de Francia creció entre 2019 y 2025', reviewedOptions);
assert.equal(otherTerritory.evidenceLevel, 'insufficient');
assert.deepEqual(otherTerritory.evidenceIds, [], 'Spanish observations must not answer a French claim');
const europeanComparison = focusedEvidencePlan('¿España tiene más productividad por hora que la Unión Europea?', reviewedOptions);
assert.equal(europeanComparison.evidenceLevel, 'insufficient');
assert.deepEqual(europeanComparison.evidenceIds, [], 'A Spain-only series must not answer a Spain/EU comparison');

const onlyOneSeries = focusedEvidencePlan(claims[0], {
  ...reviewedOptions,
  observations: reviewedRows.filter((item) => item.metricId === 'real_labour_productivity_per_person'),
});
assert.equal(onlyOneSeries.evidenceLevel, 'insufficient', 'One live productivity denominator must not be paired with reviewed fallback values');
assert.deepEqual(onlyOneSeries.evidenceIds, []);
const expiredSnapshot = focusedEvidencePlan(claims[0], {
  now: Date.parse('2028-01-01T00:00:00Z'),
  allowReviewedSnapshotFallback: true,
});
assert.equal(expiredSnapshot.evidenceLevel, 'insufficient', 'An expired snapshot must not provide current productivity claims');
assert.deepEqual(expiredSnapshot.evidenceIds, []);

const revisionMismatch = reviewedRows.map((item) => item.metricId === 'real_labour_productivity_per_hour'
  ? { ...item, source: { ...item.source, retrievedAt: '2026-11-15T12:00:00Z' } }
  : item);
assert.equal(labourProductivityAnalysisPlan(claims[0], { observations: revisionMismatch, now, allowReviewedSnapshot: true }), undefined,
  'Series fetched more than seven days apart must not be combined');

console.log('Labour productivity validation passed: paraphrases, both denominators, GDP/population context, period, geography, provisional flags, revision alignment and nearby-claim boundaries.');
