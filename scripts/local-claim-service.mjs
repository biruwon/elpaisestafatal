import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { appendFile, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { handlerForInput, visualBlockForHandler } from './knowledge/handlers.mjs';
import { discoverOfficialDocuments, discoveryObservation } from './knowledge/official-discovery.mjs';
import { approvedSourceHosts } from './knowledge/source-registry.mjs';
import { findWarehouseObservations, populationEvidenceFit, recordedOffenceCategoryForQuery } from './knowledge/warehouse-query.mjs';
import { INPUT_LIMITS, validateInputMetadata } from '../src/lib/knowledge/input-contract.mjs';
import { displayMetric, displayPeriod, summarizeWarehouseTrend } from './knowledge/warehouse-trend.mjs';
import { summarizeWarehouseEuropeanComparison, summarizeWarehouseRanking, summarizeWarehouseRegionalComparison } from './knowledge/warehouse-ranking.mjs';
import { validateAnswerPlan } from './knowledge/answer-plan-validation.mjs';
import { deterministicFallbackCompiler, propositionShapeFor, semanticSignatureFor } from './knowledge/fallback-compiler.mjs';
import { applySafePlanUpgrade, buildEvidencePacket, plannerSchema, validateEvidencePacket } from './knowledge/evidence-packet.mjs';
import { selectCurrentLegalRule } from './knowledge/legal-rules.mjs';
import { discoverBoeLegalRules, isPublicReuseQuery } from './knowledge/boe-legal-discovery.mjs';
import { resolvePublicHttpsUrl } from './knowledge/safe-url.mjs';
import { excludedMetricIdsForQuery, preferredMetricIdsForQuery } from './knowledge/metric-query-hints.mjs';

const root = new URL('../', import.meta.url).pathname;
const port = Number(process.env.LOCAL_CLASSIFIER_PORT || 8789);
const endpoint = process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434';
const classifierToken = process.env.LOCAL_CLASSIFIER_TOKEN || '';
const routerModel = process.env.OLLAMA_ROUTER_MODEL || 'gemma3:4b';
const embedModel = process.env.OLLAMA_EMBED_MODEL || 'bge-m3';
const visionModel = process.env.OLLAMA_VISION_MODEL || 'qwen3-vl:8b';
const answerPlannerEnabled = process.env.LOCAL_ANSWER_PLANNER === '1';
const semanticWarehouseEnabled = process.env.WAREHOUSE_SEMANTIC_SEARCH === '1';
const speechCommand = process.env.LOCAL_SPEECH_COMMAND || process.env.WHISPER_COMMAND || '';
const speechArgs = (() => {
  try { return process.env.LOCAL_SPEECH_ARGS ? JSON.parse(process.env.LOCAL_SPEECH_ARGS) : process.env.WHISPER_ARGS ? JSON.parse(process.env.WHISPER_ARGS) : ['{audio}']; } catch { return ['{audio}']; }
})();
const speechTimeoutMs = Math.min(60000, Math.max(10000, Number(process.env.LOCAL_SPEECH_TIMEOUT_MS || 45000)));
const allowedInferenceHosts = new Set(['127.0.0.1', 'localhost', '::1', 'host.docker.internal']);
const execFileAsync = promisify(execFile);
const catalogUrl = process.env.LOCAL_CATALOG_URL || 'http://127.0.0.1:4321/claim-catalog.json';
const indexPath = join(root, '.local/claim-semantic-index.json');
const warehousePath = join(root, '.local/source-warehouse');
const warehouseIndexPath = join(warehousePath, 'search-index.json');
const knowledgeGapPath = join(root, '.local/knowledge-gaps.jsonl');
const cacheTtlMs = 15 * 60 * 1000;
const maxCacheEntries = 1000;
const maxResolveJobs = 500;
const answerCache = new Map();
const resolveJobs = new Map();
const telemetry = { received: 0, completed: 0, unavailable: 0, cacheHits: 0, cacheMisses: 0, latencies: [], statusCounts: {} };
const inferenceBackoffMs = 30 * 1000;
let inferenceDisabledUntil = 0;
let indexPromise;
let warehousePromise;

const numberWords = { cero: '0', uno: '1', una: '1', dos: '2', tres: '3', cuatro: '4', cinco: '5', seis: '6', siete: '7', ocho: '8', nueve: '9', diez: '10', once: '11', doce: '12', trece: '13', catorce: '14', quince: '15', veinte: '20', treinta: '30', cuarenta: '40', cincuenta: '50', sesenta: '60', setenta: '70', ochenta: '80', noventa: '90', cien: '100', ciento: '100', doscientos: '200', trescientos: '300', cuatrocientos: '400', quinientos: '500', seiscientos: '600', setecientos: '700', ochocientos: '800', novecientos: '900' };
const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/\b(cero|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|veinte|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien|ciento|doscientos|trescientos|cuatrocientos|quinientos|seiscientos|setecientos|ochocientos|novecientos)\b/g, (word) => numberWords[word] || word).replace(/[^a-z0-9]+/g, ' ').trim();
const boundedExcerpt = (value, limit = 900) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length <= limit ? text : `${text.slice(0, limit - 1).trimEnd()}…`;
};
const displayUnit = (value, metricId = '') => {
  const unit = normalise(value);
  if (metricId === 'gini_coefficient') return 'escala Gini 0–100';
  if (metricId === 'life_expectancy_at_birth' || metricId === 'life_expectancy_at_birth_europe') return 'años';
  if (metricId === 'fertility_rate') return 'hijos por mujer';
  if (metricId === 'old_age_dependency_ratio') return 'personas mayores por cada 100 en edad de trabajar';
  if (metricId === 'older_population_share' || metricId === 'young_population_share') return '% de la población';
  if (metricId === 'population_change_rate') return 'por cada 1.000 habitantes';
  if (metricId === 'gdp_current_prices') return 'millones de euros';
  if (metricId === 'gdp_per_capita_current_prices') return '€ por habitante';
  if (metricId === 'gdp_per_capita_europe') return 'PPS por habitante';
  if (metricId === 'minimum_wage_monthly') return '€ al mes';
  if (metricId === 'social_protection_benefits_per_capita') return '€ por habitante';
  if (metricId === 'old_age_survivors_benefits_per_capita') return '€ por habitante';
  if (metricId === 'old_age_survivors_benefits_per_capita_europe') return '€ por habitante';
  if (metricId === 'government_debt_current_prices') return 'millones de euros';
  if (metricId === 'inflation_rate') return '% interanual';
  if (metricId === 'gdp_real_growth_quarterly' || metricId === 'gdp_real_growth_europe' || metricId === 'inflation_rate_europe') return '% interanual';
  if (metricId === 'employment_rate' || metricId === 'employment_rate_europe' || metricId === 'part_time_employment_rate' || metricId === 'part_time_employment_rate_europe' || metricId === 'temporary_employment_rate' || metricId === 'temporary_employment_rate_europe' || metricId === 'unemployment_rate' || metricId === 'unemployment_rate_europe' || metricId === 'youth_unemployment_rate' || metricId === 'youth_unemployment_rate_europe') return '%';
  if (metricId === 'median_hourly_earnings' || metricId === 'median_hourly_earnings_europe') return '€ por hora';
  if (metricId === 'government_revenue_ratio_europe' || metricId === 'government_current_taxes_income_wealth_europe' || metricId === 'government_expenditure_ratio_europe' || metricId === 'government_education_expenditure_ratio' || metricId === 'government_education_expenditure_ratio_europe') return '% del PIB';
  if (metricId === 'health_expenditure_per_capita_europe') return '€ por habitante';
  if (metricId === 'median_equivalised_income_europe') return 'PPS por persona';
  if (metricId === 'early_school_leaving_rate' || metricId === 'early_school_leaving_rate_europe') return '% de personas de 18 a 24 años';
  if (metricId === 'tertiary_education_attainment_rate' || metricId === 'tertiary_education_attainment_rate_europe') return '% de personas de 25 a 34 años';
  if (metricId === 'neet_rate' || metricId === 'neet_rate_europe') return '% de jóvenes de 15 a 29 años';
  if (metricId === 'arope_rate' || metricId === 'arope_rate_europe') return '% de la población';
  if (metricId === 'unmet_healthcare_waiting_list_rate') return '% de población de 16 años o más';
  if (metricId === 'house_price_index') return 'índice (2015=100)';
  if (metricId === 'housing_cost_overburden_rate' || metricId === 'housing_cost_overburden_rate_europe') return '% de la población';
  if (metricId === 'household_electricity_price') return '€ por kWh';
  if (metricId === 'rental_price_index') return 'índice (2015=100)';
  if (metricId === 'resident_population' || metricId === 'foreign_born_population' || metricId === 'foreign_citizenship_population' || metricId === 'immigration_flows') return 'personas';
  if (metricId === 'recorded_offences') return 'delitos registrados';
  if (metricId === 'regional_population_density') return 'personas por km²';
  if (unit === 'percentage of population in the labour force' || unit === 'percentage' || unit === 'percent') return '%';
  if (unit.includes('euro per inhabitant') || unit.includes('euro per capita')) return '€ por habitante';
  if (unit.includes('euro per person') || unit === 'euro') return '€ por persona';
  if (unit.includes('percentage of gross domestic product')) return '% del PIB';
  if (unit.includes('percentage of population')) return '% de la población';
  if (unit.includes('gini scale')) return 'escala Gini 0–100';
  return String(value || '');
};
const displayWarehouseGroup = (item) => {
  const value = normalise(item.dimensionLabels?.geo || item.dimensions?.geo || item.geo || '');
  if (value === 'es' || value === 'espana' || value === 'spain') return 'España';
  if (value === 'eu27 2020' || value === 'eu27_2020' || value.includes('union europea') || value.includes('european union')) return 'Unión Europea';
  return String(item.dimensionLabels?.geo || item.dimensions?.geo || item.id || 'Territorio');
};
const stopWords = new Set(['como', 'esta', 'este', 'para', 'pero', 'que', 'sus', 'tiene', 'una', 'uno', 'en', 'el', 'la', 'los', 'las', 'un', 'del', 'de', 'y', 'o', 'a', 'por', 'con', 'segun', 'dicen', 'dice', 'grupo', 'insiste', 'cuñado', 'cunado', 'he', 'leido', 'hay', 'datos', 'más', 'mas', 'todo', 'va', 'peor', 'verdad', 'cierto', 'cierta', 'mi', 'me', 'creo', 'esto', 'eso']);
const tokens = (value) => [...new Set(normalise(value).split(' ').filter((token) => token.length > 2 && !stopWords.has(token)))];
const includesAny = (value, words) => words.some((word) => value.includes(word));
const canonicalSignatureFor = (value) => tokens(value).join(' ') || normalise(value);
const lowSignalTokens = new Set(['espana', 'pais', 'gente', 'cosas', 'problema', 'problemas']);
const digest = (value) => createHash('sha256').update(value).digest('hex');
const evidenceUnavailableSignal = (value) => includesAny(normalise(value), [
  'sin fuente', 'no tiene fuente', 'sin contexto', 'sin fecha', 'no se ha publicado', 'no publicado',
  'archivo que no', 'no aparece en ningun registro', 'contrato verbal', 'reunion privada',
  'persona particular', 'nadie lo denuncio', 'intencion privada', 'sabia lo que', 'lo oculto',
  'mi experiencia demuestra', 'depende de que poblacion', 'depende del denominador',
  'no sabemos que significa', 'no indica el periodo', 'definiciones diferentes',
]);
const localSpecificClaim = (value) => ['mi calle', 'mi barrio', 'mi portal', 'mi municipio', 'mi pueblo', 'mi edificio', 'mi zona', 'en mi barrio', 'en mi municipio', 'en mi pueblo'].some((phrase) => normalise(value).includes(phrase));

const pruneRuntimeState = () => {
  const now = Date.now();
  for (const [key, item] of answerCache) if (!item || item.expiresAt <= now) answerCache.delete(key);
  for (const [key, item] of resolveJobs) if (!item || (item.completedAt && item.completedAt + cacheTtlMs <= now) || (!item.completedAt && item.createdAt + cacheTtlMs <= now)) resolveJobs.delete(key);
  while (answerCache.size > maxCacheEntries) answerCache.delete(answerCache.keys().next().value);
  while (resolveJobs.size > maxResolveJobs) resolveJobs.delete(resolveJobs.keys().next().value);
};
setInterval(pruneRuntimeState, 60 * 1000).unref();

const recordCompletion = (startedAt, status) => {
  const latency = Math.max(0, Date.now() - startedAt);
  telemetry.completed += 1;
  if (status === 'unavailable') telemetry.unavailable += 1;
  telemetry.statusCounts[status] = (telemetry.statusCounts[status] || 0) + 1;
  telemetry.latencies.push(latency);
  if (telemetry.latencies.length > 200) telemetry.latencies.shift();
};

const percentile = (values, fraction) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
};

const recordKnowledgeGap = async (text, result, inputType = 'text', classified, origin = 'runtime') => {
  if (!['uncovered', 'draft', 'partial'].includes(result.status)) return;
  await appendFile(knowledgeGapPath, `${JSON.stringify({
    createdAt: new Date().toISOString(),
    origin,
    inputType,
    normalized: normalise(text),
    canonical: result.canonicalSignature || canonicalSignatureFor(text),
    semanticSignature: classified?.compiler?.semanticSignature || '',
    status: result.status,
    requestId: result.requestId,
    sourceIds: result.result?.sourceIds || [],
  })}\n`).catch(() => { /* Learning must never block the user response. */ });
};

const checkLocalEndpoint = () => {
  const host = new URL(endpoint).hostname;
  if (!allowedInferenceHosts.has(host)) throw new Error('Inference endpoint is not local');
};

const ollama = async (path, body, timeout = 5000) => {
  checkLocalEndpoint();
  if (Date.now() < inferenceDisabledUntil) throw new Error('Local inference temporarily unavailable');
  try {
    const response = await fetch(`${endpoint}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeout) });
    if (!response.ok) throw new Error(`Inference request failed: ${response.status} ${String(await response.text()).slice(0, 240)}`);
    return response.json();
  } catch (error) {
    inferenceDisabledUntil = Date.now() + inferenceBackoffMs;
    throw error;
  }
};

const parseModelJson = (value) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value || '');
  const object = text.match(/\{[\s\S]*\}/)?.[0];
  try { return object ? JSON.parse(object) : null; } catch { return null; }
};

const planAnswerWithLocalModel = async (text, classified, result, observations) => {
  if (!answerPlannerEnabled || !result?.result) return result?.result;
  const handlerId = handlerForInput(classified.compiler || { retrievalHints: [text] }, classified.compiler?.claimType || '');
  const packet = buildEvidencePacket({ text, compiler: classified.compiler, handlerId, plan: result.result, observations });
  if (!validateEvidencePacket(packet).ok) return result.result;
  const prompt = `Adapta únicamente la presentación de este plan de aclaración en español. No cambies la conclusión, no añadas datos, cifras, fuentes ni bloques. Usa solo la evidencia y el plan suministrados. Devuelve únicamente JSON según el esquema. Si no puedes cumplirlo, devuelve cadenas vacías.\n\nPAQUETE:\n${JSON.stringify(packet).slice(0, 24000)}`;
  try {
    const response = await ollama('/api/chat', { model: routerModel, stream: false, think: false, format: plannerSchema, keep_alive: -1, options: { temperature: 0, num_predict: 420, num_ctx: 8192 }, messages: [{ role: 'user', content: prompt }] }, 2200);
    const draft = parseModelJson(response.message?.content);
    const upgraded = applySafePlanUpgrade(result.result, draft, packet);
    return validateAnswerPlan(upgraded, { provisional: result.status === 'draft' }).ok ? upgraded : result.result;
  } catch {
    return result.result;
  }
};

const compilerSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['normalized', 'claimType', 'propositions', 'entities', 'numbers', 'geography', 'period', 'population', 'retrievalHints', 'clarificationRequired', 'routing'],
  properties: {
    normalized: { type: 'string' },
    claimType: { type: 'string', enum: ['descriptive', 'comparative', 'definition', 'trend', 'causal', 'predictive', 'legal', 'normative', 'mixed'] },
    propositions: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['text', 'type', 'explicit'], properties: { text: { type: 'string' }, type: { type: 'string', enum: ['descriptive', 'comparative', 'definition', 'trend', 'causal', 'predictive', 'legal', 'normative', 'mixed'] }, explicit: { type: 'boolean' }, subject: { type: 'string' }, predicate: { type: 'string' }, object: { type: 'string' } } } },
    entities: { type: 'array', items: { type: 'string' } },
    numbers: { type: 'array', items: { type: 'string' } },
    geography: { type: ['string', 'null'] },
    period: { type: ['string', 'null'] },
    population: { type: ['string', 'null'] },
    retrievalHints: { type: 'array', items: { type: 'string' } },
    semanticSignature: { type: 'string' },
    clarificationRequired: { type: 'boolean' },
    routing: {
      type: 'object',
      additionalProperties: false,
      required: ['status', 'primarySlug', 'reason', 'questions'],
      properties: {
        status: { type: 'string', enum: ['published', 'related', 'uncovered'] },
        primarySlug: { type: 'string' },
        reason: { type: 'string' },
        questions: { type: 'array', items: { type: 'string' } },
      },
    },
  },
};

const fallbackCompiler = deterministicFallbackCompiler;

const compilerTypes = new Set(['descriptive', 'comparative', 'definition', 'trend', 'causal', 'predictive', 'legal', 'normative', 'mixed']);
const normalizeCompiler = (value, text) => {
  if (!value || typeof value !== 'object') return fallbackCompiler(text);
  const propositions = Array.isArray(value.propositions)
    ? value.propositions.filter((item) => item && typeof item.text === 'string' && item.text.trim()).slice(0, 6).map((item) => {
      const shape = propositionShapeFor(item.text);
      return {
        text: item.text.slice(0, 300),
        type: compilerTypes.has(item.type) ? item.type : 'mixed',
        explicit: item.explicit !== false,
        subject: typeof item.subject === 'string' && item.subject.trim() ? item.subject.slice(0, 120) : shape.subject,
        predicate: typeof item.predicate === 'string' && item.predicate.trim() ? item.predicate.slice(0, 80) : shape.predicate,
        object: typeof item.object === 'string' && item.object.trim() ? item.object.slice(0, 120) : shape.object,
      };
    })
    : [];
  if (!propositions.length) return fallbackCompiler(text);
  const explicitPropositions = propositions.filter((item) => item.explicit);
  const impliedPropositions = propositions.filter((item) => !item.explicit);
  return {
    normalized: typeof value.normalized === 'string' && value.normalized.trim() ? value.normalized.slice(0, 300) : text.slice(0, 300),
    claimType: compilerTypes.has(value.claimType) ? value.claimType : 'mixed',
    propositions,
    entities: Array.isArray(value.entities) ? value.entities.filter((item) => typeof item === 'string').slice(0, 12).map((item) => item.slice(0, 120)) : [],
    numbers: Array.isArray(value.numbers) ? value.numbers.filter((item) => typeof item === 'string').slice(0, 12).map((item) => item.slice(0, 80)) : [],
    geography: typeof value.geography === 'string' ? value.geography.slice(0, 120) : null,
    period: typeof value.period === 'string' ? value.period.slice(0, 120) : null,
    population: typeof value.population === 'string' ? value.population.slice(0, 120) : null,
    explicitPropositions,
    impliedPropositions,
    retrievalHints: Array.isArray(value.retrievalHints) ? value.retrievalHints.filter((item) => typeof item === 'string').slice(0, 8).map((item) => item.slice(0, 120)) : [],
    semanticSignature: typeof value.semanticSignature === 'string' && value.semanticSignature.trim()
      ? value.semanticSignature.slice(0, 600)
      : semanticSignatureFor({ claimType: compilerTypes.has(value.claimType) ? value.claimType : 'mixed', propositions, entities: Array.isArray(value.entities) ? value.entities : [], geography: typeof value.geography === 'string' ? value.geography : null, period: typeof value.period === 'string' ? value.period : null, population: typeof value.population === 'string' ? value.population : null, numbers: Array.isArray(value.numbers) ? value.numbers : [], negated: /\b(?:no|nunca|jamas|nadie|ningun|ninguna)\b/i.test(String(value.normalized || text)) }),
    clarificationRequired: value.clarificationRequired === true,
    routing: value.routing && typeof value.routing === 'object' ? {
      status: ['published', 'related', 'uncovered'].includes(value.routing.status) ? value.routing.status : 'uncovered',
      primarySlug: typeof value.routing.primarySlug === 'string' ? value.routing.primarySlug.slice(0, 160) : '',
      reason: typeof value.routing.reason === 'string' ? value.routing.reason.slice(0, 220) : '',
      questions: Array.isArray(value.routing.questions) ? value.routing.questions.filter((item) => typeof item === 'string').slice(0, 2).map((item) => item.slice(0, 220)) : [],
    } : { status: 'uncovered', primarySlug: '', reason: '', questions: [] },
  };
};

const compileClaim = async (text, candidates = []) => {
  const candidateText = candidates.length
    ? candidates.map((entry) => `${entry.published ? 'published' : 'internal'}:${entry.slug} — ${entry.title}`).join('\n')
    : 'ninguno';
  const prompt = `Extrae la estructura de esta afirmación en español. No evalúes si es verdadera y no añadas datos. Separa afirmaciones explícitas e implícitas mediante el campo explicit. Identifica la población o grupo al que se refiere (por ejemplo residentes, hogares, trabajadores, beneficiarios, inmigrantes, alumnado o pacientes) cuando aparezca. En routing solo puedes usar como primarySlug un candidato marcado published que exprese la misma afirmación; si solo comparte tema o no hay coincidencia, usa uncovered y primarySlug vacío. Devuelve únicamente JSON según el esquema proporcionado.\n\nAfirmación:\n${text.slice(0, 4000)}\n\nCandidatos:\n${candidateText.slice(0, 5000)}`;
  try {
    const response = await ollama('/api/chat', { model: routerModel, stream: false, think: false, format: compilerSchema, keep_alive: -1, options: { temperature: 0, num_predict: 240, num_ctx: 3072 }, messages: [{ role: 'user', content: prompt }] }, 1800);
    const value = parseModelJson(response.message?.content);
    if (!value || !Array.isArray(value.propositions)) return fallbackCompiler(text);
    return normalizeCompiler(value, text);
  } catch { return fallbackCompiler(text); }
};

// The local model can improve phrasing, but it must not weaken a deterministic
// safety classification. In particular, broad evaluative complaints sometimes
// get an over-specific model route when a nearby official document is present.
// Keep the deterministic proposition set, retrieval hints, and uncovered route
// for those inputs so unrelated evidence cannot leak into the answer.
const reconcileCompilerSafety = (text, deterministic, candidate) => {
  if (!candidate || !deterministic?.clarificationRequired) return candidate || deterministic;
  return {
    ...candidate,
    claimType: deterministic.claimType,
    propositions: deterministic.propositions,
    explicitPropositions: deterministic.explicitPropositions,
    impliedPropositions: deterministic.impliedPropositions,
    entities: deterministic.entities,
    numbers: deterministic.numbers,
    geography: deterministic.geography,
    period: deterministic.period,
    population: deterministic.population,
    retrievalHints: deterministic.retrievalHints,
    semanticSignature: deterministic.semanticSignature,
    clarificationRequired: true,
    routing: deterministic.routing,
    normalized: deterministic.normalized || text.slice(0, 300),
  };
};

const extractImageText = async (media) => {
  if (!media?.base64) return '';
  const response = await ollama('/api/chat', { model: visionModel, stream: false, think: false, keep_alive: '10m', options: { temperature: 0, num_predict: 700, num_ctx: 4096 }, messages: [{ role: 'user', content: 'Extrae el texto visible y describe brevemente las afirmaciones, cifras, fechas y entidades que aparecen. No evalúes si son verdaderas. Devuelve texto plano conciso.', images: [media.base64] }] }, 30000);
  return String(response.message?.content || '').trim().slice(0, 8000);
};

const transcribeAudio = async (media) => {
  if (!media?.base64 || !speechCommand) throw new Error('No local speech runtime configured');
  const directory = await mkdtemp(join(root, '.local/audio-'));
  const extension = media.mime === 'audio/wav' ? '.wav' : media.mime === 'audio/ogg' ? '.ogg' : media.mime === 'audio/webm' ? '.webm' : '.m4a';
  const audioPath = join(directory, `input${extension}`);
  try {
    await writeFile(audioPath, Buffer.from(media.base64, 'base64'));
    const args = speechArgs.map((arg) => String(arg).replaceAll('{audio}', audioPath));
    const response = await execFileAsync(speechCommand, args, { timeout: speechTimeoutMs, maxBuffer: 2 * 1024 * 1024, windowsHide: true });
    const text = String(response.stdout || '').trim().slice(0, 12000);
    if (!text) throw new Error('Transcription returned no text');
    return text;
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => { /* Best-effort cleanup. */ });
  }
};

const sourceHostAllowed = (hostname) => approvedSourceHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
const extractPageText = async (value) => {
  let url = await resolvePublicHttpsUrl(value);
  let response;
  for (let redirect = 0; redirect <= 2; redirect += 1) {
    response = await fetch(url, { redirect: 'manual', headers: { accept: 'text/html,application/json,text/plain;q=0.9' }, signal: AbortSignal.timeout(12000) });
    if (response.status < 300 || response.status >= 400) break;
    const location = response.headers.get('location');
    if (!location || redirect === 2) throw new Error('Too many redirects');
    url = await resolvePublicHttpsUrl(new URL(location, url).toString());
  }
  if (!response?.ok) throw new Error(`Source returned ${response?.status || 502}`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('html') && !contentType.includes('json') && !contentType.includes('text/')) throw new Error('Unsupported source format');
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks = [];
  let total = 0;
  while (total < 2 * 1024 * 1024) {
    const part = await reader.read();
    if (part.done) break;
    const remaining = Math.min(part.value.byteLength, 2 * 1024 * 1024 - total);
    chunks.push(Buffer.from(part.value.slice(0, remaining)));
    total += remaining;
    if (remaining < part.value.byteLength) break;
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return contentType.includes('html') ? raw.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 20000) : raw.slice(0, 20000);
};

const searchText = (entry) => [entry.title, ...(entry.aliases || []), ...(entry.keywords || [])].join(' ');
const oneEditAway = (left, right) => {
  if (left === right) return true;
  if (Math.abs(left.length - right.length) > 1 || Math.min(left.length, right.length) < 4) return false;
  if (left.length === right.length) {
    for (let index = 0; index < left.length - 1; index += 1) {
      if (left[index] === right[index + 1] && left[index + 1] === right[index] && left.slice(0, index) === right.slice(0, index) && left.slice(index + 2) === right.slice(index + 2)) return true;
    }
  }
  let edits = 0; let i = 0; let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) { i += 1; j += 1; continue; }
    edits += 1;
    if (edits > 1) return false;
    if (left.length > right.length) i += 1;
    else if (right.length > left.length) j += 1;
    else { i += 1; j += 1; }
  }
  return edits + (left.length - i) + (right.length - j) <= 1;
};
const lexicalScore = (query, entry) => {
  const queryText = normalise(query);
  const phrases = [entry.title, ...(entry.aliases || [])].map(normalise).filter(Boolean);
  const haystack = normalise(searchText(entry));
  if (!queryText || !haystack) return 0;
  // Score a complete title/alias before token overlap. Joining every alias
  // into one haystack can make an unrelated family look like an exact match
  // when its words happen to occur across different aliases.
  if (phrases.some((phrase) => phrase === queryText)) return 1;
  const phraseContained = (text, phrase) => ` ${text} `.includes(` ${phrase} `);
  if (phrases.some((phrase) => phrase.length >= 10 && (phraseContained(phrase, queryText) || phraseContained(queryText, phrase)))) return 0.9;
  const wanted = tokens(queryText).filter((token) => !lowSignalTokens.has(token));
  if (!wanted.length) return 0;
  // Keep aliases as separate phrases. Joining every alias into one token set
  // can create a false exact match from words that never appeared together
  // in the same published formulation.
  return Math.max(...phrases.map((phrase) => {
    const available = new Set(tokens(phrase));
    return wanted.filter((token) => available.has(token) || [...available].some((candidate) => oneEditAway(token, candidate))).length / wanted.length;
  }), 0);
};

const warehouseTokens = (value) => tokens(value).filter((token) => token.length > 3);
const loadWarehouse = async () => {
  if (warehousePromise) return warehousePromise;
  warehousePromise = (async () => {
    let files;
    try { files = (await readdir(join(warehousePath, 'manifests'))).filter((file) => file.endsWith('.json')); } catch { return []; }
    const manifests = [];
    for (const file of files.slice(0, 2000)) {
      try {
        const manifest = JSON.parse(await readFile(join(warehousePath, 'manifests', file), 'utf8'));
        if (manifest?.url && (manifest.trust === 'primary' || manifest.trust === 'approved-domain')) manifests.push(manifest);
      } catch { /* Validation reports malformed manifests separately. */ }
    }
    const signature = digest(JSON.stringify(manifests.map(({ id, sha256, url, publisher, title, aliases }) => ({ id, sha256, url, publisher, title, aliases }))));
    try {
      const cached = JSON.parse(await readFile(warehouseIndexPath, 'utf8'));
      if (cached.signature === signature && Array.isArray(cached.entries)) return cached.entries;
    } catch { /* Build the derived index. */ }
    const entries = [];
    for (const manifest of manifests) {
      try {
        let content = `${manifest.publisher || ''} ${manifest.title || ''} ${(manifest.aliases || []).join(' ')} ${manifest.url}`;
        try { content += ` ${await readFile(manifest.objectPath, 'utf8')}`; } catch { /* Metadata remains searchable. */ }
        entries.push({ id: manifest.id, title: manifest.title || `${manifest.publisher || 'Fuente oficial'} · ${new URL(manifest.url).hostname}`, url: manifest.url, text: content.slice(0, 120000) });
      } catch { /* Ignore malformed source manifests; validation reports them separately. */ }
    }
    await writeFile(warehouseIndexPath, JSON.stringify({ signature, entries }));
    return entries;
  })();
  return warehousePromise;
};

const findWarehouseSource = async (query) => {
  const wanted = warehouseTokens(query);
  const locationOnly = new Set(['espana', 'espanol', 'espanola', 'europa', 'europea', 'europeo', 'pais', 'paises', 'nacional', 'nacionales', 'actual', 'actualidad', 'hoy']);
  const subjectWanted = wanted.filter((token) => !locationOnly.has(token));
  if (wanted.length < 2) return null;
  if (!subjectWanted.length) return null;
  const entries = await loadWarehouse();
  const ranked = entries.filter((entry) => !normalise(entry.title).includes('sumario diario')).map((entry) => {
    const available = new Set(warehouseTokens(entry.text));
    const matched = wanted.filter((token) => available.has(token)).length;
    const matchedSubject = subjectWanted.filter((token) => available.has(token)).length;
    return { entry, score: matched / wanted.length, matched, matchedSubject };
  }).filter(({ score, matched, matchedSubject }) => score >= 0.34 && matched >= 2 && matchedSubject >= 1).sort((left, right) => right.score - left.score);
  const top = ranked[0];
  return top ? { id: top.entry.id, title: top.entry.title, url: top.entry.url, score: top.score } : null;
};

const observationSeriesKey = (item) => {
  const dimensions = Object.entries(item.dimensions || {})
    .filter(([key]) => !['time', 'period', 'year'].includes(normalise(key)))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');
  return [item.source?.id, item.datasetId, item.metricId, item.metric, item.unit, dimensions].join('::');
};

const selectCompatibleWarehouseSeries = (query, observations) => {
  if (observations.length < 2) return observations;
  const wantsChange = includesAny(normalise(query), ['aumenta', 'aumento', 'sube', 'subida', 'crece', 'crecimiento', 'cae', 'baja', 'variacion', 'cambio', 'rate', 'change', 'growth']);
  const grouped = new Map();
  for (const observation of observations) {
    const key = observationSeriesKey(observation);
    const group = grouped.get(key) || [];
    group.push(observation);
    grouped.set(key, group);
  }
  const groups = [...grouped.values()];
  const ranked = groups.map((group) => {
    const units = normalise(group[0]?.unit);
    const unitPreference = wantsChange
      ? (includesAny(units, ['rate', 'change', 'variacion', 'growth', 'percent', 'porcentaje']) ? 0.3 : 0)
      : (includesAny(units, ['index', 'indice', 'level', 'nivel']) ? 0.3 : 0);
    return { group, score: unitPreference + Math.max(...group.map((item) => item.score || 0)) + Math.min(group.length, 24) / 1000 };
  }).sort((left, right) => right.score - left.score);
  const selected = ranked[0]?.group || observations;
  return selected.slice().sort((left, right) => String(left.period || '').localeCompare(String(right.period || ''))).slice(-12);
};

const findWarehouseEvidence = async (query, compiler, queryEmbedding) => {
  const normalizedQuery = normalise(query);
  const explicitComparison = /\b(?:mas|menos|mayor|menor|superior|inferior)\b[\s\S]{0,80}\b(?:que|frente a|comparad)\b/.test(normalizedQuery)
    || /\b(?:que|frente a|comparad)\b[\s\S]{0,80}\b(?:mas|menos|mayor|menor|superior|inferior)\b/.test(normalizedQuery);
  const rankingQuery = normalizedQuery.includes('europa') || normalizedQuery.includes('ranking') || normalizedQuery.includes('mas alta') || normalizedQuery.includes('mas baja') || normalizedQuery.includes('mayor') || normalizedQuery.includes('menor') || normalizedQuery.includes('puesto') || explicitComparison;
  const meaningfulTerms = tokens(query).filter((token) => !lowSignalTokens.has(token));
  const locationOnlyTerms = new Set(['europa', 'europea', 'europeo', 'pais', 'paises', 'nacional', 'nacionales', 'actual', 'actualidad', 'hoy']);
  const subjectTerms = meaningfulTerms.filter((term) => !locationOnlyTerms.has(term));
  const hintedMetricIds = preferredMetricIdsForQuery(normalizedQuery);
  const excludedMetricIds = excludedMetricIdsForQuery(normalizedQuery);
  // A hinted metric can legitimately have more than 100 observations (for
  // example monthly inflation). Keep the broad path small, but let an
  // explicit metric retrieve enough of its own series to retain the latest
  // periods for the chart.
  const comparisonMetricRoute = hintedMetricIds.has('gdp_real_growth_europe') || hintedMetricIds.has('gdp_per_capita_europe') || hintedMetricIds.has('inflation_rate_europe') || hintedMetricIds.has('employment_rate_europe') || hintedMetricIds.has('part_time_employment_rate_europe') || hintedMetricIds.has('temporary_employment_rate_europe') || hintedMetricIds.has('median_hourly_earnings_europe') || hintedMetricIds.has('housing_cost_overburden_rate_europe') || hintedMetricIds.has('youth_unemployment_rate_europe') || hintedMetricIds.has('early_school_leaving_rate_europe') || hintedMetricIds.has('tertiary_education_attainment_rate_europe') || hintedMetricIds.has('neet_rate_europe') || hintedMetricIds.has('arope_rate_europe') || hintedMetricIds.has('life_expectancy_at_birth_europe') || hintedMetricIds.has('unmet_healthcare_waiting_list_rate_europe') || hintedMetricIds.has('government_revenue_ratio_europe') || hintedMetricIds.has('government_current_taxes_income_wealth_europe') || hintedMetricIds.has('government_expenditure_ratio_europe') || hintedMetricIds.has('government_education_expenditure_ratio_europe') || hintedMetricIds.has('health_expenditure_per_capita_europe') || hintedMetricIds.has('median_equivalised_income_europe') || hintedMetricIds.has('old_age_survivors_benefits_per_capita_europe') || hintedMetricIds.has('household_electricity_price_europe');
  const candidateLimit = comparisonMetricRoute ? 500 : hintedMetricIds.size ? 250 : 100;
  const candidates = (await findWarehouseObservations(query, candidateLimit, { queryEmbedding, metricIds: hintedMetricIds })).filter((item) => {
    const explicitMetricCandidate = hintedMetricIds.has(item.metricId) && (item.matchedTerms?.length || 0) >= 2;
    if (item.evidenceFit === 'weak' && !explicitMetricCandidate && !(['legal_document', 'legal_rule'].includes(item.kind) && item.matchedTerms?.length >= 3)) return false;
    if (item.freshness === 'stale' || item.freshness === 'invalid') return false;
    if (['official_publication', 'legal_document', 'legal_rule'].includes(item.kind) && item.matchedTerms?.length < Math.min(3, meaningfulTerms.length)) return false;
    // A location or comparison word alone is not evidence of subject fit.
    const semanticQualified = item.semanticScore >= 0.42 && item.retrievalChannels?.includes('semantic');
    if (subjectTerms.length && !(item.matchedTerms || []).some((term) => subjectTerms.includes(term)) && !semanticQualified) return false;
    const populationFit = populationEvidenceFit(compiler?.population, item);
    // A direct regional-density hint is more specific than a small model's
    // inferred population label. Do not let an accidental age/group label
    // discard the requested territory series and fall through to an unrelated
    // demographic answer.
    if (populationFit === 'mismatch' && !hintedMetricIds.has('regional_population_density')) return false;
    item.populationFit = populationFit;
    return true;
  });
  // A shared word such as "paro" can match both the all-age and youth series.
  // Prefer an explicit population/subject signal before selecting a compatible
  // series, otherwise the larger generic family can win on tie-breaks and
  // silently answer a different question.
  const metricCandidates = hintedMetricIds.size
    ? candidates.filter((item) => hintedMetricIds.has(item.metricId))
    : candidates.filter((item) => !excludedMetricIds.has(item.metricId));
  const compatibleCandidates = metricCandidates.length >= 2 ? metricCandidates : candidates.filter((item) => !excludedMetricIds.has(item.metricId));
  const observations = rankingQuery ? compatibleCandidates : compiler?.claimType === 'legal' ? compatibleCandidates : selectCompatibleWarehouseSeries(query, compatibleCandidates);
  const source = (rankingQuery ? observations.find((item) => item.source?.title && normalise(item.source.title).includes('europa')) : null)?.source || observations.find((item) => item.source)?.source;
  return { observations, source };
};

const hasNonTotalGroupDimension = (item) => {
  const groupKeys = ['nacionalidad', 'nationality', 'sexo', 'sex', 'edad', 'age', 'grupo', 'group', 'poblacion', 'population', 'beneficiario', 'beneficiary', 'hogar', 'household'];
  const totalValues = new Set(['total', 't', 'all', 'todos', 'todas', 'y_total', 'nr']);
  return Object.entries({ ...(item.dimensions || {}), ...(item.dimensionLabels || {}) })
    .some(([key, value]) => groupKeys.some((term) => normalise(key).includes(term)) && !totalValues.has(normalise(value)));
};

const observationText = (item) => normalise([
  item.metric,
  item.datasetId,
  JSON.stringify(item.dimensions || {}),
  JSON.stringify(item.dimensionLabels || {}),
  item.source?.title,
  ...(item.source?.aliases || []),
].join(' '));

const directGroupObservations = (query, observations) => {
  const queryText = normalise(query);
  const requestedGroup = includesAny(queryText, ['inmigr', 'extranj', 'nacionalidad', 'foreign', 'espanol', 'espanola', 'hombre', 'mujer', 'edad', 'joven', 'mayor', 'benefici', 'ayudas']);
  if (!requestedGroup) return [];
  const measureFamilies = [
    { query: ['ayud', 'prestacion', 'benefici', 'subsid', 'pension'], evidence: ['ayud', 'prestacion', 'benefici', 'subsid', 'pension'] },
    { query: ['delinc', 'crimen', 'delito', 'seguridad', 'insegur'], evidence: ['delinc', 'crimen', 'delito', 'seguridad', 'insegur', 'offence', 'crime'] },
    { query: ['empleo', 'trabaj', 'paro', 'desemple', 'ocup'], evidence: ['empleo', 'trabaj', 'paro', 'desemple', 'ocup', 'employment', 'unemployment'] },
    { query: ['viviend', 'alquiler', 'casa', 'precio'], evidence: ['viviend', 'alquiler', 'casa', 'precio', 'housing', 'rent'] },
    { query: ['poblacion', 'habit', 'nacid', 'ciudadan', 'inmigr', 'migr'], evidence: ['poblacion', 'habit', 'nacid', 'ciudadan', 'inmigr', 'migr', 'population', 'birth', 'citizen'] },
    { query: ['sanidad', 'salud', 'hospital', 'medic'], evidence: ['sanidad', 'salud', 'hospital', 'medic', 'health'] },
  ];
  const family = measureFamilies.find((candidate) => includesAny(queryText, candidate.query));
  if (!family) return [];
  return observations.filter((item) => hasNonTotalGroupDimension(item) && includesAny(observationText(item), family.evidence));
};

const parseSpanishNumber = (value) => {
  const textual = normalise(value);
  if (/[a-z]/.test(textual) && /\b(?:mil|millones?|billones?)\b/.test(textual)) {
    let total = 0;
    let current = 0;
    for (const token of textual.split(' ')) {
      if (/^\d+$/.test(token)) current += Number(token);
      else if (token === 'mil') { total += (current || 1) * 1e3; current = 0; }
      else if (/^millones?$/.test(token)) { total += (current || 1) * 1e6; current = 0; }
      else if (/^billones?$/.test(token)) { total += (current || 1) * 1e9; current = 0; }
    }
    const parsedTextual = total + current;
    if (Number.isFinite(parsedTextual) && parsedTextual > 0) return parsedTextual;
  }
  const raw = String(value || '').replace(/\s/g, '');
  if (!raw) return null;
  const normalized = raw.includes(',') && raw.includes('.')
    ? raw.lastIndexOf(',') > raw.lastIndexOf('.') ? raw.replaceAll('.', '').replace(',', '.') : raw.replaceAll(',', '')
    : raw.includes(',') ? raw.replace(',', '.') : raw;
  const parsed = Number(normalized.replace(/[^0-9.%+-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const claimedNumericValue = (text, compiler) => {
  const candidates = Array.isArray(compiler?.numbers) ? compiler.numbers : [];
  for (const raw of candidates) {
    const value = parseSpanishNumber(raw);
    if (value === null) continue;
    const position = normalise(text).indexOf(normalise(raw));
    const context = normalise(text).slice(Math.max(0, position - 18), position + 40);
    const isAgeDimension = (includesAny(context, ['mayor', 'menor']) && includesAny(context, ['anos', 'edad']))
      || (includesAny(context, ['de mas de', 'de menos de', 'mas de', 'menos de']) && includesAny(context, ['anos', 'edad']));
    const isDenominator = includesAny(context, ['por cada', 'cada']) && includesAny(context, ['edad', 'trabajar', 'poblacion', 'personas']);
    if (isAgeDimension || isDenominator) continue;
    let multiplier = 1;
    if (includesAny(context, ['billones', 'billon'])) multiplier = 1e9;
    else if (includesAny(context, ['millones', 'millon'])) multiplier = 1e6;
    else if (includesAny(context, ['miles', 'mil'])) multiplier = 1e3;
    const percentage = raw.includes('%') || includesAny(context, ['por ciento', 'porcentaje', 'proporcion', 'mayoria', 'minoría', 'minoria']);
    return { raw, value: value * multiplier, percentage };
  }
  return null;
};

const observationIsPercentage = (item) => includesAny(normalise(`${item.unit || ''} ${item.metric || ''} ${item.datasetId || ''}`), ['%', 'percent', 'porcentaje', 'rate', 'tasa', 'share', 'proporcion']);

const quantityAssessment = (text, compiler, observations) => {
  const claim = claimedNumericValue(text, compiler);
  const numeric = observations.filter((item) => typeof item.value === 'number' && Number.isFinite(item.value));
  if (!claim || !numeric.length) return null;
  const compatible = numeric.filter((item) => observationIsPercentage(item) === claim.percentage);
  if (!compatible.length) return null;
  const ordered = compatible.slice().sort((left, right) => String(left.period || '').localeCompare(String(right.period || '')));
  const latest = ordered.at(-1);
  const relativeError = Math.abs(Number(latest.value) - claim.value) / Math.max(Math.abs(claim.value), 1);
  const tolerance = claim.percentage ? 0.04 : 0.08;
  const matches = relativeError <= tolerance;
  return {
    claim,
    observation: latest,
    relativeError,
    matches,
    observations: ordered.slice(-12),
    headline: matches ? 'La cifra es compatible con la serie localizada' : 'La cifra no coincide con la serie localizada',
    summary: matches
      ? `La cifra indicada (${claim.raw}) está dentro del margen de aproximación de la última observación disponible (${latest.value}${observationIsPercentage(latest) ? '%' : ''}).`
      : `La afirmación indica ${claim.raw}, pero la última observación comparable es ${latest.value}${observationIsPercentage(latest) ? '%' : ''}. La diferencia debe comprobarse antes de aceptar la cifra.`,
    points: [
      `Afirmación: ${claim.raw}${claim.percentage ? '' : ' unidades aproximadas'}.`,
      `Serie localizada: ${latest.value}${observationIsPercentage(latest) ? '%' : ` · ${latest.period || 'último periodo'}`}.`,
      matches ? 'La diferencia está dentro de un margen razonable para una formulación aproximada.' : 'La diferencia supera el margen razonable para una formulación aproximada.',
    ],
    reply: matches
      ? `La cifra puede ser una aproximación: la última observación comparable es ${latest.value}${observationIsPercentage(latest) ? '%' : ''}. Conviene citar el periodo y la definición exacta.`
      : `La cifra no coincide con la última observación comparable (${latest.value}${observationIsPercentage(latest) ? '%' : ''}). Antes de compartirla habría que comprobar el periodo, la unidad y la población.`,
  };
};

const cosine = (left, right) => {
  if (!left || !right || left.length !== right.length) return 0;
  let score = 0;
  for (let index = 0; index < left.length; index += 1) score += left[index] * right[index];
  return Math.max(0, Math.min(1, (score + 1) / 2));
};

const frontmatter = (raw) => Object.fromEntries((raw.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] || '').split('\n').map((line) => {
  const separator = line.indexOf(':');
  return separator >= 0 ? [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')] : ['', ''];
}).filter(([key]) => key));
const jsonField = (value) => { try { return JSON.parse(value); } catch { return value ? [value] : []; } };

const plannedClaims = async () => {
  const files = await readdir(join(root, 'content/claims'));
  return Promise.all(files.filter((file) => file.endsWith('.md')).map(async (file) => {
    const data = frontmatter(await readFile(join(root, 'content/claims', file), 'utf8'));
    if (data.status === 'published') return null;
    const claimField = jsonField(data.claim);
    const title = Array.isArray(claimField) ? claimField[0] : claimField;
    return { kind: 'claim', slug: data.slug || file.replace(/\.md$/, ''), title: String(title || data.slug), href: '', aliases: jsonField(data.aliases), keywords: jsonField(data.topicSlugs), published: false };
  })).then((entries) => entries.filter(Boolean));
};

const fetchCatalog = async () => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(catalogUrl, { signal: AbortSignal.timeout(350) });
      if (response.ok) return response.json();
    } catch { /* The Astro server may still be starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return [];
};

const getIndex = async () => {
  if (indexPromise) return indexPromise;
  indexPromise = (async () => {
    const entries = [...(await fetchCatalog()).map((entry) => ({ ...entry, published: true })), ...(await plannedClaims())];
    const signature = digest(JSON.stringify(entries) + embedModel);
    try {
      const saved = JSON.parse(await readFile(indexPath, 'utf8'));
      if (saved.signature === signature) return saved;
    } catch { /* Rebuild the local index. */ }
    let embeddings = [];
    try { embeddings = (await ollama('/api/embed', { model: embedModel, input: entries.map(searchText), keep_alive: -1 }, 30000)).embeddings || []; } catch { /* Lexical fallback. */ }
    const value = { signature, entries, embeddings };
    await writeFile(indexPath, JSON.stringify(value));
    return value;
  })();
  return indexPromise;
};

const classify = async (text) => {
  // Do not reuse a result generated for a different conversational wrapper.
  // “La sanidad está colapsada” and “¿Es verdad que la sanidad está
  // colapsada?” share a canonical signature, but the compiler can make
  // different decisions for them. Meaning-level caching can be reintroduced
  // only for validated, representation-independent answer plans.
  const key = normalise(text);
  const cached = answerCache.get(key);
  if (cached && cached.expiresAt > Date.now()) { telemetry.cacheHits += 1; return cached.value; }
  if (cached) answerCache.delete(key);
  telemetry.cacheMisses += 1;
  const index = await getIndex();
  const deterministicCompiler = fallbackCompiler(text);
  const deterministicHandler = handlerForInput(deterministicCompiler, deterministicCompiler.claimType);
  const lexicalRanked = index.entries.map((entry, position) => ({ entry, position, lexical: lexicalScore(text, entry) })).sort((left, right) => right.lexical - left.lexical);
  let vector = null;
  // Do not pay for an embedding request for obvious long-tail text. Exact and
  // alias matches are already covered lexically; semantic retrieval is only
  // useful when the input has a plausible relation to the published index.
  if ((lexicalRanked[0]?.lexical || 0) >= 0.1) {
    try { vector = (await ollama('/api/embed', { model: embedModel, input: text.slice(0, 4000), keep_alive: -1 }, 3000)).embeddings?.[0] || null; } catch { /* Keep lexical matching. */ }
  }
  const ranked = lexicalRanked.map(({ entry, position, lexical }) => ({ entry, lexical, semantic: cosine(vector, index.embeddings[position]) })).map((item) => {
    // Semantic similarity is useful for paraphrases, but it must not outrank
    // distinctive words in a short political claim. Keep lexical evidence
    // dominant whenever the user supplied a meaningful direct match.
    const lexicalWeight = item.lexical >= 0.55 ? 0.75 : 0.55;
    return { ...item, score: vector ? item.lexical * lexicalWeight + item.semantic * (1 - lexicalWeight) : item.lexical };
  }).sort((a, b) => b.score - a.score);
  // Derive compatibility from each canonical claim wording as well as its
  // metadata. Keywords often describe a broad topic and can incorrectly make
  // a prediction look compatible with a descriptive query. Apply this gate
  // to both the fast path and the model-selected path; otherwise the local
  // model can reintroduce an incompatible candidate after deterministic
  // matching correctly rejected it.
  const handlerForEntry = (entry) => handlerForInput({ retrievalHints: [entry.title, ...(entry.keywords || [])], entities: entry.aliases || [] }, entry.claimType);
  const explicitGroupContrast = (value) => {
    const normalized = normalise(value);
    return /\b(?:mas|menos|mayor|menor|superior|inferior)\b[\s\S]{0,80}\b(?:que|frente a|comparad[oa]s?)\b/.test(normalized)
      || /\b(?:que|frente a|comparad[oa]s?)\b[\s\S]{0,80}\b(?:mas|menos|mayor|menor|superior|inferior)\b/.test(normalized);
  };
  const requestedGroupContrast = explicitGroupContrast(text);
  const numericTokens = (value) => [...normalise(value).matchAll(/\b\d+(?:[.,]\d+)?\b/g)].map((match) => match[0].replace(',', '.'));
  const numericCompatible = (entry) => {
    if (entry.kind !== 'claim') return true;
    const queryNumbers = numericTokens(text);
    const entryNumbers = numericTokens(searchText(entry));
    return !(queryNumbers.length && entryNumbers.length) || queryNumbers.some((number) => entryNumbers.includes(number));
  };
  const compatibleEntry = (entry) => {
    const exactCanonicalTitle = entry.kind === 'claim' && normalise(entry.title) === normalise(text);
    if (exactCanonicalTitle) return true;
    if (!numericCompatible(entry)) return false;
    if (entry.kind !== 'claim' || !deterministicHandler || deterministicHandler === 'mixed') return true;
    // A published group claim about eligibility or participation must not
    // answer a stronger comparative statement unless the published wording
    // actually contains the comparison. Similar vocabulary is not evidence
    // that the same two groups were measured against each other.
    if (deterministicHandler === 'group_comparison' && requestedGroupContrast && !explicitGroupContrast(searchText(entry))) return false;
    return handlerForEntry(entry) === deterministicHandler;
  };
  const normalizedQuery = normalise(text);
  const suppressPublishedContext = localSpecificClaim(text) || evidenceUnavailableSignal(text);
  const nearCanonicalEntry = ({ entry, lexical }) => entry.kind === 'claim' && lexical >= 0.9;
  const publicRanked = suppressPublishedContext ? [] : ranked.filter((item) => item.entry.published && numericCompatible(item.entry) && (compatibleEntry(item.entry) || nearCanonicalEntry(item)));
  const queryMeaningfulTokens = tokens(text).filter((token) => !lowSignalTokens.has(token));
  const phraseTokenExact = (entry) => entry.kind === 'claim' && [entry.title, ...(entry.aliases || [])].some((phrase) => {
    const phraseTokens = tokens(phrase).filter((token) => !lowSignalTokens.has(token));
    return phraseTokens.length === queryMeaningfulTokens.length && phraseTokens.every((phraseToken) => queryMeaningfulTokens.some((queryToken) => oneEditAway(queryToken, phraseToken)));
  });
  const phraseTokenHasTypo = (entry) => entry.kind === 'claim' && [entry.title, ...(entry.aliases || [])].some((phrase) => {
    const phraseTokens = tokens(phrase).filter((token) => !lowSignalTokens.has(token));
    const matches = phraseTokens.length === queryMeaningfulTokens.length && phraseTokens.every((phraseToken) => queryMeaningfulTokens.some((queryToken) => oneEditAway(queryToken, phraseToken)));
    return matches && phraseTokens.some((phraseToken) => !queryMeaningfulTokens.includes(phraseToken));
  });
  // Curated titles and aliases are an explicit publication contract. Resolve
  // them before handler compatibility, metric routing, or semantic ranking
  // can redirect an exact user phrase to an adjacent warehouse result.
  const exactPublishedCandidate = suppressPublishedContext ? undefined : ranked.find((item) => item.entry.published && item.entry.kind === 'claim' && [item.entry.title, ...(item.entry.aliases || [])].some((phrase) => normalise(phrase) === normalizedQuery));
  const conversationalWrapper = /\b(?:es verdad que|en el grupo dicen que|mi cunado insiste|segun los datos|no me creo que|de verdad|he leido|que hay de cierto en que)\b/.test(normalizedQuery);
  const openQuestionIntent = /\b(?:como|cuanto|cuanta|cuantos|cuantas|cual|cuales|donde|cuando|por que)\b/.test(normalizedQuery);
  const directPhraseCandidate = exactPublishedCandidate || (suppressPublishedContext ? undefined : ranked.find((item) => item.entry.published && phraseTokenExact(item.entry) && (compatibleEntry(item.entry) || phraseTokenHasTypo(item.entry) || conversationalWrapper || !openQuestionIntent)));
  const decisionRanked = directPhraseCandidate
    ? [directPhraseCandidate, ...publicRanked.filter((item) => item.entry.slug !== directPhraseCandidate.entry.slug)]
    : publicRanked;
  const usefulAlternatives = (items) => items.filter(({ score, lexical }) => score >= 0.32 && lexical >= 0.24).slice(0, 3).map(({ entry, score }) => ({ kind: entry.kind, slug: entry.slug, title: entry.title, href: entry.href, confidence: score }));
  const top = decisionRanked[0];
  // A topic can be almost identical to the claim it contains. It is useful as
  // fallback guidance, but it must not force an exact claim paraphrase through
  // the slow model path. Measure ambiguity against the next published claim;
  // a competing topic is not a competing factual answer.
  const competitor = top?.entry.kind === 'claim'
    ? decisionRanked.find((item) => item.entry.kind === 'claim' && item.entry.slug !== top.entry.slug)
    : decisionRanked[1];
  const margin = top ? top.score - (competitor?.score || 0) : 0;
  const lexicalMargin = top ? top.lexical - (competitor?.lexical || 0) : 0;
  const topHandler = top ? handlerForEntry(top.entry) : '';
  const compatibleHandlers = Boolean(top && compatibleEntry(top.entry));
  // A canonical wording can be safely resolved without a semantic-margin
  // decision. This is limited to a very high lexical match and a compatible
  // handler, so a phrase that merely shares a topic still goes through the
  // cautious related/uncovered path.
  const exactCanonicalWording = Boolean(top && normalise(top.entry.title) === normalizedQuery);
  // An exact canonical wording is authoritative even when a broad keyword
  // makes the inferred handler look different. The published claim itself
  // defines the evidence contract; handler compatibility is for paraphrase
  // candidates, not for rejecting the claim the user literally entered.
  // A curated title or alias is an explicit publication contract. Let it
  // win over inferred handler compatibility: the handler gate protects
  // approximate semantic matches, but must not downgrade an exact published
  // phrase merely because its conversational wording is classified slightly
  // differently from the claim's broad metadata type.
  const exactPublishedPhrase = Boolean(top && top.entry.kind === 'claim' && [top.entry.title, ...(top.entry.aliases || [])].some((phrase) => normalise(phrase) === normalizedQuery) && top.lexical >= 0.9);
  const canonicalPhrase = Boolean(top && numericCompatible(top.entry) && top.entry.kind === 'claim' && (exactCanonicalWording || exactPublishedPhrase || directPhraseCandidate?.entry.slug === top.entry.slug || (phraseTokenExact(top.entry) && (compatibleHandlers || phraseTokenHasTypo(top.entry)))) && top.lexical >= 0.9);
  const explicitMetricRoute = preferredMetricIdsForQuery(normalizedQuery).size > 0;
  // A new measurable question must not be swallowed by a broad published
  // claim just because both use a topic word such as "desigualdad". Let the
  // warehouse answer the requested metric unless the user entered the
  // published claim's exact wording or alias.
  const nearCanonicalPhrase = Boolean(top && numericCompatible(top.entry) && top.entry.kind === 'claim' && top.lexical >= 0.9 && top.score >= 0.7 && (compatibleHandlers || phraseTokenHasTypo(top.entry)));
  const strongMatch = Boolean(top && numericCompatible(top.entry) && top.score >= 0.5 && margin >= 0.08 && top.lexical >= 0.65 && lexicalMargin >= 0.2 && (compatibleHandlers || nearCanonicalPhrase) && (!explicitMetricRoute || canonicalPhrase));
  const broadEvaluative = deterministicCompiler.impliedPropositions.some((item) => item.type === 'definition');
  if (canonicalPhrase || (strongMatch && !broadEvaluative)) {
    // A topic is useful guidance, but it is not a claim-specific answer. Keep
    // it as the first related result so a broad political or social complaint
    // gets a useful direction without being presented as a published verdict.
    if (top.entry.kind !== 'claim') return { status: 'related', input: { original: text }, alternatives: usefulAlternatives(decisionRanked) };
    return { status: 'published', input: { original: text }, primary: { kind: top.entry.kind, slug: top.entry.slug, title: top.entry.title, href: top.entry.href, confidence: top.score, reason: 'La formulación coincide con una afirmación publicada.', answer: top.entry.answer || '', assessment: top.entry.assessment || '', whatIsTrue: top.entry.whatIsTrue || '', whatIsMissing: top.entry.whatIsMissing || '', cannotProve: top.entry.cannotProve || '', scale: top.entry.scale || '', handlerId: topHandler, propositionIds: top.entry.propositionIds || [], evidenceIds: top.entry.evidenceIds || [], sourceRefs: top.entry.sourceRefs || [], sourceLinks: top.entry.sourceLinks || [] }, alternatives: usefulAlternatives(decisionRanked.slice(1)) };
  }
  const hasPlausibleCandidate = Boolean(top && top.score >= 0.34 && (top.lexical >= 0.2 || top.semantic >= 0.5));
  const meaningfulTokens = queryMeaningfulTokens;
  const compileEligible = meaningfulTokens.length >= 3 || (meaningfulTokens.length >= 2 && /\b\d[\d.,%]*\b/.test(text));
  // Deterministic broad-complaint handling is already the safety authority.
  // Calling the local model here only to have reconcileCompilerSafety discard
  // its structure adds several seconds to vague inputs such as “España está
  // destruida” and can leave the UI looking stuck. Keep the fast clarification
  // path synchronous; reserve model extraction for claims that can benefit
  // from proposition parsing or candidate disambiguation.
  const needsModelCompilation = !deterministicCompiler.clarificationRequired && (hasPlausibleCandidate || compileEligible);
  const compiledCandidate = !evidenceUnavailableSignal(text) && needsModelCompilation
    ? await compileClaim(text, hasPlausibleCandidate ? ranked.slice(0, 8).map(({ entry }) => entry) : [])
    : fallbackCompiler(text);
  const compiled = reconcileCompilerSafety(text, deterministicCompiler, compiledCandidate);
  const routing = compiled?.routing || { status: 'uncovered', primarySlug: '', reason: '', questions: [] };
  const handlerId = handlerForInput(compiled || { retrievalHints: [text] }, compiled?.claimType || '');
  const selectedCandidate = routing.primarySlug && ranked.find(({ entry }) => entry.slug === routing.primarySlug && entry.published && numericCompatible(entry) && compatibleEntry(entry));
  const selected = selectedCandidate && (!explicitMetricRoute || exactPublishedPhrase) && selectedCandidate.score >= 0.5 && (selectedCandidate.lexical >= 0.2 || selectedCandidate.semantic >= 0.7) ? selectedCandidate.entry : undefined;
  const status = selected ? (routing.status === 'published' ? 'published' : 'related') : 'uncovered';
  const result = { status, input: { original: text, canonical: compiled?.normalized }, compiler: compiled || undefined, primary: selected ? { kind: selected.kind, slug: selected.slug, title: selected.title, href: selected.href, confidence: top?.score || 0, reason: routing.reason, answer: selected.answer || '', assessment: selected.assessment || '', whatIsTrue: selected.whatIsTrue || '', whatIsMissing: selected.whatIsMissing || '', cannotProve: selected.cannotProve || '', scale: selected.scale || '', handlerId, propositionIds: selected.propositionIds || [], evidenceIds: selected.evidenceIds || [], sourceRefs: selected.sourceRefs || [], sourceLinks: selected.sourceLinks || [] } : undefined, alternatives: usefulAlternatives(decisionRanked.filter(({ entry }) => entry.slug !== selected?.slug)), guidance: status === 'uncovered' ? { questions: routing.questions.length ? routing.questions : ['¿De qué periodo, lugar o decisión concreta estamos hablando?'], limitation: 'Todavía no tenemos una comprobación publicada de esta afirmación.' } : undefined };
  answerCache.set(key, { value: result, expiresAt: Date.now() + cacheTtlMs });
  pruneRuntimeState();
  return result;
};

const requestId = (text) => digest(normalise(text)).slice(0, 24);

const startResolveJob = (text, origin = 'runtime') => {
  const id = requestId(text);
  const signature = canonicalSignatureFor(text);
  // Coalesce equivalent text submissions by their deterministic claim
  // signature. The signature removes conversational wrappers such as “mi
  // cuñado insiste”, while preserving meaningful words and polarity, so one
  // local inference job can serve the same claim phrased in several ways.
  const existingById = resolveJobs.get(id);
  const existingEquivalent = [...resolveJobs.values()].find((item) => item.canonicalSignature === signature && !['uncovered', 'unavailable'].includes(item.status));
  // An uncovered result can mean that discovery timed out or a provider was
  // temporarily unavailable. Do not reuse that failure for every paraphrase
  // in the same semantic cluster; the next request should get one retry.
  const existing = existingById && !['uncovered', 'unavailable'].includes(existingById.status) ? existingById : existingEquivalent;
  if (existing) return existing;
  pruneRuntimeState();
  telemetry.received += 1;
  const job = { status: 'processing', requestId: id, canonicalSignature: signature, createdAt: Date.now() };
  resolveJobs.set(id, job);
  void classify(text).then(async (classified) => {
    const completed = { ...await enrichResolve(text, classified, undefined, id), canonicalSignature: signature, createdAt: job.createdAt, completedAt: Date.now() };
    resolveJobs.set(id, completed);
    recordCompletion(job.createdAt, completed.status);
    void recordKnowledgeGap(text, completed, 'text', classified, origin);
  }).catch(() => {
    const completed = { status: 'unavailable', requestId: id, createdAt: job.createdAt, completedAt: Date.now() };
    resolveJobs.set(id, completed);
    recordCompletion(job.createdAt, completed.status);
  });
  return job;
};

const startMediaResolveJob = (text, inputType, media, origin = 'runtime') => {
  const id = requestId(`${inputType}:${media?.sha || text}`);
  const existing = resolveJobs.get(id);
  if (existing) return existing;
  pruneRuntimeState();
  telemetry.received += 1;
  const job = { status: 'processing', requestId: id, createdAt: Date.now() };
  resolveJobs.set(id, job);
  void (async () => {
    if (inputType !== 'image' && inputType !== 'audio') throw new Error('Unsupported media input');
    const extracted = inputType === 'image' ? await extractImageText(media) : await transcribeAudio(media);
    if (!extracted) throw new Error('No text extracted');
    const combined = [text, extracted].filter(Boolean).join('\n\n');
    const classified = await classify(combined);
    const completed = { ...await enrichResolve(combined, classified, undefined, id), createdAt: job.createdAt, completedAt: Date.now() };
    resolveJobs.set(id, completed);
    recordCompletion(job.createdAt, completed.status);
    void recordKnowledgeGap(combined, completed, inputType, classified, origin);
  })().catch(async (error) => {
    console.error('Media extraction failed:', error instanceof Error ? error.message : error);
    // A typed caption is already a valid claim input. If local media
    // extraction is unavailable, keep that deterministic/text path useful
    // instead of turning an otherwise answerable submission into a dead end.
    if (text) {
      try {
        const classified = await classify(text);
        const completed = { ...await enrichResolve(text, classified, undefined, id), inputType, createdAt: job.createdAt, completedAt: Date.now() };
        resolveJobs.set(id, completed);
        recordCompletion(job.createdAt, completed.status);
        void recordKnowledgeGap(text, completed, inputType, classified, origin);
        return;
      } catch (fallbackError) {
        console.error('Typed media fallback failed:', fallbackError instanceof Error ? fallbackError.message : fallbackError);
      }
    }
    const completed = { status: 'unavailable', requestId: id, inputType, createdAt: job.createdAt, completedAt: Date.now() };
    resolveJobs.set(id, completed);
    recordCompletion(job.createdAt, completed.status);
  });
  return job;
};

const startUrlResolveJob = (url) => {
  const id = requestId(`url:${url}`);
  const existing = resolveJobs.get(id);
  if (existing) return existing;
  pruneRuntimeState();
  telemetry.received += 1;
  const job = { status: 'processing', requestId: id, createdAt: Date.now() };
  resolveJobs.set(id, job);
  void (async () => {
    const extracted = await extractPageText(url);
    if (!extracted) throw new Error('No source text extracted');
    const hostname = new URL(url).hostname;
    const source = { id: `url-${digest(url).slice(0, 20)}`, title: `${sourceHostAllowed(hostname) ? 'Fuente oficial' : 'Página enlazada'}: ${hostname}`, url };
    const completed = { ...await enrichResolve(extracted, await classify(extracted), source, id), createdAt: job.createdAt, completedAt: Date.now() };
    resolveJobs.set(id, completed);
    recordCompletion(job.createdAt, completed.status);
  })().catch((error) => { console.error('Link extraction failed:', error instanceof Error ? error.message : error); const completed = { status: 'unavailable', requestId: id, createdAt: job.createdAt, completedAt: Date.now() }; resolveJobs.set(id, completed); recordCompletion(job.createdAt, completed.status); });
  return job;
};

const toResolveResult = (text, classified, source, resultRequestId = requestId(text), observations = []) => {
  const broadTopicGuidance = classified.status === 'related' && !classified.primary && classified.alternatives?.some((item) => item.kind === 'topic');
  const relatedClaims = (classified.alternatives || []).filter((item) => !broadTopicGuidance || item.kind === 'topic').map((item) => ({
    kind: item.kind,
    slug: item.slug,
    title: item.title,
    href: item.href,
    confidence: item.confidence,
  }));
  const primary = classified.primary;
  if (primary) relatedClaims.unshift({ ...primary, confidence: primary.confidence });
  const evidenceIds = primary?.evidenceIds || [];
  const sourceIds = primary?.sourceRefs || [];
  const answer = primary?.answer || primary?.reason || classified.guidance?.limitation || 'La formulación no coincide con una evidencia publicada suficientemente directa.';
  const visualBlock = primary ? visualBlockForHandler(primary.handlerId || 'quantity', primary.slug, primary.evidenceIds || []) : null;
  const handlerId = primary?.handlerId || handlerForInput(classified.compiler || { retrievalHints: [text] }, classified.compiler?.claimType || '');
  const isNormative = handlerId === 'normative';
  const isCausal = handlerId === 'causal';
  const isGroupComparison = handlerId === 'group_comparison';
  const isPrediction = handlerId === 'prediction';
  const isLegal = handlerId === 'legal_rule';
  const isDefinition = handlerId === 'definition';
  const isQuantityLike = handlerId === 'quantity' || handlerId === 'proportion';
  const localClaim = localSpecificClaim(text);
  const groupObservations = isGroupComparison ? directGroupObservations(text, observations) : observations;
  const isBudgetTransfer = handlerId === 'budget_transfer';
  const budgetObservations = isBudgetTransfer ? observations.filter((item) => item.kind === 'official_publication' && item.finding?.type === 'budget_transfer') : [];
  const legalObservations = isLegal ? observations.filter((item) => item.kind === 'legal_document' || item.kind === 'legal_rule') : [];
  const publicReuseClaim = isLegal && isPublicReuseQuery(text);
  const publicReuseRules = publicReuseClaim
    ? legalObservations
      .filter((item) => item.kind === 'legal_rule')
      .sort((left, right) => Number(right.topicScore || 0) - Number(left.topicScore || 0) || Number(right.score || 0) - Number(left.score || 0))
    : [];
  const currentLegalRule = selectCurrentLegalRule(legalObservations);
  const legalPrimaryBlock = isLegal ? {
    type: 'legal_decision_tree',
    items: primary?.slug === 'la-ley-trans-permite-cambiar-de-sexo-sin-ningun-control'
      ? [
        { label: 'Norma vigente', status: 'known', detail: 'Ley 4/2023 regula la rectificación registral del sexo en España.' },
        { label: 'Requisito médico previo', status: 'known', detail: 'No exige informe médico o psicológico ni tratamiento hormonal como condición previa.' },
        { label: 'Procedimiento y edad', status: 'known', detail: 'La solicitud se tramita ante el Registro Civil y las reglas cambian según la edad: solicitud directa desde los 16, representación entre 14 y 16 y autorización judicial entre 12 y 14.' },
        { label: 'Límites y efectos', status: 'known', detail: 'La norma define efectos jurídicos y permite una reversión después de seis meses bajo las condiciones previstas.' },
        { label: 'Lo que la fuente no demuestra', status: 'missing', detail: 'Que no exista ningún control, que el cambio sea automático o que todos los casos produzcan los mismos efectos.' },
      ]
      : primary?.slug === 'la-amnistia-rompe-la-igualdad-ante-la-ley'
        ? [
        { label: 'Ámbito de la ley', status: 'known', detail: 'La Ley Orgánica 1/2024 establece una amnistía para actos vinculados al proceso independentista catalán dentro de fechas, materias y exclusiones concretas.' },
        { label: 'Diferencia jurídica', status: 'known', detail: 'La medida trata de forma distinta los actos incluidos y los que quedan fuera de su ámbito.' },
        { label: 'Control constitucional', status: 'known', detail: 'Las resoluciones de 2026 consultadas rechazaron que la medida vulnerase el principio de igualdad, con votos particulares.' },
        { label: 'Caso individual', status: 'missing', detail: 'La aplicación concreta depende de los hechos, los artículos aplicables y la resolución del órgano judicial competente.' },
        { label: 'Juicio de justicia o conveniencia', status: 'missing', detail: 'Los datos y el fallo mayoritario no resuelven por sí solos si la medida es políticamente o moralmente justa.' },
      ]
      : primary?.slug === 'desalojar-a-un-ocupante-ilegal-tarda-anos'
        ? [
        { label: 'Plazo universal', status: 'missing', detail: 'No existe un calendario único: la duración depende del inmueble, la relación previa, la prueba, la vía procesal y el órgano judicial.' },
        { label: 'Vía penal desde 2025', status: 'known', detail: 'La Ley Orgánica 1/2025 incluye determinados supuestos de allanamiento y usurpación en el procedimiento para el enjuiciamiento rápido.' },
        { label: 'Vía civil para ciertos titulares', status: 'known', detail: 'La Ley 5/2018 prevé tutela sumaria para determinadas personas físicas, entidades sin ánimo de lucro y entidades públicas de vivienda social.' },
        { label: 'Límite de la vía rápida', status: 'known', detail: 'La Fiscalía distingue el delito leve de usurpación, que continúa por el juicio sobre delitos leves; “rápido” no significa lanzamiento automático.' },
        { label: 'Caso concreto', status: 'missing', detail: 'Para estimar el recorrido hacen falta el tipo de inmueble, la relación con quien lo ocupa, los hechos acreditables y el procedimiento iniciado.' },
      ]
      : publicReuseClaim
        ? [
        { label: 'Ámbito de la ley', status: 'known', detail: 'La Ley 37/2007 regula la reutilización de documentos elaborados o custodiados por sujetos del sector público; no convierte automáticamente toda información pública en reutilizable.' },
        { label: 'Condiciones', status: publicReuseRules.some((item) => /art[ií]culo 4/i.test(item.metric)) ? 'known' : 'missing', detail: 'La reutilización puede quedar sin condiciones, someterse a licencia o requerir solicitud. Las condiciones deben ser objetivas, proporcionadas, no discriminatorias y justificadas por interés público.' },
        { label: 'Límites', status: publicReuseRules.some((item) => /art[ií]culo 3/i.test(item.metric)) ? 'known' : 'missing', detail: 'Quedan fuera, entre otros, documentos con límites de acceso, información reservada o confidencial y documentos con derechos de terceros.' },
        { label: 'Uso responsable', status: publicReuseRules.some((item) => /art[ií]culo 8/i.test(item.metric)) ? 'known' : 'missing', detail: 'Las condiciones pueden exigir no alterar el contenido, no desnaturalizarlo, citar la fuente y señalar la fecha de actualización.' },
      ]
      : [
        { label: 'Jurisdicción y norma vigente', status: legalObservations.length ? 'known' : 'missing', detail: legalObservations.length ? 'Hay una fuente jurídica localizada para el territorio y periodo indicados.' : 'Identificar el territorio y la norma aplicable en la fecha del caso.' },
        { label: 'Artículo aplicable', status: currentLegalRule ? 'known' : 'missing', detail: currentLegalRule ? 'La fuente incluye una regla vigente relacionada con el supuesto.' : 'Localizar el precepto que regula exactamente el supuesto.' },
        { label: 'Situación y procedimiento', status: 'missing', detail: 'Distinguir la condición de las partes, la autoridad competente y los plazos.' },
        { label: 'Excepciones y efectos', status: 'missing', detail: 'Comprobar medidas especiales, excepciones, recursos y efectos jurídicos.' },
      ],
  } : null;
  const quantityClaim = isQuantityLike ? claimedNumericValue(text, classified.compiler) : null;
  const quantity = isQuantityLike ? quantityAssessment(text, classified.compiler, observations) : null;
  const suppressGenericSource = (isGroupComparison && !groupObservations.length) || (isQuantityLike && quantityClaim && !quantity) || (isLegal && !legalObservations.length) || isDefinition;
  const usableSource = suppressGenericSource ? undefined : source;
  const status = classified.status === 'published'
    ? 'complete'
    : isGroupComparison
      ? (usableSource ? 'draft' : 'uncovered')
      : classified.status === 'related'
        ? 'partial'
        : usableSource ? 'draft' : 'uncovered';
  const regionalComparison = !primary && !isNormative && !isCausal && !isLegal && !isDefinition && !isGroupComparison ? summarizeWarehouseRegionalComparison(text, observations) : null;
  const europeanComparison = !primary && !regionalComparison && !isNormative && !isCausal && !isLegal && !isDefinition && !isGroupComparison ? summarizeWarehouseEuropeanComparison(text, observations) : null;
  const ranking = !primary && !regionalComparison && !europeanComparison && !isNormative && !isCausal && !isLegal && !isDefinition && !isGroupComparison ? summarizeWarehouseRanking(text, observations) : regionalComparison || europeanComparison;
  const trend = !primary && !ranking && !isNormative && !isLegal && !isDefinition && !isGroupComparison ? summarizeWarehouseTrend(text, observations) : null;
  const causalObservations = isCausal ? observations.filter((item) => typeof item.value === 'number' && Number.isFinite(item.value)).slice(-12) : [];
  const causalContext = causalObservations.length >= 2 ? {
    observations: causalObservations,
    headline: 'Hay datos relacionados, pero no una prueba de causalidad',
    summary: 'Hemos localizado una serie relacionada con la afirmación. Describe el contexto o la evolución observada, pero no demuestra por sí sola que una causa produzca la otra.',
    points: [
      `La serie localizada contiene ${causalObservations.length} observaciones comparables.`,
      'Una coincidencia temporal o territorial no identifica por sí sola el efecto causal.',
      'Para evaluar la causa harían falta comparación, magnitud, mecanismo y explicaciones alternativas.',
    ],
    reply: 'La serie aporta contexto, pero no demuestra por sí sola que una causa explique el cambio. Habría que comparar territorios o periodos y descartar otras explicaciones.',
    replyEvidenceIds: causalObservations.map((item) => item.id),
  } : null;
  const valuesContext = isNormative && !primary ? {
    headline: 'Esta parte trata de una prioridad, no solo de un dato',
    summary: 'La afirmación plantea qué criterio debería considerarse justo. Los datos pueden mostrar las reglas actuales y sus consecuencias, pero no deciden por sí solos qué prioridad moral debe elegirse.',
  } : null;
  const groupContext = isGroupComparison && !primary ? {
    headline: groupObservations.length ? 'La comparación necesita un grupo y un denominador claros' : 'No hemos localizado una comparación directa del grupo mencionado',
    summary: groupObservations.length
      ? 'Hemos encontrado observaciones con dimensiones de grupo, pero todavía hay que comprobar que la definición, la población y el periodo coincidan con la afirmación.'
      : 'Los totales generales o las cifras de contexto no permiten saber si un grupo recibe más, delinque más o está sobrerrepresentado. Hace falta una comparación directa con el mismo denominador y periodo.',
  } : null;
  const quantityContext = isQuantityLike && !primary && quantity ? {
    headline: quantity.headline,
    summary: quantity.summary,
  } : null;
  const budgetContext = isBudgetTransfer && !primary && budgetObservations.length ? {
    headline: 'La transferencia está documentada, pero el recorte educativo no está demostrado',
    summary: 'La fuente oficial documenta el movimiento de crédito y su finalidad presupuestaria. No identifica por sí sola qué programas de Educación pierden crédito ni demuestra que el dinero se destine a asesores o exclusivamente a Presidencia.',
  } : null;
  const predictionContext = isPrediction && !primary ? {
    headline: 'Esto es una predicción, no un hecho ya comprobable',
    summary: 'Una serie histórica puede aportar contexto, pero no confirma por sí sola lo que ocurrirá. Para evaluar la predicción hay que fijar una fecha, un indicador, una magnitud y las condiciones que podrían cambiar el resultado.',
  } : null;
  const legalContext = isLegal && !primary ? {
    headline: publicReuseClaim ? 'No: la información pública no es automáticamente reutilizable sin condiciones' : 'La respuesta legal depende del supuesto concreto',
    summary: publicReuseClaim
      ? 'La ley española permite reutilizar determinados documentos del sector público, pero distingue entre documentos accesibles y documentos reutilizables. Puede haber licencias, solicitudes, límites de acceso, derechos de terceros y condiciones sobre el uso.'
      : 'No basta con una frase general sobre lo que “permite” o “prohíbe” la ley. Hay que identificar la jurisdicción, el procedimiento, las fechas, las excepciones y la situación concreta.',
  } : null;
  const definitionContext = isDefinition && !primary ? {
    headline: 'Primero hay que fijar qué significa la expresión',
    summary: 'La afirmación usa una categoría que puede tener varias definiciones estadísticas o jurídicas. Comparar cifras sin fijar esa definición puede producir una respuesta aparentemente precisa pero equivocada.',
  } : null;
  const localContext = localClaim && !primary ? {
    headline: 'Esta afirmación necesita datos locales, no una media nacional',
    summary: 'El cambio en un barrio puede ser real, pero para comprobarlo hacen falta el municipio, el periodo y una medida concreta.',
  } : null;
  const recordedOffenceContext = preferredMetricIdsForQuery(text).has('recorded_offences') && !recordedOffenceCategoryForQuery(text) && !observations.length ? {
    headline: 'La criminalidad registrada debe concretarse por categoría',
    summary: 'La fuente disponible separa homicidios, robos, fraudes y otras categorías. No hemos localizado un total nacional único que permita responder a “la criminalidad” en general sin mezclar medidas distintas.',
  } : null;
  const compilerBreakdown = classified.compiler?.propositions?.length ? {
    type: 'claim_breakdown',
    propositionIds: [],
    items: classified.compiler.propositions.slice(0, 6).map((item) => ({ text: item.text, type: item.type, explicit: item.explicit !== false })),
  } : null;
  // A broad topic route is useful only when no more specific claim structure
  // can explain the disagreement. Otherwise it duplicates the causal/legal/
  // comparison guidance and makes a partial result look noisy or conflicted.
  const hasSpecificMethod = isCausal || isLegal || isPrediction || isNormative || isGroupComparison || isDefinition || localClaim || recordedOffenceContext;
  const broadRelated = classified.status === 'related' && !primary && !hasSpecificMethod;
  const relatedGuidanceBlocks = broadRelated ? [
    { type: 'strongest_valid_concern', text: 'La frase puede expresar una preocupación real, pero es demasiado amplia para atribuir una causa o un resultado concreto.' },
    { type: 'evidence_ladder', evidenceIds: [], steps: [
      { label: 'Hecho concreto', status: 'missing', detail: 'Hay que identificar qué decisión, indicador o experiencia se quiere comprobar.' },
      { label: 'Periodo y territorio', status: 'missing', detail: 'La respuesta cambia según el lugar y el momento que se comparen.' },
      { label: 'Consecuencia', status: 'missing', detail: 'Hace falta separar una valoración política de un resultado medible.' },
    ] },
  ] : [];
  const handlerBlocks = !primary ? [
    ...(isCausal ? [
      { type: 'strongest_valid_concern', text: 'Puede existir un cambio real que merezca explicación, aunque la causa propuesta todavía no esté demostrada.' },
      { type: 'evidence_ladder', evidenceIds: causalContext?.observations.map((item) => item.id) || [], steps: [
        { label: 'Cambio observado', status: causalContext ? 'available' : 'missing', detail: causalContext ? 'Hay una serie relacionada que permite describir el contexto.' : 'Falta una serie directa y comparable del resultado mencionado.' },
        { label: 'Secuencia temporal', status: causalContext ? 'context' : 'missing', detail: causalContext ? 'La evolución temporal orienta, pero no separa causa y coincidencia.' : 'Falta comprobar que la causa aparece antes que el efecto.' },
        { label: 'Comparación y magnitud', status: 'missing', detail: 'Hace falta comparar grupos, territorios o periodos y estimar cuánto cambia el resultado.' },
        { label: 'Explicaciones alternativas', status: 'missing', detail: 'Hay que comprobar si otros factores explican el mismo patrón.' },
      ] },
    ] : []),
    ...(isLegal ? [
      { type: 'strongest_valid_concern', text: publicReuseClaim ? 'Que un documento sea público o accesible no significa que pueda reutilizarse de cualquier manera. La preocupación es válida, pero la frase elimina límites que la propia ley mantiene.' : 'Una regla general puede tener efectos importantes, pero su aplicación depende del supuesto y del procedimiento concretos.' },
      { type: 'legal_decision_tree', items: publicReuseClaim ? [
        { label: 'Norma y ámbito', status: legalObservations.length ? 'known' : 'missing', detail: 'Ley 37/2007 · reutilización de documentos del sector público, sin modificar por sí sola el régimen de acceso.' },
        { label: 'Modalidad de reutilización', status: publicReuseRules.some((item) => /art[ií]culo 4/i.test(item.metric)) ? 'known' : 'missing', detail: 'Puede ser sin condiciones, con licencia-tipo, previa solicitud o mediante otros regímenes previstos por la ley.' },
        { label: 'Condiciones de uso', status: publicReuseRules.some((item) => /art[ií]culo 4|art[ií]culo 8/i.test(item.metric)) ? 'known' : 'missing', detail: 'Pueden exigirse condiciones objetivas y proporcionadas, como citar la fuente, indicar la actualización y no alterar ni desnaturalizar el contenido.' },
        { label: 'Exclusiones', status: publicReuseRules.some((item) => /art[ií]culo 3/i.test(item.metric)) ? 'known' : 'missing', detail: 'Hay límites por acceso restringido, seguridad, confidencialidad, datos personales y derechos de propiedad intelectual de terceros.' },
      ] : [
        { label: 'Jurisdicción y norma vigente', status: legalObservations.length ? 'known' : 'missing', detail: legalObservations.length ? `${legalObservations.find((item) => item.dimensions?.jurisdiction)?.dimensions?.jurisdiction || 'Norma estatal localizada'} · ${currentLegalRule?.datasetId || legalObservations[0].metric}` : 'Identificar el territorio y la norma aplicable en la fecha del caso.' },
        { label: 'Artículo aplicable', status: currentLegalRule ? 'known' : 'missing', detail: currentLegalRule ? `${currentLegalRule.metric} · versión vigente desde ${currentLegalRule.dimensions?.effectiveFrom || currentLegalRule.period}` : 'Localizar el precepto que regula exactamente el supuesto.' },
        { label: 'Situación jurídica', status: 'missing', detail: 'Distinguir la condición de las partes y los hechos relevantes del caso.' },
        { label: 'Procedimiento', status: 'missing', detail: 'Determinar qué vía, autoridad y plazos corresponden.' },
        { label: 'Excepciones', status: 'missing', detail: 'Comprobar medidas especiales, vulnerabilidad, recursos y disposiciones transitorias.' },
      ] },
    ] : []),
    ...(isPrediction ? [
      { type: 'strongest_valid_concern', text: 'La predicción puede ser plausible, pero necesita formularse de manera que pueda comprobarse cuando llegue la fecha.' },
      { type: 'prediction_conditions', items: [
        { label: 'Indicador', value: 'Qué variable exacta debe cambiar', status: 'missing' },
        { label: 'Magnitud', value: 'Cuánto debe subir o bajar', status: /\d/.test(text) ? 'specified' : 'missing' },
        { label: 'Fecha límite', value: 'Cuándo debe haberse producido', status: /a[nñ]o que viene|\b20\d{2}\b|mes|trimestre/i.test(text) ? 'specified' : 'missing' },
        { label: 'Condiciones', value: 'Qué cambios externos invalidarían la comparación', status: 'missing' },
      ] },
    ] : []),
    ...(isNormative ? [
      { type: 'strongest_valid_concern', text: 'Cuando un recurso es limitado, decidir quién debe recibir prioridad es una pregunta legítima de justicia y reparto.' },
      { type: 'trade_offs', principle: 'Los datos pueden mostrar efectos y beneficiarios; la prioridad final depende del criterio de justicia elegido.', alternatives: [
        { label: 'Prioridad por ciudadanía', consequence: 'Favorece el vínculo político con el país, pero puede excluir a residentes con la misma necesidad.' },
        { label: 'Prioridad por necesidad', consequence: 'Atiende primero la vulnerabilidad, pero no reconoce una preferencia específica por nacionalidad.' },
        { label: 'Prioridad por contribución', consequence: 'Relaciona acceso y aportaciones previas, pero deja peor cubiertos algunos casos de necesidad.' },
      ] },
    ] : []),
    ...(isGroupComparison ? [
      { type: 'strongest_valid_concern', text: 'Puede haber diferencias reales entre grupos, pero solo una comparación equivalente permite saber su tamaño y significado.' },
      { type: 'group_comparison_requirements', items: [
        { label: 'Grupos equivalentes', status: groupObservations.length ? 'check' : 'missing', detail: 'Definir exactamente quién pertenece a cada grupo.' },
        { label: 'Mismo denominador', status: groupObservations.length ? 'check' : 'missing', detail: 'Comparar tasas sobre poblaciones equivalentes, no solo totales.' },
        { label: 'Mismo periodo y territorio', status: groupObservations.length ? 'check' : 'missing', detail: 'Usar la misma fecha y cobertura geográfica.' },
        { label: 'Ajustes relevantes', status: 'missing', detail: 'Comprobar edad, renta, composición familiar u otras diferencias que afecten al resultado.' },
      ] },
    ] : []),
    ...(isDefinition ? [
      { type: 'strongest_valid_concern', text: 'La preocupación puede ser real, pero una valoración tan amplia reúne problemas distintos. Separarlos permite comprobarlos sin convertir una impresión en un veredicto.' },
      { type: 'evidence_ladder', evidenceIds: [], steps: [
        { label: 'Resultado concreto', status: 'missing', detail: 'Elegir qué se quiere medir: empleo, vivienda, precios, sanidad, seguridad u otro resultado.' },
        { label: 'Periodo y comparación', status: 'missing', detail: 'Indicar desde cuándo y frente a qué año, territorio o país se quiere comparar.' },
        { label: 'Territorio', status: 'missing', detail: 'Aclarar si se habla de España entera o de una comunidad, provincia o barrio.' },
      ] },
    ] : []),
    ...(localContext ? [
      { type: 'strongest_valid_concern', text: 'La experiencia local merece comprobarse; lo que no podemos hacer es convertirla en una conclusión sobre toda España.' },
      { type: 'evidence_ladder', evidenceIds: [], steps: [
        { label: 'Lugar exacto', status: 'missing', detail: 'Indica el municipio o la provincia y, si es posible, el barrio.' },
        { label: 'Periodo', status: 'missing', detail: 'Hay que comparar el mismo indicador antes y después.' },
        { label: 'Medida', status: 'missing', detail: 'Separa delitos registrados, victimización y percepción de inseguridad.' },
        { label: 'Fuente local', status: 'missing', detail: 'Según el indicador, habrá que consultar Interior, el ayuntamiento o la policía local.' },
      ] },
    ] : []),
  ] : [];
  const provisionalBlocks = observations.length ? (() => {
    if (isQuantityLike && quantityClaim && quantity) return [
      { type: 'key_number', evidenceId: quantity.observation.id, label: quantity.observation.metric || quantity.observation.datasetId || 'Última observación comparable', value: String(quantity.observation.value), caveat: 'Comparación automática provisional; comprueba el periodo, la unidad y la población.' },
      { type: 'data_finding', evidenceIds: quantity.observations.map((item) => item.id), points: quantity.points },
      { type: 'conversation_reply', evidenceIds: quantity.observations.map((item) => item.id), text: quantity.reply },
      { type: 'cannot_conclude', evidenceIds: quantity.observations.map((item) => item.id), points: ['La coincidencia o diferencia numérica no valida por sí sola la definición ni el contexto completo.', 'Hay que comprobar qué población, unidad, periodo y método mide la serie.'] },
    ];
    if (isQuantityLike && quantityClaim && !quantity) return [
      { type: 'cannot_conclude', evidenceIds: [], points: ['No hemos localizado una observación comparable en unidad y medida con la cifra indicada.', 'La cifra necesita una fuente que mida la misma población, unidad y periodo.'] },
    ];
    if (isGroupComparison && !groupObservations.length) return [
      { type: 'cannot_conclude', evidenceIds: [], points: ['No hemos localizado una comparación directa para el grupo mencionado.', 'Las cifras generales o de contexto no permiten inferir diferencias entre grupos.'] },
    ];
    if (isLegal && legalObservations.length) {
      const excerptRules = publicReuseClaim ? publicReuseRules.filter((item) => item.excerpt).slice(0, 3) : (currentLegalRule?.excerpt ? [currentLegalRule] : []);
      const evidenceIds = legalObservations.map((item) => item.id);
      return [
        ...excerptRules.map((item) => ({ type: 'source_excerpt', evidenceIds: [item.id], title: `${item.metric} · texto consolidado`, excerpt: boundedExcerpt(item.excerpt) })),
        { type: 'data_finding', evidenceIds, points: publicReuseClaim ? [
          'La Ley 37/2007 distingue el acceso a la información de su reutilización posterior.',
          'La reutilización puede autorizarse sin condiciones, con licencia o previa solicitud; cuando hay condiciones deben ser objetivas, proporcionadas y no discriminatorias.',
          'La norma contempla límites de acceso, confidencialidad, datos personales y derechos de terceros, además de obligaciones sobre la integridad y la cita de la fuente.',
        ] : [
          `Norma localizada: ${String(currentLegalRule?.datasetId || legalObservations[0].metric).replace(/[.\s]+$/, '')}.`,
          `Ámbito: ${legalObservations.find((item) => item.dimensions?.jurisdiction)?.dimensions?.jurisdiction || 'estatal'}; versión localizada desde: ${currentLegalRule?.dimensions?.effectiveFrom || legalObservations[0].dimensions?.effectiveFrom || 'fecha no indicada'}.`,
          legalObservations.some((item) => item.dimensions?.repealed) ? 'La ficha indica que la norma está derogada.' : 'La ficha localizada no indica derogación total.',
        ] },
        ...(publicReuseClaim ? [{ type: 'conversation_reply', evidenceIds, text: 'No exactamente. La Ley 37/2007 permite reutilizar determinados documentos del sector público, pero no toda información pública queda libre de condiciones: puede haber licencia, solicitud, límites de acceso, derechos de terceros y obligaciones como citar la fuente y no alterar el contenido.' }] : []),
        { type: 'cannot_conclude', evidenceIds, points: publicReuseClaim ? ['La ley no permite asumir que cualquier documento público puede reutilizarse sin revisar su acceso, licencia, datos personales y derechos de terceros.', 'Para un documento concreto todavía hay que comprobar su licencia, organismo responsable y posibles restricciones.'] : [currentLegalRule ? 'El artículo aporta el texto aplicable, pero no decide por sí solo cómo encaja el caso concreto.' : 'La ficha identifica la norma, pero no resuelve por sí sola el supuesto planteado.', 'Falta comprobar otros artículos, excepciones, jurisprudencia y la situación concreta.'] },
      ];
    }
    if (isLegal || isDefinition) return [
      { type: 'cannot_conclude', evidenceIds: [], points: [
        isLegal ? 'No hemos localizado una regla o resolución que corresponda exactamente al supuesto descrito.' : 'No hemos localizado una fuente que fije la definición exacta de la expresión utilizada.',
        isLegal ? 'La respuesta requiere jurisdicción, procedimiento, fechas y excepciones.' : 'Sin una definición común, las cifras relacionadas no son comparables.',
      ] },
    ];
    const grouped = observations.slice(0, 6);
    const numeric = grouped.filter((item) => typeof item.value === 'number' && Number.isFinite(item.value));
    const publications = grouped.filter((item) => item.kind === 'official_publication');
    const budgetPublication = isBudgetTransfer ? publications.find((item) => item.finding?.type === 'budget_transfer') : undefined;
    const catalogueLeads = grouped.filter((item) => item.kind === 'dataset_catalogue');
    const publicationLike = [...publications, ...catalogueLeads];
    if (!numeric.length && publicationLike.length) return [
      ...(budgetPublication ? (() => {
        const transfer = budgetPublication.finding;
        const evidenceIds = publications.filter((item) => item.finding?.type === 'budget_transfer').map((item) => item.id);
        const amount = `${Number(transfer.amount).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
        return [{ type: 'money_flow', evidenceIds, amount, origin: transfer.originEntity, destination: transfer.destinationEntity, purpose: transfer.purpose }];
      })() : []),
      ...(publicationLike.find((item) => item.excerpt) ? (() => {
        const item = publicationLike.find((candidate) => candidate.excerpt);
        return [{ type: 'source_excerpt', evidenceIds: [item.id], title: item.kind === 'dataset_catalogue' ? 'Conjunto de datos candidato en el catálogo público' : 'Fragmento localizado en la fuente oficial', excerpt: item.excerpt }];
      })() : []),
      ...(budgetPublication ? (() => {
        const transfer = budgetPublication.finding;
        const evidenceIds = publications.filter((item) => item.finding?.type === 'budget_transfer').map((item) => item.id);
        const amount = `${Number(transfer.amount).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
        return [{ type: 'conversation_reply', evidenceIds, text: `La fuente oficial documenta una transferencia de ${amount} desde ${transfer.originEntity} a ${transfer.destinationEntity} para ${transfer.purpose}. Eso no demuestra por sí solo que se hayan recortado servicios educativos ni que el dinero sea para asesores.` }];
      })() : []),
      ...(catalogueLeads.length && !publications.length ? [{ type: 'conversation_reply', evidenceIds: catalogueLeads.map((item) => item.id), text: 'El catálogo público apunta a un conjunto de datos relacionado, pero la ficha no demuestra la afirmación. Hay que abrir la distribución, comprobar su definición, periodo y cobertura territorial antes de usarla como evidencia.' }] : []),
      { type: 'cannot_conclude', evidenceIds: publicationLike.map((item) => item.id), points: catalogueLeads.length && !publications.length
        ? ['La ficha del catálogo sirve para localizar un posible conjunto de datos, no para demostrar la afirmación.', 'Falta comprobar la distribución, definición, periodo, población y cobertura territorial del recurso.']
        : ['Hemos localizado una publicación oficial relacionada con la formulación.', 'El fragmento ayuda a comprobar el contexto, pero la coincidencia no demuestra por sí sola la conclusión completa.'] },
    ];
    const series = ranking?.observations || trend?.observations || causalContext?.observations || quantity?.observations || (isGroupComparison ? groupObservations : numeric);
    const periods = series.filter((item) => item.period).map((item) => item.period);
    const keyObservation = ranking
      ? series.find((item) => {
        const label = normalise(item.dimensionLabels?.geo || '');
        const code = normalise(item.dimensions?.geo || '');
        return code === 'es' || label.includes('espana') || label.includes('spain');
      }) || series[0]
      : series.at(-1);
    return [
      { type: 'key_number', evidenceId: keyObservation.id, label: ranking ? `${ranking.regional ? 'Comparación regional' : 'España'} · ${displayMetric(keyObservation)}` : displayMetric(keyObservation), value: String(keyObservation.value), caveat: 'Dato localizado automáticamente en una fuente oficial; todavía no se ha revisado como respuesta a esta afirmación.' },
      ...((ranking || trend || causalContext) ? [{ type: 'data_finding', evidenceIds: series.map((item) => item.id), points: (ranking || trend || causalContext).points }, { type: 'conversation_reply', evidenceIds: (ranking || trend || causalContext).replyEvidenceIds || series.map((item) => item.id), text: (ranking || trend || causalContext).reply }] : []),
      ...(periods.length >= 2 && !isPrediction ? [{ type: ranking ? 'comparison_chart' : 'line_chart', visualId: 'warehouse-observation', evidenceIds: series.map((item) => item.id) }] : []),
      { type: 'cannot_conclude', evidenceIds: series.map((item) => item.id), points: isPrediction
        ? ['Estos valores describen el pasado, pero no demuestran la predicción.', 'Faltan una fecha límite, un indicador y una magnitud que permitan comprobarla.']
        : isGroupComparison
          ? ['La comparación solo sería válida con el mismo grupo, población, denominador y periodo.', 'Una cifra total o de contexto no demuestra diferencias entre grupos.']
          : ['Estos valores describen la serie localizada, pero no demuestran por sí solos la causa del cambio.', 'La definición, población y periodo deben comprobarse antes de convertirlos en un veredicto completo.'] },
    ];
  })() : [];
  const numericObservations = ranking?.observations || trend?.observations || causalContext?.observations || quantity?.observations || (isGroupComparison ? groupObservations : (isPrediction ? observations.filter((item) => typeof item.value === 'number' && Number.isFinite(item.value)) : observations.filter((item) => typeof item.value === 'number' && Number.isFinite(item.value))));
  const evidenceObservations = isGroupComparison ? groupObservations : isQuantityLike ? (quantity?.observations || (!quantityClaim ? observations : [])) : isLegal ? legalObservations : (isDefinition ? [] : observations);
  // Keep the first observation visible when a long trend is compressed. The
  // narrative summary compares the first and latest values, so the chart must
  // show that same baseline instead of starting in the middle of the series.
  const seriesForVisual = ranking
    ? numericObservations.slice(0, 6)
    : numericObservations.length > 6
      ? [numericObservations[0], ...numericObservations.slice(-5)]
      : numericObservations;
  const warehouseSeries = numericObservations.length >= 2 ? {
    labels: seriesForVisual.map((item) => ranking ? displayWarehouseGroup(item) : displayPeriod(item.period || item.id, item.metricId)),
    values: seriesForVisual.map((item) => Number(item.value)),
    label: displayMetric(numericObservations[0]),
    unit: displayUnit(numericObservations[0].unit, numericObservations[0].metricId),
    metricId: numericObservations[0].metricId,
    population: numericObservations[0].population,
  } : undefined;
  const sourceLinkMap = new Map();
  for (const item of [usableSource, ...evidenceObservations.map((observation) => observation.source)].filter((candidate) => candidate?.url)) {
    if (!sourceLinkMap.has(item.url)) sourceLinkMap.set(item.url, { id: item.id || item.url, title: item.title || item.url, url: item.url });
  }
  const sourceLinks = [...sourceLinkMap.values()].slice(0, 5);
  const relatedTopic = !primary ? classified.alternatives?.find((item) => item.kind === 'topic') : undefined;
  const primaryAssessmentHeadline = {
    false: 'La afirmación no coincide con los datos disponibles',
    unsupported: 'La relación afirmada no está demostrada por esos datos',
    misleading: 'La frase mezcla un dato real con una conclusión más amplia',
    uncertain: 'La evidencia disponible todavía no permite decidir',
    'mostly-true': 'La afirmación es básicamente correcta, con una precisión importante',
  }[primary?.assessment];
  const primaryHeadline = primary?.slug === 'la-ley-trans-permite-cambiar-de-sexo-sin-ningun-control'
    ? 'La ley elimina un requisito médico, pero mantiene un procedimiento'
    : primary?.slug === 'la-amnistia-rompe-la-igualdad-ante-la-ley'
      ? 'La amnistía establece una excepción definida, pero el TC no la consideró contraria a la igualdad'
      : primary?.slug === 'desalojar-a-un-ocupante-ilegal-tarda-anos'
        ? 'No hay un plazo único: el tipo de caso determina la vía de desalojo'
      : primary?.slug === 'espana-esta-sufriendo-un-reemplazo-poblacional'
        ? 'Hay cambios demográficos, pero no una métrica de “reemplazo”'
    : primaryAssessmentHeadline || primary?.title;
  const uniqueGuidanceTypes = new Set(['strongest_valid_concern', 'evidence_ladder', 'legal_decision_tree', 'prediction_conditions', 'trade_offs', 'group_comparison_requirements']);
  const compactGuidanceBlocks = (blocks) => {
    const seen = new Set();
    return blocks.filter((block) => {
      if (!uniqueGuidanceTypes.has(block?.type)) return true;
      if (seen.has(block.type)) return false;
      seen.add(block.type);
      return true;
    });
  };
  const result = {
    schemaVersion: '1',
    headline: primaryHeadline || valuesContext?.headline || groupContext?.headline || quantityContext?.headline || budgetContext?.headline || predictionContext?.headline || legalContext?.headline || definitionContext?.headline || localContext?.headline || recordedOffenceContext?.headline || causalContext?.headline || ranking?.headline || trend?.headline || (relatedTopic ? 'La conversación apunta a un tema político amplio' : usableSource ? 'Hemos localizado una fuente, pero todavía falta comprobar la afirmación.' : 'Todavía no tenemos una comprobación publicada para esta afirmación.'),
    summary: primary ? answer : valuesContext?.summary || groupContext?.summary || quantityContext?.summary || budgetContext?.summary || predictionContext?.summary || legalContext?.summary || definitionContext?.summary || localContext?.summary || recordedOffenceContext?.summary || causalContext?.summary || ranking?.summary || trend?.summary || (relatedTopic ? `La frase parece referirse a ${relatedTopic.title.toLocaleLowerCase('es')}, pero hace falta concretar el hecho o la decisión para comprobarla.` : usableSource ? 'Hemos localizado una fuente potencialmente relevante, pero no hemos encontrado todavía una coincidencia revisada que permita convertirla en una respuesta factual.' : answer),
    coverage: status === 'complete' ? 'strong' : status === 'partial' || causalContext || ranking || trend || quantityContext || budgetContext || (publicReuseClaim && legalObservations.length) ? 'qualified' : valuesContext ? 'values' : 'insufficient',
    claimType: classified.compiler?.claimType || 'mixed',
    blocks: primary ? [{ type: 'confirmed', propositionIds: primary.propositionIds || [], evidenceIds: primary.evidenceIds || [], points: [primary.whatIsTrue, primary.scale].filter(Boolean) }, ...(visualBlock ? [visualBlock] : []), ...(legalPrimaryBlock ? [legalPrimaryBlock] : []), ...(primary.whatIsMissing || primary.cannotProve ? [{ type: 'cannot_conclude', evidenceIds: primary.evidenceIds || [], points: [primary.whatIsMissing, primary.cannotProve].filter(Boolean) }] : []), { type: 'conversation_reply', evidenceIds: primary.evidenceIds || [], text: answer }] : compactGuidanceBlocks([ ...(compilerBreakdown ? [compilerBreakdown] : []), ...handlerBlocks, ...relatedGuidanceBlocks, ...(provisionalBlocks.length ? provisionalBlocks : relatedGuidanceBlocks.length ? [] : [{ type: 'cannot_conclude', evidenceIds: [], points: source ? ['La fuente está localizada, pero aún no tenemos una afirmación revisada que mida exactamente lo que se pregunta.', 'La coincidencia temática por sí sola no demuestra la conclusión de la publicación.'] : (classified.guidance?.questions || ['¿De qué periodo, lugar o decisión concreta estamos hablando?']) }]) ]),
    clarificationQuestion: valuesContext ? '¿Qué regla concreta o criterio de reparto quieres comparar?' : groupContext ? '¿Qué dos grupos, prestación o población quieres comparar y en qué periodo?' : quantityContext || (isQuantityLike && quantityClaim) ? '¿Qué población, unidad y periodo deben usarse para validar la cifra?' : predictionContext ? '¿Qué fecha, indicador y resultado concreto permitirían comprobar la predicción?' : publicReuseClaim ? '¿Qué documento concreto quieres reutilizar y qué licencia o condiciones indica el organismo responsable?' : legalContext ? '¿Qué país, procedimiento y situación concreta quieres comprobar?' : definitionContext ? '¿Qué definición o indicador quieres utilizar para comparar la afirmación?' : localContext ? '¿De qué municipio, periodo y tipo de inseguridad hablas?' : recordedOffenceContext ? '¿Qué categoría quieres comprobar: homicidios, robos, fraudes u otra?' : ranking ? '¿Quieres cambiar el año, la definición o el conjunto de países?' : trend ? '¿Quieres comparar esta serie con otro periodo o territorio?' : observations.length ? '¿Quieres comprobar qué mide exactamente este dato?' : source ? '¿Qué afirmación concreta quieres comprobar de esta fuente?' : classified.guidance?.questions?.[0],
    limitation: primary ? (primary.cannotProve || primary.whatIsMissing) : budgetContext ? 'La fuente confirma el movimiento de crédito, pero no permite atribuir el dinero a un programa educativo concreto, a asesores o únicamente a Presidencia.' : publicReuseClaim ? 'La respuesta es sobre el marco general: un documento concreto puede tener una licencia, datos personales, restricciones de acceso o derechos de terceros adicionales.' : valuesContext ? 'Los datos pueden describir las reglas vigentes y sus efectos, pero no resuelven por sí solos la prioridad normativa.' : localContext ? 'No hay una serie nacional que pueda confirmar una experiencia concreta de un barrio; hacen falta datos locales y una medida definida.' : recordedOffenceContext ? 'El feed de delitos disponible está desagregado por categoría. No debe presentarse una de sus categorías como si fuera el total de la criminalidad nacional.' : observations.some((item) => item.populationFit === 'context' || item.populationFit === 'unknown') ? 'La fuente localizada aporta contexto, pero no desagrega exactamente la población mencionada. No debe usarse para comparar grupos sin el mismo denominador.' : observations.length && observations.every((item) => item.kind === 'official_publication') ? 'Hemos localizado documentos oficiales relacionados, pero todavía no hemos comprobado que su contenido demuestre la afirmación completa.' : observations.length ? 'Los datos son una pista provisional: todavía no se ha validado que midan exactamente la afirmación, su causalidad o el contexto completo.' : usableSource ? 'La fuente ha sido localizada, pero todavía no hay evidencia estructurada revisada que permita evaluar la afirmación.' : classified.guidance?.limitation,
    evidenceIds: primary ? evidenceIds : evidenceObservations.map((item) => item.id),
    sourceIds: primary ? sourceIds : [...new Set(evidenceObservations.map((item) => item.source?.id).filter(Boolean))],
    ...(primary?.sourceLinks?.length ? { sourceLinks: primary.sourceLinks } : sourceLinks.length ? { sourceLinks } : {}),
    knowledgeVersion: observations.length ? 'warehouse-draft-1' : 'legacy-index',
    ...(warehouseSeries ? { warehouseSeries } : {}),
  };
  const validation = validateAnswerPlan(result, { provisional: status === 'draft' });
  if (validation.ok) return { status, requestId: resultRequestId, canonicalSignature: classified.input?.canonical ? normalise(classified.input.canonical) : canonicalSignatureFor(text), result, relatedClaims: source && !primary ? [] : isGroupComparison ? relatedClaims.filter((item) => item.kind !== 'topic') : relatedClaims };
  console.error('Answer plan downgraded:', validation.errors.join('; '));
  const safeResult = {
    ...result,
    headline: 'Todavía no podemos sostener una respuesta completa.',
    summary: 'Hemos encontrado una pista, pero no ha pasado todos los controles necesarios para presentarla como una respuesta fiable.',
    coverage: 'insufficient',
    blocks: [
      ...(compilerBreakdown ? [compilerBreakdown] : []),
      { type: 'cannot_conclude', evidenceIds: [], points: ['La respuesta automática se ha descartado porque faltaba una relación verificable entre el dato y la afirmación.', usableSource ? 'Puedes consultar la fuente localizada, pero todavía no debe interpretarse como un veredicto.' : 'No hemos localizado una evidencia directa que permita sostener un veredicto.' ] },
    ],
    evidenceIds: [],
    sourceIds: [],
  };
  return { status: 'uncovered', requestId: resultRequestId, canonicalSignature: classified.input?.canonical ? normalise(classified.input.canonical) : canonicalSignatureFor(text), result: safeResult, relatedClaims: source && !primary ? [] : relatedClaims };
};

const enrichResolve = async (text, classified, sourceOverride, resultRequestId) => {
  const retrievalText = [text, ...(classified.compiler?.retrievalHints || []), ...(classified.compiler?.entities || [])].join(' ').slice(0, 6000);
  const explicitMetricRoute = preferredMetricIdsForQuery(retrievalText).size > 0;
  const recordedOffenceRoute = preferredMetricIdsForQuery(retrievalText).has('recorded_offences');
  const recordedOffenceCategory = recordedOffenceRoute ? recordedOffenceCategoryForQuery(retrievalText) : undefined;
  const topicFallback = classified.primary?.kind === 'topic';
  // A broad topic suggestion must not block a direct warehouse answer when
  // the user has supplied an explicit metric phrase such as “precio de la
  // luz” or “inflación anual”. Keep the topic as a related result instead.
  const retrievalClassified = explicitMetricRoute && topicFallback
    ? { ...classified, primary: undefined, alternatives: [classified.primary, ...(classified.alternatives || [])] }
    : classified;
  const handlerId = handlerForInput(classified.compiler || { retrievalHints: [text] }, classified.compiler?.claimType || '');
  // A bare number is often a dimension label in statistical indexes (for
  // example, an index with base year 100). Keep exact amounts for budget
  // events, but do not let generic quantities retrieve unrelated numeric rows.
  const warehouseQuery = handlerId === 'budget_transfer' ? retrievalText : retrievalText.replace(/\b\d[\d.,%]*\b/g, ' ');
  const suppressUnrelatedContext = localSpecificClaim(text) || evidenceUnavailableSignal(text) || (recordedOffenceRoute && !recordedOffenceCategory);
  let queryEmbedding;
  if (!classified.primary && semanticWarehouseEnabled && !suppressUnrelatedContext) {
    try {
      const embedded = await ollama('/api/embed', { model: embedModel, input: warehouseQuery.slice(0, 4000), keep_alive: -1 }, 1800);
      queryEmbedding = embedded.embeddings?.[0];
    } catch { /* Hybrid retrieval falls back to lexical search. */ }
  }
  const warehouse = !retrievalClassified.primary && !suppressUnrelatedContext ? await findWarehouseEvidence(warehouseQuery, retrievalClassified.compiler, queryEmbedding) : { observations: [], source: undefined };
  const liveLegal = !retrievalClassified.primary && !suppressUnrelatedContext && handlerId === 'legal_rule' && !warehouse.observations.length && !evidenceUnavailableSignal(text)
    ? await discoverBoeLegalRules(retrievalText, 6)
    : [];
  const allowDiscovery = !classified.compiler?.clarificationRequired;
  const indexedSource = allowDiscovery && !retrievalClassified.primary && !suppressUnrelatedContext && !warehouse.observations.length && !sourceOverride ? await findWarehouseSource(retrievalText) : null;
  // Official discovery is useful for new measurable or definitional claims,
  // but generic documents are not evidence for causal, group, legal,
  // predictive, or normative conclusions. Those handlers must either find a
  // typed record or explain what is missing instead of attaching a topical
  // publication.
  const discoveryEligible = new Set(['budget_transfer', 'quantity', 'proportion', 'ranking', 'trend', 'definition']);
  const discovered = allowDiscovery && discoveryEligible.has(handlerId) && !suppressUnrelatedContext && !warehouse.observations.length && !indexedSource && !sourceOverride
    ? (await discoverOfficialDocuments(retrievalText, 3)).map(discoveryObservation)
    : [];
  const source = sourceOverride || warehouse.source || liveLegal[0]?.source || (indexedSource ? { id: indexedSource.id, title: `Fuente indexada: ${indexedSource.title}`, url: indexedSource.url } : undefined) || discovered[0]?.source;
  const observations = warehouse.observations.length ? warehouse.observations : liveLegal.length ? liveLegal : discovered;
  const deterministic = toResolveResult(text, retrievalClassified, source, resultRequestId, observations);
  if (!answerPlannerEnabled || !deterministic.result) return deterministic;
  const upgraded = await planAnswerWithLocalModel(text, classified, deterministic, observations);
  return upgraded === deterministic.result ? deterministic : { ...deterministic, result: upgraded };
};

const readText = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString('utf8');
  if (request.headers['content-type']?.includes('application/json')) return String(JSON.parse(body).text || '').trim();
  const form = await new Request('http://local', { method: 'POST', headers: request.headers, body: Buffer.from(body) }).formData();
  return String(form.get('text') || '').trim();
};

const readResolveBody = async (request) => {
  const declaredLength = Number(request.headers['content-length'] || 0);
  if (declaredLength > INPUT_LIMITS.maxRequestBytes) return { text: '', inputType: 'text', hasFile: false, tooLarge: true };
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > INPUT_LIMITS.maxRequestBytes) return { text: '', inputType: 'text', hasFile: false, tooLarge: true };
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks);
  const body = rawBody.toString('utf8');
  if (request.headers['content-type']?.includes('multipart/form-data')) {
    try {
      const form = await new Request('http://local', { method: 'POST', headers: request.headers, body: rawBody }).formData();
      const file = form.get('file');
      if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') return { text: String(form.get('text') || '').trim(), inputType: String(form.get('inputType') || 'text'), hasFile: false };
      const fileBytes = Buffer.from(await file.arrayBuffer());
      if (fileBytes.length > INPUT_LIMITS.maxFileBytes) return { text: '', inputType: String(form.get('inputType') || 'text'), hasFile: false, tooLarge: true };
      return { text: String(form.get('text') || '').trim(), inputType: String(form.get('inputType') || 'text'), hasFile: true, media: { base64: fileBytes.toString('base64'), mime: file.type, sha: digest(fileBytes.toString('base64')).slice(0, 24) } };
    } catch (error) { console.error('Media parsing failed:', error instanceof Error ? error.message : error); return { text: '', inputType: 'text', hasFile: false }; }
  }
  try {
    const value = JSON.parse(body);
    return { text: String(value.text || '').trim(), inputType: String(value.inputType || 'text'), hasFile: false };
  } catch { return { text: '', inputType: 'text', hasFile: false }; }
};

const server = createServer(async (request, response) => {
  if (request.url === '/healthz' && request.method === 'GET') {
    response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    const totalLookups = telemetry.cacheHits + telemetry.cacheMisses;
    response.end(JSON.stringify({ status: 'ok', deterministic: true, dynamic: Date.now() >= inferenceDisabledUntil, queue: [...resolveJobs.values()].filter((item) => item.status === 'processing').length, metrics: { received: telemetry.received, completed: telemetry.completed, unavailable: telemetry.unavailable, cacheHitRate: totalLookups ? Number((telemetry.cacheHits / totalLookups).toFixed(3)) : 0, p95LatencyMs: percentile(telemetry.latencies, 0.95), statusCounts: telemetry.statusCounts } }));
    return;
  }
  if (!request.url?.startsWith('/api/classify') && !request.url?.startsWith('/v1/resolve')) { response.writeHead(404); response.end(); return; }
  try {
    if (classifierToken && request.headers.authorization !== `Bearer ${classifierToken}`) { response.writeHead(401, { 'content-type': 'application/json', 'cache-control': 'no-store' }); response.end(JSON.stringify({ status: 'unavailable' })); return; }
    const url = new URL(request.url, 'http://127.0.0.1');
    if (request.url.startsWith('/v1/resolve')) {
      const requestMatch = url.pathname.match(/^\/v1\/resolve\/([^/]+)$/);
      if (requestMatch && request.method === 'GET') {
        const job = resolveJobs.get(requestMatch[1]);
        response.writeHead(job ? 200 : 404, { 'content-type': 'application/json', 'cache-control': 'no-store' });
        response.end(JSON.stringify(job || { status: 'unavailable' }));
        return;
      }
      const body = await readResolveBody(request);
      if (body.tooLarge) { response.writeHead(413, { 'content-type': 'application/json', 'cache-control': 'no-store' }); response.end(JSON.stringify({ status: 'unavailable', relatedClaims: [] })); return; }
      const validation = validateInputMetadata({ text: body.text, inputType: body.inputType, hasFile: body.hasFile, fileSize: body.media?.base64 ? Buffer.byteLength(body.media.base64, 'base64') : 0, mimeType: body.media?.mime });
      if (!validation.ok) { response.writeHead(validation.code === 'file_too_large' || validation.code === 'text_too_large' ? 413 : validation.code === 'empty' || validation.code === 'invalid_url' ? 400 : 415, { 'content-type': 'application/json', 'cache-control': 'no-store' }); response.end(JSON.stringify({ status: validation.code === 'empty' || validation.code === 'text_too_large' ? 'uncovered' : 'unavailable', relatedClaims: [] })); return; }
      const origin = typeof request.headers['x-knowledge-gap-origin'] === 'string' ? request.headers['x-knowledge-gap-origin'].slice(0, 32) : 'runtime';
      const result = body.hasFile ? startMediaResolveJob(body.text, body.inputType, body.media, origin) : body.text && body.inputType === 'url' ? startUrlResolveJob(body.text) : body.text && body.inputType === 'text' ? startResolveJob(body.text, origin) : body.inputType !== 'text' ? { status: 'unavailable', relatedClaims: [] } : { status: 'uncovered', relatedClaims: [] };
      response.writeHead(body.text || body.hasFile ? (result.status === 'processing' ? 202 : 200) : 400, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      response.end(JSON.stringify(result));
      return;
    }
    const text = url.searchParams.get('text')?.trim() || await readText(request);
    const result = text ? await classify(text) : { status: 'unavailable' };
    response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    response.end(JSON.stringify(result));
  } catch { response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify({ status: 'unavailable' })); }
});

server.listen(port, '127.0.0.1', () => console.log(`Local claim service listening on 127.0.0.1:${port}`));
