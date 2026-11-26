import assert from 'node:assert/strict';
import { RAIL_INVESTMENT_MAINTENANCE_SNAPSHOT } from '../../src/lib/knowledge/rail-investment-maintenance-snapshot.mjs';
import { claimFocusFor } from '../../src/lib/knowledge/claim-focus.mjs';
import { focusedEvidencePlan } from '../../src/lib/knowledge/focused-evidence-plan.mjs';
import { deterministicApiFallback } from '../../src/lib/knowledge/deterministic-api-fallback.mjs';
import { publicResolveResponse } from '../../src/lib/knowledge/public-response.mjs';
import { snapshotLifecycle } from '../../src/lib/knowledge/snapshot-lifecycle.mjs';
import { deterministicFallbackCompiler } from './fallback-compiler.mjs';
import { localPublicCheckResponse } from '../lib/local-public-check-response.mjs';
import { validateAnswerPlan } from './answer-plan-validation.mjs';

const now = Date.parse('2026-11-25T12:00:00Z');
const paraphrases = [
  'España ha invertido mucho en alta velocidad mientras descuidaba parte de la red de cercanías y convencional',
  'España destinó más inversión a la alta velocidad mientras atendía menos al mantenimiento de Cercanías y la red convencional',
];
const sameSources = [];

for (const claim of [...paraphrases, 'El mantenimiento ferroviario recibe menos atención política que inaugurar nuevas líneas']) {
  assert.equal(claimFocusFor(claim)?.id, 'rail-investment-maintenance', claim);
  const propositions = deterministicFallbackCompiler(claim).explicitPropositions;
  const plan = focusedEvidencePlan(claim, { now, propositions, allowReviewedSnapshotFallback: true });
  assert.equal(plan?.answerScope?.family, 'rail-investment-maintenance', claim);
  assert.equal(plan.evidenceLevel, 'limited', claim);
  assert.match(plan.shareableReply, /En España, en 2023.*1\.429,8 millones.*1\.974,5 millones/s, claim);
  assert.match(plan.shareableReply, /974,3 millones.*600,6.*373,7.*sin IVA/s, claim);
  assert.match(plan.shareableReply, /son partidas distintas/i, claim);
  assert.match(plan.shareableReply, /no indican si el mantenimiento era suficiente ni qu[eé] prioridad recibi[oó] cada red/i, claim);
  assert.ok(plan.shareableReply.trim().split(/\s+/).length <= 90, 'Rail investment context should stay concise while retaining the spending categories and scope.');
  assert.deepEqual(plan.sourceIds, ['adif-rail-investment-maintenance-2023']);
  assert.deepEqual(plan.answerScope.directMetrics, []);
  const item = plan.blocks.find((block) => block.type === 'claim_breakdown').items[0];
  assert.equal(item.verdict, 'insufficient', 'Contextual spending figures do not establish neglect or political priority.');
  assert.deepEqual(item.evidenceIds, [], 'Contextual figures must not be attributed as direct proof of neglect.');
  assert.deepEqual(item.sourceIds, []);
  assert.ok(plan.evidenceSummary.families.filter((family) => family.familyId === 'rail-investment-maintenance')
    .every((family) => family.dataKind === 'context'));
  assert.ok(validateAnswerPlan(plan).ok, JSON.stringify(validateAnswerPlan(plan).errors));
  assert.ok(publicResolveResponse({ status: 'complete', requestId: 'rail-maintenance-test', result: plan }));

  const raw = deterministicApiFallback({ text: claim, inputType: 'text', now });
  const response = localPublicCheckResponse({ ...raw, requestId: 'rail-maintenance-public-test' }, claim);
  assert.equal(response.state, 'insufficient');
  assert.equal(response.result.arguments[0].verdict, 'insufficient');
  assert.deepEqual(response.result.arguments[0].sourceIds, []);
  assert.match(response.result.reply, /1\.429,8 millones/);
  assert.ok(response.result.sources.some((source) => source.id === 'adif-rail-investment-maintenance-2023'));
  sameSources.push(plan.sourceIds.join('|'));
}

assert.equal(new Set(sameSources).size, 1, 'Related railway-investment paraphrases must use the same reviewed evidence.');
assert.deepEqual(RAIL_INVESTMENT_MAINTENANCE_SNAPSHOT.sources.map((source) => source.id), ['adif-rail-investment-maintenance-2023']);
assert.equal(RAIL_INVESTMENT_MAINTENANCE_SNAPSHOT.directClaimEvidence, false);
assert.equal(snapshotLifecycle(RAIL_INVESTMENT_MAINTENANCE_SNAPSHOT, now).usable, true);

for (const claim of [
  'En 2024, España invirtió más en alta velocidad mientras descuidaba la red convencional',
  'En Madrid, España invirtió más en alta velocidad que en mantener Cercanías',
  'Desde 2019, España ha aumentado la inversión en alta velocidad mientras descuidaba el mantenimiento de la red convencional',
]) {
  assert.equal(claimFocusFor(claim)?.id, 'rail-investment-maintenance', claim);
  assert.equal(RAIL_INVESTMENT_MAINTENANCE_SNAPSHOT.when(claim), false, `Out-of-scope request must not use the 2023 national snapshot: ${claim}`);
  const plan = focusedEvidencePlan(claim, { now, propositions: deterministicFallbackCompiler(claim).explicitPropositions });
  assert.equal(plan?.evidenceLevel, 'insufficient', claim);
  assert.deepEqual(plan?.sourceIds, [], claim);
  assert.doesNotMatch(plan?.shareableReply || '', /1\.429,8|1\.974,5|974,3|600,6|373,7/, claim);
}

const specificServiceClaim = 'Las nuevas líneas ferroviarias reciben más recursos que el mantenimiento de Rodalies';
assert.notEqual(claimFocusFor(specificServiceClaim)?.id, 'rail-investment-maintenance', 'The national snapshot must not answer for a specific service.');
const punctualityClaim = 'Los retrasos de Cercanías aumentan mientras crece la inversión en alta velocidad';
assert.equal(claimFocusFor(punctualityClaim)?.id, 'rail-punctuality', 'Service punctuality must remain distinct from investment and maintenance.');
assert.notEqual(claimFocusFor(punctualityClaim)?.id, 'rail-investment-maintenance');
assert.equal(claimFocusFor('La inversión en carreteras nuevas supera el mantenimiento de las carreteras'), undefined,
  'Road investment must not inherit rail evidence.');

console.log('Rail investment and maintenance validation passed: scoped 2023 context, unresolved political and adequacy claims, paraphrase consistency, and year, geography, service and punctuality boundaries.');
