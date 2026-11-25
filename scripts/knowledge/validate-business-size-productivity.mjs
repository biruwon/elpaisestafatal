import assert from 'node:assert/strict';
import { BUSINESS_SIZE_PRODUCTIVITY_SNAPSHOT } from '../../src/lib/knowledge/business-size-productivity-snapshot.mjs';
import { claimFocusFor } from '../../src/lib/knowledge/claim-focus.mjs';
import { focusedEvidencePlan } from '../../src/lib/knowledge/focused-evidence-plan.mjs';
import { deterministicApiFallback } from '../../src/lib/knowledge/deterministic-api-fallback.mjs';
import { publicResolveResponse } from '../../src/lib/knowledge/public-response.mjs';
import { snapshotLifecycle } from '../../src/lib/knowledge/snapshot-lifecycle.mjs';
import { deterministicFallbackCompiler } from './fallback-compiler.mjs';
import { localPublicCheckResponse } from '../lib/local-public-check-response.mjs';
import { validateAnswerPlan } from './answer-plan-validation.mjs';

const now = Date.parse('2026-11-25T12:00:00Z');
const claims = [
  'El pequeño tamaño medio de las empresas frena la inversión y la productividad',
  'Las pymes tienen menos capacidad para adoptar tecnología y pagar buenos salarios',
  'El tamaño empresarial limita la innovación y los sueldos',
  'Las empresas españolas más pequeñas generan menos valor añadido por trabajador porque no pueden invertir en tecnología',
];
const plans = claims.map((claim) => {
  assert.equal(claimFocusFor(claim)?.id, 'business-size-productivity', claim);
  const propositions = deterministicFallbackCompiler(claim).explicitPropositions;
  const plan = focusedEvidencePlan(claim, { now, propositions });
  assert.equal(plan?.answerScope?.family, 'business-size-productivity', claim);
  assert.equal(plan.evidenceLevel, 'limited');
  assert.match(plan.shareableReply, /42,83 miles de euros.*71,95 miles de euros/s);
  assert.match(plan.shareableReply, /68\s*%/);
  assert.match(plan.shareableReply, /no demuestra que el tamaño cause la diferencia/i);
  assert.match(plan.shareableReply, /tampoco mide inversión, tecnología o salarios/i);
  const item = plan.blocks.find((block) => block.type === 'claim_breakdown').items[0];
  assert.equal(item.verdict, 'insufficient', 'A cross-sectional association must not be framed as proof of the causal claim');
  assert.deepEqual(item.evidenceIds, [], 'Contextual productivity figures must not be attributed as direct causal evidence');
  assert.deepEqual(item.sourceIds, []);
  assert.deepEqual(plan.answerScope.directMetrics, []);
  assert.ok(plan.evidenceSummary.families.some((family) => family.familyId === 'business-size-productivity' && family.dataKind === 'context'));
  assert.ok(validateAnswerPlan(plan).ok, JSON.stringify(validateAnswerPlan(plan).errors));
  assert.ok(publicResolveResponse({ status: 'complete', requestId: 'business-size-test', result: plan }));
  return plan;
});
assert.equal(new Set(plans.map((plan) => [...plan.sourceIds].sort().join('|'))).size, 1,
  'Paraphrases must keep the same reviewed sources.');
assert.deepEqual(new Set(plans[0].sourceIds), new Set(BUSINESS_SIZE_PRODUCTIVITY_SNAPSHOT.sources.map((source) => source.id)));
assert.equal(BUSINESS_SIZE_PRODUCTIVITY_SNAPSHOT.directClaimEvidence, false);
assert.equal(snapshotLifecycle(BUSINESS_SIZE_PRODUCTIVITY_SNAPSHOT, now).usable, true);
assert.match(plans[0].shareableReply, /0–9 personas empleadas/);
assert.doesNotMatch(plans[0].shareableReply, /persons employed|or more persons/i);

const causalInput = claims[3];
const causalRaw = deterministicApiFallback({ text: causalInput, inputType: 'text', now });
const causalResponse = localPublicCheckResponse({ ...causalRaw, requestId: 'business-size-causal-runtime' }, causalInput);
assert.equal(causalResponse.state, 'insufficient');
assert.equal(causalResponse.result.answerScope.family, 'business-size-productivity');
assert.equal(causalResponse.result.arguments[0].verdict, 'insufficient');
assert.deepEqual(causalResponse.result.arguments[0].sourceIds, [], 'Contextual figures must not be attached as direct proof for a causal claim.');
assert.ok(causalResponse.result.sources.some((source) => source.id === 'eurostat-business-size-apparent-productivity-spain-2024'));
assert.match(causalResponse.result.reply, /42,83 miles de euros/);
assert.match(causalResponse.result.reply, /no demuestra que el tamaño cause la diferencia/);

const firmWageClaims = [
  'Las grandes empresas tienen productividad suficiente para pagar más pero contienen salarios',
  'Las grandes empresas españolas frenan los sueldos pese a su mayor productividad',
  'Las empresas de mayor tamaño frenan los salarios pese a su productividad',
];
const firmWagePlans = firmWageClaims.map((claim) => {
  assert.equal(claimFocusFor(claim)?.id, 'firm-wage-capacity', claim);
  const plan = focusedEvidencePlan(claim, { now, propositions: deterministicFallbackCompiler(claim).explicitPropositions });
  assert.equal(plan?.answerScope?.family, 'firm-wage-capacity', claim);
  assert.equal(plan.evidenceLevel, 'limited');
  assert.match(plan.shareableReply, /42,83 mil euros.*71,95 mil euros/s);
  assert.match(plan.shareableReply, /no un salario ni productividad por hora/i);
  assert.match(plan.shareableReply, /ni demuestra que contengan los salarios/i);
  assert.deepEqual(plan.answerScope.directMetrics, []);
  assert.ok(plan.evidenceSummary.families.some((family) => family.familyId === 'firm-wage-capacity' && family.dataKind === 'context'));
  const item = plan.blocks.find((block) => block.type === 'claim_breakdown').items[0];
  assert.equal(item.verdict, 'insufficient');
  assert.deepEqual(item.evidenceIds, []);
  assert.deepEqual(item.sourceIds, []);
  assert.ok(validateAnswerPlan(plan).ok, JSON.stringify(validateAnswerPlan(plan).errors));
  const response = localPublicCheckResponse({ status: 'complete', requestId: 'firm-wage-context-test', result: plan }, claim);
  assert.equal(response.state, 'insufficient');
  assert.equal(response.result.arguments[0].verdict, 'insufficient');
  return plan;
});
assert.equal(new Set(firmWagePlans.map((plan) => [...plan.sourceIds].sort().join('|'))).size, 1,
  'Large-firm wage-restraint paraphrases must share the same scoped productivity context.');
assert.deepEqual(firmWagePlans[0].sourceIds, BUSINESS_SIZE_PRODUCTIVITY_SNAPSHOT.sources.map((source) => source.id));

const noSizeFirmWageClaim = 'Las empresas muy productivas pueden pagar sueldos altos';
const noSizeFirmWagePlan = focusedEvidencePlan(noSizeFirmWageClaim, {
  now,
  propositions: deterministicFallbackCompiler(noSizeFirmWageClaim).explicitPropositions,
});
assert.equal(claimFocusFor(noSizeFirmWageClaim)?.id, 'firm-wage-capacity');
assert.equal(noSizeFirmWagePlan.evidenceLevel, 'insufficient', 'The size-class snapshot must not answer a firm-wage claim with no size comparison.');
assert.deepEqual(noSizeFirmWagePlan.sourceIds, []);

const europeanSmallBusinessClaim = 'Las pequeñas empresas españolas tienen tan poco margen que no pueden pagar salarios europeos';
const europeanSmallBusinessPlan = focusedEvidencePlan(europeanSmallBusinessClaim, { now });
assert.equal(claimFocusFor(europeanSmallBusinessClaim)?.id, 'small-business-cost-pressure');
assert.equal(europeanSmallBusinessPlan.evidenceLevel, 'insufficient', 'Spanish size-class context must not answer a claim about European pay or operating margins.');
assert.deepEqual(europeanSmallBusinessPlan.sourceIds, []);

const explicitCurrentYear = focusedEvidencePlan('El tamaño de las pymes limita la productividad en 2024', { now });
assert.equal(explicitCurrentYear.evidenceLevel, 'limited', 'The reviewed reference year is supported.');
for (const claim of [
  'El tamaño de las pymes limitó la productividad en 2023',
  'El pequeño tamaño de las empresas frena la productividad en Madrid',
  'El pequeño tamaño de las empresas frena la productividad más que en Europa',
  'El pequeño tamaño de las pymes frenó la productividad entre 2021 y 2025',
  'El pequeño tamaño de las empresas frena la productividad en hostelería',
  'Las grandes empresas pueden contener los salarios frente a Europa debido a su productividad',
  'Las grandes empresas españolas frenan los sueldos pese a su productividad en 2023',
  'Las grandes empresas frenan los salarios pese a su productividad en Madrid',
  'Las grandes empresas de hostelería frenan los salarios pese a su productividad',
]) {
  const plan = focusedEvidencePlan(claim, { now });
  assert.equal(plan?.evidenceLevel, 'insufficient', `Out-of-scope claim must not borrow the 2024 national aggregate: ${claim}`);
  assert.deepEqual(plan?.sourceIds, [], claim);
}

assert.notEqual(claimFocusFor('Las grandes empresas tienen productividad suficiente para pagar más pero contienen salarios')?.id,
  'business-size-productivity', 'Firm pay restraint is a distinct claim and must not inherit the size-productivity context family.');
assert.notEqual(claimFocusFor('La productividad laboral agregada de España apenas ha mejorado'),
  claimFocusFor(claims[0]), 'National productivity trends must not route to company-size evidence.');

console.log('Business-size productivity validation passed: paraphrases share one scoped dataset, causality and unmeasured outcomes stay unresolved, and year, geography, sector and trend boundaries hold.');
