import { deterministicFallbackCompiler, propositionShapeFor, semanticSignatureFor } from './fallback-compiler.mjs';

export const compilerTypes = new Set(['descriptive', 'comparative', 'definition', 'trend', 'causal', 'predictive', 'legal', 'normative', 'mixed']);

// The local model is a parser, not an evidence source. Keep this schema small
// and bounded so model latency and the amount of untrusted text entering the
// retrieval layer stay predictable.
export const compilerSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['normalized', 'claimType', 'propositions', 'entities', 'numbers', 'geography', 'period', 'population', 'retrievalHints', 'clarificationRequired', 'routing'],
  properties: {
    normalized: { type: 'string', maxLength: 300 },
    claimType: { type: 'string', enum: [...compilerTypes] },
    propositions: {
      type: 'array',
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'type', 'explicit'],
        properties: {
          text: { type: 'string', maxLength: 300 },
          type: { type: 'string', enum: [...compilerTypes] },
          explicit: { type: 'boolean' },
          subject: { type: 'string', maxLength: 120 },
          predicate: { type: 'string', maxLength: 80 },
          object: { type: 'string', maxLength: 120 },
        },
      },
    },
    entities: { type: 'array', maxItems: 12, items: { type: 'string', maxLength: 120 } },
    // This field is retained in the model contract for diagnostics, but the
    // normalizer always replaces it with numbers extracted deterministically
    // from the submitted text.
    numbers: { type: 'array', maxItems: 12, items: { type: 'string', maxLength: 80 } },
    geography: { type: ['string', 'null'], maxLength: 120 },
    period: { type: ['string', 'null'], maxLength: 120 },
    population: { type: ['string', 'null'], maxLength: 120 },
    retrievalHints: { type: 'array', maxItems: 8, items: { type: 'string', maxLength: 120 } },
    // The model may return this for inspection, but signatures are always
    // derived below so it cannot manufacture a cluster or bypass polarity
    // and claim-type boundaries.
    semanticSignature: { type: 'string', maxLength: 600 },
    clarificationRequired: { type: 'boolean' },
    routing: {
      type: 'object',
      additionalProperties: false,
      required: ['status', 'primarySlug', 'reason', 'questions'],
      properties: {
        status: { type: 'string', enum: ['published', 'related', 'uncovered'] },
        primarySlug: { type: 'string', maxLength: 160 },
        reason: { type: 'string', maxLength: 220 },
        questions: { type: 'array', maxItems: 2, items: { type: 'string', maxLength: 220 } },
      },
    },
  },
};

const bounded = (value, maximum) => typeof value === 'string' ? value.trim().slice(0, maximum) : '';

const safeList = (value, maximumItems, maximumLength) => Array.isArray(value)
  ? value.filter((item) => typeof item === 'string' && item.trim()).slice(0, maximumItems).map((item) => item.trim().slice(0, maximumLength))
  : [];

const meaningfulTokens = (value) => new Set(String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9]{3,}/g) || []);

// A model can translate or normalise a population label, but it must not be
// able to introduce a completely unrelated geography or population into the
// warehouse query. Preserve deterministic extraction when available; accept a
// model value only when it shares a meaningful token with the submitted text.
const safeContextField = (value, fallback, text, maximum) => {
  if (fallback) return fallback;
  const candidate = bounded(value, maximum);
  if (!candidate) return null;
  const inputTokens = meaningfulTokens(text);
  const candidateTokens = meaningfulTokens(candidate);
  return [...candidateTokens].some((token) => inputTokens.has(token)) ? candidate : null;
};

const safeRelatedList = (value, fallback, text, maximumItems, maximumLength) => {
  const inputTokens = meaningfulTokens(text);
  const fallbackValues = safeList(fallback, maximumItems, maximumLength);
  const modelValues = safeList(value, maximumItems, maximumLength).filter((item) => {
    const itemTokens = meaningfulTokens(item);
    return [...itemTokens].some((token) => inputTokens.has(token));
  });
  return [...new Set([...fallbackValues, ...modelValues])].slice(0, maximumItems);
};

export const normalizeCompilerOutput = (value, text) => {
  const deterministic = deterministicFallbackCompiler(text);
  if (!value || typeof value !== 'object') return deterministic;
  const propositions = Array.isArray(value.propositions)
    ? value.propositions.filter((item) => item && typeof item.text === 'string' && item.text.trim()).slice(0, 6).map((item) => {
      const shape = propositionShapeFor(item.text);
      return {
        text: bounded(item.text, 300),
        type: compilerTypes.has(item.type) ? item.type : 'mixed',
        explicit: item.explicit !== false,
        subject: bounded(item.subject, 120) || shape.subject,
        predicate: bounded(item.predicate, 80) || shape.predicate,
        object: bounded(item.object, 120) || shape.object,
      };
    })
    : [];
  if (!propositions.length) return deterministic;
  const explicitPropositions = propositions.filter((item) => item.explicit);
  const impliedPropositions = propositions.filter((item) => !item.explicit);
  const claimType = compilerTypes.has(value.claimType) ? value.claimType : 'mixed';
  const entities = safeRelatedList(value.entities, deterministic.entities, text, 12, 120);
  const geography = safeContextField(value.geography, deterministic.geography, text, 120);
  const period = safeContextField(value.period, deterministic.period, text, 120);
  const population = safeContextField(value.population, deterministic.population, text, 120);
  const numbers = deterministic.numbers.slice(0, 12);
  return {
    normalized: bounded(value.normalized, 300) || deterministic.normalized,
    claimType,
    propositions,
    entities,
    numbers,
    geography,
    period,
    population,
    explicitPropositions,
    impliedPropositions,
    retrievalHints: safeRelatedList(value.retrievalHints, deterministic.retrievalHints, text, 8, 120),
    // Never trust the model's signature. The deterministic compiler owns
    // polarity, direction, relation and metric-family boundaries.
    semanticSignature: semanticSignatureFor({
      claimType,
      propositions,
      entities,
      geography,
      period,
      population,
      numbers,
      negated: /\b(?:no|nunca|jamas|nadie|ningun|ninguna)\b/i.test(String(text || '')),
    }),
    clarificationRequired: value.clarificationRequired === true,
    routing: value.routing && typeof value.routing === 'object' ? {
      status: ['published', 'related', 'uncovered'].includes(value.routing.status) ? value.routing.status : 'uncovered',
      primarySlug: bounded(value.routing.primarySlug, 160),
      reason: bounded(value.routing.reason, 220),
      questions: safeList(value.routing.questions, 2, 220),
    } : { status: 'uncovered', primarySlug: '', reason: '', questions: [] },
  };
};

export const compilerContractFacts = {
  modelMayProvide: ['normalized', 'claimType', 'propositions', 'entities', 'geography', 'period', 'population', 'retrievalHints', 'clarificationRequired', 'routing'],
  deterministicOnly: ['numbers', 'semanticSignature'],
  maxPropositions: 6,
  maxRetrievalHints: 8,
};

const compilerSignalWords = new Set(['espana', 'pais', 'gente', 'cosa', 'cosas', 'problema', 'problemas', 'verdad', 'cierto', 'cierta']);
const compilerSignalTokens = (value) => [...new Set(String(value || '')
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .match(/[a-z0-9]{3,}/g) || [])].filter((token) => !compilerSignalWords.has(token));

export const isBroadComplaint = (deterministic) => Boolean(
  deterministic?.impliedPropositions?.some((item) => item?.type === 'definition' && /valoraci[oó]n amplia|concretar/i.test(item.text || '')),
);

export const reconcileCompilerSafety = (deterministic, candidate) => {
  if (!candidate || isBroadComplaint(deterministic)) return deterministic || candidate;
  const safetySensitive = ['causal', 'legal', 'normative', 'predictive'].includes(deterministic.claimType);
  if (!safetySensitive) return candidate;
  return {
    ...candidate,
    claimType: deterministic.claimType,
    propositions: deterministic.propositions,
    explicitPropositions: deterministic.explicitPropositions,
    impliedPropositions: deterministic.impliedPropositions,
    semanticSignature: deterministic.semanticSignature,
    clarificationRequired: deterministic.clarificationRequired || candidate.clarificationRequired === true,
  };
};

// Model extraction is useful for a genuinely new, ordinary sentence, but it
// should not add latency to empty/random input, explicit warehouse questions,
// or broad complaints that already have a safe deterministic path. Keep this
// policy in the shared contract so the local service and its tests agree on
// when model work is justified.
export const shouldUseLocalCompiler = ({ text, deterministic, hasPlausibleCandidate = false } = {}) => {
  if (!String(text || '').trim() || isBroadComplaint(deterministic)) return false;
  if (hasPlausibleCandidate || (deterministic?.propositions?.length || 0) > 1) return true;
  if (['mixed', 'causal', 'legal', 'normative', 'predictive'].includes(deterministic?.claimType)) return true;
  const signalCount = compilerSignalTokens(text).length;
  return signalCount >= 3 && String(text).trim().length >= 18;
};
