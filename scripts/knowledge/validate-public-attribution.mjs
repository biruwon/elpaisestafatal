import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { focusedEvidencePlan } from '../../src/lib/knowledge/focused-evidence-plan.mjs';
import { sourcesForEvidenceIds } from '../../src/lib/knowledge/evidence-source-ids.mjs';
import { localPublicCheckResponse } from '../lib/local-public-check-response.mjs';

// Bundle the real Pages mapper so this test exercises the production path as
// well as the local preview, including its TypeScript imports.
const built = await build({ entryPoints: ['functions/lib/public-check-response.ts'], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const { checkFromPlan } = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].contents).toString('base64')}`);
const source = { id: 'health-source', title: 'Health survey', publisher: 'Ministry', url: 'https://example.test/health' };
const rows = [
  { id: 'wait-days-observation', metricId: 'primary_care_wait_days', value: 10.27, unit: 'days', period: '2026-O1', geography: 'España', dimensions: { provisional: true }, source },
  { id: 'wait-rate-observation', metricId: 'primary_care_wait_over_one_day_rate', value: 71.16, unit: '%', period: '2026-O1', geography: 'España', dimensions: { provisional: true }, source },
];
const claim = 'Hay que esperar demasiado para conseguir cita con el médico de familia';
const plan = focusedEvidencePlan(claim, { observations: rows });
const published = checkFromPlan(claim, plan, 'direct');
const local = localPublicCheckResponse({ status: 'complete', requestId: 'direct', result: plan }, claim);
assert.equal(published.state, 'limited');
assert.equal(local.state, published.state, 'Local and Pages evidence labels disagree');
assert.equal(published.result.arguments[0].verdict, 'insufficient', 'Relevant data must not become proof of the entire claim');
assert.deepEqual(published.result.arguments[0].sourceIds, ['health-source']);
for (const result of [published.result, local.result]) {
  assert.ok(result.criteria.length >= 2);
  assert.ok(result.criteria.every((criterion) => criterion.sourceIds.includes('health-source')), 'Observation IDs were not mapped to their document');
  assert.ok(result.criteria.every((criterion) => criterion.sourceIds.every((id) => result.sources.some((item) => item.id === id))), 'A criterion references a missing source');
}

const povertySource = { id: 'poverty-source', title: 'Poverty survey', publisher: 'Eurostat', url: 'https://example.test/poverty' };
const poverty = [{ id: 'poverty-observation', metricId: 'in_work_poverty_full_time_rate', value: 9.5, unit: '%', period: '2025', geography: 'España', source: povertySource }];
const povertyClaim = 'A jornada completa no se llega a fin de mes';
const contextual = focusedEvidencePlan(povertyClaim, { observations: poverty });
const contextualPublic = checkFromPlan(povertyClaim, contextual, 'context');
assert.equal(contextualPublic.state, 'insufficient');
assert.equal(localPublicCheckResponse({ status: 'complete', requestId: 'context', result: contextual }, povertyClaim).state, 'insufficient');
assert.deepEqual(contextualPublic.result.arguments[0].evidenceIds, [], 'Contextual poverty data cannot prove difficulty making ends meet');
assert.deepEqual(contextualPublic.result.criteria[0].sourceIds, ['poverty-source']);
assert.match(contextualPublic.result.reply, /Como contexto/);

const explanation = focusedEvidencePlan('¿Las pensiones públicas usan reparto o cuentas individuales?', { now: Date.parse('2026-10-30') });
const explanationPublic = checkFromPlan('¿Las pensiones públicas usan reparto o cuentas individuales?', explanation, 'definition');
assert.equal(explanationPublic.state, 'limited');
assert.deepEqual(explanationPublic.result.arguments[0].sourceIds, ['social-security-pay-as-you-go']);
const privateAccessClaim = 'Se contrata un seguro privado para evitar esperas de especialistas';
const privateAccessContext = focusedEvidencePlan(privateAccessClaim);
const privateAccessPages = checkFromPlan(privateAccessClaim, privateAccessContext, 'private-access-context');
const privateAccessLocal = localPublicCheckResponse({ status: 'partial', requestId: 'private-access-context', result: privateAccessContext }, privateAccessClaim);
assert.deepEqual(privateAccessPages.result.arguments[0].evidenceIds, [], 'The claim must not inherit evidence IDs from a contextual data finding');
assert.deepEqual(privateAccessPages.result.arguments[0].sourceIds, [], 'The source must not be attributed as direct evidence for the submitted claim');
for (const response of [privateAccessPages, privateAccessLocal]) {
  assert.equal(response.state, 'insufficient', 'Context about public waits cannot be a partial verdict on private-care motives');
  assert.ok(response.result.criteria.every((criterion) => criterion.label === 'Contexto'), 'Contextual data must be labelled as context in the public answer');
  assert.ok(response.result.sources.some((item) => item.id === 'sisle-sns-regional-consultations-dec-2025'));
  assert.match(response.result.reply, /Como contexto: El informe/);
  assert.match(response.result.reply, /16 d[ií]as en Melilla y 162 en Canarias/);
  assert.match(response.result.reply, /Falta una medición directa/);
}
assert.deepEqual(sourcesForEvidenceIds({ sourceLinks: [{ id: 'known' }], evidenceSummary: { families: [] } }, ['unrelated-observation']), [], 'Unknown observations must not acquire guessed sources');

const exactClaim = 'España supera los 49 millones de residentes.';
const sourceFreePlan = {
  schemaVersion: '1', evidenceLevel: 'supported', headline: exactClaim,
  summary: 'La formulación coincide con una afirmación publicada.', coverage: 'strong', claimType: 'descriptive',
  blocks: [
    { type: 'confirmed', propositionIds: [], evidenceIds: ['poblacion-residente-supera-49m'], points: [] },
    { type: 'conversation_reply', evidenceIds: ['poblacion-residente-supera-49m'], text: 'La formulación coincide con una afirmación publicada.' },
  ],
  evidenceIds: ['poblacion-residente-supera-49m'], sourceIds: ['poblacion-residente-espana-eurostat'],
  sourceLinks: [], knowledgeVersion: 'test',
};
const sourceFreePages = checkFromPlan(exactClaim, sourceFreePlan, 'source-free');
assert.equal(sourceFreePages.state, 'insufficient', 'A supported label without public findings and citations must fail closed');
assert.match(sourceFreePages.result.reply, /no hemos podido recuperar datos y fuentes verificables/i);
assert.deepEqual(sourceFreePages.result.sources, []);
assert.deepEqual(sourceFreePages.result.whatWeKnow, []);
const sourceFreeLimited = checkFromPlan(exactClaim, { ...sourceFreePlan, evidenceLevel: 'limited' }, 'source-free-limited');
assert.equal(sourceFreeLimited.state, 'insufficient', 'A limited response without any source must not be presented as an evidence finding');
assert.match(sourceFreeLimited.result.reply, /no hemos podido recuperar datos y fuentes verificables/i);

const exactReference = { kind: 'claim', slug: 'poblacion-residente-supera-49m', title: exactClaim, href: '/afirmaciones/poblacion-residente-supera-49m', confidence: 1 };
const localExact = localPublicCheckResponse({ status: 'complete', requestId: 'source-free-exact', result: sourceFreePlan, relatedClaims: [exactReference] }, exactClaim);
assert.equal(localExact.state, 'supported');
assert.equal(localExact.result.canonicalHref, '/comprobar/poblacion-residente-supera-49m', 'An exact published claim must open its sourced canonical page');

const localNeighbor = localPublicCheckResponse({ status: 'complete', requestId: 'source-free-neighbor', result: sourceFreePlan, relatedClaims: [exactReference] }, 'España supera los 49 millones de habitantes y ya no hay sitio.');
assert.equal(localNeighbor.state, 'insufficient', 'A stronger nearby claim must not inherit the canonical verdict');
assert.equal(localNeighbor.result.canonicalHref, undefined);
assert.match(localNeighbor.result.reply, /no la damos por confirmada/i);

const uncoveredPlan = {
  schemaVersion: '1', evidenceLevel: 'insufficient', headline: 'No hay una medida compatible localizada',
  summary: 'No se ha localizado una medición que responda a esta formulación.', coverage: 'insufficient', claimType: 'descriptive',
  limitation: 'Falta una medida directa con el periodo y la población solicitados.',
  blocks: [
    { type: 'cannot_conclude', evidenceIds: [], points: ['Sin una medición compatible no se puede confirmar ni descartar la afirmación.'] },
    { type: 'conversation_reply', evidenceIds: [], text: 'No se ha localizado una medición compatible; esto no demuestra que la afirmación sea falsa.' },
  ],
  evidenceIds: [], sourceIds: [], knowledgeVersion: 'test',
  evidenceSummary: { mode: 'none', families: [{ label: 'Medición solicitada', direction: 'neutral', status: 'missing', evidenceIds: [], finding: 'No se ha localizado una medida directa.', missingDimensions: ['periodo y población comparables'] }], missingDimensions: ['periodo y población comparables'] },
};
const uncoveredLocal = localPublicCheckResponse({ status: 'uncovered', requestId: 'uncovered-gap', result: uncoveredPlan }, '¿Esta afirmación está respaldada por los datos?');
assert.equal(uncoveredLocal.state, 'insufficient', 'A deliberate evidence gap should be explained, not reported as a service outage');
assert.match(uncoveredLocal.result.reply, /esto no demuestra que la afirmación sea falsa/i);
assert.equal(uncoveredLocal.result.evidenceSummary?.families[0]?.status, 'missing');
const uncoveredPages = checkFromPlan('¿Esta afirmación está respaldada por los datos?', uncoveredPlan, 'uncovered-gap');
assert.equal(uncoveredPages.state, 'insufficient');
assert.match(uncoveredPages.result.reply, /esto no demuestra que la afirmación sea falsa/i);
assert.equal(uncoveredPages.result.evidenceSummary?.families[0]?.status, 'missing');

const periodGapPlan = {
  schemaVersion: '1', evidenceLevel: 'insufficient', headline: 'Falta el periodo solicitado',
  summary: 'Hay observaciones de otros años, pero no del periodo solicitado.', coverage: 'insufficient', claimType: 'trend',
  limitation: 'La serie consultada no incluye 2010; no podemos calcular el cambio pedido.',
  blocks: [
    { type: 'data_finding', evidenceIds: ['rent-2015', 'rent-2025'], points: ['La serie registra 100 en 2015 y 120 en 2025.'] },
    { type: 'conversation_reply', evidenceIds: ['rent-2015', 'rent-2025'], text: 'La serie registra 100 en 2015 y 120 en 2025, pero falta 2010.' },
    { type: 'evidence_gap', missing: ['2010'], needed: ['Observación para 2010'], nextAction: 'Buscar una serie que incluya 2010.' },
  ],
  evidenceIds: ['rent-2015', 'rent-2025'], sourceIds: ['rent-source'],
  sourceLinks: [{ id: 'rent-source', title: 'Índice de alquiler', publisher: 'Eurostat', url: 'https://example.test/rent' }],
  knowledgeVersion: 'test',
};
const periodGapPages = checkFromPlan('¿Cómo ha cambiado el índice desde 2010?', periodGapPlan, 'period-gap');
const periodGapLocal = localPublicCheckResponse({ status: 'uncovered', requestId: 'period-gap', result: periodGapPlan }, '¿Cómo ha cambiado el índice desde 2010?');
for (const result of [periodGapPages, periodGapLocal]) {
  assert.equal(result.state, 'insufficient');
  assert.match(result.result.reply, /no incluye 2010/i, 'The missing requested period should remain visible');
  assert.doesNotMatch(result.result.reply, /100|120/, 'Unattributed values from other periods must stay hidden');
  assert.deepEqual(result.result.criteria, [], 'Nearby years without source attribution must not appear as findings');
  assert.deepEqual(result.result.sources, [], 'A source without an observation-to-document link must not be attributed');
}
console.log('Public attribution passed: Pages and local results preserve direct evidence, source documents and contextual gaps.');
