import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { focusedEvidencePlan } from '../../src/lib/knowledge/focused-evidence-plan.mjs';
import { deterministicApiFallback } from '../../src/lib/knowledge/deterministic-api-fallback.mjs';
import { sourcesForEvidenceIds } from '../../src/lib/knowledge/evidence-source-ids.mjs';
import { WORKING_POVERTY_SNAPSHOT } from '../../src/lib/knowledge/working-poverty-snapshot.mjs';
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
assert.equal(local.result.arguments[0].verdict, published.result.arguments[0].verdict, 'The local preview must retain the per-claim verdict');
assert.deepEqual(local.result.arguments[0].sourceIds, published.result.arguments[0].sourceIds, 'The local preview must attribute the same source to the same claim');
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
const contextualLocal = localPublicCheckResponse({ status: 'complete', requestId: 'context', result: contextual }, povertyClaim);
assert.deepEqual(contextualLocal.result.arguments[0].evidenceIds, [], 'Contextual observations must not become direct evidence in the local preview');
assert.deepEqual(contextualLocal.result.arguments[0].sourceIds, [], 'The local preview must not attribute a context-only source to the submitted claim');
assert.deepEqual(contextualPublic.result.criteria[0].sourceIds, ['poverty-source']);
assert.match(contextualPublic.result.reply, /Como contexto/);

const textPovertyRows = WORKING_POVERTY_SNAPSHOT.observations;
const directPovertyClaim = 'Trabajar a jornada completa no impide estar en riesgo de pobreza';
const directPovertyPlan = focusedEvidencePlan(directPovertyClaim, { observations: textPovertyRows, now: Date.parse('2026-11-17') });
const directPovertyPublic = checkFromPlan(directPovertyClaim, directPovertyPlan, 'text-full-time-poverty');
assert.equal(directPovertyPublic.state, 'limited');
assert.equal(directPovertyPublic.result.arguments[0].verdict, 'supported');
assert.ok(directPovertyPublic.result.arguments[0].sourceIds.includes('eurostat-in-work-poverty-full-time-2026-11'));
assert.match(directPovertyPublic.result.reply, /9,5 %/);

const directPartTimeClaim = 'Trabajar a jornada parcial no evita estar en riesgo de pobreza';
const directPartTimePlan = focusedEvidencePlan(directPartTimeClaim, { observations: textPovertyRows, now: Date.parse('2026-11-17') });
const directPartTimePublic = checkFromPlan(directPartTimeClaim, directPartTimePlan, 'text-part-time-poverty');
assert.equal(directPartTimePublic.state, 'limited');
assert.equal(directPartTimePublic.result.arguments[0].verdict, 'supported');
assert.ok(directPartTimePublic.result.arguments[0].sourceIds.includes('eurostat-in-work-poverty-part-time-2026-11'));
assert.doesNotMatch(directPartTimePublic.result.reply, /9,5 %/);
assert.match(directPartTimePublic.result.reply, /18,6 %/);

const worktimeComparisonClaim = 'La tasa de riesgo de pobreza es más alta en la jornada parcial que en la jornada completa';
const worktimeComparisonPlan = focusedEvidencePlan(worktimeComparisonClaim, { observations: textPovertyRows, now: Date.parse('2026-11-17') });
const worktimeComparisonPublic = checkFromPlan(worktimeComparisonClaim, worktimeComparisonPlan, 'text-worktime-comparison');
assert.equal(worktimeComparisonPublic.state, 'limited');
assert.equal(worktimeComparisonPublic.result.arguments[0].verdict, 'supported');
assert.ok(worktimeComparisonPublic.result.arguments[0].sourceIds.includes('eurostat-in-work-poverty-full-time-2026-11'));
assert.ok(worktimeComparisonPublic.result.arguments[0].sourceIds.includes('eurostat-in-work-poverty-part-time-2026-11'));
assert.match(worktimeComparisonPublic.result.reply, /9,1 puntos porcentuales más en jornada parcial/);

const countPovertyClaim = '¿Cada vez hay más personas ocupadas en riesgo de pobreza?';
const countPovertyPlan = focusedEvidencePlan(countPovertyClaim, { observations: textPovertyRows, now: Date.parse('2026-11-17') });
const countPovertyPublic = checkFromPlan(countPovertyClaim, countPovertyPlan, 'text-working-poverty-count');
assert.equal(countPovertyPublic.state, 'insufficient');
assert.equal(countPovertyPublic.result.arguments[0].verdict, 'insufficient');
assert.deepEqual(countPovertyPublic.result.arguments[0].evidenceIds, [], 'A rate series cannot be attributed as direct evidence for an absolute headcount claim');
assert.match(countPovertyPublic.result.reply, /mide un porcentaje, no el número de personas/);
assert.ok(countPovertyPublic.result.criteria.some((item) => item.sourceIds.includes('eurostat-in-work-poverty-2026-11')),
  'The public response should retain the rate series as clearly labelled context');

const compoundParaphrases = [
  'El contribuyente medio paga más impuestos pero percibe peores servicios que hace unos años',
  'La ciudadanía paga cada vez más impuestos, pero siente que los servicios públicos han empeorado',
];
for (const [index, text] of compoundParaphrases.entries()) {
  const fallback = deterministicApiFallback({ text, inputType: 'text' });
  const internalItems = fallback.result.blocks.find((block) => block.type === 'claim_breakdown')?.items || [];
  const localResult = localPublicCheckResponse({ ...fallback, requestId: `compound-${index}` }, text);
  assert.equal(localResult.state, 'insufficient', 'An unevidenced compound claim must remain insufficient');
  assert.deepEqual(localResult.result.arguments?.map((argument) => argument.claim), internalItems.map((item) => item.text), 'The public local response must preserve the complete claim and every parsed part');
  assert.equal(localResult.result.arguments?.length, 3, 'Both paraphrases should expose the whole statement and its two explicit parts');
  assert.ok(localResult.result.arguments.every((argument) => argument.verdict === 'insufficient' && argument.evidenceLevel === 'none'), 'No clause may acquire evidence from an unrelated part');
  assert.ok(localResult.result.arguments.every((argument) => argument.evidenceIds.length === 0 && argument.sourceIds.length === 0), 'An unsupported compound claim must not display invented evidence or sources');
  assert.ok(localResult.result.nextQuestion, 'The next concrete question should survive the public mapping');
}

const neighboringSingle = 'El contribuyente medio paga más impuestos';
const neighboringFallback = deterministicApiFallback({ text: neighboringSingle, inputType: 'text' });
const neighboringLocal = localPublicCheckResponse({ ...neighboringFallback, requestId: 'neighboring-single' }, neighboringSingle);
assert.deepEqual(neighboringLocal.result.arguments?.map((argument) => argument.claim), [neighboringSingle], 'A single tax claim must not inherit the separate services clause');

const employmentSource = { id: 'employment-source', title: 'Empleo en España', publisher: 'Estadística oficial', url: 'https://example.test/employment' };
const compoundEvidencePlan = ({ includeCause = true, causeVerdict = 'insufficient', attachCauseEvidence = false } = {}) => {
  const items = [
    { text: 'El empleo aumentó en 2025', type: 'trend', explicit: true, evidenceIds: ['employment-observation'], sourceIds: ['employment-source'], verdict: 'supported', evidenceLevel: 'strong', finding: 'La tasa de empleo subió en 2025.' },
  ];
  if (includeCause) items.push({
    text: 'Ese aumento redujo el paro juvenil', type: 'causal', explicit: true,
    evidenceIds: attachCauseEvidence ? ['unattributed-causal-observation'] : [],
    sourceIds: attachCauseEvidence ? ['unlisted-causal-source'] : [],
    verdict: causeVerdict, evidenceLevel: causeVerdict === 'supported' ? 'strong' : 'none',
    finding: 'El aumento causó el descenso del paro juvenil.',
  });
  const propositionIds = includeCause ? ['employment-trend', 'employment-cause'] : ['employment-trend'];
  return {
    schemaVersion: '1', evidenceLevel: 'supported', headline: 'La relación causal está demostrada',
    summary: 'La evidencia confirma todas las partes de esta frase.', coverage: 'complete', claimType: includeCause ? 'mixed' : 'trend',
    blocks: [
      { type: 'claim_breakdown', propositionIds, items },
      { type: 'data_finding', propositionIds: ['employment-trend'], evidenceIds: ['employment-observation'], points: ['La tasa de empleo subió en 2025.'] },
      { type: 'conversation_reply', text: 'La subida del empleo demuestra que el paro juvenil bajó por esa causa.' },
    ],
    evidenceIds: ['employment-observation', ...(includeCause && attachCauseEvidence ? ['unattributed-causal-observation'] : [])],
    sourceIds: ['employment-source'], sourceLinks: [employmentSource],
    shareableReply: 'La subida del empleo causó el descenso del paro juvenil.', shareableSourceIds: ['employment-source'],
    evidenceSummary: { mode: 'dynamic', families: [{ label: 'Tasa de empleo', direction: 'supports', evidenceIds: ['employment-observation'], sourceIds: ['employment-source'], finding: 'La tasa de empleo subió en 2025.' }] },
    knowledgeVersion: 'test',
  };
};
const compoundTextParaphrases = [
  'El empleo aumentó en 2025 y redujo el paro juvenil',
  'Crece el empleo y por eso baja el desempleo de los jóvenes',
];
for (const [index, text] of compoundTextParaphrases.entries()) {
  const compoundPlan = compoundEvidencePlan(index === 0
    ? { causeVerdict: 'supported', attachCauseEvidence: true }
    : { causeVerdict: 'insufficient' });
  const pages = checkFromPlan(text, compoundPlan, `partially-evidenced-${index}`);
  const preview = localPublicCheckResponse({ status: 'complete', requestId: `partially-evidenced-${index}`, result: compoundPlan }, text);
  for (const response of [pages, preview]) {
    assert.equal(response.state, 'limited', 'A cited fact must not make an unsupported compound claim look supported');
    assert.equal(response.result.arguments?.[0]?.verdict, 'supported');
    assert.equal(response.result.arguments?.[1]?.verdict, 'insufficient', 'A claim part with no traceable source must lose its positive verdict');
    assert.deepEqual(response.result.arguments?.[1]?.sourceIds, []);
    assert.equal(response.result.arguments?.[1]?.finding, 'No se ha vinculado evidencia directa con una fuente consultable a esta parte.');
    assert.match(response.result.keyFact, /no permite confirmar todas las partes/i);
    assert.match(response.result.reply, /no permite confirmar toda la afirmaci[oó]n/i);
    assert.equal(response.result.shareableReply, undefined, 'A shareable sentence must not repeat the unsupported whole-claim verdict');
  }
}
const neighboringEmployment = 'El empleo aumentó en 2025';
const neighboringEmploymentPlan = compoundEvidencePlan({ includeCause: false });
const neighboringEmploymentPages = checkFromPlan(neighboringEmployment, neighboringEmploymentPlan, 'single-employment-fact');
const neighboringEmploymentLocal = localPublicCheckResponse({ status: 'complete', requestId: 'single-employment-fact', result: neighboringEmploymentPlan }, neighboringEmployment);
for (const response of [neighboringEmploymentPages, neighboringEmploymentLocal]) {
  assert.equal(response.state, 'supported', 'A directly evidenced single-part claim must retain its supported status');
  assert.equal(response.result.arguments?.length, 1, 'The nearby single-part claim must not inherit the causal clause');
  assert.equal(response.result.shareableReply, neighboringEmploymentPlan.shareableReply);
}

const unassessedCompoundPlan = {
  schemaVersion: '1', evidenceLevel: 'insufficient', headline: 'Faltan medidas compatibles',
  summary: 'No se ha localizado evidencia compatible para estas partes.', coverage: 'insufficient', claimType: 'mixed',
  blocks: [
    { type: 'claim_breakdown', propositionIds: [], items: [
      { text: 'El gasto público crece', type: 'trend', explicit: true, coveredBy: 'spending-claim' },
      { text: 'Los servicios públicos empeoran', type: 'trend', explicit: true, coveredBy: 'service-claim' },
    ] },
    { type: 'evidence_gap', missing: ['serie por periodo'], needed: ['medidas comparables'], nextAction: 'Concretar los indicadores y el periodo.' },
  ],
  evidenceIds: [], sourceIds: [], sourceLinks: [], knowledgeVersion: 'test',
};
const unassessedText = 'El gasto público crece mientras los servicios públicos empeoran';
const unassessedPages = checkFromPlan(unassessedText, unassessedCompoundPlan, 'unassessed-compound');
const unassessedLocal = localPublicCheckResponse({ status: 'uncovered', requestId: 'unassessed-compound', result: unassessedCompoundPlan }, unassessedText);
for (const response of [unassessedPages, unassessedLocal]) {
  assert.equal(response.state, 'insufficient');
  assert.equal(response.result.arguments?.length || 0, 0, 'A parsed clause list without findings or evidence links must not look like per-part fact-checks');
}

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

const causalGapClaims = [
  'Las redes sociales provocan más acoso entre jóvenes',
  'El uso de las redes sociales causa un aumento del acoso entre jóvenes',
];
const causalGapAnswers = causalGapClaims.map((text, index) => {
  const fallback = deterministicApiFallback({ text, inputType: 'text' });
  const pages = checkFromPlan(text, fallback.result, `causal-gap-${index}`);
  const local = localPublicCheckResponse({ status: fallback.status, requestId: `causal-gap-${index}`, result: fallback.result }, text);
  assert.equal(pages.state, 'insufficient');
  assert.equal(local.state, pages.state);
  assert.equal(local.result.reply, pages.result.reply, 'Local and Pages answers must compose the same evidence gap');
  assert.match(pages.result.reply, /no demuestra que la afirmación sea falsa/i);
  assert.match(pages.result.reply, /medidas comparables.*evidencia del mecanismo o diseño que permita atribuir causalidad/i);
  assert.match(pages.result.reply, /Siguiente paso: Separar los hechos relacionados/);
  assert.deepEqual(pages.result.sources, [], 'An evidence gap must not invent a source');
  assert.ok(pages.result.reply.trim().split(/\s+/).length < 100, 'The unsupported reply should stay digestible');
  return pages.result.reply;
});
assert.equal(causalGapAnswers[0], causalGapAnswers[1], 'Causal paraphrases should receive the same evidence requirements and explanation');

const adjacentDescriptiveClaim = 'Hay más casos de acoso entre jóvenes que antes';
const adjacentFallback = deterministicApiFallback({ text: adjacentDescriptiveClaim, inputType: 'text' });
const adjacentAnswer = checkFromPlan(adjacentDescriptiveClaim, adjacentFallback.result, 'descriptive-gap');
assert.equal(adjacentAnswer.state, 'insufficient');
assert.match(adjacentAnswer.result.reply, /población, territorio y periodo definidos/);
assert.doesNotMatch(adjacentAnswer.result.reply, /atribuir causalidad|mecanismo o diseño causal/i, 'A descriptive comparison must not inherit the causal evidence gap');

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
