import assert from 'node:assert/strict';
import { build } from 'esbuild';

const compiled = await build({ entryPoints: ['functions/api/check.ts'], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const api = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].contents).toString('base64')}`);
const pending = [];
const emptyDatabase = {
  prepare() {
    return { bind() { return this; }, async all() { return { results: [] }; }, async run() { return {}; } };
  },
};
const brokenDatabase = {
  prepare() {
    return { bind() { return this; }, async all() { throw new Error('D1 read failed'); }, async run() { throw new Error('D1 write failed'); } };
  },
};
const context = (text, DB) => ({
  request: new Request('https://site.test/api/check?fresh=1', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, inputType: 'text' }),
  }),
  env: { DB },
  waitUntil: (promise) => pending.push(promise),
});
const check = async (text, DB = emptyDatabase) => {
  const response = await api.onRequestPost(context(text, DB));
  return { httpStatus: response.status, body: await response.json() };
};

const fullTime = await check('Trabajar a jornada completa no impide estar en riesgo de pobreza');
assert.equal(fullTime.httpStatus, 200);
assert.equal(fullTime.body.state, 'limited');
assert.equal(fullTime.body.result.evidenceSummary.mode, 'snapshot');
assert.equal(fullTime.body.result.arguments[0].verdict, 'supported');
assert.match(fullTime.body.result.reply, /9,5 %.*2025/);
assert.ok(fullTime.body.result.sources.some((source) => source.id === 'eurostat-in-work-poverty-full-time-2026-11'));

const comparison = await check('La tasa de riesgo de pobreza es más alta en jornada parcial que en jornada completa');
assert.equal(comparison.body.state, 'limited');
assert.equal(comparison.body.result.evidenceSummary.mode, 'snapshot');
assert.equal(comparison.body.result.arguments[0].verdict, 'supported');
assert.match(comparison.body.result.reply, /9,1 puntos porcentuales más en jornada parcial/);
assert.ok(comparison.body.result.sources.some((source) => source.id === 'eurostat-in-work-poverty-part-time-2026-11'));
assert.ok(comparison.body.result.sources.some((source) => source.id === 'eurostat-in-work-poverty-full-time-2026-11'));

const headcount = await check('¿Cada vez hay más personas ocupadas en riesgo de pobreza?');
assert.equal(headcount.body.state, 'insufficient');
assert.equal(headcount.body.result.arguments[0].verdict, 'insufficient');
assert.deepEqual(headcount.body.result.arguments[0].evidenceIds, []);
assert.match(headcount.body.result.reply, /mide un porcentaje, no el número de personas/);

const ageSpecific = await check('La tasa de riesgo de pobreza de trabajadores de 25 a 34 años a jornada parcial es alta');
assert.equal(ageSpecific.body.state, 'insufficient');
assert.equal(ageSpecific.body.result.arguments[0].evidenceIds.length, 0);
assert.doesNotMatch(ageSpecific.body.result.reply, /18,6 %/);

const unavailable = await check('Trabajar a jornada completa no impide estar en riesgo de pobreza', brokenDatabase);
assert.equal(unavailable.body.state, 'unavailable');
assert.match(unavailable.body.message, /no hemos podido consultar las series estadísticas/i);
assert.doesNotMatch(unavailable.body.result?.reply || '', /9,5 %/);

await Promise.all(pending);
console.log('Working-poverty Pages fallback passed: empty D1 uses scoped reviewed text data; failed D1 reads remain unavailable.');
