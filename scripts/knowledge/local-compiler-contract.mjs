import { deterministicFallbackCompiler, knownSemanticConceptIds, propositionShapeFor, semanticSignatureFor } from './fallback-compiler.mjs';
import { preferredMetricIdsForQuery } from './metric-query-hints.mjs';

export const compilerTypes = new Set(['descriptive', 'comparative', 'definition', 'trend', 'causal', 'predictive', 'legal', 'normative', 'mixed']);

export const compilerInstruction = 'Extrae la estructura de esta afirmación en español. No evalúes si es verdadera y no añadas datos. Separa afirmaciones explícitas e implícitas mediante el campo explicit. Si la entrada contiene varias cláusulas independientes unidas por y, pero, porque, aunque o punto y coma, crea una proposición explícita separada para cada afirmación comprobable; no las resumas en una sola. Identifica la población o grupo al que se refiere (por ejemplo residentes, hogares, trabajadores, beneficiarios, inmigrantes, alumnado o pacientes) cuando aparezca. Identifica también qué necesitaríamos medir o comprobar para responder: una lista breve de dimensiones de evidencia como métrica, periodo, territorio, población, denominador, fuente normativa, programa, impacto o comparación. No inventes valores ni fuentes. Para routing, compara la relación completa entre sujeto, acción, resultado, población, métrica, dirección, periodo y territorio: una diferencia de palabras puede ser una paráfrasis (por ejemplo inmigrantes/extranjeros o inseguridad/delincuencia), pero compartir solo un tema no basta. En cada proposición, incluye en concepts únicamente IDs de este vocabulario revisado cuando correspondan: immigration, crime, housing, rental_housing, employment, unemployment, taxes, healthcare, education, prices, hotel_tourism, benefits, budget, politics, cost_of_living, public_finance, public_debt_stock, public_debt_ratio, income, health_access, healthcare_collapse, health_spending, demography, education_outcomes, neet, fixed_discontinuous, crime_reporting, minimum_income, employment_record, law, minimum_wage, pension_system, pension_financing, pension_dependency, environment, justice. No inventes IDs: si ninguno corresponde, devuelve una lista vacía. Solo puedes usar como primarySlug un candidato marcado published que exprese la misma combinación; si cambia la relación, población, métrica, dirección, periodo o territorio, usa uncovered y primarySlug vacío. Nunca uses un candidato internal como primarySlug. Devuelve únicamente JSON según el esquema proporcionado. Sé compacto: no repitas la afirmación, usa como máximo tres retrievalHints y tres evidenceNeeds, deja questions vacío salvo que falte un dato esencial y omite subject/predicate/object si no son necesarios.';

// The local model is a parser, not an evidence source. Keep this schema small
// and bounded so model latency and the amount of untrusted text entering the
// retrieval layer stay predictable.
export const compilerSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['normalized', 'claimType', 'propositions', 'entities', 'numbers', 'geography', 'period', 'population', 'metricIds', 'retrievalHints', 'evidenceNeeds', 'clarificationRequired', 'routing'],
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
          // Ollama may map unfamiliar wording to a reviewed concept ID. The
          // normalizer filters this against the shared registry below.
          concepts: { type: 'array', maxItems: 8, items: { type: 'string', maxLength: 80 } },
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
    metricIds: { type: 'array', maxItems: 8, items: { type: 'string', maxLength: 120 } },
    retrievalHints: { type: 'array', maxItems: 8, items: { type: 'string', maxLength: 120 } },
    evidenceNeeds: { type: 'array', maxItems: 8, items: { type: 'string', maxLength: 120 } },
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

const safeConcepts = (value) => [...new Set(safeList(value, 8, 80)
  .map((item) => item.toLocaleLowerCase('en').trim())
  .filter((item) => knownSemanticConceptIds.has(item)))].slice(0, 8);

// Give the local compiler enough reviewed context to distinguish a paraphrase
// from a merely related topic. This is still a bounded routing hint: the
// compiler cannot publish a candidate without the deterministic score,
// compatibility, and evidence gates in the resolver.
export const formatCompilerCandidates = (candidates = []) => candidates
  .slice(0, 8)
  .map((entry) => {
    const aliases = safeList(entry.aliases, 6, 180).join(' | ') || 'none';
    const type = bounded(entry.claimType, 80) || 'unknown';
    const geography = bounded(entry.geography, 100) || 'unknown';
    const period = bounded(entry.period, 100) || 'unknown';
    const summary = bounded(entry.whatIsTrue, 240) || 'none';
    const limits = bounded(entry.whatIsMissing || entry.cannotProve, 180) || 'none';
    return `${entry.published ? 'published' : 'internal'}:${bounded(entry.slug, 160)} — ${bounded(entry.title, 260)} [type=${type}; geography=${geography}; period=${period}; aliases=${aliases}; summary=${summary}; limits=${limits}]`;
  })
  .join('\n');

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

// Evidence needs are an intent vocabulary, not factual content. Accept only
// bounded methodological labels so a model can say that a claim needs a
// denominator or a legal programme without smuggling in a new number, source,
// or conclusion.
const allowedEvidenceNeeds = new Set([
  'metrica', 'periodo', 'territorio', 'poblacion', 'denominador', 'fuente',
  'norma', 'programa', 'partida', 'importe', 'destino', 'impacto', 'causa',
  'comparacion', 'definicion', 'ejecucion', 'fecha', 'categoria', 'tasa',
]);
const evidenceNeedsList = (value) => [...new Set(safeList(value, 8, 120)
  .map((item) => item.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim())
  .filter((item) => allowedEvidenceNeeds.has(item)))].slice(0, 8);

export const normalizeCompilerOutput = (value, text) => {
  const deterministic = deterministicFallbackCompiler(text);
  const withRegistryMetrics = (result) => ({
    ...result,
    metricIds: [...preferredMetricIdsForQuery(text)].slice(0, 8),
  });
  if (!value || typeof value !== 'object') return withRegistryMetrics(deterministic);
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
        concepts: safeConcepts(item.concepts),
      };
    })
    : [];
  if (!propositions.length) return withRegistryMetrics(deterministic);
  const modelExplicitPropositions = propositions.filter((item) => item.explicit);
  const impliedPropositions = propositions.filter((item) => !item.explicit);
  // A model may collapse a compound sentence into one broad proposition.
  // Deterministic clause splitting is the minimum structural guarantee, so
  // retain every independently testable explicit clause it found and only
  // keep model-implied context around it. This does not add evidence or a
  // conclusion; it prevents information loss before retrieval and rendering.
  const deterministicStructuralTypes = new Set(['trend', 'comparative', 'causal', 'legal', 'normative', 'predictive', 'definition']);
  // The local model can enrich a proposition, but it must not change the
  // structural contract already identified deterministically. In particular,
  // “cada vez llegan más inmigrantes” is a trend; a model may mistake “más”
  // for a group comparison and route it away from the reusable population
  // trend family. Preserve the deterministic proposition whenever it carries
  // a structural type and the model supplied only a competing single shape.
  const modelConflictsWithDeterministicStructure = deterministic.explicitPropositions.length === 1
    && modelExplicitPropositions.length === 1
    && deterministicStructuralTypes.has(deterministic.claimType)
    && modelExplicitPropositions[0]?.type !== deterministic.claimType;
  const explicitPropositions = deterministic.explicitPropositions.length > modelExplicitPropositions.length
    || modelConflictsWithDeterministicStructure
    ? deterministic.explicitPropositions
    : modelExplicitPropositions;
  const normalizedPropositions = [...explicitPropositions, ...impliedPropositions].slice(0, 6);
  const claimType = deterministicStructuralTypes.has(deterministic.claimType)
    ? deterministic.claimType
    : (compilerTypes.has(value.claimType) ? value.claimType : deterministic.claimType);
  const entities = safeRelatedList(value.entities, deterministic.entities, text, 12, 120);
  const geography = safeContextField(value.geography, deterministic.geography, text, 120);
  const period = safeContextField(value.period, deterministic.period, text, 120);
  const population = safeContextField(value.population, deterministic.population, text, 120);
  const numbers = deterministic.numbers.slice(0, 12);
  // Resolve metrics from the shared registry, never from model prose. This
  // lets many surface forms reuse the same evidence series without creating
  // another claim record.
  const metricIds = [...preferredMetricIdsForQuery(text)].slice(0, 8);
  return {
    normalized: bounded(value.normalized, 300) || deterministic.normalized,
    claimType,
    propositions: normalizedPropositions,
    entities,
    numbers,
    geography,
    period,
    population,
    metricIds,
    explicitPropositions,
    impliedPropositions,
    retrievalHints: safeRelatedList(value.retrievalHints, deterministic.retrievalHints, text, 8, 120),
    evidenceNeeds: [...new Set([
      ...evidenceNeedsList(deterministic.evidenceNeeds),
      ...evidenceNeedsList(value.evidenceNeeds),
    ])].slice(0, 8),
    // Never trust the model's signature. The deterministic compiler owns
    // polarity, direction, relation and metric-family boundaries.
    semanticSignature: semanticSignatureFor({
      claimType,
      propositions: normalizedPropositions,
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
  modelMayProvide: ['normalized', 'claimType', 'propositions', 'proposition concepts', 'entities', 'geography', 'period', 'population', 'metricIds', 'retrievalHints', 'evidenceNeeds', 'clarificationRequired', 'routing'],
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
  // Semantic signatures are deterministic-only contract data for every
  // claim type. A descriptive model response must not invent a new concept
  // (for example crime) and use it to promote an adjacent published family.
  // The model can still enrich wording, entities, and retrieval hints.
  if (!safetySensitive) return { ...candidate, semanticSignature: deterministic.semanticSignature, numbers: deterministic.numbers };
  return {
    ...candidate,
    claimType: deterministic.claimType,
    propositions: deterministic.propositions,
    explicitPropositions: deterministic.explicitPropositions,
    impliedPropositions: deterministic.impliedPropositions,
    semanticSignature: deterministic.semanticSignature,
    numbers: deterministic.numbers,
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
