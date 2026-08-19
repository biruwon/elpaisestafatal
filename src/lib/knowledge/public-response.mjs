import { RUNTIME_VERSIONS } from './runtime-versions.mjs';

const statuses = new Set(['published', 'related', 'draft', 'uncovered', 'unavailable', 'complete', 'partial', 'processing']);
const kinds = new Set(['claim', 'topic']);
const forbidden = /ollama|localhost|127\.0\.0\.1|host\.docker\.internal|whisper_command|cloudflare_api_token|local_classifier|cors/i;

const string = (value) => typeof value === 'string' ? value : undefined;
const strings = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined;

const isReference = (value) => Boolean(value && typeof value === 'object'
  && kinds.has(value.kind)
  && typeof value.slug === 'string'
  && typeof value.title === 'string'
  && typeof value.href === 'string'
  && Number.isFinite(Number(value.confidence)));

const cleanReference = (value) => ({
  kind: value.kind,
  slug: value.slug,
  title: value.title,
  href: value.href,
  confidence: Number(value.confidence),
});

const cleanGuidance = (value) => {
  if (!value || typeof value !== 'object') return undefined;
  const questions = strings(value.questions);
  const suggestions = Array.isArray(value.suggestions)
    ? value.suggestions.filter((item) => item && typeof item === 'object' && typeof item.title === 'string').map((item) => ({
      title: item.title,
      ...(typeof item.href === 'string' ? { href: item.href } : {}),
      ...(typeof item.prompt === 'string' ? { prompt: item.prompt } : {}),
    }))
    : undefined;
  return {
    ...(string(value.heading) ? { heading: value.heading } : {}),
    ...(questions ? { questions } : {}),
    ...(string(value.questionsLabel) ? { questionsLabel: value.questionsLabel } : {}),
    ...(string(value.limitation) ? { limitation: value.limitation } : {}),
    ...(suggestions ? { suggestions } : {}),
    ...(string(value.suggestionsLabel) ? { suggestionsLabel: value.suggestionsLabel } : {}),
  };
};

const cleanPlan = (value) => {
  if (!value || typeof value !== 'object' || value.schemaVersion !== RUNTIME_VERSIONS.answerPlanSchema
    || typeof value.headline !== 'string' || typeof value.summary !== 'string'
    || !Array.isArray(value.blocks) || !Array.isArray(value.evidenceIds)
    || !Array.isArray(value.sourceIds) || typeof value.knowledgeVersion !== 'string'
    || (value.evidenceLevel !== undefined && !['supported', 'limited', 'insufficient'].includes(value.evidenceLevel))
    || !['supported', 'limited', 'insufficient'].includes(value.evidenceLevel)) return undefined;
  return value;
};

export const publicResolveResponse = (value) => {
  if (!value || typeof value !== 'object' || !statuses.has(value.status)) return undefined;
  if (forbidden.test(JSON.stringify(value))) return undefined;
  if (value.status === 'processing') {
    return typeof value.requestId === 'string' ? { status: 'processing', requestId: value.requestId } : undefined;
  }
  if (value.result !== undefined && !cleanPlan(value.result)) return undefined;
  if (value.relatedClaims !== undefined && (!Array.isArray(value.relatedClaims) || !value.relatedClaims.every(isReference))) return undefined;
  if (value.alternatives !== undefined && (!Array.isArray(value.alternatives) || !value.alternatives.every(isReference))) return undefined;
  if (value.primary !== undefined && !isReference(value.primary)) return undefined;

  const response = { status: value.status };
  for (const key of ['requestId', 'canonicalSignature']) if (typeof value[key] === 'string') response[key] = value[key];
  if (value.input && typeof value.input === 'object') response.input = {
    ...(typeof value.input.original === 'string' ? { original: value.input.original } : {}),
    ...(typeof value.input.canonical === 'string' ? { canonical: value.input.canonical } : {}),
  };
  if (value.primary) response.primary = cleanReference(value.primary);
  if (value.alternatives) response.alternatives = value.alternatives.map(cleanReference);
  if (value.relatedClaims) response.relatedClaims = value.relatedClaims.map(cleanReference);
  if (value.guidance) response.guidance = cleanGuidance(value.guidance);
  if (value.result) response.result = value.result;
  return response;
};
