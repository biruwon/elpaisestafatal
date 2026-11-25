import assert from 'node:assert/strict';
import { claimFocusFor } from '../../src/lib/knowledge/claim-focus.mjs';
import { focusedEvidencePlan } from '../../src/lib/knowledge/focused-evidence-plan.mjs';
import { deterministicApiFallback } from '../../src/lib/knowledge/deterministic-api-fallback.mjs';
import { validateAnswerPlan } from './answer-plan-validation.mjs';
import { publicResolveResponse } from '../../src/lib/knowledge/public-response.mjs';

const now = Date.parse('2026-11-24T12:00:00Z');
const answer = (claim) => focusedEvidencePlan(claim, { now, allowReviewedSnapshotFallback: true });
const realWageParaphrases = [
  'Los salarios españoles llevan años perdiendo poder adquisitivo frente al coste de la vida',
  'Los sueldos en España pierden capacidad de compra frente a los precios',
  'La inflación se come la nómina de los trabajadores españoles',
];
let realWageSources;
for (const claim of realWageParaphrases) {
  const plan = answer(claim);
  assert.equal(plan?.answerScope?.family, 'real-wages', claim);
  assert.equal(plan.evidenceLevel, 'limited');
  assert.deepEqual(plan.sourceIds, ['eurostat-annual-hourly-wages-spain-2026-11-23', 'eurostat-annual-hicp-spain-2026-11-23']);
  assert.match(plan.shareableReply, /entre 2020 y 2025/);
  assert.match(plan.shareableReply, /índice salarial bajó aproximadamente un 4,6 %/);
  assert.match(plan.limitation, /no es neto, mediano ni individual/);
  realWageSources ||= plan.sourceIds;
  assert.deepEqual(plan.sourceIds, realWageSources, 'Real-wage paraphrases should use the same aligned series');
  assert.ok(validateAnswerPlan(plan).ok, JSON.stringify(validateAnswerPlan(plan).errors));
  assert.ok(publicResolveResponse({ status: 'complete', requestId: `test-${claim.length}`, result: plan }));
}

const collectiveParaphrases = [
  'Los convenios colectivos actualizan los salarios más lentamente que los precios',
  'Las subidas salariales pactadas no han seguido el ritmo de la inflación',
  'La negociación colectiva ha subido los sueldos más despacio que el coste de la vida',
  'Las subidas salariales pactadas en convenios han quedado por debajo de los precios',
  'Los salarios pactados en convenio no recuperan el poder adquisitivo perdido',
  'Los sueldos pactados en convenios no recuperan el poder de compra frente al IPC',
];
let collectiveSources;
for (const claim of collectiveParaphrases) {
  assert.equal(claimFocusFor(claim)?.id, 'collective-agreement-wages', claim);
  const plan = answer(claim);
  assert.equal(plan?.answerScope?.family, 'collective-agreement-wages', claim);
  assert.equal(plan.evidenceLevel, 'limited');
  assert.deepEqual(new Set(plan.sourceIds), new Set(['mites-collective-agreements-2026-10', 'eurostat-annual-hicp-spain-2026-11-23']));
  assert.match(plan.shareableReply, /21,9 % entre 2020 y 2025/);
  assert.match(plan.shareableReply, /15,7 % entre 2021 y 2025/);
  assert.match(plan.shareableReply, /5 % por debajo de los precios/);
  assert.match(plan.shareableReply, /3\.162 convenios/);
  assert.match(plan.shareableReply, /9\.578\.780 trabajadores/);
  assert.doesNotMatch(plan.shareableReply, /2022: pactada|2023: pactada/);
  const agreementData = plan.evidenceSummary.families.find((family) => family.familyId === 'collective_agreement_wage_settlement_rate').data.join(' ');
  assert.match(agreementData, /2022: 3 %/);
  assert.match(agreementData, /2023: 3,6 %/);
  assert.match(plan.shareableReply, /2025 es provisional/);
  assert.match(plan.limitation, /no mide cuánto cobró cada trabajador/);
  assert.equal(plan.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'supported');
  collectiveSources ||= plan.sourceIds;
  assert.deepEqual(new Set(plan.sourceIds), new Set(collectiveSources), 'Collective-agreement paraphrases should use the same official series');
  assert.ok(validateAnswerPlan(plan).ok, JSON.stringify(validateAnswerPlan(plan).errors));
  assert.ok(publicResolveResponse({ status: 'complete', requestId: `test-${claim.length}`, result: plan }));
}

const claim2023 = 'Los convenios colectivos actualizan los salarios más lentamente que los precios en 2023';
const plan2023 = answer(claim2023);
assert.equal(plan2023.blocks[0].items[0].verdict, 'contradicted', 'For 2023, pact increases were slightly higher than annual HICP inflation');
assert.match(plan2023.shareableReply, /entre 2022 y 2023/);

const claim2025 = 'Los salarios pactados subieron más que los precios en 2025';
const plan2025 = answer(claim2025);
assert.equal(plan2025.blocks[0].items[0].verdict, 'supported');
assert.match(plan2025.shareableReply, /dato de 2025 es provisional/);

for (const claim of [
  'Los convenios colectivos actualizan los salarios más lentamente que los precios en Madrid',
  'Los convenios colectivos actualizan el salario mínimo más lentamente que los precios',
  'Los convenios colectivos actualizan salarios más lentamente que los precios en 2026',
]) {
  const plan = answer(claim);
  assert.equal(plan.evidenceLevel, 'insufficient', `Incompatible scope or unavailable year was treated as a national result: ${claim}`);
  assert.deepEqual(plan.sourceIds, []);
  assert.doesNotMatch(plan.shareableReply, /15,7 %|21,9 %|5 % por debajo/);
}

for (const claim of [
  'Los salarios pactados en convenio de las mujeres no recuperan poder adquisitivo frente a la inflación',
  'Los salarios pactados en convenio no recuperan poder adquisitivo en Madrid',
]) {
  const plan = answer(claim);
  assert.equal(claimFocusFor(claim)?.id, 'collective-agreement-wages', claim);
  assert.equal(plan.evidenceLevel, 'insufficient');
  assert.deepEqual(plan.sourceIds, [], 'National aggregate agreements must not answer subgroup or city claims');
  assert.doesNotMatch(plan.shareableReply, /15,7 %|21,9 %|5 % por debajo/);
}
assert.notEqual(claimFocusFor('El número de convenios colectivos registrados crece menos que la inflación')?.id, 'collective-agreement-wages', 'Agreement counts must not inherit wage-settlement evidence');

const personalWageClaim = 'Los salarios de las mujeres pierden poder adquisitivo frente a la inflación';
const personalWagePlan = answer(personalWageClaim);
assert.equal(personalWagePlan.evidenceLevel, 'insufficient');
assert.doesNotMatch(personalWagePlan.shareableReply, /4,6 %|21,9 %/);

const causalClaim = 'Los convenios colectivos causan inflación al subir los salarios';
const causalPlan = answer(causalClaim);
assert.equal(claimFocusFor(causalClaim)?.id, 'wage-price-margin-pass-through');
assert.equal(causalPlan.evidenceLevel, 'insufficient');
assert.doesNotMatch(causalPlan.shareableReply, /15,7 %|21,9 %|4,6 %/);

const fallback = deterministicApiFallback({ text: collectiveParaphrases[0], inputType: 'text', now });
assert.equal(fallback.status, 'partial');
assert.equal(fallback.result.answerScope.family, 'collective-agreement-wages');
console.log('Text wage families passed: official aligned series, paraphrase routing, annual reversals, provisional data, and adjacent-scope boundaries.');
