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

const graduateOutcome = await check('Un título universitario ya no garantiza encontrar un empleo cualificado');
assert.equal(graduateOutcome.httpStatus, 200);
assert.equal(graduateOutcome.body.state, 'limited');
assert.equal(graduateOutcome.body.result.evidenceSummary.mode, 'snapshot');
assert.match(graduateOutcome.body.result.reply, /83,2 %.*2025/);
assert.match(graduateOutcome.body.result.reply, /34 %.*2025/);
assert.match(graduateOutcome.body.result.reply, /definición de este dato difiere/);
assert.match(graduateOutcome.body.result.reply, /no garantizan el resultado de cada persona/);
assert.doesNotMatch(graduateOutcome.body.result.reply, /no compara dos periodos/);
assert.ok(graduateOutcome.body.result.sources.some((source) => source.id === 'eurostat-tertiary-employment'));
assert.ok(graduateOutcome.body.result.sources.some((source) => source.id === 'eurostat-tertiary-overqualification'));
assert.ok(graduateOutcome.body.result.reply.trim().split(/\s+/).length <= 160);

const youthOverqualification = await check('Los jóvenes con estudios superiores están sobrecualificados en sus empleos');
assert.equal(youthOverqualification.body.state, 'limited');
assert.match(youthOverqualification.body.result.reply, /34,4 %.*20 a 34 años/);
assert.match(youthOverqualification.body.result.reply, /denominador son solo las personas ocupadas de ese grupo/);
assert.match(youthOverqualification.body.result.reply, /no equivale a recién graduados/);
assert.ok(youthOverqualification.body.result.sources.some((source) => source.id === 'eurostat-tertiary-overqualification'));
assert.doesNotMatch(youthOverqualification.body.result.reply, /34 % de las personas ocupadas de 20 a 64 años/);

const educationNeighbour = await check('La FP tiene más salidas laborales que la universidad');
assert.equal(educationNeighbour.body.state, 'insufficient');
assert.doesNotMatch(JSON.stringify(educationNeighbour.body.result?.sources || []), /eurostat-tertiary-/);
assert.match(educationNeighbour.body.result.reply, /no compara por s[ií] sola los grupos que menciona/);
assert.doesNotMatch(educationNeighbour.body.result.reply, /83,2 %|34 %/);

const fpTiming = await check('La Formación Profesional permite entrar antes al mercado laboral que muchas carreras');
assert.equal(fpTiming.body.state, 'insufficient');
assert.match(fpTiming.body.result.reply, /no indica cu[aá]nto tardan las personas tituladas en encontrar su primer trabajo/);
assert.doesNotMatch(fpTiming.body.result.reply, /83,2 %|34,4 %/);
assert.deepEqual(fpTiming.body.result.sources, []);

const degreeRequirementTrend = await check('Cada vez se exige un máster para trabajos que antes pedían solo una carrera');
assert.equal(degreeRequirementTrend.body.state, 'insufficient');
assert.match(degreeRequirementTrend.body.result.reply, /no muestran qu[eé] titulaci[oó]n piden las ofertas/);
assert.match(degreeRequirementTrend.body.result.evidenceSummary.missingDimensions.join(' '), /anuncios de las mismas ocupaciones en periodos comparables/);
assert.deepEqual(degreeRequirementTrend.body.result.sources, []);

const unavailable = await check('Trabajar a jornada completa no impide estar en riesgo de pobreza', brokenDatabase);
assert.equal(unavailable.body.state, 'unavailable');
assert.match(unavailable.body.message, /no hemos podido consultar las series estadísticas/i);
assert.doesNotMatch(unavailable.body.result?.reply || '', /9,5 %/);

const educationUnavailable = await check('Un título universitario ya no garantiza encontrar un empleo cualificado', brokenDatabase);
assert.equal(educationUnavailable.body.state, 'unavailable');
assert.doesNotMatch(educationUnavailable.body.result?.reply || '', /83,2 %|34 %/);

await Promise.all(pending);
console.log('Reviewed text snapshot Pages fallback passed: empty D1 uses scoped education and working-poverty data; failed D1 reads remain unavailable.');
