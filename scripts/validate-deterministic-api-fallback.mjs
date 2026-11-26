import { deterministicApiFallback } from '../src/lib/knowledge/deterministic-api-fallback.mjs';
import { deterministicFallbackCompiler, FALLBACK_CLAIM_MAX_CHARS } from './knowledge/fallback-compiler.mjs';

const text = deterministicApiFallback({ text: 'España está destruida', inputType: 'text' });
if (text.status !== 'uncovered' || !text.result?.blocks?.some((block) => block.type === 'claim_breakdown')) throw new Error('text fallback did not preserve a structured clarification');
if (!/hecho concreto|periodo|lugar|decisión del Gobierno|instituciones/i.test(text.result?.clarificationQuestion || '')) throw new Error('text fallback did not offer a concrete next question');
const textPlan = text.result;
if (textPlan?.['sourceLinks'] || textPlan?.evidenceIds?.length) throw new Error('text fallback invented evidence or sources');

for (const claim of [
  'El contribuyente medio paga más impuestos pero percibe peores servicios que hace unos años',
]) {
  const result = deterministicApiFallback({ text: claim, inputType: 'text' });
  const compiled = deterministicFallbackCompiler(claim);
  const breakdown = result.result?.blocks?.find((block) => block.type === 'claim_breakdown');
  const items = breakdown?.items || [];
  if (result.status !== 'partial' || result.result?.evidenceLevel !== 'limited'
    || result.result?.answerScope?.family !== 'tax-service-perception') {
    throw new Error(`The focused tax and service context was not labelled limited: ${claim}`);
  }
  if (items.length !== compiled.explicitPropositions.length + 1 || items[0]?.text !== claim || items[0]?.type !== compiled.claimType
    || compiled.explicitPropositions.some((proposition, index) => items[index + 1]?.text !== proposition.text)) {
    throw new Error(`The compound fallback did not preserve the full claim and each explicit clause: ${claim}`);
  }
  if (items.some((item) => item.verdict !== 'insufficient' || item.evidenceLevel !== 'none' || item.evidenceIds?.length || item.sourceIds?.length)) {
    throw new Error(`The compound fallback attached support to an unevidenced clause: ${claim}`);
  }
  if (!result.result?.blocks?.some((block) => block.type === 'cannot_conclude' && block.evidenceIds?.length === 0)
    || !result.result?.blocks?.some((block) => block.type === 'data_finding' && block.dataKind === 'context')) {
    throw new Error(`The compound fallback lost contextual evidence or the explicit limit on its conclusion: ${claim}`);
  }
  if (!result.result?.blocks?.some((block) => block.type === 'evidence_gap' && block.missing?.length)) {
    throw new Error(`The compound fallback hid its missing evidence dimensions: ${claim}`);
  }
}

const longUncoveredText = `Una afirmación pendiente de revisión ${'sin evidencia compatible '.repeat(20)}`;
const longUncovered = deterministicApiFallback({ text: longUncoveredText, inputType: 'text' });
if (longUncoveredText.length <= FALLBACK_CLAIM_MAX_CHARS || longUncovered.result?.evidenceLevel !== 'insufficient'
  || !longUncovered.result?.summary?.includes(`primeros ${FALLBACK_CLAIM_MAX_CHARS} caracteres`)
  || !longUncovered.guidance?.questions?.[0]?.includes(String(FALLBACK_CLAIM_MAX_CHARS))) {
  throw new Error('The text fallback silently implied that it analyzed input beyond its bounded compiler limit.');
}
const longDefinition = deterministicApiFallback({ text: `¿Qué mide la tasa de empleo? ${'Contexto adicional que el fallback no interpreta. '.repeat(8)}` });
if (longDefinition.status !== 'uncovered' || longDefinition.result?.evidenceIds?.length || longDefinition.result?.sourceIds?.length
  || !longDefinition.result?.summary?.includes(`primeros ${FALLBACK_CLAIM_MAX_CHARS} caracteres`)) {
  throw new Error('A measurement definition matched in a parsed prefix was presented as an answer to a longer, unanalyzed submission.');
}
const forecast = deterministicFallbackCompiler('Los robots eliminarán todos los empleos del mundo en diez años');
const presentTense = deterministicFallbackCompiler('Los robots eliminan puestos de trabajo en la industria');
if (forecast.claimType !== 'predictive' || !forecast.evidenceNeeds.includes('fecha')
  || presentTense.claimType === 'predictive') {
  throw new Error('A future-tense forecast was confused with a present employment claim or lacks a time-horizon requirement.');
}
const forecastResult = deterministicApiFallback({ text: 'Los robots eliminarán todos los empleos del mundo en diez años', inputType: 'text' });
if (forecastResult.result?.claimType !== 'predictive'
  || !forecastResult.result?.blocks?.some((block) => block.type === 'evidence_gap' && block.missing.some((item) => /plazo definido/.test(item)))
  || forecastResult.result?.evidenceIds?.length || forecastResult.result?.sourceIds?.length
  || !/horizonte temporal/i.test(forecastResult.result?.clarificationQuestion || '')) {
  throw new Error('The unsupported forecast did not request a horizon and projection evidence.');
}
const sinceYear = deterministicApiFallback({ text: '¿Cómo ha cambiado el índice de alquiler desde 2010?', inputType: 'text' });
const sinceYearParaphrase = deterministicApiFallback({ text: '¿Qué evolución ha tenido el índice de alquiler desde el año 2010?', inputType: 'text' });
const sinceYearGap = sinceYear.result?.blocks?.find((block) => block.type === 'evidence_gap');
const sinceYearParaphraseGap = sinceYearParaphrase.result?.blocks?.find((block) => block.type === 'evidence_gap');
if (sinceYearGap?.needed?.[0] !== 'serie del mismo indicador que incluya 2010 y el periodo final, con territorio y unidad compatibles'
  || sinceYearParaphraseGap?.needed?.[0] !== sinceYearGap.needed[0]
  || sinceYearGap?.nextAction !== sinceYearParaphraseGap?.nextAction) {
  throw new Error('A historical since-year paraphrase did not preserve the same requested period and evidence dimensions.');
}
const singleYear = deterministicApiFallback({ text: '¿Cuál fue el índice de alquiler en 2010?', inputType: 'text' });
if (singleYear.result?.blocks?.find((block) => block.type === 'evidence_gap')?.needed?.[0] === sinceYearGap?.needed?.[0]) {
  throw new Error('A single-year value question inherited the missing baseline requirement of a historical trend.');
}
const legalGap = deterministicApiFallback({ text: 'Es ilegal que una empresa no declare este pago' });
const normativeGap = deterministicApiFallback({ text: 'El ayuntamiento debería priorizar los parques frente a las carreteras' });
if (legalGap.result?.claimType !== 'legal' || !/jurisdicci[oó]n/.test(legalGap.result?.clarificationQuestion || '')
  || !legalGap.result?.blocks?.some((block) => block.type === 'evidence_gap' && block.missing.some((item) => /norma vigente/.test(item)))) {
  throw new Error('An unsupported legal claim did not ask for jurisdiction and the applicable rule.');
}
if (normativeGap.result?.claimType !== 'normative' || !/criterio expl[ií]cito/.test(normativeGap.result?.clarificationQuestion || '')
  || !normativeGap.result?.blocks?.some((block) => block.type === 'evidence_gap' && block.missing.some((item) => /criterio de valoraci[oó]n/.test(item)))) {
  throw new Error('An unsupported value judgment did not ask for a criterion before factual evaluation.');
}

const independenceClaim = deterministicApiFallback({ text: 'Tener un trabajo a jornada completa ya no garantiza poder independizarse' });
const unrelatedEmploymentContext = independenceClaim.result?.blocks?.some((block) => block.type === 'data_finding'
  && /temporalidad|paro/.test(block.points?.join(' ') || '')
  && !(block.evidenceIds || []).some((id) => ['cje-emancipation-2025', 'cje-emancipation-methodology', 'youth-family-housing-ine'].includes(id)));
if (independenceClaim.status !== 'partial' || independenceClaim.result?.id !== 'measurement-work-housing-independence'
  || independenceClaim.result?.evidenceLevel !== 'limited'
  || !independenceClaim.result?.sourceIds?.includes('cje-emancipation-2025')
  || !independenceClaim.result?.sourceIds?.includes('youth-family-housing-ine')
  || unrelatedEmploymentContext) {
  throw new Error('A full-time-work housing claim lost its limited CJE/INE context or inherited unrelated employment metrics.');
}
const fullTimePoverty = deterministicApiFallback({ text: 'Trabajar a jornada completa no impide estar en riesgo de pobreza', inputType: 'text', now: Date.parse('2026-11-17') });
if (fullTimePoverty.status !== 'partial' || fullTimePoverty.result?.evidenceLevel !== 'limited'
  || fullTimePoverty.result?.evidenceSummary?.mode !== 'snapshot'
  || fullTimePoverty.result?.headline !== 'El empleo a jornada completa no elimina el riesgo de pobreza'
  || !fullTimePoverty.result?.shareableReply?.includes('9,5 %') || !fullTimePoverty.result?.shareableReply?.includes('en 2025')
  || !fullTimePoverty.result?.shareableReply?.includes('personas ocupadas a jornada completa')
  || !fullTimePoverty.result?.sourceIds?.includes('eurostat-in-work-poverty-full-time-2026-11')
  || fullTimePoverty.result?.blocks?.find((block) => block.type === 'claim_breakdown')?.items?.[0]?.verdict !== 'supported') {
  throw new Error('A direct full-time working-poverty claim did not use the reviewed Eurostat snapshot with its population and year.');
}
for (const paraphrase of [
  'Tener un empleo a tiempo completo no te protege del riesgo de pobreza',
  'Un trabajo de jornada completa no evita que haya personas en riesgo de pobreza',
]) {
  const answer = deterministicApiFallback({ text: paraphrase, inputType: 'text', now: Date.parse('2026-11-17') });
  if (answer.status !== 'partial' || answer.result?.answerScope?.family !== 'working-poverty'
    || !answer.result?.shareableReply?.includes('9,5 %') || !answer.result?.shareableReply?.includes('en 2025')
    || JSON.stringify(answer.result?.sourceIds || []) !== JSON.stringify(fullTimePoverty.result.sourceIds)) {
    throw new Error(`A full-time working-poverty paraphrase changed its source or population: ${paraphrase}`);
  }
}
const workingPovertyTrend = deterministicApiFallback({ text: 'La proporción de personas ocupadas en riesgo de pobreza ha bajado entre 2015 y 2025', inputType: 'text', now: Date.parse('2026-11-17') });
if (workingPovertyTrend.status !== 'partial' || workingPovertyTrend.result?.claimType !== 'trend'
  || !workingPovertyTrend.result?.headline?.includes('bajó 1,9 puntos porcentuales entre 2015 y 2025')
  || workingPovertyTrend.result?.blocks?.find((block) => block.type === 'claim_breakdown')?.items?.[0]?.verdict !== 'supported'
  || !workingPovertyTrend.result?.sourceIds?.includes('eurostat-in-work-poverty-2026-11')) {
  throw new Error('The working-poverty rate trend answer did not compare the same annual series or describe its endpoint direction.');
}
const workingPovertyTrendParaphrase = deterministicApiFallback({ text: 'De 2015 a 2025 bajó la proporción de personas ocupadas en riesgo de pobreza', inputType: 'text', now: Date.parse('2026-11-17') });
if (workingPovertyTrendParaphrase.result?.claimType !== 'trend'
  || workingPovertyTrendParaphrase.result?.headline !== workingPovertyTrend.result?.headline
  || JSON.stringify(workingPovertyTrendParaphrase.result?.sourceIds || []) !== JSON.stringify(workingPovertyTrend.result?.sourceIds || [])) {
  throw new Error('A period-range paraphrase of the working-poverty trend changed its source or assessment.');
}
const partTimePovertyTrend = deterministicApiFallback({ text: 'La tasa de riesgo de pobreza entre trabajadores a tiempo parcial ha bajado desde 2015', inputType: 'text', now: Date.parse('2026-11-17') });
if (partTimePovertyTrend.result?.headline !== 'El riesgo de pobreza entre personas ocupadas a jornada parcial bajó 8,5 puntos porcentuales entre 2015 y 2025'
  || !partTimePovertyTrend.result?.sourceIds?.includes('eurostat-in-work-poverty-part-time-2026-11')
  || partTimePovertyTrend.result?.sourceIds?.includes('eurostat-in-work-poverty-full-time-2026-11')) {
  throw new Error('The part-time trend did not use its own comparable Eurostat series.');
}
const worktimeComparison = deterministicApiFallback({ text: 'La tasa de riesgo de pobreza es más alta en la jornada parcial que en la jornada completa', inputType: 'text', now: Date.parse('2026-11-17') });
if (worktimeComparison.status !== 'partial' || worktimeComparison.result?.claimType !== 'comparative'
  || worktimeComparison.result?.blocks?.find((block) => block.type === 'claim_breakdown')?.items?.[0]?.verdict !== 'supported'
  || worktimeComparison.result?.headline !== 'En 2025, el riesgo fue 18,6 % en jornada parcial y 9,5 % en jornada completa'
  || !worktimeComparison.result?.shareableReply?.includes('9,1 puntos porcentuales más en jornada parcial')
  || !worktimeComparison.result?.sourceIds?.includes('eurostat-in-work-poverty-full-time-2026-11')
  || !worktimeComparison.result?.sourceIds?.includes('eurostat-in-work-poverty-part-time-2026-11')) {
  throw new Error('The full-time/part-time comparison did not use same-period rates from both groups.');
}
const worktimeComparisonParaphrase = deterministicApiFallback({ text: 'La tasa de pobreza laboral a jornada parcial supera a la de jornada completa', inputType: 'text', now: Date.parse('2026-11-17') });
if (worktimeComparisonParaphrase.result?.claimType !== 'comparative'
  || worktimeComparisonParaphrase.result?.blocks?.find((block) => block.type === 'claim_breakdown')?.items?.[0]?.verdict !== 'supported'
  || !worktimeComparisonParaphrase.result?.shareableReply?.includes('9,1 puntos porcentuales más en jornada parcial')
  || JSON.stringify(worktimeComparisonParaphrase.result?.sourceIds || []) !== JSON.stringify(worktimeComparison.result?.sourceIds || [])) {
  throw new Error('A paraphrased comparison did not reuse the same paired worktime evidence.');
}
const reverseWorktimeComparison = deterministicApiFallback({ text: 'La tasa de riesgo de pobreza es más alta en la jornada completa que en la jornada parcial', inputType: 'text', now: Date.parse('2026-11-17') });
if (reverseWorktimeComparison.result?.blocks?.find((block) => block.type === 'claim_breakdown')?.items?.[0]?.verdict !== 'contradicted') {
  throw new Error('The full-time/part-time comparison did not contradict the reverse rate ordering.');
}
const worktimeComparison2020 = deterministicApiFallback({ text: 'En 2020 la tasa de riesgo de pobreza era más alta en la jornada parcial que en la jornada completa', inputType: 'text', now: Date.parse('2026-11-17') });
if (worktimeComparison2020.result?.blocks?.find((block) => block.type === 'claim_breakdown')?.items?.[0]?.verdict !== 'supported'
  || worktimeComparison2020.result?.headline !== 'En 2020, el riesgo fue 19 % en jornada parcial y 9,7 % en jornada completa'
  || !worktimeComparison2020.result?.shareableReply?.includes('9,3 puntos porcentuales más en jornada parcial')) {
  throw new Error('An explicit comparison year was replaced by the latest available year.');
}
const relativeWorktimeTrend = deterministicApiFallback({ text: 'La tasa de riesgo de pobreza a jornada parcial ha bajado más que a jornada completa entre 2015 y 2025', inputType: 'text', now: Date.parse('2026-11-17') });
if (relativeWorktimeTrend.result?.blocks?.find((block) => block.type === 'claim_breakdown')?.items?.[0]?.verdict !== 'mixed'
  || !relativeWorktimeTrend.result?.shareableReply?.includes('bajó 0,8 puntos porcentuales')
  || !relativeWorktimeTrend.result?.shareableReply?.includes('bajó 8,5 puntos porcentuales')) {
  throw new Error('Two separate declines were treated as proof of which worktime group declined more.');
}
const causalWorktimeComparison = deterministicApiFallback({ text: 'La jornada parcial causa más riesgo de pobreza que la jornada completa', inputType: 'text', now: Date.parse('2026-11-17') });
if (causalWorktimeComparison.result?.blocks?.find((block) => block.type === 'claim_breakdown')?.items?.[0]?.verdict !== 'mixed'
  || !causalWorktimeComparison.result?.shareableReply?.includes('no demuestra que el tipo de jornada cause el riesgo')) {
  throw new Error('A rate comparison was presented as proof that work hours cause poverty risk.');
}
const countTrend = deterministicApiFallback({ text: '¿Cada vez hay más personas ocupadas en riesgo de pobreza?', inputType: 'text', now: Date.parse('2026-11-17') });
const countTrendArgument = countTrend.result?.blocks?.find((block) => block.type === 'claim_breakdown')?.items?.[0];
if (countTrend.status !== 'partial' || countTrend.result?.evidenceLevel !== 'insufficient' || countTrend.result?.claimType !== 'trend'
  || countTrendArgument?.verdict !== 'insufficient' || countTrendArgument?.evidenceIds?.length
  || !countTrend.result?.shareableReply?.includes('mide un porcentaje, no el número de personas')
  || !countTrend.result?.shareableReply?.includes('bajó 1,9 puntos porcentuales')
  || !countTrend.result?.sourceIds?.includes('eurostat-in-work-poverty-2026-11')) {
  throw new Error('A contextual rate series must leave the count claim insufficient while preserving its related evidence.');
}
const contraryRateTrend = deterministicApiFallback({ text: 'La tasa de riesgo de pobreza entre ocupados ha aumentado entre 2015 y 2025', inputType: 'text', now: Date.parse('2026-11-17') });
if (contraryRateTrend.result?.blocks?.find((block) => block.type === 'claim_breakdown')?.items?.[0]?.verdict !== 'contradicted'
  || !contraryRateTrend.result?.headline?.includes('bajó 1,9 puntos porcentuales entre 2015 y 2025')) {
  throw new Error('The working-poverty rate trend did not contradict a direction that conflicts with the same series endpoints.');
}
const scopedRateTrend = deterministicApiFallback({ text: 'La tasa de riesgo de pobreza entre ocupados bajó de 2019 a 2020', inputType: 'text', now: Date.parse('2026-11-17') });
if (scopedRateTrend.result?.headline !== 'El riesgo de pobreza entre personas ocupadas bajó 0,9 puntos porcentuales entre 2019 y 2020'
  || !scopedRateTrend.result?.shareableReply?.includes('2019 (12,7 %) y 2020 (11,8 %)')) {
  throw new Error('A year-range trend answer included endpoints outside the requested period.');
}
const subjectivePoverty = deterministicApiFallback({ text: 'En España se puede trabajar a jornada completa y seguir sin llegar a fin de mes', inputType: 'text', now: Date.parse('2026-11-24T12:00:00Z') });
const subjectiveArgument = subjectivePoverty.result?.blocks?.find((block) => block.type === 'claim_breakdown')?.items?.[0];
if (subjectivePoverty.status !== 'partial' || subjectivePoverty.result?.evidenceLevel !== 'insufficient'
  || !subjectivePoverty.result?.shareableReply?.includes('Eurostat mide pobreza laboral')
  || !subjectivePoverty.result?.shareableReply?.includes('9,5 % de las personas ocupadas a jornada completa')
  || !subjectivePoverty.result?.shareableReply?.includes('20,6 % de la población')
  || !subjectivePoverty.result?.shareableReply?.includes('no cruza esta dificultad con las horas trabajadas')
  || subjectiveArgument?.sourceIds?.length || subjectiveArgument?.evidenceIds?.length) {
  throw new Error('Household poverty context must leave the full-time-claim verdict insufficient.');
}
const partTimePoverty = deterministicApiFallback({ text: 'Trabajar a tiempo parcial no impide ser pobre', inputType: 'text', now: Date.parse('2026-11-17') });
if (partTimePoverty.status !== 'partial' || partTimePoverty.result?.evidenceLevel !== 'limited'
  || partTimePoverty.result?.headline !== 'El empleo a jornada parcial no elimina el riesgo de pobreza'
  || !partTimePoverty.result?.shareableReply?.includes('18,6 %') || !partTimePoverty.result?.shareableReply?.includes('en 2025')
  || !partTimePoverty.result?.shareableReply?.includes('personas ocupadas a jornada parcial')
  || !partTimePoverty.result?.shareableReply?.includes('año de la encuesta EU-SILC')
  || !partTimePoverty.result?.sourceIds?.includes('eurostat-in-work-poverty-part-time-2026-11')
  || partTimePoverty.result?.sourceIds?.includes('eurostat-in-work-poverty-full-time-2026-11')
  || partTimePoverty.result?.blocks?.find((block) => block.type === 'claim_breakdown')?.items?.[0]?.verdict !== 'mixed') {
  throw new Error('The part-time poverty claim did not use its own Eurostat series with the scope caveat for the broader word «pobre».');
}
for (const paraphrase of [
  'Trabajar a media jornada no evita estar en riesgo de pobreza',
  'El empleo a tiempo parcial no evita caer en riesgo de pobreza',
  'El empleo parcial no evita estar en riesgo de pobreza',
]) {
  const answer = deterministicApiFallback({ text: paraphrase, inputType: 'text', now: Date.parse('2026-11-17') });
  if (answer.status !== 'partial' || answer.result?.answerScope?.family !== 'working-poverty'
    || !answer.result?.shareableReply?.includes('18,6 %') || !answer.result?.shareableReply?.includes('en 2025')
    || !answer.result?.sourceIds?.includes('eurostat-in-work-poverty-part-time-2026-11')
    || answer.result?.sourceIds?.includes('eurostat-in-work-poverty-full-time-2026-11')) {
    throw new Error(`A part-time working-poverty paraphrase changed source or population: ${paraphrase}`);
  }
}
const staleWorkingPoverty = deterministicApiFallback({ text: 'Trabajar a jornada completa no impide ser pobre', inputType: 'text', now: Date.parse('2027-05-01') });
if (staleWorkingPoverty.result?.sourceIds?.some((sourceId) => sourceId.startsWith('eurostat-in-work-poverty'))
  || staleWorkingPoverty.result?.evidenceIds?.length) {
  throw new Error('The reviewed working-poverty snapshot remained usable after its expiry date.');
}
const nonTextWorkingPoverty = deterministicApiFallback({ text: 'Trabajar a jornada completa no impide estar en riesgo de pobreza', inputType: 'image', now: Date.parse('2026-11-17') });
if (nonTextWorkingPoverty.result?.sourceIds?.some((sourceId) => sourceId.startsWith('eurostat-in-work-poverty'))
  || nonTextWorkingPoverty.result?.evidenceIds?.length) {
  throw new Error('The text-only working-poverty snapshot was reused for a non-text submission.');
}
const graduateOutcomeClaim = 'Un título universitario ya no garantiza encontrar un empleo cualificado';
const graduateOutcome = deterministicApiFallback({ text: graduateOutcomeClaim, inputType: 'text', now: Date.parse('2026-11-17') });
const graduateOutcomeClaimFinding = graduateOutcome.result?.blocks?.find((block) => block.type === 'claim_breakdown')?.items?.[0]?.finding || '';
if (graduateOutcome.status !== 'partial' || graduateOutcome.result?.evidenceLevel !== 'limited'
  || graduateOutcome.result?.evidenceSummary?.mode !== 'snapshot'
  || graduateOutcome.result?.answerScope?.family !== 'education-employment-outcomes'
  || !graduateOutcomeClaimFinding.includes('83,2 %') || !graduateOutcome.result?.shareableReply?.includes('34 %')
  || !graduateOutcome.result?.shareableReply?.includes('España, 2025')
  || !graduateOutcome.result?.shareableReply?.includes('diferencia de definición')
  || !/no garantizan el resultado individual ni demuestran un cambio temporal/i.test(graduateOutcome.result?.shareableReply || '')
  || !graduateOutcome.result?.shareableReply?.includes('no garantizan el resultado individual')
  || !graduateOutcome.result?.sourceIds?.includes('eurostat-tertiary-employment')
  || !graduateOutcome.result?.sourceIds?.includes('eurostat-tertiary-overqualification')
  || graduateOutcome.result?.sourceIds?.includes('eurostat-tertiary-unemployment')
  || graduateOutcome.result?.shareableReply?.trim().split(/\s+/).length > 160) {
  throw new Error('A degree-to-qualified-work claim did not receive concise, qualified 2025 employment and overqualification context.');
}
for (const paraphrase of [
  'Tener una carrera no asegura encontrar un empleo acorde con la formación',
  'Un título superior no garantiza conseguir un trabajo cualificado',
]) {
  const answer = deterministicApiFallback({ text: paraphrase, inputType: 'text', now: Date.parse('2026-11-17') });
  const answerClaimFinding = answer.result?.blocks?.find((block) => block.type === 'claim_breakdown')?.items?.[0]?.finding || '';
  if (answer.status !== 'partial' || answer.result?.answerScope?.family !== 'education-employment-outcomes'
    || !answerClaimFinding.includes('83,2 %') || !answer.result?.shareableReply?.includes('34 %')
    || JSON.stringify(answer.result?.sourceIds || []) !== JSON.stringify(graduateOutcome.result.sourceIds)) {
    throw new Error(`A graduate employment paraphrase changed the evidence family or source scope: ${paraphrase}`);
  }
}
const graduateUnemployment = deterministicApiFallback({
  text: '¿Cuál fue la tasa de paro de la población activa de 20 a 64 años con estudios superiores en España en 2025?',
  inputType: 'text', now: Date.parse('2026-11-17'),
});
if (graduateUnemployment.status !== 'partial' || graduateUnemployment.result?.answerScope?.directMetrics?.join(',') !== 'unemployment_rate_tertiary_education'
  || !graduateUnemployment.result?.shareableReply?.includes('6,4 %')
  || !graduateUnemployment.result?.shareableReply?.includes('de la población activa de 20 a 64 años')
  || !graduateUnemployment.result?.shareableReply?.includes('fuente señala una diferencia de definición; compara años con cautela')
  || !graduateUnemployment.result?.sourceIds?.includes('eurostat-tertiary-unemployment')
  || graduateUnemployment.result?.sourceIds?.includes('eurostat-tertiary-employment')
  || graduateUnemployment.result?.sourceIds?.includes('eurostat-tertiary-overqualification')) {
  throw new Error('A tertiary-unemployment question inherited an employment or overqualification measure.');
}
for (const paraphrase of [
  '¿Qué porcentaje de la población activa de 20 a 64 años con educación superior estaba desempleada en España en 2025?',
  '¿Cuál fue el paro entre personas activas de 20 a 64 años con titulación terciaria en España en 2025?',
]) {
  const answer = deterministicApiFallback({ text: paraphrase, inputType: 'text', now: Date.parse('2026-11-17') });
  if (answer.result?.answerScope?.directMetrics?.join(',') !== 'unemployment_rate_tertiary_education'
    || !answer.result?.shareableReply?.includes('6,4 %')
    || JSON.stringify(answer.result?.sourceIds || []) !== JSON.stringify(graduateUnemployment.result.sourceIds)) {
    throw new Error(`A tertiary-unemployment paraphrase changed metric, denominator or source: ${paraphrase}`);
  }
}
const youthGraduateClaim = 'Los jóvenes con estudios superiores están sobrecualificados en sus empleos';
const youthGraduate = deterministicApiFallback({ text: youthGraduateClaim, inputType: 'text', now: Date.parse('2026-11-17') });
if (youthGraduate.status !== 'partial' || youthGraduate.result?.answerScope?.directMetrics?.join(',') !== 'tertiary_overqualification_rate_age_20_34'
  || !youthGraduate.result?.shareableReply?.includes('34,4 %')
  || !youthGraduate.result?.shareableReply?.includes('20 a 34 años')
  || !youthGraduate.result?.shareableReply?.includes('34,4 % de las personas ocupadas de 20 a 34 años con educación terciaria')
  || !youthGraduate.result?.shareableReply?.includes('no equivale a recién graduados')
  || youthGraduate.result?.shareableReply?.includes('34 % de las personas ocupadas de 20 a 64 años')
  || youthGraduate.result?.sourceIds?.includes('eurostat-tertiary-employment')) {
  throw new Error('A youth overqualification claim inherited an all-age or graduate-only measure.');
}
for (const paraphrase of [
  '¿Qué proporción de personas ocupadas de 20 a 34 años con educación terciaria trabaja en puestos que no requieren ese nivel?',
  '¿Cuántos trabajadores jóvenes titulados están sobrecualificados?',
]) {
  const answer = deterministicApiFallback({ text: paraphrase, inputType: 'text', now: Date.parse('2026-11-17') });
  if (answer.result?.answerScope?.directMetrics?.join(',') !== 'tertiary_overqualification_rate_age_20_34'
    || !answer.result?.shareableReply?.includes('34,4 %')
    || JSON.stringify(answer.result?.sourceIds || []) !== JSON.stringify(youthGraduate.result.sourceIds)) {
    throw new Error(`A youth overqualification paraphrase changed the age group or source: ${paraphrase}`);
  }
}
for (const nearbyClaim of [
  'La FP tiene más salidas laborales que la universidad',
  'Las empresas exigen un máster para encontrar un buen empleo',
  'Las empresas valoran más las competencias digitales que las asignaturas de la carrera',
  'La FP sigue teniendo un estigma social pese a tener buenas salidas laborales',
]) {
  const answer = deterministicApiFallback({ text: nearbyClaim, inputType: 'text', now: Date.parse('2026-11-17') });
  if (answer.result?.sourceIds?.some((sourceId) => sourceId.startsWith('eurostat-tertiary-'))
    || answer.result?.evidenceIds?.some((evidenceId) => evidenceId.startsWith('tertiary-'))) {
    throw new Error(`A tertiary employment statistic crossed into an adjacent education claim: ${nearbyClaim}`);
  }
}
const foreignGraduateClaim = deterministicApiFallback({ text: 'En Francia, un título universitario ya no garantiza encontrar un empleo cualificado', inputType: 'text', now: Date.parse('2026-11-17') });
if (foreignGraduateClaim.result?.sourceIds?.some((sourceId) => sourceId.startsWith('eurostat-tertiary-'))
  || foreignGraduateClaim.result?.evidenceIds?.length) {
  throw new Error('Spain-only tertiary education measures crossed into a France claim.');
}
const staleEducationSnapshot = deterministicApiFallback({ text: graduateOutcomeClaim, inputType: 'text', now: Date.parse('2027-05-01') });
if (staleEducationSnapshot.result?.sourceIds?.some((sourceId) => sourceId.startsWith('eurostat-tertiary-'))
  || staleEducationSnapshot.result?.evidenceIds?.length) {
  throw new Error('The reviewed education snapshot remained usable after its expiry date.');
}
const povertyHousingNeighbour = deterministicApiFallback({ text: 'Tener un trabajo a jornada completa ya no garantiza poder independizarse', inputType: 'text', now: Date.parse('2026-11-17') });
if (povertyHousingNeighbour.result?.sourceIds?.some((sourceId) => sourceId.startsWith('eurostat-in-work-poverty'))) {
  throw new Error('Working-poverty evidence crossed into the separate housing-independence claim.');
}
for (const outOfScopePoverty of [
  'En Francia, trabajar a jornada completa no impide estar en riesgo de pobreza',
  'Entre los trabajadores de 20 a 34 años, trabajar a jornada completa no impide estar en riesgo de pobreza',
]) {
  const answer = deterministicApiFallback({ text: outOfScopePoverty, inputType: 'text', now: Date.parse('2026-11-17') });
  if (answer.result?.sourceIds?.some((sourceId) => sourceId.startsWith('eurostat-in-work-poverty'))
    || answer.result?.evidenceIds?.length) {
    throw new Error(`Spain-wide all-adult poverty evidence crossed into an unmeasured population: ${outOfScopePoverty}`);
  }
}
const specialistRegionalWait = deterministicApiFallback({ text: 'Las listas de espera varían demasiado entre comunidades autónomas', inputType: 'text' });
if (specialistRegionalWait.status !== 'partial' || specialistRegionalWait.result?.evidenceLevel !== 'limited'
  || !specialistRegionalWait.result?.sourceIds?.includes('sisle-sns-regional-consultations-dec-2025')
  || specialistRegionalWait.result?.blocks?.some((block) => block.type === 'evidence_gap')) {
  throw new Error('A dated, source-backed regional waiting-time comparison was still marked as uncovered or as missing the data it contains.');
}
const foreignHousingCause = deterministicApiFallback({ text: 'Las compras de vivienda por extranjeros no residentes están encareciendo el mercado en zonas costeras' });
if (foreignHousingCause.status !== 'partial' || foreignHousingCause.result?.id !== 'measurement-foreign-housing-price-causality'
  || foreignHousingCause.result?.claimType !== 'causal' || foreignHousingCause.result?.evidenceLevel !== 'limited'
  || !foreignHousingCause.result?.sourceIds?.includes('registradores-eri-2026-q3-foreign-purchases')
  || !foreignHousingCause.result?.blocks?.some((block) => block.type === 'evidence_gap' && block.missing.some((item) => /residencia habitual/.test(item)))) {
  throw new Error('The foreign-purchase claim lost registry context, its residence limitation, or its causal evidence gap.');
}
const unemploymentWagePressure = deterministicApiFallback({ text: 'El paro estructural permite a las empresas ofrecer salarios bajos porque siempre hay candidatos', inputType: 'text' });
if (unemploymentWagePressure.status !== 'partial' || unemploymentWagePressure.result?.id !== 'measurement-unemployment-wage-pressure'
  || unemploymentWagePressure.result?.claimType !== 'causal' || unemploymentWagePressure.result?.evidenceLevel !== 'limited'
  || JSON.stringify(unemploymentWagePressure.result?.sourceIds || []) !== JSON.stringify(['bde-wp-2036-unemployment-wage-setting', 'bde-wp-1504-real-wage-cyclicality'])
  || unemploymentWagePressure.result?.answerScope?.directMetrics?.length
  || !unemploymentWagePressure.result?.blocks?.some((block) => block.type === 'evidence_gap' && block.missing.some((item) => /desempleo local y salarios comparables/.test(item)))
  || unemploymentWagePressure.result?.blocks?.some((block) => block.type === 'claim_breakdown' && block.items?.[0]?.verdict === 'confirmed')) {
  throw new Error('The unemployment/wage claim lost its historical evidence limits, causal classification, or direct evidence gap.');
}
for (const paraphrase of [
  'El desempleo elevado debilita la negociación salarial y presiona los sueldos a la baja',
  'Cuando abundan los candidatos, las empresas pueden contener los salarios',
]) {
  const result = deterministicApiFallback({ text: paraphrase, inputType: 'text' });
  if (result.status !== 'partial' || result.result?.id !== 'measurement-unemployment-wage-pressure'
    || result.result?.claimType !== 'causal' || result.result?.evidenceLevel !== 'limited'
    || JSON.stringify(result.result?.sourceIds || []) !== JSON.stringify(unemploymentWagePressure.result.sourceIds)) {
    throw new Error(`An unemployment/wage paraphrase changed evidence family or scope: ${paraphrase}`);
  }
}
const localSafetyTrend = deterministicApiFallback({ text: 'En mi barrio ha subido la inseguridad este mes', inputType: 'text' });
if (localSafetyTrend.status !== 'partial' || localSafetyTrend.result?.id !== 'measurement-local-safety-trend'
  || localSafetyTrend.result?.claimType !== 'trend' || localSafetyTrend.result?.evidenceLevel !== 'limited'
  || JSON.stringify(localSafetyTrend.result?.sourceIds || []) !== JSON.stringify(['interior-criminality-balance-2026-q2', 'ine-neighbourhood-crime-perception-ecv-2023'])
  || localSafetyTrend.result?.blocks?.some((block) => block.type === 'claim_breakdown' && block.items?.[0]?.evidenceIds?.length)
  || !localSafetyTrend.result?.blocks?.some((block) => block.type === 'evidence_gap' && block.missing.some((item) => /municipio|percepción vecinal/.test(item)))) {
  throw new Error('A neighborhood safety claim was not kept insufficient with scoped official context and the information needed for a valid comparison.');
}
for (const paraphrase of [
  'La delincuencia ha empeorado en mi calle estas semanas',
  'En la zona hay cada vez más robos',
  'En mi municipio han aumentado los hurtos este trimestre',
]) {
  const result = deterministicApiFallback({ text: paraphrase, inputType: 'text' });
  if (result.status !== 'partial' || result.result?.id !== localSafetyTrend.result.id
    || JSON.stringify(result.result?.sourceIds || []) !== JSON.stringify(localSafetyTrend.result.sourceIds)) {
    throw new Error(`A local safety paraphrase changed the evidence family or its source scope: ${paraphrase}`);
  }
}
const nationalSafetyTrend = deterministicApiFallback({ text: 'En España ha subido la criminalidad registrada este año', inputType: 'text' });
if (nationalSafetyTrend.result?.id !== 'broad-security'
  || nationalSafetyTrend.result?.sourceIds?.includes('ine-neighbourhood-crime-perception-ecv-2023')) {
  throw new Error('A national crime trend crossed into the local-safety family or received neighborhood perception data.');
}
const migrationSafetyCause = deterministicApiFallback({ text: 'La llegada de inmigrantes ha provocado más robos en mi barrio', inputType: 'text' });
if (migrationSafetyCause.result?.id !== 'broad-immigration-security'
  || migrationSafetyCause.result?.sourceIds?.includes('ine-neighbourhood-crime-perception-ecv-2023')) {
  throw new Error('A migration-attribution claim was routed through unrelated neighborhood context.');
}
const migrationHousingCause = deterministicApiFallback({ text: 'La inmigración está haciendo que suban los alquileres en algunas ciudades' });
if (migrationHousingCause.status !== 'uncovered' || migrationHousingCause.result?.id !== 'measurement-migration-housing-demand-causality'
  || migrationHousingCause.result?.claimType !== 'causal' || migrationHousingCause.result?.evidenceLevel !== 'insufficient'
  || migrationHousingCause.result?.sourceIds?.length
  || !migrationHousingCause.result?.blocks?.some((block) => block.type === 'evidence_gap' && block.missing.some((item) => /municipios y periodos/.test(item)))) {
  throw new Error('A migration-and-housing causal claim was answered with national population counts instead of local demand and causal evidence needs.');
}

const rentalMechanismClaims = [
  { family: 'rental-tenant-screening-exclusion', claim: 'Las garantías, fianzas y seguros de impago excluyen del alquiler a trabajadores con ingresos irregulares' },
  { family: 'rental-regulation-contract-shift', claim: 'La regulación del alquiler ha empujado a algunos propietarios hacia contratos temporales', context: true },
  { family: 'rental-regulation-contract-shift', claim: 'El control de precios provoca que viviendas pasen del alquiler habitual al de temporada', context: true },
  { family: 'rental-regulation-contract-shift', claim: 'La regulación en Cataluña desplazó viviendas del alquiler habitual a contratos de temporada', context: true },
  { family: 'rental-regulation-contract-shift', claim: 'Los topes de alquiler hacen que parte de la oferta desaparezca del mercado regulado' },
  { family: 'rental-landlord-motives', claim: 'El miedo a la okupación y al impago hace que propietarios retiren pisos del alquiler', context: true },
  { family: 'rental-landlord-motives', claim: 'Hay viviendas vacías que no se alquilan por miedo a problemas legales con inquilinos', context: true },
  { family: 'rental-landlord-motives', claim: 'Los propietarios prefieren el alquiler de temporada porque les da más flexibilidad que el alquiler habitual' },
];
for (const { family, claim, context = false } of rentalMechanismClaims) {
  const result = deterministicApiFallback({ text: claim, inputType: 'text' });
  const reply = result.result?.shareableReply || '';
  const claimItem = result.result?.blocks?.find((block) => block.type === 'claim_breakdown')?.items?.[0];
  const expectedSourceIds = context
    ? family === 'rental-landlord-motives' ? ['observatorio-alquiler-landlord-profile-2025'] : ['catalonia-seasonal-rental-deposits-q2-2026']
    : [];
  if (result.status !== (context ? 'partial' : 'uncovered') || result.result?.id !== `measurement-${family}`
    || result.result?.claimType !== 'causal' || result.result?.evidenceLevel !== (context ? 'limited' : 'insufficient')
    || JSON.stringify(result.result?.sourceIds || []) !== JSON.stringify(expectedSourceIds)
    || !claimItem || claimItem.sourceIds?.length || claimItem.evidenceIds?.length
    || result.result?.answerScope?.contextMetrics?.length
    || !result.result?.blocks?.some((block) => block.type === 'evidence_gap' && block.missing.length)) {
    throw new Error(`A rental-market mechanism did not preserve its own evidence gap: ${claim}`);
  }
  if (context && family === 'rental-regulation-contract-shift' && (!/9\.330/.test(reply) || !/13\.517/.test(reply) || !/13\.152/.test(reply)
    || !/Catalu[nñ]a/.test(reply) || !/no viviendas [uú]nicas/.test(reply)
    || !/No demuestra que la regulaci[oó]n causara el cambio/.test(reply)
    || !result.result?.blocks?.some((block) => block.type === 'data_finding' && block.dataKind === 'context'))) {
    throw new Error(`The seasonal-rental trend lost its region, period, limitation, or context-only label: ${claim}`);
  }
  if (/26,7|31,6|32,4|34,5|98,7/.test(reply)) {
    throw new Error(`A neighboring rent-affordability statistic crossed into a landlord or screening claim: ${claim}`);
  }
}
const madridRentalRegulation = deterministicApiFallback({ text: 'La regulación del alquiler en Madrid ha empujado a propietarios hacia contratos temporales' });
if (madridRentalRegulation.result?.id !== 'measurement-rental-regulation-contract-shift'
  || madridRentalRegulation.result?.sourceIds?.length || madridRentalRegulation.result?.evidenceLevel !== 'insufficient') {
  throw new Error('The Catalonia-only seasonal-rental context crossed into a Madrid-specific claim.');
}

const reviewedAt = Date.parse('2026-11-16T12:00:00Z');
const youthRentClaims = [
  'El alquiler se come más de la mitad del sueldo de muchos jóvenes',
  'Muchos jóvenes destinan más de la mitad de su salario a alquilar una vivienda',
  'El alquiler mensual medio casi iguala el salario joven medio de referencia',
];
for (const claim of youthRentClaims) {
  const result = deterministicApiFallback({ text: claim, inputType: 'text', now: reviewedAt });
  if (result.result?.id !== 'broad-youth-living-housing' || result.result?.evidenceLevel !== 'limited') {
    throw new Error(`A reviewed, scoped youth-rent comparison was hidden by a generic evidence gap: ${claim}`);
  }
  if (!result.result?.sourceIds?.includes('cje-emancipation-2025')
    || !result.result?.evidenceSummary?.families?.some((family) => family.criterionId === 'youth-rental-effort' && family.data?.some((item) => /98,7 %/.test(item)))) {
    throw new Error(`Youth-rent context lost its reviewed source or measured comparison: ${claim}`);
  }
  if (!result.result?.blocks?.some((block) => block.type === 'evidence_gap' && block.missing.some((item) => /porcentaje de renta individual/.test(item)))) {
    throw new Error(`A contextual average was presented without the gap for the claimed individual threshold: ${claim}`);
  }
  if (!/no muestra cu[aá]ntas personas superan el 50 % de su salario individual/.test(result.result?.limitation || '')) {
    throw new Error(`Youth-rent answer did not preserve the individual-threshold caveat: ${claim}`);
  }
  const reply = result.result?.shareableReply || '';
  if (reply.trim().split(/\s+/).length > 160) throw new Error(`Youth-rent public reply is too long to scan: ${claim}`);
  if (!/España/.test(reply) || !/2025/.test(reply) || !/vivienda completa/.test(reply)
    || !/salario individual mensual medio/.test(reply) || !/Consejo de la Juventud de España/.test(reply)) {
    throw new Error(`Youth-rent answer omitted its geography, period, population, denominator, or named source: ${claim}`);
  }
  if (!/27,4 %/.test(reply) || !/34,2 %/.test(reply)
    || /escenario potencial|municipios: Madrid|36,3 %/.test(reply)
    || !/no indican cu[aá]ntos j[oó]venes destinan m[aá]s de la mitad de su salario individual/.test(reply)) {
    throw new Error(`Youth-rent public reply lost a scoped household measure, included an unasked hypothetical, or omitted the individual-threshold limitation: ${claim}`);
  }
}
const youthPurchaseClaims = [
  'Comprar una vivienda es imposible para muchos jóvenes sin ayuda familiar o una herencia',
  'Los jóvenes necesitan ahorrar más de cuatro años de sueldo para la entrada de una vivienda',
];
for (const claim of youthPurchaseClaims) {
  const result = deterministicApiFallback({ text: claim, inputType: 'text', now: reviewedAt });
  if (result.result?.id !== 'broad-youth-living-housing' || result.result?.evidenceLevel !== 'limited') {
    throw new Error(`A reviewed youth down-payment comparison was hidden by a generic purchase-affordability gap: ${claim}`);
  }
  if (!result.result?.sourceIds?.includes('cje-emancipation-2025')
    || !result.result?.evidenceSummary?.families?.some((family) => family.criterionId === 'youth-purchase-effort'
      && family.data?.some((item) => /66\.900 €/.test(item) && /4,7 años/.test(item)))) {
    throw new Error(`Youth purchase answer lost its reviewed down-payment evidence: ${claim}`);
  }
  if (!result.result?.blocks?.some((block) => block.type === 'evidence_gap'
    && block.missing.some((item) => /proporción de jóvenes/.test(item)))) {
    throw new Error(`A reference average was presented as the distribution of youth home-buying access: ${claim}`);
  }
  const reply = result.result?.shareableReply || '';
  if (reply.trim().split(/\s+/).length > 160) throw new Error(`Youth-purchase public reply is too long to scan: ${claim}`);
  if (!/España/.test(reply) || !/2025/.test(reply) || !/66\.900 €/.test(reply)
    || !/salario individual anual/.test(reply) || !/dedicar.*íntegro/.test(reply)
    || !/Consejo de la Juventud de España/.test(reply)) {
    throw new Error(`Youth purchase answer omitted its geography, period, denominator, assumption, or source: ${claim}`);
  }
  if (/ayuda familiar|herencia/i.test(claim)
    && (!/no mide el efecto de (?:las )?ayudas familiares o herencias/.test(reply)
      || !result.result?.blocks?.some((block) => block.type === 'evidence_gap' && block.missing.some((item) => /herencias/.test(item))))) {
    throw new Error(`Youth purchase answer treated family support as measured when it is not: ${claim}`);
  }
}
const youthMigrationClaim = 'Los precios de la casa y los salarios estancados dejan a la gente joven sin futuro; ¿cuántos se irían sin herencia?';
const youthMigration = deterministicApiFallback({ text: youthMigrationClaim, inputType: 'text', now: reviewedAt });
const youthMigrationReply = youthMigration.result?.shareableReply || '';
if (youthMigration.result?.id !== 'broad-youth-living-housing'
  || youthMigrationReply.trim().split(/\s+/).length > 160
  || !youthMigrationReply.includes('47,3 %')
  || !/no pregunta cu[aá]ntas personas se habr[ií]an trasladado fuera de Espa[nñ]a/.test(youthMigrationReply)) {
  throw new Error('A combined youth housing and migration claim needs a concise reply with the scoped survey result and explicit counterfactual gap');
}
for (const claim of [
  'El alquiler medio consume casi todo el salario de trabajadores adultos en España',
  'En Madrid, los jóvenes destinan más de la mitad de su sueldo al alquiler',
  'En Portugal, muchos jóvenes gastan más de la mitad de su salario en alquiler',
  'En Madrid, comprar una vivienda es imposible para jóvenes sin ayuda familiar',
  'En Portugal, jóvenes no pueden comprar vivienda sin heredar',
  'Comprar casa consume varios años de salario de trabajadores adultos en España',
  'La entrada de una hipoteca es una barrera mayor que la cuota mensual para acceder a una vivienda',
  'El problema de la vivienda no se corrige porque muchos votantes propietarios se benefician de precios altos',
]) {
  const result = deterministicApiFallback({ text: claim, inputType: 'text', now: reviewedAt });
  if (result.result?.id === 'broad-youth-living-housing' || result.result?.sourceIds?.includes('cje-emancipation-2025')) {
    throw new Error(`Spain-wide youth-housing evidence crossed a population, geography, or measurement boundary: ${claim}`);
  }
}

const housing = deterministicApiFallback({ text: 'La vivienda está imposible', inputType: 'text' });
if (!/precios|alquileres|vivienda pública|disponibilidad/i.test(housing.guidance.questions[0])) throw new Error('topic-aware fallback lost housing guidance');
for (const input of ['No hay trabajo y los salarios bajan', 'No hay trabajo y la vivienda es cara']) {
  const result = deterministicApiFallback({ text: input, inputType: 'text' });
  if (result.result?.id === 'measurement-job-opportunities') throw new Error(`A focused fallback silently discarded a separate proposition: ${input}`);
}

const political = deterministicApiFallback({ text: 'pedro sanchez está destruyendo españa', inputType: 'text' });
if (political.relatedClaims?.[0]?.kind !== 'topic' || political.relatedClaims[0].slug !== 'politica') throw new Error('political fallback did not preserve topic-only context');
if (political.result?.evidenceLevel !== 'supported' && (political.result?.evidenceIds?.length || political.result?.sourceIds?.length)) throw new Error('political fallback invented evidence');
if (/impuestos/i.test(JSON.stringify(political))) throw new Error('political fallback attached unrelated tax context');

const broadPolitical = deterministicApiFallback({ text: 'España está destruida', inputType: 'text' });
if (broadPolitical.relatedClaims?.[0]?.kind !== 'topic' || broadPolitical.relatedClaims[0].slug !== 'politica') throw new Error('broad political fallback did not preserve topic-only context');
if (broadPolitical.result?.evidenceIds?.length || broadPolitical.result?.sourceIds?.length) throw new Error('broad political fallback invented evidence');
const politicalReviewedAt = Date.parse('2026-10-30T12:00:00Z');
const broadPositive = deterministicApiFallback({ text: 'España está mejorando', inputType: 'text', now: politicalReviewedAt });
if (broadPositive.result?.evidenceLevel !== 'supported') throw new Error('positive broad political fallback did not produce a supported scorecard');
const expiredPositive = deterministicApiFallback({ text: 'España está mejorando', inputType: 'text', now: Date.parse('2026-11-01T12:00:00Z') });
if (expiredPositive.result?.blocks?.some((block) => block.type === 'scorecard')) throw new Error('expired scorecard must not be served as current evidence');

for (const [input, expected] of [
  ['Pedro Sánchez está destruyendo el país', 'supported'],
  ['Nos mienten con los datos del paro', 'limited'],
  ['Los inmigrantes nos invaden', 'limited'],
  ['No se puede salir a la calle de cómo está el país', 'limited'],
]) {
  const result = deterministicApiFallback({ text: input, inputType: 'text', now: politicalReviewedAt });
  if (result.result?.evidenceLevel !== expected || !result.result?.sourceLinks?.length) throw new Error(`broad claim did not receive scoped evidence: ${input}`);
  const evidenceGap = result.result?.blocks?.find((block) => block.type === 'evidence_gap');
  if (evidenceGap && (!String(result.result?.knowledgeVersion || '').startsWith('broad-domain-snapshot-')
    || !Array.isArray(evidenceGap.missing) || !evidenceGap.missing.length
    || !Array.isArray(evidenceGap.needed) || !evidenceGap.needed.length
    || typeof evidenceGap.nextAction !== 'string' || !evidenceGap.nextAction.trim())) {
    throw new Error(`broad claim fell through to an unstructured evidence gap: ${input}`);
  }
}
const immigrationCrime = deterministicApiFallback({ text: 'Los inmigrantes crean inseguridad en España', inputType: 'text' });
if (!/causa colectiva|diferencia descriptiva/i.test(JSON.stringify(immigrationCrime.result))) throw new Error('immigration/crime causal claim lost its causal limitation');

const media = deterministicApiFallback({ inputType: 'audio' });
if (media.status !== 'uncovered' || media.result || !/audio/i.test(media.guidance.limitation)) throw new Error('file-only fallback did not provide a generic retry path');

if (/ollama|localhost|127\.0\.0\.1|model|provider/i.test(JSON.stringify({ text, housing, media }))) throw new Error('deterministic fallback exposed implementation details');

console.log('Deterministic API fallback validation passed: text and media failures retain useful, evidence-honest guidance.');
