import { deterministicApiFallback } from '../src/lib/knowledge/deterministic-api-fallback.mjs';

const text = deterministicApiFallback({ text: 'España está destruida', inputType: 'text' });
if (text.status !== 'uncovered' || !text.result?.blocks?.some((block) => block.type === 'claim_breakdown')) throw new Error('text fallback did not preserve a structured clarification');
if (!/hecho concreto|periodo|lugar|decisión del Gobierno|instituciones/i.test(text.result?.clarificationQuestion || '')) throw new Error('text fallback did not offer a concrete next question');
const textPlan = text.result;
if (textPlan?.['sourceLinks'] || textPlan?.evidenceIds?.length) throw new Error('text fallback invented evidence or sources');

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
  if (!result.result?.blocks?.some((block) => block.type === 'evidence_gap' && block.missing.some((item) => /porcentaje de ingresos/.test(item)))) {
    throw new Error(`A contextual average was presented without the gap for the claimed individual threshold: ${claim}`);
  }
  if (!/no indican cuántos jóvenes superan un porcentaje concreto/.test(result.result?.limitation || '')) {
    throw new Error(`Youth-rent answer did not preserve the individual-threshold caveat: ${claim}`);
  }
  const reply = result.result?.shareableReply || '';
  if (!/España/.test(reply) || !/2025/.test(reply) || !/vivienda completa/.test(reply)
    || !/salario individual mensual medio/.test(reply) || !/Consejo de la Juventud de España/.test(reply)) {
    throw new Error(`Youth-rent answer omitted its geography, period, population, denominator, or named source: ${claim}`);
  }
}
for (const claim of [
  'El alquiler medio consume casi todo el salario de trabajadores adultos en España',
  'En Madrid, los jóvenes destinan más de la mitad de su sueldo al alquiler',
  'En Portugal, muchos jóvenes gastan más de la mitad de su salario en alquiler',
]) {
  const result = deterministicApiFallback({ text: claim, inputType: 'text', now: reviewedAt });
  if (result.result?.id === 'broad-youth-living-housing' || result.result?.sourceIds?.includes('cje-emancipation-2025')) {
    throw new Error(`Spain-wide youth-rent evidence crossed a population or geography boundary: ${claim}`);
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
