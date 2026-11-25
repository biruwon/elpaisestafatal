import assert from 'node:assert/strict';
import { canSkipLocalCompilerForFocusedMeasurement, claimFocusFor } from '../../src/lib/knowledge/claim-focus.mjs';
import { deterministicApiFallback } from '../../src/lib/knowledge/deterministic-api-fallback.mjs';
import { validateAnswerPlan } from './answer-plan-validation.mjs';
import { publicResolveResponse } from '../../src/lib/knowledge/public-response.mjs';

const now = Date.parse('2026-11-23T20:00:00Z');
const check = (text) => deterministicApiFallback({ text, inputType: 'text', now });
const supportedParaphrases = [
  'La entrada de una hipoteca es una barrera mayor que la cuota mensual para acceder a una vivienda',
  'La falta de ahorro previo pesa más que poder pagar la mensualidad al comprar una casa con hipoteca',
  'Reunir el pago inicial es un obstáculo más frecuente que afrontar las cuotas de la hipoteca',
];
let sourceIds;
for (const claim of supportedParaphrases) {
  assert.equal(claimFocusFor(claim)?.id, 'mortgage-entry-vs-payment', claim);
  assert.equal(canSkipLocalCompilerForFocusedMeasurement(claim, {
    propositions: [{ text: claim, explicit: true }], clarificationRequired: true, claimType: 'comparative',
  }), true, `A single reviewed comparison should not need model compilation: ${claim}`);
  const result = check(claim);
  const plan = result.result;
  assert.equal(result.status, 'partial');
  assert.equal(plan?.evidenceLevel, 'limited');
  assert.equal(plan?.answerScope?.family, 'mortgage-entry-vs-payment');
  assert.deepEqual(plan?.sourceIds, ['bde-financial-capacity-housing-2026-spring']);
  assert.match(plan?.shareableReply || '', /alrededor del 86 %/);
  assert.match(plan?.shareableReply || '', /frente al 35 %/i);
  assert.match(plan?.shareableReply || '', /un año de consumo/i);
  assert.match(plan?.shareableReply || '', /2016–2023/);
  assert.match(plan?.shareableReply || '', /pueden solaparse/);
  assert.match(plan?.shareableReply || '', /82 % de la población/);
  assert.match(plan?.shareableReply || '', /no una tasa de hipotecas denegadas/i);
  assert.match(plan?.limitation || '', /no describe 2026/i);
  assert.equal(plan?.blocks.find((block) => block.type === 'claim_breakdown')?.items[0]?.verdict, 'supported');
  assert.ok(validateAnswerPlan(plan).ok, JSON.stringify(validateAnswerPlan(plan).errors));
  assert.ok(publicResolveResponse({ status: 'complete', requestId: `mortgage-${claim.length}`, result: plan }));
  sourceIds ||= plan.sourceIds;
  assert.deepEqual(plan.sourceIds, sourceIds, 'Equivalent entry/payment paraphrases should use the same source');
}

const reversed = check('La cuota mensual de la hipoteca es una barrera mayor que reunir la entrada para comprar vivienda');
assert.equal(canSkipLocalCompilerForFocusedMeasurement('La cuota mensual de la hipoteca es una barrera mayor que reunir la entrada para comprar vivienda', {
  propositions: [{ text: 'La cuota mensual de la hipoteca es una barrera mayor que reunir la entrada para comprar vivienda', explicit: true }],
  clarificationRequired: true,
  claimType: 'comparative',
}), true, 'Reversing the comparison must keep the same deterministic evidence path');
assert.equal(reversed.result?.blocks.find((block) => block.type === 'claim_breakdown')?.items[0]?.verdict, 'contradicted');
assert.deepEqual(reversed.result?.sourceIds, sourceIds);

const negatedEntryComparison = check('La entrada no es una barrera mayor que la cuota mensual para acceder a una vivienda');
assert.equal(negatedEntryComparison.result?.blocks.find((block) => block.type === 'claim_breakdown')?.items[0]?.verdict, 'contradicted');
assert.deepEqual(negatedEntryComparison.result?.sourceIds, sourceIds);

const question = '¿Qué supone una barrera mayor para comprar una vivienda con hipoteca: reunir la entrada o pagar la cuota?';
const questionAnswer = check(question);
assert.equal(claimFocusFor(question)?.id, 'mortgage-entry-vs-payment');
assert.equal(questionAnswer.result?.evidenceLevel, 'limited');
assert.match(questionAnswer.result?.shareableReply || '', /la limitación patrimonial fue más frecuente que la de renta/i);
assert.deepEqual(questionAnswer.result?.sourceIds, sourceIds);

const neutral = 'La entrada y la cuota hipotecaria son dos barreras para comprar una vivienda';
assert.notEqual(claimFocusFor(neutral)?.id, 'mortgage-entry-vs-payment', 'A claim that names both costs without comparing them must not inherit a direction');
assert.equal(canSkipLocalCompilerForFocusedMeasurement(neutral, {
  propositions: [{ text: neutral, explicit: true }], clarificationRequired: true, claimType: 'comparative',
}), false, 'A nearby mortgage claim without the reviewed comparison must not use the shortcut');
const compoundComparison = `${supportedParaphrases[0]} y los tipos de interés también han aumentado`;
assert.equal(canSkipLocalCompilerForFocusedMeasurement(compoundComparison, {
  propositions: [{ text: compoundComparison, explicit: true }], clarificationRequired: true, claimType: 'comparative',
}), false, 'Compound comparison claims must retain proposition compilation');

for (const claim of [
  'En Madrid la entrada de una hipoteca es una barrera mayor que la cuota mensual para comprar una vivienda',
  'Entre los jóvenes, la entrada hipotecaria pesa más que la cuota mensual',
  'En 2026 la entrada de una hipoteca es una barrera mayor que la cuota mensual',
  'Actualmente la entrada de una hipoteca es una barrera mayor que la cuota mensual',
]) {
  const result = check(claim);
  assert.equal(result.result?.answerScope?.family, 'mortgage-entry-vs-payment', claim);
  assert.equal(result.result?.evidenceLevel, 'insufficient', claim);
  assert.deepEqual(result.result?.sourceIds, [], claim);
  assert.doesNotMatch(result.result?.shareableReply || '', /86 %|35 %/);
}

const causalNeighbour = check('La entrada de la hipoteca causa más dificultades que la cuota mensual para comprar una vivienda');
assert.notEqual(causalNeighbour.result?.answerScope?.family, 'mortgage-entry-vs-payment');
assert.doesNotMatch(causalNeighbour.result?.shareableReply || '', /86 %|35 %/);

console.log('Mortgage entry comparison passed: paraphrase reuse, reversed direction, model scope and dated-source limits.');
