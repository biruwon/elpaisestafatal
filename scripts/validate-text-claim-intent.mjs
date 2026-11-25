import assert from 'node:assert/strict';
import { isMissingTextClaim } from '../src/lib/knowledge/text-claim-intent.mjs';

for (const text of [
  'hola',
  'Hola, ¿qué tal?',
  'Buenos días',
  'Muchas gracias',
  'Hi',
  '¿Qué opinas?',
  'Quiero comprobar algo',
  '¿Puedes verificar esto?',
  '¿Paro?',
]) assert.equal(isMissingTextClaim(text), true, `Expected a request for a concrete claim: ${text}`);

for (const text of [
  'El paro sube',
  '¿Hay paro?',
  'La tasa de paro está al 12 %',
  'España está fatal',
  'PP miente',
  'Los españoles primero',
  '¿Qué significa el paro?',
  'La tasa de paro bajó de forma interanual',
  'Valor 1.2',
]) assert.equal(isMissingTextClaim(text), false, `A compact claim must continue to the evidence pipeline: ${text}`);

assert.equal(isMissingTextClaim(''), false, 'The input-contract layer remains responsible for empty submissions');
assert.equal(isMissingTextClaim('42'), true, 'A lone quantity without a subject should ask for the claim context');
console.log('Text claim intent passed: conversation-only inputs request a claim and compact assertions remain analyzable.');
