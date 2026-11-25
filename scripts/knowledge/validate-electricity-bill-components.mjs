import assert from 'node:assert/strict';
import { ELECTRICITY_BILL_COMPONENTS_SNAPSHOT } from '../../src/lib/knowledge/electricity-bill-components-snapshot.mjs';
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
  'Los impuestos, peajes y cargos hacen que la factura final se mueva de forma distinta al precio mayorista',
  'Los cambios del precio mayorista no se reflejan igual en la factura de la luz debido a los peajes y demás cargos',
  'La factura eléctrica depende de costes de red y tributos además del mercado mayorista',
  'Entre 2024 y 2025, los impuestos, peajes y cargos hacen que la factura final se mueva de forma distinta al precio mayorista',
  'El precio mayorista cambia, pero la factura final se mueve de forma distinta debido a peajes y cargos',
];
const signatures = [];
const sourceIds = [
  'eurostat-household-electricity-components-spain-2024-2025',
  'eurostat-electricity-price-components-methodology-spain',
  'cnmc-electricity-bill-components-and-contracts',
];

for (const claim of claims) {
  assert.equal(claimFocusFor(claim)?.id, 'electricity-bill-components', claim);
  const propositions = deterministicFallbackCompiler(claim).explicitPropositions;
  const plan = focusedEvidencePlan(claim, { now, propositions, allowReviewedSnapshotFallback: true });
  assert.equal(plan?.answerScope?.family, 'electricity-bill-components', claim);
  assert.equal(plan.claimType, 'causal');
  assert.equal(plan.evidenceLevel, 'limited');
  assert.ok(plan.shareableReply.includes('0,2383 €/kWh en 2024 y 0,2638 €/kWh en 2025'));
  assert.ok(plan.shareableReply.includes('se mantuvo en 0,1108 €/kWh'));
  assert.ok(plan.shareableReply.includes('0,0701 a 0,0712'));
  assert.ok(plan.shareableReply.includes('0,0574 a 0,0818'));
  assert.ok(plan.shareableReply.includes('«energía y suministro» no es el precio mayorista spot'));
  assert.match(plan.shareableReply, /no prueban por sí solos que los cargos causaran una diferencia frente al mercado mayorista/i);
  assert.deepEqual(plan.sourceIds, sourceIds);
  assert.deepEqual(plan.answerScope.directMetrics, []);
  const item = plan.blocks.find((block) => block.type === 'claim_breakdown').items[0];
  assert.equal(item.verdict, 'insufficient', 'Retail component data do not directly compare with the wholesale spot price.');
  assert.deepEqual(item.evidenceIds, [], 'Contextual component data must not be cited as direct evidence of wholesale pass-through.');
  assert.deepEqual(item.sourceIds, []);
  const familyFacts = plan.evidenceSummary.families.filter((family) => family.familyId === 'electricity-bill-components');
  assert.equal(familyFacts.length, 2);
  assert.ok(familyFacts.every((family) => family.dataKind === 'context'));
  assert.ok(validateAnswerPlan(plan).ok, JSON.stringify(validateAnswerPlan(plan).errors));
  assert.ok(publicResolveResponse({ status: 'complete', requestId: 'electricity-bill-components-test', result: plan }));

  const raw = deterministicApiFallback({ text: claim, inputType: 'text', now });
  const response = localPublicCheckResponse({ ...raw, requestId: 'electricity-bill-components-public-test' }, claim);
  assert.equal(response.state, 'insufficient');
  assert.equal(response.result.arguments[0].verdict, 'insufficient');
  assert.deepEqual(response.result.arguments[0].sourceIds, []);
  assert.ok(sourceIds.every((id) => response.result.sources.some((source) => source.id === id)));
  signatures.push(JSON.stringify({ sourceIds: plan.sourceIds, reply: plan.shareableReply }));
}

assert.equal(new Set(signatures).size, 1, 'Bill-component paraphrases must share the same sources and public explanation.');
assert.equal(ELECTRICITY_BILL_COMPONENTS_SNAPSHOT.directClaimEvidence, false);
assert.equal(snapshotLifecycle(ELECTRICITY_BILL_COMPONENTS_SNAPSHOT, now).usable, true);

for (const claim of [
  'En 2023, los impuestos, peajes y cargos hacen que la factura final se mueva de forma distinta al precio mayorista',
  'En Madrid, los impuestos, peajes y cargos hacen que la factura final se mueva de forma distinta al precio mayorista',
  'En Francia, los impuestos, peajes y cargos hacen que la factura final se mueva de forma distinta al precio mayorista',
  'Mi factura eléctrica con PVPC cambia distinto al precio mayorista por los impuestos y cargos',
  'Desde 2020, los impuestos, peajes y cargos hacen que la factura final se mueva de forma distinta al precio mayorista',
]) {
  assert.equal(claimFocusFor(claim)?.id, 'electricity-bill-components', claim);
  assert.equal(ELECTRICITY_BILL_COMPONENTS_SNAPSHOT.when(claim), false, `The fixed Spanish 2024–2025 band must not be used out of scope: ${claim}`);
  const plan = focusedEvidencePlan(claim, { now, propositions: deterministicFallbackCompiler(claim).explicitPropositions });
  assert.equal(plan?.evidenceLevel, 'insufficient', claim);
  assert.deepEqual(plan?.sourceIds, [], claim);
  assert.doesNotMatch(plan?.shareableReply || '', /0,2383|0,2638|0,1108|0,0701|0,0712|0,0574|0,0818/, claim);
}

assert.equal(claimFocusFor('El precio mayorista no llega íntegro a la factura de la luz')?.id, 'electricity-price-transmission',
  'A wholesale-to-bill claim without component details must stay in the existing transmission family.');
assert.notEqual(claimFocusFor('Los impuestos, peajes y cargos hacen que la factura final se mueva de forma distinta al precio mayorista de gasolina')?.id,
  'electricity-bill-components', 'Electricity evidence must not route to fuel claims.');
const gasClaim = 'La factura del gas natural se mueve distinto al precio mayorista por impuestos, peajes y cargos';
assert.notEqual(claimFocusFor(gasClaim)?.id,
  'electricity-bill-components', 'Electricity evidence must not route to natural-gas claims.');
assert.equal(ELECTRICITY_BILL_COMPONENTS_SNAPSHOT.when(gasClaim), false, 'The electricity snapshot must reject natural-gas claims.');

console.log('Electricity bill component validation passed: 2024–2025 Eurostat totals, contract and network scope, causal boundary, paraphrases, and year, geography, customer, tariff and product neighbours.');
