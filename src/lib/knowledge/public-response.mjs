import { RUNTIME_VERSIONS } from './runtime-versions.mjs';

const statuses = new Set(['published', 'related', 'draft', 'uncovered', 'unavailable', 'complete', 'partial', 'processing']);
const kinds = new Set(['claim', 'topic']);
const forbidden = /ollama|localhost|127\.0\.0\.1|host\.docker\.internal|whisper_command|cloudflare_api_token|local_classifier|cors/i;

const string = (value) => typeof value === 'string' ? value : undefined;
const strings = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined;
const evidenceStatuses = new Set(['available', 'partial', 'missing']);
const evidenceDataKinds = new Set(['observed', 'projected', 'snapshot', 'context']);
const validDimensions = (value) => !value || (typeof value === 'object' && !Array.isArray(value) && ['subject', 'population', 'period', 'geography', 'denominator', 'unit', 'causalRequirement'].every((key) => value[key] === undefined || typeof value[key] === 'string'));
const validEvidenceSummary = (value) => !value || (typeof value === 'object'
  && ['dynamic', 'snapshot', 'mixed', 'none'].includes(value.mode)
  && Array.isArray(value.families)
  && value.families.every((family) => family && typeof family.label === 'string' && ['supports', 'qualifies', 'contradicts', 'neutral'].includes(family.direction) && (!family.status || evidenceStatuses.has(family.status)) && (!family.dataKind || evidenceDataKinds.has(family.dataKind)) && validDimensions(family.dimensions) && Array.isArray(family.evidenceIds) && family.evidenceIds.every((id) => typeof id === 'string')
    && (family.finding === undefined || typeof family.finding === 'string')
    && (family.limitation === undefined || typeof family.limitation === 'string')
    && (family.period === undefined || typeof family.period === 'string')
    && (!family.criteria || Array.isArray(family.criteria) && family.criteria.every((criterion) => criterion && typeof criterion.id === 'string' && typeof criterion.label === 'string' && typeof criterion.finding === 'string' && (!criterion.status || evidenceStatuses.has(criterion.status)) && (!criterion.dataKind || evidenceDataKinds.has(criterion.dataKind)) && validDimensions(criterion.dimensions) && (!criterion.evidenceIds || Array.isArray(criterion.evidenceIds)) && (!criterion.sourceIds || Array.isArray(criterion.sourceIds)) && (!criterion.data || strings(criterion.data)) && (!criterion.missingDimensions || strings(criterion.missingDimensions)))))
  && (!value.missingDimensions || strings(value.missingDimensions))
  && (!value.fallbackReason || typeof value.fallbackReason === 'string'));

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
    || !['supported', 'limited', 'insufficient'].includes(value.evidenceLevel)
    || !validEvidenceSummary(value.evidenceSummary)) return undefined;
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
