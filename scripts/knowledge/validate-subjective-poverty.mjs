import assert from 'node:assert/strict';
import { claimFocusFor, focusedMetricIdsFor } from '../../src/lib/knowledge/claim-focus.mjs';
import { deterministicApiFallback } from '../../src/lib/knowledge/deterministic-api-fallback.mjs';
import { focusedEvidencePlan } from '../../src/lib/knowledge/focused-evidence-plan.mjs';
import { measurementMeaningPlan } from '../../src/lib/knowledge/measurement-meaning.mjs';
import { SUBJECTIVE_POVERTY_SNAPSHOT } from '../../src/lib/knowledge/subjective-poverty-snapshot.mjs';
import { localPublicCheckResponse } from '../lib/local-public-check-response.mjs';

const now = Date.parse('2026-11-23T15:12:58Z');
const answer = (text, inputType = 'text', at = now) => deterministicApiFallback({ text, inputType, now: at });
const sources = ['eurostat-subjective-poverty-2026-11', 'definition-eurostat-subjective-poverty', 'definition-eurostat-ability-to-make-ends-meet'];

assert.equal(SUBJECTIVE_POVERTY_SNAPSHOT.observations[0].value, 20.6);
assert.equal(SUBJECTIVE_POVERTY_SNAPSHOT.observations[0].dimensions.lev_diff_values.DIF
  + SUBJECTIVE_POVERTY_SNAPSHOT.observations[0].dimensions.lev_diff_values.GRT, 20.6);
assert.equal(SUBJECTIVE_POVERTY_SNAPSHOT.observations.find((item) => item.metricId === 'subjective_poverty_difficulty_rate')?.value, 12.1);
assert.equal(SUBJECTIVE_POVERTY_SNAPSHOT.observations.find((item) => item.metricId === 'subjective_poverty_great_difficulty_rate')?.value, 8.5);

const primary = answer('En España, en 2025, más del 20 % de la población declaró pobreza subjetiva.');
assert.equal(claimFocusFor('En España, en 2025, más del 20 % de la población declaró pobreza subjetiva.')?.id, 'subjective-financial-strain');
assert.equal(primary.status, 'partial');
assert.equal(primary.result.answerScope.family, 'subjective-financial-strain');
assert.equal(primary.result.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'supported');
assert.ok(primary.result.shareableReply.includes('20,6 % de la población'));
assert.ok(primary.result.shareableReply.includes('12,1 % respondió'));
assert.ok(primary.result.shareableReply.includes('8,5 % «con gran dificultad»'));
assert.match(primary.result.shareableReply, /no es un recuento de hogares/i);
assert.ok(sources.every((sourceId) => primary.result.sourceIds.includes(sourceId)));
assert.doesNotMatch(primary.result.shareableReply, /20,6 % de los hogares/);
const definition = measurementMeaningPlan('¿Qué mide la pobreza subjetiva?');
assert.ok(definition?.shareableReply.includes('ingresos netos totales del hogar'));
assert.ok(definition?.shareableReply.includes('con gran dificultad'));
assert.ok(sources.slice(1).every((sourceId) => definition?.sourceIds.includes(sourceId)));
assert.deepEqual([...focusedMetricIdsFor('En 2025, muchas personas vivían en hogares con dificultad para llegar a fin de mes.')], ['subjective_poverty_difficulty_rate']);
assert.deepEqual([...focusedMetricIdsFor('En 2025, muchas personas vivían en hogares con dificultad o gran dificultad para llegar a fin de mes.')], [
  'subjective_poverty_rate', 'subjective_poverty_difficulty_rate', 'subjective_poverty_great_difficulty_rate',
]);
assert.deepEqual([...focusedMetricIdsFor('¿Qué porcentaje de la población declaró que llegaba a fin de mes con dificultad?')], ['subjective_poverty_difficulty_rate']);
assert.deepEqual([...focusedMetricIdsFor('¿Qué porcentaje de la población declaró que llegaba a fin de mes con gran dificultad?')], ['subjective_poverty_great_difficulty_rate']);

const difficultyOnly = answer('En España, en 2025, más del 10 % de la población respondió con dificultad para cubrir gastos habituales.');
assert.equal(difficultyOnly.result.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'supported');
assert.ok(difficultyOnly.result.shareableReply.includes('12,1 %'));
assert.doesNotMatch(difficultyOnly.result.shareableReply, /20,6 %|8,5 %/);
const greatDifficultyOnly = answer('En España, en 2025, más del 7 % de la población respondió con gran dificultad para cubrir gastos habituales.');
assert.equal(greatDifficultyOnly.result.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'supported');
assert.ok(greatDifficultyOnly.result.shareableReply.includes('8,5 %'));
assert.doesNotMatch(greatDifficultyOnly.result.shareableReply, /20,6 %|12,1 %/);

const componentSource = (id, level) => ({
  id,
  title: `Respuesta ${level} de EU-SILC · Eurostat`,
  publisher: 'Eurostat',
  url: `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ilc_mdes09?geo=ES&unit=PC&hhcomp=TOTAL&rskpovth=TOTAL&lev_diff=${level}`,
  retrievedAt: '2026-11-23T15:12:58Z',
});
const directObservation = (level, period, value, source) => ({
  id: `${level}-${period}`,
  kind: 'observation',
  metricId: level === 'DIF' ? 'subjective_poverty_difficulty_rate' : 'subjective_poverty_great_difficulty_rate',
  value,
  period,
  unit: 'Percentage',
  geography: 'Spain',
  population: 'Personas residentes en hogares privados, clasificadas según la respuesta del hogar',
  denominator: 'Población residente en hogares privados',
  dimensions: { freq: 'A', unit: 'PC', geo: 'ES', time: period, hhcomp: 'TOTAL', rskpovth: 'TOTAL', lev_diff: level },
  dimensionLabels: { geo: 'Spain', time: period },
  source,
});
const difficultySource = componentSource('live-difficulty', 'DIF');
const greatDifficultySource = componentSource('live-great-difficulty', 'GRT');
const liveComponents = [
  directObservation('DIF', '2024', 12.8, difficultySource), directObservation('GRT', '2024', 9.1, greatDifficultySource),
  directObservation('DIF', '2025', 12.1, difficultySource), directObservation('GRT', '2025', 8.5, greatDifficultySource),
];
const livePlan = focusedEvidencePlan('En España, en 2025, más del 20 % de la población declaró pobreza subjetiva.', { observations: liveComponents, now });
assert.equal(livePlan?.answerScope.family, 'subjective-financial-strain');
assert.equal(livePlan?.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'supported');
assert.ok(livePlan?.shareableReply.includes('20,6 %'));
assert.ok(livePlan?.evidenceIds.includes('DIF-2025'));
assert.ok(livePlan?.evidenceIds.includes('GRT-2025'));
assert.ok(livePlan?.sourceIds.includes('live-difficulty'));
assert.ok(livePlan?.sourceIds.includes('live-great-difficulty'));
assert.ok(!livePlan?.evidenceIds.includes('DIF-2024'), 'The requested year should cite its component rows only.');
const liveDifficultyOnly = focusedEvidencePlan('En España, en 2025, más del 10 % de la población respondió con dificultad para cubrir gastos habituales.', { observations: liveComponents, now });
assert.equal(liveDifficultyOnly?.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'supported');
assert.ok(liveDifficultyOnly?.shareableReply.includes('12,1 %'));
assert.doesNotMatch(liveDifficultyOnly?.shareableReply || '', /20,6 %|8,5 %/);
assert.ok(liveDifficultyOnly?.evidenceIds.includes('DIF-2025'));
assert.ok(!liveDifficultyOnly?.evidenceIds.includes('GRT-2025'));
const liveGreatDifficultyOnly = focusedEvidencePlan('En España, en 2025, más del 7 % de la población respondió con gran dificultad para cubrir gastos habituales.', { observations: liveComponents, now });
assert.equal(liveGreatDifficultyOnly?.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'supported');
assert.ok(liveGreatDifficultyOnly?.shareableReply.includes('8,5 %'));
assert.doesNotMatch(liveGreatDifficultyOnly?.shareableReply || '', /20,6 %|12,1 %/);
assert.ok(liveGreatDifficultyOnly?.evidenceIds.includes('GRT-2025'));
assert.ok(!liveGreatDifficultyOnly?.evidenceIds.includes('DIF-2025'));
const mismatchedRefresh = focusedEvidencePlan('En España, en 2025, más del 20 % de la población declaró pobreza subjetiva.', {
  observations: [liveComponents[2], { ...liveComponents[3], source: { ...greatDifficultySource, retrievedAt: '2026-11-20T15:12:58Z' } }], now,
});
assert.ok(!mismatchedRefresh?.evidenceIds.includes('DIF-2025'), 'Component categories from different refreshes must not be added together.');

for (const [paraphrase, expectedValue] of [
  ['¿Qué porcentaje de personas vivía en España en 2025 en hogares que podían cubrir los gastos habituales con dificultad?', '12,1 %'],
  ['En 2025, más del 20 % de la población vivía en hogares con dificultad o gran dificultad para llegar a fin de mes.', '20,6 %'],
]) {
  const result = answer(paraphrase);
  assert.equal(result.result?.answerScope?.family, 'subjective-financial-strain', paraphrase);
  assert.ok(result.result?.sourceIds.includes('eurostat-subjective-poverty-2026-11'), paraphrase);
  assert.ok(result.result?.shareableReply.includes(expectedValue), paraphrase);
}

for (const incompatible of [
  'En 2024, más del 20 % de la población declaró pobreza subjetiva.',
  'En Madrid, en 2025, más del 20 % de la población declaró pobreza subjetiva.',
  'En 2025, más del 20 % de las mujeres declaró pobreza subjetiva.',
  'En 2025, más del 20 % de los jóvenes declaró pobreza subjetiva.',
  'En 2025, más del 20 % de los hogares monoparentales declaró dificultad para llegar a fin de mes.',
]) {
  const result = answer(incompatible);
  assert.equal(result.result?.answerScope?.family, 'subjective-financial-strain', incompatible);
  assert.ok(!result.result?.sourceIds.includes('eurostat-subjective-poverty-2026-11'), incompatible);
  assert.ok(!result.result?.shareableReply.includes('20,6 %'), incompatible);
}

assert.equal(claimFocusFor('Cada vez cuesta más llegar a fin de mes en España')?.id, undefined,
  'A current subjective-poverty cross-section must not answer a trend in living costs.');

const householdDenominator = answer('En España, en 2025, más del 20 % de los hogares declaró dificultad para llegar a fin de mes.');
assert.equal(householdDenominator.status, 'partial', 'The population-level context has sources, but does not measure the requested household share.');
assert.equal(householdDenominator.result?.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'insufficient');
assert.equal(localPublicCheckResponse({ ...householdDenominator, requestId: 'subjective-household-denominator' }, 'En España, en 2025, más del 20 % de los hogares declaró dificultad para llegar a fin de mes.').state, 'insufficient');
assert.ok(householdDenominator.result?.sourceIds.includes('eurostat-subjective-poverty-2026-11'));
assert.deepEqual(householdDenominator.result?.blocks.find((block) => block.type === 'claim_breakdown').items[0].evidenceIds, []);
assert.ok(householdDenominator.result?.shareableReply.includes('20,6 % de la población'));
assert.ok(!householdDenominator.result?.shareableReply.includes('20,6 % de los hogares'));
assert.ok(householdDenominator.result?.shareableReply.includes('porcentaje de hogares'));

const personalClaim = answer('A mí me cuesta llegar a fin de mes.');
assert.equal(personalClaim.status, 'partial', 'Definition sources may explain the measure but cannot answer an individual claim.');
assert.equal(localPublicCheckResponse({ ...personalClaim, requestId: 'subjective-personal' }, 'A mí me cuesta llegar a fin de mes.').state, 'insufficient');
assert.ok(!personalClaim.result?.sourceIds.includes('eurostat-subjective-poverty-2026-11'));
assert.ok(!personalClaim.result?.shareableReply.includes('20,6 %'));

const fullTimeClaim = 'En España se puede trabajar a jornada completa y seguir sin llegar a fin de mes';
assert.equal(claimFocusFor(fullTimeClaim)?.id, 'working-poverty');
assert.ok(focusedMetricIdsFor(fullTimeClaim).has('subjective_poverty_rate'), 'A work claim may show the household measure as separate context.');
const fullTime = answer(fullTimeClaim);
assert.equal(fullTime.status, 'partial', 'Sourced work-poverty context is available but does not measure subjective household hardship by work schedule.');
assert.equal(localPublicCheckResponse({ ...fullTime, requestId: 'subjective-full-time' }, fullTimeClaim).state, 'insufficient');
assert.equal(fullTime.result.answerScope.family, 'working-poverty');
assert.equal(fullTime.result.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'insufficient');
assert.ok(fullTime.result.shareableReply.includes('9,5 % de las personas ocupadas a jornada completa'));
assert.ok(fullTime.result.shareableReply.includes('20,6 % de la población'));
assert.ok(fullTime.result.shareableReply.includes('cruce de la dificultad declarada con la situación laboral y la jornada'));
assert.ok(fullTime.result.sourceIds.includes('eurostat-subjective-poverty-2026-11'));
assert.ok(!fullTime.result.blocks.find((block) => block.type === 'claim_breakdown').items[0].evidenceIds.includes('eurostat-subjective-poverty-spain-2025'));

const objectivePoverty = answer('En 2025, el porcentaje de trabajadores a jornada completa en riesgo de pobreza superó el 10 %.');
assert.equal(objectivePoverty.result?.answerScope?.family, 'working-poverty');
assert.equal(objectivePoverty.result?.blocks.find((block) => block.type === 'claim_breakdown').items[0].verdict, 'contradicted');
assert.ok(objectivePoverty.result.sourceIds.includes('eurostat-in-work-poverty-full-time-2026-11'));
assert.ok(!objectivePoverty.result.sourceIds.includes('eurostat-subjective-poverty-2026-11'));

const nonText = answer('En España, en 2025, más del 20 % de la población declaró pobreza subjetiva.', 'image');
assert.ok(!nonText.result?.sourceIds.includes('eurostat-subjective-poverty-2026-11'));
const beforeSnapshotReview = answer('En España, en 2025, más del 20 % de la población declaró pobreza subjetiva.', 'text', Date.parse('2026-11-17T12:00:00Z'));
assert.ok(!beforeSnapshotReview.result?.sourceIds.includes('eurostat-subjective-poverty-2026-11'));
assert.ok(!beforeSnapshotReview.result?.shareableReply.includes('20,6 %'));
const expired = answer('En 2025, más del 20 % de la población vivía en hogares con dificultad para llegar a fin de mes.', 'text', Date.parse('2027-05-01'));
assert.ok(!expired.result?.sourceIds.includes('eurostat-subjective-poverty-2026-11'));

console.log('Subjective financial strain validation passed: source scope, paraphrases, threshold grading, neighboring metrics, and snapshot lifecycle.');
