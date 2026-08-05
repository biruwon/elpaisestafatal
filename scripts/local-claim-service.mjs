import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { RUNTIME_VERSIONS } from '../src/lib/knowledge/runtime-versions.mjs';
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
import { deterministicFallbackCompiler } from './knowledge/fallback-compiler.mjs';
import { compilerInstruction, compilerSchema, formatCompilerCandidates, normalizeCompilerOutput, reconcileCompilerSafety, shouldUseLocalCompiler } from './knowledge/local-compiler-contract.mjs';
import { applySafePlanUpgrade, buildEvidencePacket, plannerSchema, validateEvidencePacket } from './knowledge/evidence-packet.mjs';
import { selectCurrentLegalRule } from './knowledge/legal-rules.mjs';
import { discoverBoeLegalRules, isPublicReuseQuery } from './knowledge/boe-legal-discovery.mjs';
import { discoveryQueryTextFor } from './knowledge/discovery-query.mjs';
import { causalEvidenceProfile, causalEvidenceSteps } from './knowledge/causal-evidence.mjs';
import { predictionSpecFor, predictionStepsFor } from './knowledge/prediction-evidence.mjs';
import { legalEvidenceProfile, legalEvidenceSteps } from './knowledge/legal-evidence.mjs';
import { unitCompatible } from './knowledge/numeric-evidence.mjs';
import { isSpecificSemanticSignature, semanticFamilyKeys } from './knowledge/claim-family-routing.mjs';
import { domainProfileFor } from './knowledge/domain-handlers.mjs';
import { compareGroupObservations } from './knowledge/domain-verification.mjs';
import { resolvePublicHttpsUrl } from './knowledge/safe-url.mjs';
import { excludedMetricIdsForQuery, metricQueryTextForIds, preferredMetricIdsForQuery } from './knowledge/metric-query-hints.mjs';
import { createLocalInferenceProvider } from './local-inference-provider.mjs';

const root = new URL('../', import.meta.url).pathname;
const port = Number(process.env.LOCAL_CLASSIFIER_PORT || 8789);
const bindHost = process.env.LOCAL_CLASSIFIER_BIND_HOST || '127.0.0.1';
const endpoint = process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434';
const classifierToken = process.env.LOCAL_CLASSIFIER_TOKEN || '';
const routerModel = process.env.OLLAMA_ROUTER_MODEL || 'gemma3:4b';
const compilerTimeoutMs = Math.min(15000, Math.max(1800, Number(process.env.LOCAL_COMPILER_TIMEOUT_MS || 12000)));
const embedModel = process.env.OLLAMA_EMBED_MODEL || 'bge-m3';
const visionModel = process.env.OLLAMA_VISION_MODEL || 'qwen3-vl:8b';
// Local development should use the installed Ollama model automatically for
// structured answer enrichment. Set LOCAL_ANSWER_PLANNER=0 to benchmark the
// deterministic path in isolation. Every planner failure still returns the
// already-built deterministic result.
const answerPlannerEnabled = process.env.LOCAL_ANSWER_PLANNER !== '0';
const semanticWarehouseEnabled = process.env.WAREHOUSE_SEMANTIC_SEARCH === '1';
const speechCommand = process.env.LOCAL_SPEECH_COMMAND || '';
const speechArgs = (() => {
  try { return process.env.LOCAL_SPEECH_ARGS ? JSON.parse(process.env.LOCAL_SPEECH_ARGS) : ['{audio}']; } catch { return ['{audio}']; }
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
  if (metricId === 'gini_coefficient' || metricId === 'gini_coefficient_europe') return 'escala Gini 0–100';
  if (metricId === 'life_expectancy_at_birth' || metricId === 'life_expectancy_at_birth_europe') return 'años';
  if (metricId === 'fertility_rate' || metricId === 'fertility_rate_europe') return 'hijos por mujer';
  if (metricId === 'old_age_dependency_ratio') return 'personas mayores por cada 100 en edad de trabajar';
  if (metricId === 'older_population_share' || metricId === 'young_population_share') return '% de la población';
  if (metricId === 'population_change_rate') return 'por cada 1.000 habitantes';
  if (metricId === 'gdp_current_prices') return 'millones de euros';
  if (metricId === 'gdp_per_capita_current_prices') return '€ por habitante';
  if (metricId === 'gdp_per_capita_europe') return 'PPS por habitante';
  if (metricId === 'minimum_wage_monthly') return '€ al mes';
  if (metricId === 'social_protection_benefits_per_capita') return '€ por habitante';
  if (metricId === 'social_protection_benefits_per_capita_europe') return '€ por habitante';
  if (metricId === 'old_age_survivors_benefits_per_capita') return '€ por habitante';
  if (metricId === 'old_age_survivors_benefits_per_capita_europe') return '€ por habitante';
  if (metricId === 'government_debt_current_prices') return 'millones de euros';
  if (metricId === 'government_deficit_ratio_europe' || metricId === 'government_debt_ratio_europe') return '% del PIB';
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
const evidenceNeedLabels = new Map([
  ['metrica', ['Indicador exacto', 'Definir qué se mide: personas, euros, porcentaje, casos u otra unidad.']],
  ['periodo', ['Periodo comparable', 'Fijar el año, trimestre o intervalo; una cifra sin fecha no permite evaluar la tendencia.']],
  ['territorio', ['Territorio', 'Distinguir España, comunidad, provincia, municipio o barrio antes de comparar.']],
  ['poblacion', ['Población y denominador', 'Precisar a quién se cuenta y con qué población de referencia se calcula la tasa.']],
  ['categoria', ['Categoría', 'Separar la categoría concreta de una etiqueta amplia que puede mezclar medidas distintas.']],
  ['definicion', ['Definición', 'Acordar qué significa la expresión antes de convertirla en una conclusión estadística.']],
  ['comparacion', ['Comparación equivalente', 'Usar la misma definición, unidad, población, periodo y territorio en ambos lados.']],
  ['causa', ['Causa', 'Una coincidencia temporal o territorial no demuestra por sí sola que una variable cause la otra.']],
  ['fuente', ['Fuente primaria', 'Localizar el documento o conjunto de datos que mida directamente la afirmación.']],
  ['programa', ['Programa o regla', 'Identificar la prestación, convocatoria, norma o programa exacto al que se refiere la frase.']],
  ['norma', ['Norma vigente', 'Comprobar la regla aplicable y sus excepciones en la fecha y territorio relevantes.']],
  ['importe', ['Importe', 'Comprobar la cantidad exacta, la moneda y si es presupuesto, gasto ejecutado o transferencia.']],
  ['partida', ['Partida presupuestaria', 'Identificar la aplicación o capítulo concreto; el destino general no demuestra qué servicio se recorta.']],
  ['ejecucion', ['Ejecución', 'Separar lo anunciado, autorizado, pagado y efectivamente entregado.']],
  ['impacto', ['Impacto observado', 'Comprobar qué efecto medible produjo la decisión y sobre qué población.']],
  ['tasa', ['Tasa comparable', 'No sustituir una cifra bruta por una tasa ni mezclar grupos con distinta composición.']],
  ['fecha', ['Fecha', 'Fijar cuándo ocurrió o entró en vigor el hecho que se quiere comprobar.']],
]);
const evidenceLadderForCompiler = (compiler, source, handlerId = '') => {
  const defaultNeeds = {
    descriptive: ['metrica', 'periodo', 'territorio', 'fuente'],
    quantity: ['metrica', 'periodo', 'poblacion', 'fuente'],
    trend: ['metrica', 'periodo', 'territorio', 'fuente'],
    mixed: ['definicion', 'metrica', 'periodo', 'fuente'],
    legal_rule: ['norma', 'programa', 'fecha', 'fuente'],
    government_event: ['fecha', 'fuente', 'ejecucion', 'impacto'],
    budget_transfer: ['importe', 'partida', 'ejecucion', 'impacto'],
    causal: ['causa', 'comparacion', 'impacto', 'fuente'],
    normative: ['definicion', 'comparacion', 'impacto', 'fuente'],
    prediction: ['metrica', 'periodo', 'causa', 'fuente'],
  };
  const requestedNeeds = Array.isArray(compiler?.evidenceNeeds) ? compiler.evidenceNeeds : [];
  const normalizedRequestedNeeds = [...new Set(requestedNeeds.filter((need) => evidenceNeedLabels.has(need)))];
  const needs = normalizedRequestedNeeds.length
    ? normalizedRequestedNeeds
    : [...new Set((defaultNeeds[handlerId] || defaultNeeds[compiler?.claimType] || defaultNeeds.mixed).filter((need) => evidenceNeedLabels.has(need)))];
  if (!needs.length) return null;
  return {
    type: 'evidence_ladder',
    evidenceIds: [],
    steps: needs.slice(0, 6).map((need) => {
      const [label, missingDetail] = evidenceNeedLabels.get(need);
      return { label, status: need === 'fuente' && source ? 'context' : 'missing', detail: need === 'fuente' && source ? 'Hay una fuente relacionada, pero todavía debe comprobarse que mida directamente la afirmación.' : missingDetail };
    }),
  };
};
const lowSignalTokens = new Set(['espana', 'pais', 'gente', 'cosas', 'problema', 'problemas']);
const meaningfulBroadTerms = new Set(['destruida', 'destruido', 'ruina', 'arruinada', 'arruinado', 'colapsada', 'colapsado', 'inseguridad', 'inseguro', 'insegura', 'peligro', 'peligrosa', 'delincuencia', 'crisis', 'decadencia', 'impuestos', 'vivienda', 'sanidad', 'empleo', 'paro', 'inmigracion', 'inmigrantes', 'gobierno', 'educacion', 'politica', 'futuro']);
const isLowSignalInput = (value) => {
  const normalized = normalise(value);
  if (!normalized) return true;
  if (/\d|https?:\/\//.test(normalized)) return false;
  const meaningful = tokens(normalized).filter((token) => !lowSignalTokens.has(token));
  return meaningful.length === 0 || (meaningful.length === 1 && !meaningfulBroadTerms.has(meaningful[0]));
};
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

const inference = createLocalInferenceProvider({
  endpoint,
  allowedHosts: allowedInferenceHosts,
  isDisabled: () => Date.now() < inferenceDisabledUntil,
  disable: () => { inferenceDisabledUntil = Date.now() + inferenceBackoffMs; },
});

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
    const response = await inference.chat({ model: routerModel, stream: false, think: false, format: plannerSchema, keep_alive: -1, options: { temperature: 0, num_predict: 420, num_ctx: 8192 }, messages: [{ role: 'user', content: prompt }] }, 2200);
    const draft = parseModelJson(response.message?.content);
    const upgraded = normalizeAnswerPlan(applySafePlanUpgrade(result.result, draft, packet));
    return validateAnswerPlan(upgraded, { provisional: result.status === 'draft' }).ok ? upgraded : result.result;
  } catch {
    return result.result;
  }
};

const normalizeAnswerPlan = (plan) => {
  if (!plan || !Array.isArray(plan.blocks)) return plan;
  const statusMap = { known: 'available', observed: 'available', supported: 'available', strong: 'available', qualified: 'context', partial: 'context', context: 'context', unknown: 'missing', unresolved: 'missing', insufficient: 'missing', missing: 'missing' };
  return {
    ...plan,
    blocks: plan.blocks.map((block) => {
      if (block?.type && ['line_chart', 'bar_chart', 'comparison_chart'].includes(block.type) && !block.visualId) {
        return { ...block, visualId: 'warehouse-observation' };
      }
      if (block?.type !== 'evidence_ladder' || !Array.isArray(block.steps)) return block;
      const steps = block.steps.map((step) => ({ ...step, status: statusMap[step?.status] || step?.status, label: String(step?.label || '').trim(), detail: String(step?.detail || step?.label || '').trim() })).filter((step) => step.label && ['available', 'context', 'missing'].includes(step.status));
      return steps.length ? { ...block, steps } : null;
    }).filter(Boolean),
  };
};

// Keep the fast compiler and the local-model compiler on the same structured
// contract. In particular, fallback results must carry registry metric IDs as
// well; otherwise later retrieval can infer metrics from noisy generated
// hints and select a neighbouring series.
const fallbackCompiler = (text) => normalizeCompilerOutput(null, text);

const compileClaim = async (text, candidates = []) => {
  const candidateText = formatCompilerCandidates(candidates) || 'ninguno';
  const prompt = `${compilerInstruction}\n\nAfirmación:\n${text.slice(0, 4000)}\n\nCandidatos:\n${candidateText.slice(0, 5000)}`;
  try {
    // This is background enrichment: the deterministic result is already
    // available to the user. Allow one bounded cold-start model load, while
    // keeping failures finite and configurable for slower local hardware.
    const response = await inference.chat({ model: routerModel, stream: false, think: false, format: compilerSchema, keep_alive: -1, options: { temperature: 0, num_predict: 420, num_ctx: 3072 }, messages: [{ role: 'user', content: prompt }] }, compilerTimeoutMs);
    const value = parseModelJson(response.message?.content);
    if (!value || !Array.isArray(value.propositions)) {
      if (process.env.LOCAL_DEBUG === '1') console.error(`[local-compiler] Model response did not satisfy the compiler schema: ${boundedExcerpt(response.message?.content, 600)}`);
      return fallbackCompiler(text);
    }
    return normalizeCompilerOutput(value, text);
  } catch (error) {
    if (process.env.LOCAL_DEBUG === '1') console.error(`[local-compiler] ${error instanceof Error ? error.message : String(error)}`);
    return fallbackCompiler(text);
  }
};

const extractImageText = async (media) => {
  if (!media?.base64) return '';
  const response = await inference.chat({ model: visionModel, stream: false, think: false, keep_alive: -1, options: { temperature: 0, num_predict: 700, num_ctx: 4096 }, messages: [{ role: 'user', content: 'Extrae el texto visible y describe brevemente las afirmaciones, cifras, fechas y entidades que aparecen. No evalúes si son verdaderas. Devuelve texto plano conciso.', images: [media.base64] }] }, 30000);
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

const findBestWarehouseSource = async (queries = []) => {
  const candidates = await Promise.all([...new Set(queries.filter(Boolean).slice(0, 4))].map((query) => findWarehouseSource(query)));
  return candidates.filter(Boolean).sort((left, right) => Number(right.score || 0) - Number(left.score || 0))[0] || null;
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
  const normalizedQuery = normalise(query);
  const wantsSpain = includesAny(normalizedQuery, ['espana', 'nacional', 'pais']) && !includesAny(normalizedQuery, ['europa', 'union europea']);
  const ranked = groups.map((group) => {
    const units = normalise(group[0]?.unit);
    const unitPreference = wantsChange
      ? (includesAny(units, ['rate', 'change', 'variacion', 'growth', 'percent', 'porcentaje']) ? 0.3 : 0)
      : (includesAny(units, ['index', 'indice', 'level', 'nivel']) ? 0.3 : 0);
    const geographyPreference = wantsSpain && group.some((item) => includesAny(normalise(`${item.dimensionLabels?.geo || ''} ${item.dimensions?.geo || ''}`), ['espana', 'spain', 'es'])) ? 0.35 : 0;
    return { group, score: unitPreference + geographyPreference + Math.max(...group.map((item) => item.score || 0)) + Math.min(group.length, 24) / 1000 };
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
  // Prefer the metric contract produced by the shared compiler, while
  // retaining the deterministic query lookup as a safety net for fast-path
  // and legacy callers. The answer is therefore based on reusable evidence
  // IDs, not on a claim-specific alias list.
  const compilerMetricIds = Array.isArray(compiler?.metricIds) ? compiler.metricIds : [];
  const hintedMetricIds = new Set([
    ...compilerMetricIds,
    // Only use the query text as a fallback for callers that predate the
    // compiler metric contract. Generated retrieval prose is deliberately
    // excluded because it can add a neighbouring metric (“gasto” beside
    // “recaudación”, for example) and change the question being answered.
    ...(compilerMetricIds.length ? [] : preferredMetricIdsForQuery(normalizedQuery)),
  ]);
  const excludedMetricIds = excludedMetricIdsForQuery(normalizedQuery);
  // A hinted metric can legitimately have more than 100 observations (for
  // example monthly inflation). Keep the broad path small, but let an
  // explicit metric retrieve enough of its own series to retain the latest
  // periods for the chart.
  const comparisonMetricRoute = hintedMetricIds.has('gdp_real_growth_europe') || hintedMetricIds.has('gdp_per_capita_europe') || hintedMetricIds.has('inflation_rate_europe') || hintedMetricIds.has('employment_rate_europe') || hintedMetricIds.has('part_time_employment_rate_europe') || hintedMetricIds.has('temporary_employment_rate_europe') || hintedMetricIds.has('median_hourly_earnings_europe') || hintedMetricIds.has('housing_cost_overburden_rate_europe') || hintedMetricIds.has('youth_unemployment_rate_europe') || hintedMetricIds.has('early_school_leaving_rate_europe') || hintedMetricIds.has('tertiary_education_attainment_rate_europe') || hintedMetricIds.has('neet_rate_europe') || hintedMetricIds.has('arope_rate_europe') || hintedMetricIds.has('life_expectancy_at_birth_europe') || hintedMetricIds.has('fertility_rate_europe') || hintedMetricIds.has('unmet_healthcare_waiting_list_rate_europe') || hintedMetricIds.has('government_revenue_ratio_europe') || hintedMetricIds.has('government_current_taxes_income_wealth_europe') || hintedMetricIds.has('government_expenditure_ratio_europe') || hintedMetricIds.has('government_education_expenditure_ratio_europe') || hintedMetricIds.has('health_expenditure_per_capita_europe') || hintedMetricIds.has('median_equivalised_income_europe') || hintedMetricIds.has('old_age_survivors_benefits_per_capita_europe') || hintedMetricIds.has('social_protection_benefits_per_capita_europe') || hintedMetricIds.has('government_deficit_ratio_europe') || hintedMetricIds.has('government_debt_ratio_europe') || hintedMetricIds.has('gini_coefficient_europe') || hintedMetricIds.has('household_electricity_price_europe');
  const candidateLimit = comparisonMetricRoute ? 500 : hintedMetricIds.size ? 250 : 100;
  const candidates = (await findWarehouseObservations(query, candidateLimit, { queryEmbedding, metricIds: hintedMetricIds })).filter((item) => {
    const explicitMetricCandidate = hintedMetricIds.has(item.metricId) && (item.matchedTerms?.length || 0) >= 2;
    if (item.evidenceFit === 'weak' && !explicitMetricCandidate && !(['legal_document', 'legal_rule'].includes(item.kind) && item.matchedTerms?.length >= 3)) return false;
    if (item.freshness === 'stale' || item.freshness === 'invalid') return false;
    if (['official_publication', 'legal_document', 'legal_rule'].includes(item.kind) && item.matchedTerms?.length < Math.min(3, meaningfulTerms.length)) return false;
    // A location or comparison word alone is not evidence of subject fit.
    const semanticQualified = item.semanticScore >= 0.42 && item.retrievalChannels?.includes('semantic');
    if (subjectTerms.length && !(item.matchedTerms || []).some((term) => subjectTerms.includes(term)) && !semanticQualified) return false;
    // An explicit metric phrase is a stronger population contract than an
    // uncertain small-model label. For example, “alquileres” should retrieve
    // the rental series even if the compiler guessed a generic resident
    // population from the surrounding political wording.
    const populationFit = hintedMetricIds.size ? 'not_requested' : populationEvidenceFit(compiler?.population, item);
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
  // Once a metric contract exists, never fall back to a neighbouring metric
  // merely because the requested series has fewer than two rows. A shorter
  // or insufficient result is safer than answering a housing question with
  // the European variant, or a pay question with household income.
  const compatibleCandidates = hintedMetricIds.size
    ? metricCandidates
    : candidates.filter((item) => !excludedMetricIds.has(item.metricId));
  const preserveGroupSeries = hintedMetricIds.has('imv_title_holders_by_nationality');
  const observations = rankingQuery || compiler?.claimType === 'legal' || preserveGroupSeries
    ? compatibleCandidates
    : selectCompatibleWarehouseSeries(query, compatibleCandidates);
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
  const requestedGroup = includesAny(queryText, ['inmigr', 'extranj', 'nacionalidad', 'marroqui', 'rumano', 'latino', 'senegales', 'colombiano', 'venezolano', 'foreign', 'espanol', 'espanola', 'hombre', 'mujer', 'edad', 'joven', 'mayor', 'benefici', 'ayudas']);
  if (!requestedGroup) return [];
  const measureFamilies = [
    { query: ['ayud', 'prestacion', 'benefici', 'subsid', 'pension', 'imv', 'ingreso minimo'], evidence: ['ayud', 'prestacion', 'benefici', 'subsid', 'pension', 'imv', 'ingreso minimo', 'minimum'] },
    { query: ['delinc', 'crimen', 'delito', 'seguridad', 'insegur'], evidence: ['delinc', 'crimen', 'delito', 'seguridad', 'insegur', 'offence', 'crime'] },
    { query: ['empleo', 'trabaj', 'paro', 'desemple', 'ocup'], evidence: ['empleo', 'trabaj', 'paro', 'desemple', 'ocup', 'employment', 'unemployment'] },
    { query: ['viviend', 'alquiler', 'casa', 'precio'], evidence: ['viviend', 'alquiler', 'casa', 'precio', 'housing', 'rent'] },
    { query: ['poblacion', 'habit', 'nacid', 'ciudadan', 'inmigr', 'migr'], evidence: ['poblacion', 'habit', 'nacid', 'ciudadan', 'inmigr', 'migr', 'population', 'birth', 'citizen'] },
    { query: ['sanidad', 'salud', 'hospital', 'medic'], evidence: ['sanidad', 'salud', 'hospital', 'medic', 'health'] },
  ];
  const family = measureFamilies.find((candidate) => includesAny(queryText, candidate.query));
  if (!family) return [];
  const grouped = observations.filter((item) => hasNonTotalGroupDimension(item) && includesAny(observationText(item), family.evidence));
  // One subgroup is context, not a comparison. Requiring two distinct
  // non-total labels prevents a warehouse row for “foreign nationals” from
  // being presented as proof that one group receives more, commits more, or
  // is overrepresented than another.
  const groupLabels = new Set(grouped.flatMap((item) => Object.entries({ ...(item.dimensions || {}), ...(item.dimensionLabels || {}) })
    .filter(([key, value]) => hasNonTotalGroupDimension({ dimensions: { [key]: value } }))
    .map(([, value]) => normalise(value))
    .filter(Boolean)));
  return groupLabels.size >= 2 ? grouped : [];
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
  const compatible = numeric.filter((item) => observationIsPercentage(item) === claim.percentage && unitCompatible(text, item));
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
    const rawEntries = [...(await fetchCatalog()).map((entry) => ({ ...entry, published: true })), ...(await plannedClaims())];
    // Reuse the deterministic compiler's semantic family signatures for
    // published aliases. This is a cheap, rebuildable routing index: it
    // recognizes equivalent Spanish claim structure before embeddings or a
    // local model are needed, while preserving the existing compatibility and
    // evidence gates before any published result is returned.
    const entries = rawEntries.map((entry) => ({
      ...entry,
      semanticSignatures: entry.published && entry.kind === 'claim'
        ? [...new Set([entry.title, ...(entry.aliases || [])]
          .map((phrase) => fallbackCompiler(phrase).semanticSignature)
          .filter(Boolean))].slice(0, 32)
        : [],
      semanticFamilyKeys: entry.published && entry.kind === 'claim'
        ? [...new Set([entry.title, ...(entry.aliases || [])]
          .flatMap((phrase) => semanticFamilyKeys(fallbackCompiler(phrase).semanticSignature)))]
        : [],
    }));
    const signature = digest(JSON.stringify({
      entries,
      embedModel,
      indexVersion: RUNTIME_VERSIONS.indexKnowledge,
      compilerVersion: RUNTIME_VERSIONS.fallbackKnowledge,
    }));
    const hydrateEmbeddings = (value) => {
      if (value.embeddings?.length === entries.length || !entries.length) return;
      // Semantic hydration is an optimisation. Never make the first claim
      // wait for a batch embedding request; lexical matching is immediately
      // usable and the in-memory index is upgraded for later requests.
      void inference.embed({ model: embedModel, input: entries.map(searchText), keep_alive: -1 }, 30000)
        .then((response) => {
          const embeddings = Array.isArray(response.embeddings) ? response.embeddings : [];
          if (embeddings.length !== entries.length) return;
          value.embeddings = embeddings;
          return writeFile(indexPath, JSON.stringify(value));
        })
        .catch(() => { /* Lexical retrieval remains the supported fast path. */ });
    };
    try {
      const saved = JSON.parse(await readFile(indexPath, 'utf8'));
      if (saved.signature === signature) {
        hydrateEmbeddings(saved);
        return saved;
      }
    } catch { /* Rebuild the local index. */ }
    const value = { signature, entries, embeddings: [] };
    await writeFile(indexPath, JSON.stringify(value));
    hydrateEmbeddings(value);
    return value;
  })();
  return indexPromise;
};

const semanticEntitiesFor = (value) => String(fallbackCompiler(value)?.semanticSignature || '')
  .split('|')
  .filter((part) => part.startsWith('entity:'))
  .map((part) => part.slice('entity:'.length))
  .filter(Boolean);

const claimableCompoundParts = (text, compiler) => {
  const explicit = Array.isArray(compiler?.explicitPropositions) && compiler.explicitPropositions.length
    ? compiler.explicitPropositions.map((item) => String(item.text || '').trim()).filter(Boolean)
    : [];
  if (explicit.length > 1) return explicit.slice(0, 4);

  const match = String(text || '').trim().match(/^(.{8,}?)\s+y\s+(.{5,})$/i);
  if (!match) return [String(text || '').trim()].filter(Boolean);
  const left = match[1].trim();
  const right = match[2].trim();
  const leftSubject = left.match(/\b(inmigrantes?|extranjeros?|espanoles?|migrantes?|fijos? discontinuos?|trabajadores?)\b/i)?.[0] || '';
  const rightHasSubject = /\b(inmigrantes?|extranjeros?|espanoles?|migrantes?|fijos? discontinuos?|trabajadores?)\b/i.test(right);
  const rightWithSubject = leftSubject && !rightHasSubject ? `${leftSubject} ${right}` : right;
  const normalized = normalise(text);
  const looksLikeTwoClaims = /\b(inmigr|extranj|delinqu|delit|ayud|prestacion|fijo|desemple|ocupad|alquil|impuest|pension)\w*/.test(normalized);
  return looksLikeTwoClaims ? [left, rightWithSubject] : [String(text || '').trim()].filter(Boolean);
};

const publishedCoverageCandidate = (part, entries) => {
  const normalizedPart = normalise(part);
  const causalPart = /\b(?:porque|debido|a causa|por culpa|por la falta|por la poca|provoca|provocan|causa|causan|genera|generan|dispara|disparado)\b/.test(normalizedPart);
  const unsupportedModifier = /\b(?:manipulad|camuflad|ocult|inseguridad juridica|respaldad[oa] por el gobierno)\w*/.test(normalizedPart);
  const partTokens = new Set(tokens(part).filter((token) => token.length > 3));
  const partEntities = semanticEntitiesFor(part);
  return entries.map((entry) => {
    const entryText = searchText(entry);
    const entryTokens = new Set(tokens(entryText).filter((token) => token.length > 3));
    const sharedTokens = [...partTokens].filter((token) => entryTokens.has(token)).length;
    const tokenCoverage = partTokens.size ? sharedTokens / partTokens.size : 0;
    const entryEntities = semanticEntitiesFor(entryText);
    const entityCoverage = partEntities.length > 0 && partEntities.every((entity) => entryEntities.includes(entity));
    const lexical = lexicalScore(part, entry);
    const candidateCompiler = fallbackCompiler(entryText);
    const candidateCausal = candidateCompiler.claimType === 'causal' || candidateCompiler.propositions?.some((item) => item.type === 'causal');
    const candidateHasModifier = [...tokens(entryText)].some((token) => normalizedPart.includes(token) && ['manipulad', 'camuflad', 'ocult', 'juridic'].some((stem) => token.startsWith(stem)));
    // A related trend cannot cover a causal clause, and a generic topic
    // cannot cover a proposition whose decisive wording is “manipulated”,
    // “hidden”, or “legal insecurity”. These gates prevent the composite
    // path from turning adjacent claims into a false direct answer.
    if (causalPart && !candidateCausal) return { entry, score: 0, lexical, entityCoverage: false, tokenCoverage };
    if (unsupportedModifier && !candidateHasModifier) return { entry, score: 0, lexical, entityCoverage: false, tokenCoverage };
    if (!causalPart && candidateCausal && !/\b(?:causa|causan|provoca|provocan|genera|generan|por culpa|debido|a causa|inseguridad)\b/.test(normalizedPart)) return { entry, score: 0, lexical, entityCoverage: false, tokenCoverage };
    const score = Math.max(lexical, entityCoverage ? Math.min(0.84, 0.62 + tokenCoverage * 0.22) : tokenCoverage * 0.72);
    return { entry, score, lexical, entityCoverage, tokenCoverage };
  }).filter((candidate) => candidate.entityCoverage || candidate.lexical >= 0.62)
    .sort((left, right) => right.score - left.score || right.lexical - left.lexical)[0];
};

// A compound user message can contain several already-published claim
// families. Reusing those reviewed answers is a scalable way to turn a new
// wording into a strong clarification without inventing a new claim record.
// Every component must map to a published claim with evidence and sources;
// otherwise the normal qualified/unresolved path remains in control.
const buildPublishedCompositeResult = async (text, classified) => {
  if (classified?.primary) return null;
  // A metric-bearing input must be answered by the metric/evidence path. A
  // compound published-claim shortcut can otherwise stitch together a nearby
  // editorial page and present it as the answer to a new measurement request.
  // Exact canonical claims have already been retained before this function.
  if (preferredMetricIdsForQuery(text).size > 0) return null;
  // A causal sentence is one proposition with a proposed mechanism, not a
  // list of independent published claims. Splitting it into clauses can
  // combine adjacent facts (for example crime and immigration) and falsely
  // upgrade the causal conclusion. Let the causal handler evaluate it as a
  // whole instead.
  if (classified?.compiler?.claimType === 'causal' || classified?.compiler?.propositions?.some((item) => item.type === 'causal')) return null;
  const index = await getIndex();
  const entries = (index.entries || []).filter((entry) => entry.kind === 'claim' && entry.published && entry.evidenceIds?.length && entry.sourceRefs?.length);
  if (!entries.length) return null;
  const parts = claimableCompoundParts(text, classified?.compiler);
  if (parts.length < 2) return null;
  const matches = parts.map((part) => ({ part, candidate: publishedCoverageCandidate(part, entries) }));
  if (matches.some(({ candidate }) => !candidate || candidate.score < 0.62)) return null;
  const distinctSlugs = new Set(matches.map(({ candidate }) => candidate.entry.slug));
  if (distinctSlugs.size < 2 && !matches.every(({ candidate }) => candidate.entityCoverage)) return null;
  const covered = matches.map(({ part, candidate }) => ({ part, entry: candidate.entry }));
  const evidenceIds = [...new Set(covered.flatMap(({ entry }) => entry.evidenceIds || []))];
  const sourceIds = [...new Set(covered.flatMap(({ entry }) => entry.sourceRefs || []))];
  const sourceLinks = [...new Map(covered.flatMap(({ entry }) => entry.sourceLinks || []).map((source) => [source.url, source])).values()].slice(0, 6);
  const truePoints = covered.map(({ entry }) => entry.whatIsTrue || entry.answer || entry.title).filter(Boolean);
  const limits = covered.map(({ entry }) => entry.whatIsMissing || entry.cannotProve).filter(Boolean);
  const replies = covered.map(({ entry }) => entry.answer || entry.shareable || entry.whatIsTrue).filter(Boolean);
  const plan = normalizeAnswerPlan({
    schemaVersion: RUNTIME_VERSIONS.answerPlanSchema,
    headline: 'La frase mezcla afirmaciones que ya tienen aclaraciones publicadas',
    summary: 'Podemos comprobar las partes principales por separado. La respuesta no convierte una afirmación compuesta en un único dato: conserva qué está documentado y qué límite tiene cada parte.',
    coverage: 'strong',
    claimType: 'mixed',
    blocks: [
      { type: 'claim_breakdown', propositionIds: [], items: covered.map(({ part, entry }) => ({ text: part, type: entry.claimType || 'mixed', explicit: true, coveredBy: entry.slug })) },
      { type: 'confirmed', propositionIds: covered.flatMap(({ entry }) => entry.propositionIds || []), evidenceIds, points: truePoints.slice(0, 6) },
      ...(limits.length ? [{ type: 'cannot_conclude', evidenceIds, points: limits.slice(0, 6) }] : []),
      { type: 'conversation_reply', evidenceIds, text: replies.join(' ') },
    ],
    clarificationQuestion: '¿Quieres abrir cada parte por separado y revisar sus fuentes?',
    limitation: limits.join(' ') || 'Cada parte conserva el alcance y las limitaciones de su aclaración publicada.',
    evidenceIds,
    sourceIds,
    sourceLinks,
    knowledgeVersion: RUNTIME_VERSIONS.indexKnowledge,
  });
  const validation = validateAnswerPlan(plan);
  if (!validation.ok) return null;
  return {
    status: 'complete',
    requestId: requestId(text),
    canonicalSignature: classified.input?.canonical ? normalise(classified.input.canonical) : canonicalSignatureFor(text),
    result: plan,
    relatedClaims: covered.map(({ entry }) => ({ kind: 'claim', slug: entry.slug, title: entry.title, href: entry.href, confidence: 1 })),
  };
};

const classify = async (text) => {
  // Do not reuse a result generated for a different conversational wrapper.
  // “La sanidad está colapsada” and “¿Es verdad que la sanidad está
  // colapsada?” share a canonical signature, but the compiler can make
  // different decisions for them. Meaning-level caching can be reintroduced
  // only for validated, representation-independent answer plans.
  const key = normalise(text);
  const broadComplaintInput = /\b(?:espana|pais|este pais|el pais)\b[\s\w]{0,36}\b(?:destruida?|destruido|fatal|mal|ruina|desastre|cuesta abajo|arruinad[oa]|quebrada?|quiebra|bancarrota|impagable)\b/.test(key)
    || /\b(?:este pais|el pais|espana)\s+es\s+(?:un\s+)?desastre\b/.test(key)
    || /\bdeuda publica\b[\s\w]{0,24}\b(?:impagable|quebrada?|insostenible)\b/.test(key);
  if (isLowSignalInput(text) && !broadComplaintInput) {
    const result = { status: 'uncovered', input: { original: text, canonical: normalise(text) }, alternatives: [], guidance: { questions: ['¿Qué afirmación, hecho o experiencia quieres comprobar?'], limitation: 'No hemos identificado una afirmación comprobable en este texto.' } };
    answerCache.set(key, { value: result, expiresAt: Date.now() + cacheTtlMs });
    return result;
  }
  const cached = answerCache.get(key);
  if (cached && cached.expiresAt > Date.now()) { telemetry.cacheHits += 1; return cached.value; }
  if (cached) answerCache.delete(key);
  telemetry.cacheMisses += 1;
  const index = await getIndex();
  const deterministicCompiler = fallbackCompiler(text);
  const routingCompiler = deterministicFallbackCompiler(text);
  // Resolve a reusable evidence family before the broad-topic shortcut below.
  // A single proposition can still be specific (for example benefits plus
  // immigration); routing it to the topic first would discard the published
  // family that already answers the paraphrase.
  const routingFamilyKeys = new Set(semanticFamilyKeys(routingCompiler.semanticSignature));
  const hasPublishedSemanticFamily = routingFamilyKeys.size > 0
    && isSpecificSemanticSignature(routingCompiler.semanticSignature)
    && index.entries.some((entry) => entry.kind === 'claim' && entry.published
      && (entry.semanticFamilyKeys || []).some((key) => routingFamilyKeys.has(key)));
  const exactPublishedInput = index.entries.some((entry) => entry.kind === 'claim' && entry.published
    && [entry.title, ...(entry.aliases || [])].some((phrase) => normalise(phrase) === normalise(text)));
  const normalizedRoutingInput = normalise(routingCompiler.normalized);
  // An explicit metric request should go to the metric/evidence path before
  // a nearby published claim. Otherwise a new phrasing such as “cuesta más
  // encontrar trabajo que en Europa” can be swallowed by an employment
  // headline even though it asks for an unemployment comparison.
  const hasExplicitMetricRoute = preferredMetricIdsForQuery(text).size > 0;
  const directPublishedEntry = index.entries.find((entry) => entry.kind === 'claim' && entry.published
    && [entry.title, ...(entry.aliases || [])].some((phrase) => normalise(phrase) === normalizedRoutingInput));
  // A unique semantic family is enough to reuse a reviewed answer even when
  // lexical ranking or the later local compiler chooses a different surface
  // handler. This is the scalable path for new wording: one evidence family
  // can serve many paraphrases without creating a new claim record.
  const routingFamilyCounts = new Map();
  const routingSignatureCounts = new Map();
  for (const entry of index.entries) {
    if (entry.kind !== 'claim' || !entry.published) continue;
    for (const key of entry.semanticFamilyKeys || []) routingFamilyCounts.set(key, (routingFamilyCounts.get(key) || 0) + 1);
    for (const signature of entry.semanticSignatures || []) routingSignatureCounts.set(signature, (routingSignatureCounts.get(signature) || 0) + 1);
  }
  const earlyFamilyEntry = !exactPublishedInput && !hasExplicitMetricRoute && !localSpecificClaim(text) && !evidenceUnavailableSignal(text)
    && isSpecificSemanticSignature(routingCompiler.semanticSignature)
    ? index.entries.find((entry) => entry.kind === 'claim' && entry.published
      && (entry.semanticFamilyKeys || []).some((key) => routingFamilyKeys.has(key) && routingFamilyCounts.get(key) === 1))
    : undefined;
  const earlySignatureEntry = !earlyFamilyEntry && !exactPublishedInput && !hasExplicitMetricRoute && !localSpecificClaim(text) && !evidenceUnavailableSignal(text)
    && isSpecificSemanticSignature(routingCompiler.semanticSignature)
    && routingSignatureCounts.get(routingCompiler.semanticSignature) === 1
    ? index.entries.find((entry) => entry.kind === 'claim' && entry.published && (entry.semanticSignatures || []).includes(routingCompiler.semanticSignature))
    : undefined;
  const reusableFamilyEntry = directPublishedEntry || earlyFamilyEntry || earlySignatureEntry;
  if (reusableFamilyEntry) {
    const result = { status: 'published', input: { original: text, canonical: routingCompiler.normalized }, primary: { kind: 'claim', slug: reusableFamilyEntry.slug, title: reusableFamilyEntry.title, href: reusableFamilyEntry.href, confidence: 0.82, reason: 'La formulación pertenece a una familia de evidencia publicada.', answer: reusableFamilyEntry.answer || '', assessment: reusableFamilyEntry.assessment || '', whatIsTrue: reusableFamilyEntry.whatIsTrue || '', whatIsMissing: reusableFamilyEntry.whatIsMissing || '', cannotProve: reusableFamilyEntry.cannotProve || '', scale: reusableFamilyEntry.scale || '', propositionIds: reusableFamilyEntry.propositionIds || [], evidenceIds: reusableFamilyEntry.evidenceIds || [], sourceRefs: reusableFamilyEntry.sourceRefs || [], sourceLinks: reusableFamilyEntry.sourceLinks || [] }, relatedClaims: [{ kind: 'claim', slug: reusableFamilyEntry.slug, title: reusableFamilyEntry.title, href: reusableFamilyEntry.href, confidence: 0.82 }] };
    answerCache.set(key, { value: result, expiresAt: Date.now() + cacheTtlMs });
    return result;
  }
  const routingDomains = {
    immigration: 'inmigracion', crime: 'seguridad', housing: 'vivienda',
    employment: 'empleo', healthcare: 'sanidad', taxes: 'impuestos', public_finance: 'economia',
  };
  const routingTopics = [...new Set(Object.entries(routingDomains)
    .filter(([domain]) => routingCompiler.semanticSignature.includes(domain))
    .map(([, slug]) => slug))];
  if (!exactPublishedInput && !hasPublishedSemanticFamily && routingCompiler.claimType === 'descriptive' && routingCompiler.propositions.length <= 1 && routingTopics.length === 1) {
    const slug = routingTopics[0];
    const topic = index.entries.find((entry) => entry.kind === 'topic' && entry.slug === slug);
    if (topic) {
      const result = {
        status: 'related',
        input: { original: text, canonical: routingCompiler.normalized },
        alternatives: [{ kind: 'topic', slug: topic.slug, title: topic.title, href: topic.href, confidence: 0.35, handlerId: handlerForInput({ retrievalHints: [topic.title] }, 'descriptive') }],
        guidance: { questions: ['¿Qué indicador, periodo o territorio quieres comprobar?'], limitation: 'Es una formulación amplia sobre un tema concreto; hay que precisar el indicador antes de compararla con datos.' },
      };
      answerCache.set(key, { value: result, expiresAt: Date.now() + cacheTtlMs });
      return result;
    }
  }
  const deterministicHandler = handlerForInput(deterministicCompiler, deterministicCompiler.claimType);
  const lexicalRanked = index.entries.map((entry, position) => ({ entry, position, lexical: lexicalScore(text, entry) })).sort((left, right) => right.lexical - left.lexical);
  let vector = null;
  // Do not pay for an embedding request for obvious long-tail text. Exact and
  // alias matches are already covered lexically; semantic retrieval is only
  // useful when the input has a plausible relation to the published index.
  if ((lexicalRanked[0]?.lexical || 0) >= 0.1) {
    try { vector = (await inference.embed({ model: embedModel, input: text.slice(0, 4000), keep_alive: -1 }, 3000)).embeddings?.[0] || null; } catch { /* Keep lexical matching. */ }
  }
  const querySemanticSignature = deterministicCompiler.semanticSignature;
  // Keep both compiler views in the routing set. The fast deterministic
  // compiler may preserve a richer registry concept than the presentation
  // compiler (or vice versa); dropping either view makes valid paraphrases
  // fall through to a broad topic even when the published family is exact.
  const rawQueryFamilyKeys = [...new Set([
    ...semanticFamilyKeys(querySemanticSignature),
    ...routingFamilyKeys,
  ])];
  const maxFamilyKeyLength = Math.max(0, ...rawQueryFamilyKeys.map((key) => key.length));
  const queryFamilyKeys = new Set(rawQueryFamilyKeys.filter((key) => key.length === maxFamilyKeyLength));
  // Strong routing uses only the most specific key. Related guidance may use
  // a shorter core key when the user added an extra modifier or domain.
  const queryGuidanceFamilyKeys = new Set(rawQueryFamilyKeys);
  const distinctiveFamilyKey = (key) => {
    const payload = String(key).split('|').at(-1) || '';
    // Core keys are useful for related guidance only when they carry enough
    // semantic structure to distinguish a proposition family from a broad
    // topic. Derive that from the key rather than maintaining a growing list
    // of manually approved concepts as new claim families are published.
    const semanticPayload = payload;
    // A bare descriptive concept list (“housing+rental_housing”,
    // “benefits+budget”) is useful for retrieval but is not a proposition
    // family: it has no direction, comparison, trend, or other relation.
    // Keep it from authorizing a strong answer across unrelated claims.
    if (/^(?:descriptive|trend):[^:]+$/.test(semanticPayload) && !/_[a-z0-9_]+$/.test(semanticPayload)) return false;
    const semanticParts = semanticPayload.split(/[+_\-]/).filter((part) => part.length >= 3);
    return payload.includes('+') || semanticParts.length >= 2;
  };
  const familyKeyCounts = new Map();
  const familyKeyLexicalScores = new Map();
  const semanticSignatureCounts = new Map();
  const semanticSignatureLexicalScores = new Map();
  for (const candidate of index.entries.filter((item) => item.kind === 'claim')) {
    for (const key of candidate.semanticFamilyKeys || []) familyKeyCounts.set(key, (familyKeyCounts.get(key) || 0) + 1);
    for (const signature of candidate.semanticSignatures || []) semanticSignatureCounts.set(signature, (semanticSignatureCounts.get(signature) || 0) + 1);
  }
  for (const { entry, lexical } of lexicalRanked) {
    for (const signature of entry.semanticSignatures || []) {
      const values = semanticSignatureLexicalScores.get(signature) || [];
      values.push({ slug: entry.slug, lexical });
      semanticSignatureLexicalScores.set(signature, values);
    }
    for (const key of entry.semanticFamilyKeys || []) {
      const values = familyKeyLexicalScores.get(key) || [];
      values.push({ slug: entry.slug, lexical });
      familyKeyLexicalScores.set(key, values);
    }
  }
  const familyKeyDominates = (key, entry) => {
    if (familyKeyCounts.get(key) === 1) return true;
    const scores = [...(familyKeyLexicalScores.get(key) || [])].sort((left, right) => right.lexical - left.lexical);
    const own = scores.find((item) => item.slug === entry.slug);
    const runnerUp = scores.find((item) => item.slug !== entry.slug);
    // A clear wording lead can safely resolve an ambiguous broad family
    // (for example “desempleo” versus a candidate specifically mentioning
    // “paro juvenil”). Without that lead, retain the qualified path.
    return Boolean(own && scores[0]?.slug === entry.slug && own.lexical >= 0.55 && own.lexical - (runnerUp?.lexical || 0) >= 0.12);
  };
  const directUniqueFamilyMatch = (item) => item.entry.kind === 'claim'
    && item.entry.published
    && populationQualifierCompatible(item.entry)
    && isSpecificSemanticSignature(routingCompiler.semanticSignature)
    && (item.entry.semanticFamilyKeys || []).some((key) => routingFamilyKeys.has(key) && familyKeyCounts.get(key) === 1);
  const semanticSignatureDominates = (signature, entry) => {
    if (semanticSignatureCounts.get(signature) === 1) return true;
    const scores = [...(semanticSignatureLexicalScores.get(signature) || [])].sort((left, right) => right.lexical - left.lexical);
    const own = scores.find((item) => item.slug === entry.slug);
    const runnerUp = scores.find((item) => item.slug !== entry.slug);
    return Boolean(own && scores[0]?.slug === entry.slug && own.lexical >= 0.55 && own.lexical - (runnerUp?.lexical || 0) >= 0.12);
  };
  const queryEntityConcepts = new Set(String(querySemanticSignature).split('|').filter((part) => part.startsWith('entity:')));
  const knownDomainConcepts = ['politics', 'budget', 'public_finance', 'prices', 'cost_of_living', 'income', 'demography', 'housing', 'employment', 'immigration', 'crime', 'healthcare', 'taxes'];
  const queryDomainConcepts = new Set([
    ...queryEntityConcepts,
    ...knownDomainConcepts.filter((concept) => String(querySemanticSignature).includes(concept)).map((concept) => `entity:${concept}`),
  ]);
  const queryHasYouthQualifier = /\b(?:joven|jovenes|juvenil|juveniles|menor|menores)\b/.test(normalise(text));
  const populationQualifierCompatible = (entry) => {
    if (entry.kind !== 'claim') return true;
    const entryHasYouthQualifier = /\b(?:joven|jovenes|juvenil|juveniles|menor|menores)\b/.test(normalise(searchText(entry)));
    return queryHasYouthQualifier === entryHasYouthQualifier;
  };
  const ranked = lexicalRanked.map(({ entry, position, lexical }) => ({
    entry,
    lexical,
    semantic: cosine(vector, index.embeddings[position]),
    semanticFamilyRelated: entry.kind === 'claim' && populationQualifierCompatible(entry) && isSpecificSemanticSignature(querySemanticSignature) && (
      entry.semanticSignatures?.includes(querySemanticSignature)
      || (queryGuidanceFamilyKeys.size > 0 && (entry.semanticFamilyKeys || []).some((key) => distinctiveFamilyKey(key) && queryGuidanceFamilyKeys.has(key)))
    ),
    // A claim can use a different proposition form (trend, description, or
    // causal wording) while still addressing the same two-domain question.
    // Keep this as related guidance only; it never upgrades a result to a
    // strong published answer.
    semanticConceptRelated: entry.kind === 'claim' && queryEntityConcepts.size >= 2 && (() => {
      const candidateEntities = new Set((entry.semanticSignatures || []).flatMap((signature) => String(signature).split('|').filter((part) => part.startsWith('entity:'))));
      return [...queryEntityConcepts].every((concept) => candidateEntities.has(concept));
    })(),
    semanticFamilyMatch: entry.kind === 'claim' && populationQualifierCompatible(entry) && isSpecificSemanticSignature(querySemanticSignature) && (
      (entry.semanticSignatures?.includes(querySemanticSignature) && semanticSignatureDominates(querySemanticSignature, entry))
      || (queryFamilyKeys.size > 0 && (entry.semanticFamilyKeys || []).some((key) => queryFamilyKeys.has(key) && familyKeyDominates(key, entry)))
    ),
  })).map((item) => {
    // Semantic similarity is useful for paraphrases, but it must not outrank
    // distinctive words in a short political claim. Keep lexical evidence
    // dominant whenever the user supplied a meaningful direct match.
    const lexicalWeight = item.lexical >= 0.55 ? 0.75 : 0.55;
    const score = vector ? item.lexical * lexicalWeight + item.semantic * (1 - lexicalWeight) : item.lexical;
    return { ...item, score: item.semanticFamilyMatch ? Math.max(score, 0.82) : ((item.semanticFamilyRelated || item.semanticConceptRelated) ? Math.max(score, 0.36) : score) };
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
    // Population qualifiers are part of the evidence contract. A national
    // unemployment claim must not answer a youth-unemployment query (or the
    // reverse) merely because both contain “paro” or “empleo”.
    const entryHasYouthQualifier = /\b(?:joven|jovenes|juvenil|juveniles|menor|menores)\b/.test(normalise(searchText(entry)));
    if (queryHasYouthQualifier !== entryHasYouthQualifier) return false;
    // A published group claim about eligibility or participation must not
    // answer a stronger comparative statement unless the published wording
    // actually contains the comparison. Similar vocabulary is not evidence
    // that the same two groups were measured against each other.
    if (deterministicHandler === 'group_comparison' && requestedGroupContrast && !explicitGroupContrast(searchText(entry))) return false;
    return handlerForEntry(entry) === deterministicHandler;
  };
  const normalizedQuery = normalise(text);
  const deterministicRoutingCompiler = deterministicFallbackCompiler(text);
  const broadDeterministicDescription = deterministicRoutingCompiler.claimType === 'descriptive'
    && deterministicRoutingCompiler.propositions.length <= 1
    && !isSpecificSemanticSignature(deterministicRoutingCompiler.semanticSignature);
  const suppressPublishedContext = localSpecificClaim(text) || evidenceUnavailableSignal(text);
  const nearCanonicalEntry = ({ entry, lexical }) => entry.kind === 'claim' && lexical >= 0.9;
  const publicRanked = suppressPublishedContext ? [] : ranked.filter((item) => item.entry.published && numericCompatible(item.entry) && (compatibleEntry(item.entry) || nearCanonicalEntry(item)));
  // A family signature is a stronger routing signal than incidental lexical
  // overlap. Put the compatible published family candidate first so a
  // paraphrase cannot be displaced by a thematically similar claim or topic.
  const semanticFamilyCandidate = suppressPublishedContext
    ? undefined
    : ranked.find((item) => !broadDeterministicDescription && (item.semanticFamilyMatch || directUniqueFamilyMatch(item)) && item.entry.kind === 'claim' && numericCompatible(item.entry));
  const familyRanked = semanticFamilyCandidate
    ? [semanticFamilyCandidate, ...publicRanked.filter((item) => item.entry.slug !== semanticFamilyCandidate.entry.slug)]
    : publicRanked;
  // Broad evaluative complaints are not a published claim and should not be
  // forced into an ad-hoc record. Route the common “Spain is ruined” shape to
  // the reusable political topic so the user gets an immediate direction,
  // while keeping it explicitly topic guidance rather than a verdict.
  const broadComplaintText = normalise(text);
  const broadPoliticalComplaint = /\b(?:espana|pais|este pais|el pais)\b[\s\w]{0,36}\b(?:destruida?|destruido|fatal|mal|ruina|desastre|cuesta abajo|arruinad[oa])\b/.test(broadComplaintText)
    || /\b(?:este pais|el pais|espana)\s+es\s+(?:un\s+)?desastre\b/.test(broadComplaintText)
    || /\b(?:destruy(?:e|endo)|carga)\s+espana\b/.test(broadComplaintText);
  const broadEconomicComplaint = /\b(?:espana|pais|este pais|el pais)\b[\s\w]{0,36}\b(?:quebrada?|quiebra|bancarrota|impagable)\b/.test(broadComplaintText)
    || /\bdeuda publica\b[\s\w]{0,24}\b(?:impagable|quebrada?|insostenible)\b/.test(broadComplaintText)
    || /\bdebe\s+mas\s+de\s+lo\s+que\s+produce\b/.test(broadComplaintText);
  const rankedPoliticalTopic = ranked.find(({ entry }) => entry.kind === 'topic' && entry.slug === 'politica')
    || (broadPoliticalComplaint
      ? (() => {
        const entry = index.entries.find((item) => item.kind === 'topic' && item.slug === 'politica');
        return entry ? { entry, lexical: 0.35, semantic: 0, score: 0.35, semanticFamilyMatch: false } : undefined;
      })()
      : undefined);
  const rankedEconomicTopic = ranked.find(({ entry }) => entry.kind === 'topic' && entry.slug === 'economia')
    || (broadEconomicComplaint
      ? (() => {
        const entry = index.entries.find((item) => item.kind === 'topic' && item.slug === 'economia');
        return entry ? { entry, lexical: 0.35, semantic: 0, score: 0.35, semanticFamilyMatch: false, semanticFamilyRelated: false, semanticConceptRelated: false } : undefined;
      })()
      : undefined);
  const broadTopic = broadPoliticalComplaint ? rankedPoliticalTopic : (broadEconomicComplaint ? rankedEconomicTopic : undefined);
  const domainTopicSlugs = {
    immigration: 'inmigracion',
    crime: 'seguridad',
    housing: 'vivienda',
    employment: 'empleo',
    healthcare: 'sanidad',
    taxes: 'impuestos',
    public_finance: 'economia',
  };
  // The local model may return a deliberately broad or mixed compiler type for
  // short wording. Keep the deterministic compiler as a routing backstop so a
  // phrase such as “La vivienda está cara” still reaches the reusable housing
  // topic instead of falling into the generic political explanation.
  const routingSemanticSignature = `${querySemanticSignature}|${deterministicRoutingCompiler.semanticSignature}`;
  const semanticDomainCandidates = Object.keys(domainTopicSlugs).filter((domain) => routingSemanticSignature.includes(domain));
  const semanticTopicCandidates = [...new Set(semanticDomainCandidates.map((domain) => domainTopicSlugs[domain]))];
  // A single-domain broad statement (“invasión migratoria”, “España es
  // insegura”, “el alquiler está imposible”) is not a new claim family, but
  // it should still reach the reusable domain guidance. Derive the topic from
  // the compiler's normalized entity vocabulary instead of enumerating each
  // wording as another complaint special case.
  const domainTopicFallback = !broadTopic && !semanticFamilyCandidate
    && semanticTopicCandidates.length === 1
    ? (() => {
      const slug = semanticTopicCandidates[0];
      const entry = slug ? (index.entries.find((item) => item.kind === 'topic' && item.slug === slug) || {
        kind: 'topic',
        slug,
        title: slug,
        href: `/preocupaciones/${slug}`,
        published: true,
      }) : undefined;
      return entry ? { entry, lexical: 0.35, semantic: 0, score: 0.35, semanticFamilyMatch: false, semanticFamilyRelated: false, semanticConceptRelated: false } : undefined;
    })()
    : undefined;
  const effectiveBroadTopic = broadTopic || domainTopicFallback;
  const topicRanked = effectiveBroadTopic
    ? [effectiveBroadTopic, ...familyRanked.filter(({ entry }) => entry.slug !== effectiveBroadTopic.entry.slug)]
    : familyRanked;
  const conceptRelatedRanked = ranked.filter((item) => item.semanticConceptRelated && item.entry.kind === 'claim');
  const familyGuidanceRanked = ranked.filter((item) => item.semanticFamilyRelated && item.entry.kind === 'claim');
  const guidanceRanked = [...topicRanked,
    ...familyGuidanceRanked.filter(({ entry }) => !topicRanked.some((item) => item.entry.slug === entry.slug)),
    ...conceptRelatedRanked.filter(({ entry }) => !topicRanked.some((item) => item.entry.slug === entry.slug) && !familyGuidanceRanked.some((item) => item.entry.slug === entry.slug))];
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
    ? [directPhraseCandidate, ...guidanceRanked.filter((item) => item.entry.slug !== directPhraseCandidate.entry.slug)]
    : guidanceRanked;
  const topicConcepts = {
    politica: ['politics', 'budget'],
    economia: ['public_finance', 'prices', 'cost_of_living', 'income', 'demography'],
    vivienda: ['housing'],
    empleo: ['employment', 'income'],
    inmigracion: ['immigration'],
    seguridad: ['crime'],
    sanidad: ['healthcare'],
    impuestos: ['taxes', 'public_finance'],
    desigualdad: ['income', 'public_finance'],
    corrupcion: ['politics', 'public_finance'],
  };
  const topicMatchesQueryDomain = (entry) => {
    if (entry.kind !== 'topic' || queryDomainConcepts.size === 0) return true;
    const concepts = topicConcepts[entry.slug];
    return !concepts || [...queryDomainConcepts].some((part) => concepts.includes(part.slice('entity:'.length)));
  };
  const usefulAlternatives = (items) => items.filter(({ entry, score, lexical, semanticFamilyMatch, semanticFamilyRelated, semanticConceptRelated }) => {
    if (score < 0.32) return false;
    if (entry.kind === 'topic') return topicMatchesQueryDomain(entry) && (lexical >= 0.24 || (broadPoliticalComplaint && entry.slug === 'politica'));
    // Shared entities such as “immigration” are not enough to make an
    // unrelated published claim useful. Require the same semantic family or
    // an unmistakably direct phrase match before showing a claim as guidance.
    return semanticFamilyMatch || semanticFamilyRelated || semanticConceptRelated;
  }).slice(0, 3).map(({ entry, score, semanticFamilyMatch, semanticFamilyRelated, semanticConceptRelated }) => ({ kind: entry.kind, slug: entry.slug, title: entry.title, href: entry.href, confidence: score, handlerId: handlerForEntry(entry), validated: Boolean(semanticFamilyMatch || semanticFamilyRelated || semanticConceptRelated) }));
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
  // A unique semantic-family match is already a validated proposition
  // contract. Do not require the page's broad presentation label (often
  // “mixed”) to equal the compiler's narrower input handler; the family key
  // has already preserved type, polarity, entities, direction, and concepts.
  const strongMatch = Boolean(top && numericCompatible(top.entry) && (
    // A unique family key is the strongest deterministic signal. It is
    // intentionally allowed to work with low lexical overlap: the whole
    // purpose of the family index is to recognize different surface forms.
    ((!explicitMetricRoute || canonicalPhrase) && top.semanticFamilyMatch)
    || (top.score >= 0.5 && margin >= 0.08 && top.lexical >= 0.65 && lexicalMargin >= 0.2 && (compatibleHandlers || nearCanonicalPhrase) && (top.semanticFamilyMatch || canonicalPhrase) && (!explicitMetricRoute || canonicalPhrase))
  ));
  const semanticFamilyMatch = Boolean(top?.semanticFamilyMatch && numericCompatible(top.entry) && top.score >= 0.82 && (!explicitMetricRoute || canonicalPhrase));
  const broadEvaluative = deterministicCompiler.impliedPropositions.some((item) => item.type === 'definition');
  // An exact family signature is already a structured proposition match, so
  // an evaluative wrapper such as “está colapsada” must not force the user
  // into an uncovered dead end. Broad wording without a family match still
  // follows the cautious clarification path below.
  if (canonicalPhrase || (strongMatch && !broadEvaluative) || semanticFamilyMatch) {
    // A topic is useful guidance, but it is not a claim-specific answer. Keep
    // it as the first related result so a broad political or social complaint
    // gets a useful direction without being presented as a published verdict.
    if (top.entry.kind !== 'claim') return { status: 'related', input: { original: text }, alternatives: usefulAlternatives(decisionRanked) };
    return { status: 'published', input: { original: text }, primary: { kind: top.entry.kind, slug: top.entry.slug, title: top.entry.title, href: top.entry.href, confidence: top.score, reason: 'La formulación coincide con una afirmación publicada.', answer: top.entry.answer || '', assessment: top.entry.assessment || '', whatIsTrue: top.entry.whatIsTrue || '', whatIsMissing: top.entry.whatIsMissing || '', cannotProve: top.entry.cannotProve || '', scale: top.entry.scale || '', handlerId: topHandler, propositionIds: top.entry.propositionIds || [], evidenceIds: top.entry.evidenceIds || [], sourceRefs: top.entry.sourceRefs || [], sourceLinks: top.entry.sourceLinks || [] }, alternatives: usefulAlternatives(decisionRanked.slice(1)) };
  }
  // A recognized metric is already a concrete question. Do not let a broad
  // topic (for example housing) intercept it before the warehouse has had a
  // chance to answer or explicitly report that its evidence is missing.
  if (effectiveBroadTopic && !explicitMetricRoute) {
    return {
      status: 'related',
      input: { original: text },
      alternatives: [{ kind: 'topic', slug: effectiveBroadTopic.entry.slug, title: effectiveBroadTopic.entry.title, href: effectiveBroadTopic.entry.href, confidence: effectiveBroadTopic.score, handlerId: handlerForEntry(effectiveBroadTopic.entry) }],
      guidance: { questions: ['¿Qué decisión, indicador o periodo concreto quieres comprobar?'], limitation: broadPoliticalComplaint
        ? 'Es una valoración política amplia; hay que concretar el hecho antes de compararlo con datos.'
        : broadEconomicComplaint
          ? 'Es una valoración económica amplia; hay que concretar el indicador, periodo o magnitud antes de compararla con datos.'
          : 'Es una afirmación amplia sobre un ámbito concreto; hay que precisar el indicador, periodo o hecho antes de compararla con datos.' },
    };
  }
  const hasPlausibleCandidate = Boolean(top && top.score >= 0.34 && (top.lexical >= 0.2 || top.semantic >= 0.5));
  const meaningfulTokens = queryMeaningfulTokens;
  // A model call is valuable for a plausible paraphrase or a compound/high-
  // ambiguity claim. It is wasteful for every three-word descriptive query:
  // deterministic extraction plus the warehouse can already handle those
  // metric requests. This keeps long-tail batches bounded on local hardware.
  const compilerNeedsStructure = deterministicCompiler.propositions.length > 1
    || ['mixed', 'causal', 'legal', 'normative', 'predictive'].includes(deterministicCompiler.claimType)
    || (meaningfulTokens.length >= 2 && /\b\d[\d.,%]*\b/.test(text) && deterministicCompiler.claimType === 'comparative');
  // Deterministic broad-complaint handling is already the safety authority.
  // Calling the local model here only to have reconcileCompilerSafety discard
  // its structure adds several seconds to vague inputs such as “España está
  // destruida” and can leave the UI looking stuck. Keep the fast clarification
  // path synchronous; reserve model extraction for claims that can benefit
  // from proposition parsing or candidate disambiguation.
  const needsModelCompilation = shouldUseLocalCompiler({ text, deterministic: deterministicCompiler, hasPlausibleCandidate })
    || (!deterministicCompiler.clarificationRequired && compilerNeedsStructure);
  const compiledCandidate = !evidenceUnavailableSignal(text) && needsModelCompilation
    ? await compileClaim(text, hasPlausibleCandidate ? ranked.slice(0, 8).map(({ entry }) => entry) : [])
    : fallbackCompiler(text);
  const compiled = reconcileCompilerSafety(deterministicCompiler, compiledCandidate);
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
  const fallbackTopicSlugs = { immigration: 'inmigracion', crime: 'seguridad', housing: 'vivienda', employment: 'empleo', healthcare: 'sanidad', taxes: 'impuestos', public_finance: 'economia' };
  const fallbackRoutingSignature = `${classified.compiler?.semanticSignature || ''}|${deterministicFallbackCompiler(text).semanticSignature}`;
  const fallbackTopicSlug = Object.entries(fallbackTopicSlugs).find(([domain]) => fallbackRoutingSignature.includes(domain))?.[1];
  const fallbackTopic = fallbackTopicSlug && !classified.primary
    ? { kind: 'topic', slug: fallbackTopicSlug, title: fallbackTopicSlug, href: `/preocupaciones/${fallbackTopicSlug}`, confidence: 0.3 }
    : undefined;
  const broadTopicGuidance = classified.status === 'related' && !classified.primary && (classified.alternatives?.some((item) => item.kind === 'topic') || fallbackTopic);
  const requestedHandler = handlerForInput({ ...(classified.compiler || {}), retrievalHints: [text, ...(classified.compiler?.retrievalHints || [])] }, classified.compiler?.claimType || '');
  const domainSpecific = new Set(['legal_rule', 'budget_transfer', 'government_event']);
  const relatedClaims = [...(classified.alternatives || []), ...(fallbackTopic ? [fallbackTopic] : [])].filter((item, index, items) => items.findIndex((candidate) => candidate.slug === item.slug) === index).filter((item) => {
    if (broadTopicGuidance && item.kind !== 'topic') return false;
    if (domainSpecific.has(requestedHandler) && item.kind === 'claim' && item.handlerId && item.handlerId !== requestedHandler) return false;
    return true;
  }).map((item) => ({
    kind: item.kind,
    slug: item.slug,
    title: item.title,
    href: item.href,
    confidence: item.confidence,
  }));
  const primary = classified.primary;
  const hasValidatedRelatedClaim = classified.alternatives?.some((item) => item.kind === 'claim' && item.validated);
  if (primary) relatedClaims.unshift({ ...primary, confidence: primary.confidence });
  const evidenceIds = primary?.evidenceIds || [];
  const sourceIds = primary?.sourceRefs || [];
  const answer = primary?.answer || primary?.reason || classified.guidance?.limitation || 'La formulación no coincide con una evidencia publicada suficientemente directa.';
  const visualBlock = primary ? visualBlockForHandler(primary.handlerId || 'quantity', primary.slug, primary.evidenceIds || []) : null;
  const handlerId = primary?.handlerId || handlerForInput({ ...(classified.compiler || {}), retrievalHints: [text, ...(classified.compiler?.retrievalHints || [])] }, classified.compiler?.claimType || '');
  const isNormative = handlerId === 'normative';
  const isCausal = handlerId === 'causal';
  const isGroupComparison = handlerId === 'group_comparison';
  const domainProfile = isGroupComparison ? domainProfileFor(text) : null;
  const isPrediction = handlerId === 'prediction';
  const isLegal = handlerId === 'legal_rule';
  const isDefinition = handlerId === 'definition';
  const isQuantityLike = handlerId === 'quantity' || handlerId === 'proportion';
  const localClaim = localSpecificClaim(text);
  const groupObservations = isGroupComparison ? directGroupObservations(text, observations) : observations;
  const groupComparison = isGroupComparison ? compareGroupObservations(groupObservations) : null;
  const isBudgetTransfer = handlerId === 'budget_transfer';
  const budgetObservations = isBudgetTransfer ? observations.filter((item) => item.kind === 'official_publication' && item.finding?.type === 'budget_transfer') : [];
  const isGovernmentEvent = handlerId === 'government_event';
  const eventObservations = isGovernmentEvent ? observations.filter((item) => item.kind === 'official_publication' && item.finding?.type === 'government_event') : [];
  const eventPublication = eventObservations[0];
  const eventFinding = eventPublication?.finding;
  const legalObservations = isLegal ? observations.filter((item) => item.kind === 'legal_document' || item.kind === 'legal_rule') : [];
  const publicReuseClaim = isLegal && isPublicReuseQuery(text);
  const publicReuseRules = publicReuseClaim
    ? legalObservations
      .filter((item) => item.kind === 'legal_rule')
      .sort((left, right) => Number(right.topicScore || 0) - Number(left.topicScore || 0) || Number(right.score || 0) - Number(left.score || 0))
    : [];
  const currentLegalRule = selectCurrentLegalRule(legalObservations);
  const legalProfile = isLegal ? legalEvidenceProfile(legalObservations) : null;
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
      : legalEvidenceSteps(legalProfile || { hasRule: false, current: false, effectiveDate: false, procedure: false, exceptions: false }).map((step) => ({ ...step, detail: step.label === 'Aplicación al caso' ? 'La regla general no decide por sí sola los hechos, pruebas y procedimiento concretos.' : 'Comprobar este elemento en la norma y el expediente aplicables.' })),
  } : null;
  const quantityClaim = isQuantityLike ? claimedNumericValue(text, classified.compiler) : null;
  const quantity = isQuantityLike ? quantityAssessment(text, classified.compiler, observations) : null;
  const definitionData = isDefinition && observations.length && preferredMetricIdsForQuery(text).size > 0;
  const suppressGenericSource = (isGroupComparison && !groupObservations.length) || (isQuantityLike && quantityClaim && !quantity) || (isLegal && !legalObservations.length) || (isDefinition && !definitionData);
  const usableSource = suppressGenericSource ? undefined : source;
  const status = classified.status === 'published'
    ? 'complete'
    : isGroupComparison
      ? (usableSource ? 'draft' : 'uncovered')
      : classified.status === 'related'
        ? 'partial'
        : usableSource ? 'draft' : 'uncovered';
  const regionalComparison = !primary && !isNormative && !isCausal && !isLegal && !isDefinition && !isGroupComparison ? summarizeWarehouseRegionalComparison(text, observations) : null;
  const historicalClaim = includesAny(normalise(text), ['historia', 'historico', 'historica', 'evolucion', 'desde 2015', 'desde 2010', 'desde 2008']);
  const europeanComparison = !historicalClaim && !primary && !regionalComparison && !isNormative && !isCausal && !isLegal && !isDefinition && !isGroupComparison ? summarizeWarehouseEuropeanComparison(text, observations) : null;
  const ranking = !historicalClaim && !primary && !regionalComparison && !europeanComparison && !isNormative && !isCausal && !isLegal && !isDefinition && !isGroupComparison ? summarizeWarehouseRanking(text, observations) : regionalComparison || europeanComparison;
  const trend = !primary && !ranking && !isNormative && !isLegal && !isDefinition && !isGroupComparison ? summarizeWarehouseTrend(text, observations) : null;
  const causalObservations = isCausal ? observations.filter((item) => typeof item.value === 'number' && Number.isFinite(item.value)).slice(-12) : [];
  const causalProfile = isCausal ? causalEvidenceProfile(causalObservations) : null;
  const causalContext = causalObservations.length >= 2 ? {
    observations: causalObservations,
    headline: 'Hay datos relacionados, pero no una prueba de causalidad',
    summary: 'Hemos localizado una serie relacionada con la afirmación. Describe el contexto o la evolución observada, pero no demuestra por sí sola que una causa produzca la otra.',
    points: [
      `La serie localizada contiene ${causalObservations.length} observaciones comparables.`,
      'Una coincidencia temporal o territorial no identifica por sí sola el efecto causal.',
      'Para evaluar la causa harían falta comparación, magnitud, mecanismo y explicaciones alternativas.',
      ...(causalProfile?.hasDirectCausalStudy ? ['Hay una fuente que se presenta como estudio de impacto o efecto; todavía debe comprobarse su diseño y población.'] : ['No hemos localizado un estudio o mecanismo causal directo en las observaciones recuperadas.']),
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
    summary: (() => { const spec = predictionSpecFor(text, classified.compiler); return spec.measurable ? 'La predicción ya contiene un indicador, una magnitud y una fecha; todavía hay que fijar las condiciones y la fuente de seguimiento.' : 'Una serie histórica puede aportar contexto, pero no confirma por sí sola lo que ocurrirá. Para evaluar la predicción hay que fijar una fecha, un indicador, una magnitud y las condiciones que podrían cambiar el resultado.'; })(),
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
  const recordedOffenceContext = (preferredMetricIdsForQuery(text).has('recorded_offences') || includesAny(normalise(text), ['delincuencia', 'delitos registrados', 'criminalidad'])) && !recordedOffenceCategoryForQuery(text) ? {
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
      { type: 'evidence_ladder', evidenceIds: causalContext?.observations.map((item) => item.id) || [], steps: causalEvidenceSteps(causalProfile || { observationCount: 0, hasTemporalSequence: false, hasCrossContextComparison: false, hasDirectCausalStudy: false, supportsCausalConclusion: false }).map((step) => ({ ...step, detail: step.label === 'Conclusión causal' ? (step.status === 'qualified' ? 'La evidencia directa permite una evaluación cualificada, no una afirmación universal.' : 'Los datos recuperados no permiten atribuir el resultado a la causa propuesta.') : undefined })) },
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
      { type: 'prediction_conditions', items: predictionStepsFor(predictionSpecFor(text, classified.compiler)).map((step) => ({ ...step, value: step.label === 'Resultado comprobable' ? 'La predicción puede revisarse con los campos anteriores' : 'Fijar este campo antes de evaluarla' })) },
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
      { type: 'strongest_valid_concern', text: domainProfile ? `Puede haber diferencias reales, pero esta afirmación necesita datos específicos de ${domainProfile.id.replaceAll('_', ' ')} antes de extraer una conclusión.` : 'Puede haber diferencias reales entre grupos, pero solo una comparación equivalente permite saber su tamaño y significado.' },
      { type: 'group_comparison_requirements', items: [
        { label: 'Grupos equivalentes', status: groupObservations.length ? 'check' : 'missing', detail: domainProfile?.needs.includes('beneficiarios por grupo') ? 'Comparar personas beneficiarias con el mismo programa y criterio de elegibilidad.' : 'Definir exactamente quién pertenece a cada grupo.' },
        { label: 'Mismo denominador', status: groupObservations.length ? 'check' : 'missing', detail: domainProfile?.needs.includes('tasa por población') ? 'Usar tasas por población comparable, no el número bruto de detenidos o condenados.' : 'Comparar tasas sobre poblaciones equivalentes, no solo totales.' },
        { label: 'Mismo periodo y territorio', status: groupObservations.length ? 'check' : 'missing', detail: domainProfile?.needs.includes('programa y territorio') ? 'Identificar el programa de vivienda y el territorio exacto.' : 'Usar la misma fecha y cobertura geográfica.' },
        { label: 'Ajustes relevantes', status: 'missing', detail: domainProfile?.needs.includes('estructura de edad y sexo') ? 'Ajustar o separar edad, sexo, renta y territorio antes de hablar de causalidad.' : 'Comprobar edad, renta, composición familiar u otras diferencias que afecten al resultado.' },
        ...(domainProfile ? [{ label: 'Fuentes necesarias', status: 'missing', detail: domainProfile.sources.join(' · ') }] : []),
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
    ...(isGovernmentEvent ? [
      { type: 'strongest_valid_concern', text: 'Una decisión oficial puede aclarar qué se aprobó, pero una publicación no demuestra por sí sola su ejecución, impacto o intención política.' },
      { type: 'evidence_ladder', evidenceIds: eventObservations.map((item) => item.id), steps: [
        { label: 'Acto publicado', status: eventObservations.length ? 'available' : 'missing', detail: eventObservations.length ? 'Hay una publicación oficial relacionada con la decisión descrita.' : 'Falta localizar el acuerdo, decreto, resolución o convocatoria concreta.' },
        { label: 'Entidades y fecha', status: eventFinding ? 'available' : 'missing', detail: eventFinding ? 'La ficha conserva el tipo de acto y el texto de acción localizado.' : 'Hay que confirmar quién decide, quién recibe la medida y cuándo entra en vigor.' },
        { label: 'Ejecución y alcance', status: 'missing', detail: 'La publicación no demuestra por sí sola si la medida se ejecutó, a cuántas personas afecta o cuál fue su resultado.' },
        { label: 'Intención o consecuencia política', status: 'missing', detail: 'Las consecuencias e intenciones añadidas por una lectura política requieren evidencia adicional.' },
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
    if (isGroupComparison && groupComparison?.comparable) return [
      { type: 'comparison_chart', evidenceIds: [groupComparison.left.id, groupComparison.right.id], points: [
        `${groupComparison.left.dimensions?.group || groupComparison.left.population}: ${groupComparison.left.value} ${groupComparison.left.unit || ''}`.trim(),
        `${groupComparison.right.dimensions?.group || groupComparison.right.population}: ${groupComparison.right.value} ${groupComparison.right.unit || ''}`.trim(),
        `Diferencia observada: ${groupComparison.difference} ${groupComparison.left.unit || ''}`.trim(),
      ], caveat: 'Comparación descriptiva: no demuestra por sí sola causalidad ni explica diferencias individuales.' },
      { type: 'cannot_conclude', evidenceIds: [groupComparison.left.id, groupComparison.right.id], points: ['La comparación usa dos grupos con el mismo periodo, territorio y métrica.', 'Todavía hay que comprobar la definición de la medida, el denominador y los ajustes relevantes antes de atribuir causas.'] },
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
      ...(eventPublication ? (() => {
        const evidenceIds = eventObservations.map((item) => item.id);
        const action = String(eventFinding?.action || eventPublication.excerpt || '').trim();
        const eventType = String(eventFinding?.eventType || 'decisión oficial').replaceAll('_', ' ');
        return [
          { type: 'data_finding', evidenceIds, points: [`La fuente oficial recoge un acto clasificado como ${eventType}.`, action ? `Texto de acción localizado: ${action}` : 'El texto de la acción todavía necesita una extracción más precisa.'] },
          { type: 'conversation_reply', evidenceIds, text: action ? `La fuente oficial recoge ${eventType}: «${action}». Eso confirma que el acto fue publicado, pero no demuestra por sí solo su ejecución, alcance o todas las consecuencias que se le atribuyen.` : 'Hemos localizado una publicación oficial relacionada, pero todavía hay que comprobar el texto completo del acto antes de atribuirle consecuencias.' },
        ];
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
        : eventPublication
          ? ['La publicación documenta el acto, pero no demuestra por sí sola su ejecución, alcance, intención o impacto final.', 'Para comprobar esas consecuencias hacen falta registros de aplicación, presupuesto ejecutado, beneficiarios o resultados, según el caso.']
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
  const evidenceObservations = isGroupComparison ? groupObservations : isQuantityLike ? (quantity?.observations || (!quantityClaim ? observations : [])) : isLegal ? legalObservations : (isDefinition && !definitionData ? [] : observations);
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
  const resolvedClaimType = ['budget_transfer', 'government_event'].includes(handlerId) ? 'descriptive' : (classified.compiler?.claimType || 'mixed');
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
  const provisionalHasUsableData = provisionalBlocks.some((block) => ['key_number', 'data_finding', 'line_chart', 'bar_chart', 'comparison_chart', 'money_flow', 'conversation_reply'].includes(block.type));
  const generatedMethod = !primary && !provisionalHasUsableData && !handlerBlocks.some((block) => block.type === 'evidence_ladder' || block.type === 'legal_decision_tree' || block.type === 'group_comparison_requirements')
    ? evidenceLadderForCompiler(classified.compiler, source, handlerId)
    : null;
  const metricEvidenceGap = explicitMetricRoute && !observations.length && !primary;
  const result = {
    schemaVersion: RUNTIME_VERSIONS.answerPlanSchema,
    headline: primaryHeadline || valuesContext?.headline || groupContext?.headline || quantityContext?.headline || budgetContext?.headline || (isGovernmentEvent ? 'La afirmación se refiere a un acto oficial' : undefined) || predictionContext?.headline || legalContext?.headline || definitionContext?.headline || localContext?.headline || recordedOffenceContext?.headline || causalContext?.headline || ranking?.headline || trend?.headline || (metricEvidenceGap ? 'Hemos identificado el indicador, pero todavía falta su evidencia' : relatedTopic ? 'La conversación apunta a un tema político amplio' : usableSource ? 'Hemos localizado una fuente, pero todavía falta comprobar la afirmación.' : 'Todavía no tenemos una comprobación publicada para esta afirmación.'),
    summary: primary ? answer : valuesContext?.summary || groupContext?.summary || quantityContext?.summary || budgetContext?.summary || (isGovernmentEvent ? 'La comprobación debe separar el acto que se publicó de su ejecución, alcance, impacto e intención.' : undefined) || predictionContext?.summary || legalContext?.summary || definitionContext?.summary || localContext?.summary || recordedOffenceContext?.summary || causalContext?.summary || ranking?.summary || trend?.summary || (metricEvidenceGap ? 'La formulación encaja con una familia de datos reutilizable, pero el almacén local todavía no contiene observaciones compatibles para ese indicador.' : relatedTopic ? `La frase parece referirse a ${relatedTopic.title.toLocaleLowerCase('es')}, pero hace falta concretar el hecho o la decisión para comprobarla.` : usableSource ? 'Hemos localizado una fuente potencialmente relevante, pero no hemos encontrado todavía una coincidencia revisada que permita convertirla en una respuesta factual.' : answer),
    coverage: status === 'complete' ? 'strong' : status === 'partial' || causalContext || ranking || trend || quantityContext || budgetContext || (publicReuseClaim && legalObservations.length) ? 'qualified' : valuesContext ? 'values' : 'insufficient',
    claimType: resolvedClaimType,
    blocks: primary ? [{ type: 'confirmed', propositionIds: primary.propositionIds || [], evidenceIds: primary.evidenceIds || [], points: [primary.whatIsTrue, primary.scale].filter(Boolean) }, ...(visualBlock ? [visualBlock] : []), ...(legalPrimaryBlock ? [legalPrimaryBlock] : []), ...(primary.whatIsMissing || primary.cannotProve ? [{ type: 'cannot_conclude', evidenceIds: primary.evidenceIds || [], points: [primary.whatIsMissing, primary.cannotProve].filter(Boolean) }] : []), { type: 'conversation_reply', evidenceIds: primary.evidenceIds || [], text: answer }] : compactGuidanceBlocks([ ...(compilerBreakdown ? [compilerBreakdown] : []), ...handlerBlocks, ...relatedGuidanceBlocks, ...(generatedMethod ? [generatedMethod] : []), ...(provisionalBlocks.length ? provisionalBlocks : relatedGuidanceBlocks.length ? [] : [{ type: 'cannot_conclude', evidenceIds: [], points: source ? ['La fuente está localizada, pero aún no tenemos una afirmación revisada que mida exactamente lo que se pregunta.', 'La coincidencia temática por sí sola no demuestra la conclusión de la publicación.'] : (classified.guidance?.questions || ['¿De qué periodo, lugar o decisión concreta estamos hablando?']) }]) ]),
    clarificationQuestion: valuesContext ? '¿Qué regla concreta o criterio de reparto quieres comparar?' : groupContext ? '¿Qué dos grupos, prestación o población quieres comparar y en qué periodo?' : quantityContext || (isQuantityLike && quantityClaim) ? '¿Qué población, unidad y periodo deben usarse para validar la cifra?' : predictionContext ? '¿Qué fecha, indicador y resultado concreto permitirían comprobar la predicción?' : publicReuseClaim ? '¿Qué documento concreto quieres reutilizar y qué licencia o condiciones indica el organismo responsable?' : legalContext ? '¿Qué país, procedimiento y situación concreta quieres comprobar?' : definitionContext ? '¿Qué definición o indicador quieres utilizar para comparar la afirmación?' : localContext ? '¿De qué municipio, periodo y tipo de inseguridad hablas?' : recordedOffenceContext ? '¿Qué categoría quieres comprobar: homicidios, robos, fraudes u otra?' : isGovernmentEvent ? '¿Qué parte quieres comprobar: el acto publicado, su ejecución o sus consecuencias?' : ranking ? '¿Quieres cambiar el año, la definición o el conjunto de países?' : trend ? '¿Quieres comparar esta serie con otro periodo o territorio?' : observations.length ? '¿Quieres comprobar qué mide exactamente este dato?' : source ? '¿Qué afirmación concreta quieres comprobar de esta fuente?' : classified.guidance?.questions?.[0],
    limitation: primary ? (primary.cannotProve || primary.whatIsMissing) : budgetContext ? 'La fuente confirma el movimiento de crédito, pero no permite atribuir el dinero a un programa educativo concreto, a asesores o únicamente a Presidencia.' : isGovernmentEvent ? 'La publicación oficial documenta el acto localizado, pero no demuestra por sí sola su ejecución, alcance, intención política ni impacto final.' : publicReuseClaim ? 'La respuesta es sobre el marco general: un documento concreto puede tener una licencia, datos personales, restricciones de acceso o derechos de terceros adicionales.' : valuesContext ? 'Los datos pueden describir las reglas vigentes y sus efectos, pero no resuelven por sí solos la prioridad normativa.' : localContext ? 'No hay una serie nacional que pueda confirmar una experiencia concreta de un barrio; hacen falta datos locales y una medida definida.' : recordedOffenceContext ? 'El feed de delitos disponible está desagregado por categoría. No debe presentarse una de sus categorías como si fuera el total de la criminalidad nacional.' : metricEvidenceGap ? 'El sistema reconoce el indicador, pero no tiene todavía una fuente estructurada con el periodo, población o territorio necesarios para responder.' : observations.some((item) => item.populationFit === 'context' || item.populationFit === 'unknown') ? 'La fuente localizada aporta contexto, pero no desagrega exactamente la población mencionada. No debe usarse para comparar grupos sin el mismo denominador.' : observations.length && observations.every((item) => item.kind === 'official_publication') ? 'Hemos localizado documentos oficiales relacionados, pero todavía no hemos comprobado que su contenido demuestre la afirmación completa.' : observations.length ? 'Los datos son una pista provisional: todavía no se ha validado que midan exactamente la afirmación, su causalidad o el contexto completo.' : usableSource ? 'La fuente ha sido localizada, pero todavía no hay evidencia estructurada revisada que permita evaluar la afirmación.' : classified.guidance?.limitation,
    evidenceIds: primary ? evidenceIds : evidenceObservations.map((item) => item.id),
    sourceIds: primary ? sourceIds : [...new Set(evidenceObservations.map((item) => item.source?.id).filter(Boolean))],
    ...(primary?.sourceLinks?.length ? { sourceLinks: primary.sourceLinks } : sourceLinks.length ? { sourceLinks } : {}),
    knowledgeVersion: observations.length ? RUNTIME_VERSIONS.warehouseKnowledge : RUNTIME_VERSIONS.indexKnowledge,
    ...(warehouseSeries ? { warehouseSeries } : {}),
  };
  const normalizedResult = normalizeAnswerPlan(result);
  const validation = validateAnswerPlan(normalizedResult, { provisional: status === 'draft' });
  if (validation.ok) return { status, requestId: resultRequestId, canonicalSignature: classified.input?.canonical ? normalise(classified.input.canonical) : canonicalSignatureFor(text), result: normalizedResult, relatedClaims: explicitMetricRoute ? relatedClaims.filter((item) => item.kind !== 'topic') : source && !primary && !broadTopicGuidance && !hasValidatedRelatedClaim ? [] : isGroupComparison && primary ? relatedClaims.filter((item) => item.kind !== 'topic') : relatedClaims };
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
  // An unrelated discovered source must not erase deterministic topic
  // guidance. Broad wording should still point to the reusable domain even
  // when discovery happened to return a contextual document.
  const finalRelatedClaims = source && !primary && !broadTopicGuidance && !hasValidatedRelatedClaim ? [] : relatedClaims;
  return { status: 'uncovered', requestId: resultRequestId, canonicalSignature: classified.input?.canonical ? normalise(classified.input.canonical) : canonicalSignatureFor(text), result: safeResult, relatedClaims: explicitMetricRoute ? finalRelatedClaims.filter((item) => item.kind !== 'topic') : finalRelatedClaims };
};

const enrichResolve = async (text, classified, sourceOverride, resultRequestId) => {
  // Enrichment must never replace a canonical published answer with a
  // provisional warehouse composition. Resolve the normalized title/alias
  // again at this boundary because this is where dynamic retrieval can
  // otherwise overwrite a valid published classification.
  const enrichmentIndex = await getIndex();
  const enrichmentCompiler = deterministicFallbackCompiler(text);
  const enrichmentCanonical = normalise(enrichmentCompiler.normalized);
  const canonicalPublished = enrichmentIndex.entries.find((entry) => entry.kind === 'claim' && entry.published
    && [entry.title, ...(entry.aliases || [])].some((phrase) => normalise(phrase) === enrichmentCanonical));
  if (canonicalPublished) {
    const canonicalPrimary = {
      kind: 'claim', slug: canonicalPublished.slug, title: canonicalPublished.title, href: canonicalPublished.href,
      confidence: 1, reason: 'La formulación coincide con una afirmación publicada.',
      answer: canonicalPublished.answer || '', assessment: canonicalPublished.assessment || '',
      whatIsTrue: canonicalPublished.whatIsTrue || '', whatIsMissing: canonicalPublished.whatIsMissing || '',
      cannotProve: canonicalPublished.cannotProve || '', scale: canonicalPublished.scale || '',
      handlerId: handlerForInput({ retrievalHints: [canonicalPublished.title, ...(canonicalPublished.keywords || [])], entities: canonicalPublished.aliases || [] }, canonicalPublished.claimType),
      propositionIds: canonicalPublished.propositionIds || [], evidenceIds: canonicalPublished.evidenceIds || [],
      sourceRefs: canonicalPublished.sourceRefs || [], sourceLinks: canonicalPublished.sourceLinks || [],
    };
    return toResolveResult(text, { ...classified, status: 'published', primary: canonicalPrimary, alternatives: [] }, sourceOverride, resultRequestId);
  }
  const retrievalText = [text, ...(classified.compiler?.retrievalHints || []), ...(classified.compiler?.entities || []), ...(classified.compiler?.evidenceNeeds || [])].join(' ').slice(0, 6000);
  const compilerMetricIds = Array.isArray(classified.compiler?.metricIds) ? classified.compiler.metricIds : [];
  const hintedMetricIds = new Set([
    ...compilerMetricIds,
    ...(compilerMetricIds.length ? [] : preferredMetricIdsForQuery(text)),
  ]);
  const explicitMetricRoute = hintedMetricIds.size > 0;
  const recordedOffenceRoute = hintedMetricIds.has('recorded_offences') || includesAny(normalise(text), ['delincuencia registrada', 'delitos registrados', 'robos registrados', 'hurtos registrados', 'homicidios registrados', 'fraudes registrados', 'violencia sexual registrada', 'criminalidad registrada']);
  const recordedOffenceCategory = recordedOffenceRoute ? recordedOffenceCategoryForQuery(retrievalText) : undefined;
  // A broad topic suggestion must not block a direct warehouse answer when
  // the user has supplied an explicit metric phrase such as “precio de la
  // luz” or “inflación anual”. Keep the topic as a related result instead.
  const preservePublishedClaim = classified.primary?.kind === 'claim' && classified.status === 'published';
  const retrievalClassified = explicitMetricRoute && !preservePublishedClaim
    // A nearby published claim is not a valid alternative to an explicit
    // metric request. Keeping it here makes the UI look as if the metric was
    // answered by that claim, even when the warehouse selected the right
    // series. The metric result should stand on its own.
    ? { ...classified, primary: undefined, alternatives: [] }
    : classified;
  // Re-assert the metric vocabulary from the user's original wording at the
  // retrieval boundary. The local model may return useful semantic hints,
  // but it must not replace a direct registry match with a neighbouring
  // metric inferred from its paraphrase.
  const authoritativeMetricIds = preferredMetricIdsForQuery(text);
  if (authoritativeMetricIds.size) {
    retrievalClassified.compiler = { ...retrievalClassified.compiler, metricIds: [...authoritativeMetricIds] };
  }
  const handlerId = handlerForInput({ ...(classified.compiler || {}), retrievalHints: [text, ...(classified.compiler?.retrievalHints || [])] }, classified.compiler?.claimType || '');
  const discoveryText = discoveryQueryTextFor({ text, compiler: classified.compiler, handlerId });
  const publishedComposite = await buildPublishedCompositeResult(text, retrievalClassified);
  if (publishedComposite) return publishedComposite;
  // A bare number is often a dimension label in statistical indexes (for
  // example, an index with base year 100). Keep exact amounts for budget
  // events, but do not let generic quantities retrieve unrelated numeric rows.
  const warehouseQuery = handlerId === 'budget_transfer' ? retrievalText : retrievalText.replace(/\b\d[\d.,%]*\b/g, ' ');
  const suppressUnrelatedContext = localSpecificClaim(text) || evidenceUnavailableSignal(text) || (recordedOffenceRoute && !recordedOffenceCategory);
  let queryEmbedding;
  if (!classified.primary && semanticWarehouseEnabled && !suppressUnrelatedContext) {
    try {
      const embedded = await inference.embed({ model: embedModel, input: warehouseQuery.slice(0, 4000), keep_alive: -1 }, 1800);
      queryEmbedding = embedded.embeddings?.[0];
    } catch { /* Hybrid retrieval falls back to lexical search. */ }
  }
  // Compound inputs need proposition-level retrieval. Searching only the full
  // sentence can bury each metric behind unrelated clauses (for example,
  // employment plus housing in one message). Keep this bounded to the full
  // query plus at most three deterministic explicit propositions.
  const propositionQueries = Array.isArray(retrievalClassified.compiler?.explicitPropositions)
    ? retrievalClassified.compiler.explicitPropositions.map((item) => item.text).filter(Boolean)
    : [];
  const counterpartTerms = handlerId === 'group_comparison'
    ? (() => {
      const normalized = normalise(text);
      if (includesAny(normalized, ['inmigr', 'extranj', 'nacionalidad', 'marroqui', 'rumano', 'latino', 'senegales', 'colombiano', 'venezolano'])) return 'españoles nacionales extranjeros inmigrantes';
      if (includesAny(normalized, ['español', 'nacional'])) return 'españoles nacionales extranjeros inmigrantes';
      if (includesAny(normalized, ['mujer', 'hombre', 'sexo'])) return 'mujeres hombres sexo';
      if (includesAny(normalized, ['joven', 'mayor', 'edad'])) return 'jóvenes mayores edad';
      return '';
    })()
    : '';
  const recordedOffenceQuery = recordedOffenceCategory
    ? `${recordedOffenceCategory.terms[0]} España delitos registrados`
    : '';
  const metricFallbackQuery = hintedMetricIds.has('house_price_index')
    ? 'precio vivienda España evolución'
    : hintedMetricIds.has('rental_price_index')
      ? 'precio alquiler España evolución'
      : hintedMetricIds.has('imv_title_holders_by_nationality')
        ? 'ingreso minimo vital titulares nacionalidad'
        : hintedMetricIds.has('government_current_taxes_income_wealth_europe')
          ? 'presion fiscal España evolución'
          : hintedMetricIds.has('unmet_healthcare_waiting_list_rate')
            ? 'lista de espera sanitaria España evolución'
        : hintedMetricIds.size
          // Metric IDs are indexed alongside aliases in every warehouse
          // backend. This generic fallback lets any newly registered metric
          // retrieve its series without another claim-specific branch.
          ? `${metricQueryTextForIds(hintedMetricIds)} España Europa`
          : '';
  const warehouseQueries = [...new Set([warehouseQuery, metricFallbackQuery, recordedOffenceQuery, counterpartTerms ? `${warehouseQuery} ${counterpartTerms}` : '', ...propositionQueries.map((query) => handlerId === 'budget_transfer' ? query : query.replace(/\b\d[\d.,%]*\b/g, ' '))])].filter(Boolean).slice(0, 5);
  const warehouseResults = !retrievalClassified.primary && !suppressUnrelatedContext
    ? await Promise.all(warehouseQueries.map((query, index) => findWarehouseEvidence(query, retrievalClassified.compiler, index === 0 ? queryEmbedding : undefined)))
    : [];
  // A metric hint is a stronger routing signal than the broad semantic topic
  // extracted by the classifier. Retry the canonical metric query directly so
  // a new claim such as “the rent has exploded” can use the existing series
  // even when its conversational wording mentions several unrelated causes.
  if (!retrievalClassified.primary && !suppressUnrelatedContext && metricFallbackQuery) {
    // Put the explicitly requested metric first. A broad first query can
    // legitimately find contextual observations (for example crime terms in
    // a housing claim); those must not crowd the direct series out of the
    // bounded evidence packet.
    warehouseResults.unshift(await findWarehouseEvidence(metricFallbackQuery, retrievalClassified.compiler));
  }
  const warehouse = {
    observations: [...new Map(warehouseResults.flatMap((item) => item.observations || []).map((item) => [item.id, item])).values()].slice(0, 24),
    source: warehouseResults.find((item) => item.source)?.source,
  };
  const liveLegal = !retrievalClassified.primary && !suppressUnrelatedContext && handlerId === 'legal_rule' && !warehouse.observations.length && !evidenceUnavailableSignal(text)
    ? await discoverBoeLegalRules(retrievalText, 6)
    : [];
  // Some claims require clarification in their final interpretation but are
  // still safe to investigate for an official source. In particular, a new
  // budget transfer or government decision should not lose discovery merely
  // because the compiler also flagged an implied impact. Causal, legal,
  // predictive, group, and normative claims remain gated from generic source
  // discovery and use their dedicated evidence paths instead.
  const discoveryEligible = new Set(['budget_transfer', 'government_event', 'quantity', 'proportion', 'ranking', 'trend', 'definition']);
  const allowDiscovery = !classified.compiler?.clarificationRequired || discoveryEligible.has(handlerId);
  const indexedSourceCandidate = allowDiscovery && !retrievalClassified.primary && !suppressUnrelatedContext && !warehouse.observations.length && !sourceOverride
    ? await findBestWarehouseSource([retrievalText, ...propositionQueries])
    : null;
  // A loose keyword overlap is not enough to put an official excerpt in the
  // answer. This prevents a claim such as “there are ministers in prison”
  // from receiving an unrelated tax or broad politics publication merely
  // because both documents mention government institutions.
  const indexedSource = indexedSourceCandidate?.score >= 0.5 ? indexedSourceCandidate : null;
  // Official discovery is useful for new measurable or definitional claims,
  // but generic documents are not evidence for causal, group, legal,
  // predictive, or normative conclusions. Those handlers must either find a
  // typed record or explain what is missing instead of attaching a topical
  // publication.
  const discovered = allowDiscovery && discoveryEligible.has(handlerId) && !suppressUnrelatedContext && !warehouse.observations.length && !indexedSource && !sourceOverride
    ? (await discoverOfficialDocuments(discoveryText || retrievalText, 3)).map(discoveryObservation)
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
  if (!request.url?.startsWith('/api/classify') && !request.url?.startsWith('/v1/classify')) { response.writeHead(404); response.end(); return; }
  try {
    if (classifierToken && request.headers.authorization !== `Bearer ${classifierToken}`) { response.writeHead(401, { 'content-type': 'application/json', 'cache-control': 'no-store' }); response.end(JSON.stringify({ status: 'unavailable' })); return; }
    const url = new URL(request.url, 'http://127.0.0.1');
    if (request.url.startsWith('/v1/classify')) {
      const requestMatch = url.pathname.match(/^\/v1\/classify\/([^/]+)$/);
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

server.listen(port, bindHost, () => console.log(`Local claim service listening on ${bindHost}:${port}`));
