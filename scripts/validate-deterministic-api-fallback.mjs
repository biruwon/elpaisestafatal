import { deterministicApiFallback } from '../src/lib/knowledge/deterministic-api-fallback.mjs';

const text = deterministicApiFallback({ text: 'España está destruida', inputType: 'text' });
if (text.status !== 'uncovered' || !text.result?.blocks?.some((block) => block.type === 'claim_breakdown')) throw new Error('text fallback did not preserve a structured clarification');
if (!/hecho concreto|periodo|lugar|decisión del Gobierno|instituciones/i.test(text.result?.clarificationQuestion || '')) throw new Error('text fallback did not offer a concrete next question');
const textPlan = text.result;
if (textPlan?.['sourceLinks'] || textPlan?.evidenceIds?.length) throw new Error('text fallback invented evidence or sources');

const housing = deterministicApiFallback({ text: 'La vivienda está imposible', inputType: 'text' });
if (!/precios|alquileres|vivienda pública|disponibilidad/i.test(housing.guidance.questions[0])) throw new Error('topic-aware fallback lost housing guidance');

const political = deterministicApiFallback({ text: 'pedro sanchez está destruyendo españa', inputType: 'text' });
if (political.relatedClaims?.[0]?.kind !== 'topic' || political.relatedClaims[0].slug !== 'politica') throw new Error('political fallback did not preserve topic-only context');
if (political.result?.evidenceLevel !== 'supported' && (political.result?.evidenceIds?.length || political.result?.sourceIds?.length)) throw new Error('political fallback invented evidence');
if (/impuestos/i.test(JSON.stringify(political))) throw new Error('political fallback attached unrelated tax context');

const broadPolitical = deterministicApiFallback({ text: 'España está destruida', inputType: 'text' });
if (broadPolitical.relatedClaims?.[0]?.kind !== 'topic' || broadPolitical.relatedClaims[0].slug !== 'politica') throw new Error('broad political fallback did not preserve topic-only context');
if (broadPolitical.result?.evidenceIds?.length || broadPolitical.result?.sourceIds?.length) throw new Error('broad political fallback invented evidence');
const broadPositive = deterministicApiFallback({ text: 'España está mejorando', inputType: 'text' });
if (broadPositive.result?.evidenceLevel !== 'supported') throw new Error('positive broad political fallback did not produce a supported scorecard');

for (const [input, expected] of [
  ['Pedro Sánchez está destruyendo el país', 'supported'],
  ['Nos mienten con los datos del paro', 'limited'],
  ['Los inmigrantes nos invaden', 'limited'],
  ['No se puede salir a la calle de cómo está el país', 'limited'],
]) {
  const result = deterministicApiFallback({ text: input, inputType: 'text' });
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
