import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { appendFile, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { handlerForInput, visualBlockForHandler } from './knowledge/handlers.mjs';
import { discoverOfficialDocuments, discoveryObservation } from './knowledge/official-discovery.mjs';
import { approvedSourceHosts } from './knowledge/source-registry.mjs';
import { findWarehouseObservations } from './knowledge/warehouse-query.mjs';
import { summarizeWarehouseTrend } from './knowledge/warehouse-trend.mjs';
import { summarizeWarehouseRanking } from './knowledge/warehouse-ranking.mjs';
import { validateAnswerPlan } from './knowledge/answer-plan-validation.mjs';
import { deterministicFallbackCompiler } from './knowledge/fallback-compiler.mjs';
import { applySafePlanUpgrade, buildEvidencePacket, plannerSchema, validateEvidencePacket } from './knowledge/evidence-packet.mjs';

const root = new URL('../', import.meta.url).pathname;
const port = Number(process.env.LOCAL_CLASSIFIER_PORT || 8789);
const endpoint = process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434';
const classifierToken = process.env.LOCAL_CLASSIFIER_TOKEN || '';
const routerModel = process.env.OLLAMA_ROUTER_MODEL || 'gemma3:4b';
const embedModel = process.env.OLLAMA_EMBED_MODEL || 'bge-m3';
const visionModel = process.env.OLLAMA_VISION_MODEL || 'gemma3:4b';
const answerPlannerEnabled = process.env.LOCAL_ANSWER_PLANNER === '1';
const whisperCommand = process.env.WHISPER_COMMAND || '';
const whisperArgs = (() => {
  try { return process.env.WHISPER_ARGS ? JSON.parse(process.env.WHISPER_ARGS) : ['{audio}']; } catch { return ['{audio}']; }
})();
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
const inferenceBackoffMs = 30 * 1000;
let inferenceDisabledUntil = 0;
let indexPromise;
let warehousePromise;

const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
const displayUnit = (value) => normalise(value) === 'percentage of population in the labour force' ? '%' : String(value || '');
const stopWords = new Set(['como', 'esta', 'este', 'para', 'pero', 'que', 'sus', 'tiene', 'una', 'uno', 'en', 'el', 'la', 'los', 'las', 'un', 'del', 'de', 'y', 'o', 'a', 'por', 'con', 'segun', 'dicen', 'dice', 'grupo', 'insiste', 'cuñado', 'cunado', 'he', 'leido', 'hay', 'datos', 'más', 'mas', 'todo', 'va', 'peor', 'verdad', 'cierto', 'cierta', 'mi', 'me', 'creo', 'esto', 'eso']);
const tokens = (value) => [...new Set(normalise(value).split(' ').filter((token) => token.length > 2 && !stopWords.has(token)))];
const includesAny = (value, words) => words.some((word) => value.includes(word));
const canonicalSignatureFor = (value) => tokens(value).join(' ') || normalise(value);
const lowSignalTokens = new Set(['espana', 'pais', 'gente', 'cosas', 'problema', 'problemas']);
const digest = (value) => createHash('sha256').update(value).digest('hex');

const pruneRuntimeState = () => {
  const now = Date.now();
  for (const [key, item] of answerCache) if (!item || item.expiresAt <= now) answerCache.delete(key);
  for (const [key, item] of resolveJobs) if (!item || (item.completedAt && item.completedAt + cacheTtlMs <= now) || (!item.completedAt && item.createdAt + cacheTtlMs <= now)) resolveJobs.delete(key);
  while (answerCache.size > maxCacheEntries) answerCache.delete(answerCache.keys().next().value);
  while (resolveJobs.size > maxResolveJobs) resolveJobs.delete(resolveJobs.keys().next().value);
};
setInterval(pruneRuntimeState, 60 * 1000).unref();

const recordKnowledgeGap = async (text, result, inputType = 'text') => {
  if (!['uncovered', 'draft', 'partial'].includes(result.status)) return;
  await appendFile(knowledgeGapPath, `${JSON.stringify({
    createdAt: new Date().toISOString(),
    inputType,
    normalized: normalise(text),
    canonical: result.canonicalSignature || canonicalSignatureFor(text),
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
    const response = await ollama('/api/chat', { model: routerModel, stream: false, think: false, format: plannerSchema, keep_alive: '-1', options: { temperature: 0, num_predict: 420, num_ctx: 8192 }, messages: [{ role: 'user', content: prompt }] }, 2200);
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
  required: ['normalized', 'claimType', 'propositions', 'entities', 'numbers', 'geography', 'period', 'retrievalHints', 'clarificationRequired'],
  properties: {
    normalized: { type: 'string' },
    claimType: { type: 'string', enum: ['descriptive', 'comparative', 'causal', 'predictive', 'legal', 'normative', 'mixed'] },
    propositions: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['text', 'type', 'explicit'], properties: { text: { type: 'string' }, type: { type: 'string', enum: ['descriptive', 'comparative', 'causal', 'predictive', 'legal', 'normative', 'mixed'] }, explicit: { type: 'boolean' } } } },
    entities: { type: 'array', items: { type: 'string' } },
    numbers: { type: 'array', items: { type: 'string' } },
    geography: { type: ['string', 'null'] },
    period: { type: ['string', 'null'] },
    retrievalHints: { type: 'array', items: { type: 'string' } },
    clarificationRequired: { type: 'boolean' },
  },
};

const fallbackCompiler = deterministicFallbackCompiler;

const compilerTypes = new Set(['descriptive', 'comparative', 'causal', 'predictive', 'legal', 'normative', 'mixed']);
const normalizeCompiler = (value, text) => {
  if (!value || typeof value !== 'object') return fallbackCompiler(text);
  const propositions = Array.isArray(value.propositions)
    ? value.propositions.filter((item) => item && typeof item.text === 'string' && item.text.trim()).slice(0, 6).map((item) => ({
      text: item.text.slice(0, 300),
      type: compilerTypes.has(item.type) ? item.type : 'mixed',
      explicit: item.explicit !== false,
    }))
    : [];
  if (!propositions.length) return fallbackCompiler(text);
  return {
    normalized: typeof value.normalized === 'string' && value.normalized.trim() ? value.normalized.slice(0, 300) : text.slice(0, 300),
    claimType: compilerTypes.has(value.claimType) ? value.claimType : 'mixed',
    propositions,
    entities: Array.isArray(value.entities) ? value.entities.filter((item) => typeof item === 'string').slice(0, 12).map((item) => item.slice(0, 120)) : [],
    numbers: Array.isArray(value.numbers) ? value.numbers.filter((item) => typeof item === 'string').slice(0, 12).map((item) => item.slice(0, 80)) : [],
    geography: typeof value.geography === 'string' ? value.geography.slice(0, 120) : null,
    period: typeof value.period === 'string' ? value.period.slice(0, 120) : null,
    retrievalHints: Array.isArray(value.retrievalHints) ? value.retrievalHints.filter((item) => typeof item === 'string').slice(0, 8).map((item) => item.slice(0, 120)) : [],
    clarificationRequired: value.clarificationRequired === true,
  };
};

const compileClaim = async (text) => {
  const prompt = `Extrae la estructura de esta afirmación en español. No evalúes si es verdadera y no añadas datos. Separa afirmaciones explícitas e implícitas. Devuelve únicamente JSON según el esquema proporcionado.\n\nAfirmación:\n${text.slice(0, 4000)}`;
  try {
    const response = await ollama('/api/chat', { model: routerModel, stream: false, think: false, format: compilerSchema, keep_alive: '-1', options: { temperature: 0, num_predict: 280, num_ctx: 3072 }, messages: [{ role: 'user', content: prompt }] }, 2500);
    const value = parseModelJson(response.message?.content);
    if (!value || !Array.isArray(value.propositions)) return fallbackCompiler(text);
    return normalizeCompiler(value, text);
  } catch { return fallbackCompiler(text); }
};

const extractImageText = async (media) => {
  if (!media?.base64) return '';
  const response = await ollama('/api/chat', { model: visionModel, stream: false, think: false, keep_alive: '10m', options: { temperature: 0, num_predict: 700, num_ctx: 4096 }, messages: [{ role: 'user', content: 'Extrae el texto visible y describe brevemente las afirmaciones, cifras, fechas y entidades que aparecen. No evalúes si son verdaderas. Devuelve texto plano conciso.', images: [media.base64] }] }, 30000);
  return String(response.message?.content || '').trim().slice(0, 8000);
};

const transcribeAudio = async (media) => {
  if (!media?.base64 || !whisperCommand) throw new Error('No local transcription runtime configured');
  const directory = await mkdtemp(join(root, '.local/audio-'));
  const extension = media.mime === 'audio/wav' ? '.wav' : media.mime === 'audio/ogg' ? '.ogg' : media.mime === 'audio/webm' ? '.webm' : '.m4a';
  const audioPath = join(directory, `input${extension}`);
  try {
    await writeFile(audioPath, Buffer.from(media.base64, 'base64'));
    const args = whisperArgs.map((arg) => String(arg).replaceAll('{audio}', audioPath));
    const response = await execFileAsync(whisperCommand, args, { timeout: 45000, maxBuffer: 2 * 1024 * 1024, windowsHide: true });
    const text = String(response.stdout || '').trim().slice(0, 12000);
    if (!text) throw new Error('Transcription returned no text');
    return text;
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => { /* Best-effort cleanup. */ });
  }
};

const sourceHostAllowed = (hostname) => approvedSourceHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
const extractPageText = async (value) => {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !sourceHostAllowed(url.hostname)) throw new Error('Source host is not approved');
  const response = await fetch(url, { redirect: 'error', headers: { accept: 'text/html,application/json;q=0.9' }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Source returned ${response.status}`);
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
  const haystack = normalise(searchText(entry));
  if (!queryText || !haystack) return 0;
  if (haystack === queryText) return 1;
  if (haystack.includes(queryText) || queryText.includes(haystack)) return 0.9;
  const wanted = tokens(queryText).filter((token) => !lowSignalTokens.has(token));
  const available = new Set(tokens(haystack));
  return wanted.length ? wanted.filter((token) => available.has(token) || [...available].some((candidate) => oneEditAway(token, candidate))).length / wanted.length : 0;
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
  return [item.source?.id, item.datasetId, item.metric, item.unit, dimensions].join('::');
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

const findWarehouseEvidence = async (query) => {
  const normalizedQuery = normalise(query);
  const rankingQuery = normalizedQuery.includes('europa') || normalizedQuery.includes('ranking') || normalizedQuery.includes('mas alta') || normalizedQuery.includes('mas baja') || normalizedQuery.includes('mayor') || normalizedQuery.includes('menor') || normalizedQuery.includes('puesto');
  const meaningfulTerms = tokens(query).filter((token) => !lowSignalTokens.has(token));
  const locationOnlyTerms = new Set(['europa', 'europea', 'europeo', 'pais', 'paises', 'nacional', 'nacionales', 'actual', 'actualidad', 'hoy']);
  const subjectTerms = meaningfulTerms.filter((term) => !locationOnlyTerms.has(term));
  const candidates = (await findWarehouseObservations(query, 100)).filter((item) => {
    if (item.evidenceFit === 'weak') return false;
    if (item.kind === 'official_publication' && item.matchedTerms?.length < Math.min(3, meaningfulTerms.length)) return false;
    // A location or comparison word alone is not evidence of subject fit.
    if (subjectTerms.length && !(item.matchedTerms || []).some((term) => subjectTerms.includes(term))) return false;
    return true;
  });
  const observations = rankingQuery ? candidates : selectCompatibleWarehouseSeries(query, candidates);
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
    try { embeddings = (await ollama('/api/embed', { model: embedModel, input: entries.map(searchText), keep_alive: '-1' }, 30000)).embeddings || []; } catch { /* Lexical fallback. */ }
    const value = { signature, entries, embeddings };
    await writeFile(indexPath, JSON.stringify(value));
    return value;
  })();
  return indexPromise;
};

const rerank = async (text, candidates, compiled) => {
  const prompt = `Clasifica una afirmación en español. Devuelve solo JSON válido: {"status":"published|related|uncovered","primarySlug":"","canonical":"","reason":"","questions":[]}. Solo puedes usar como primarySlug un candidato con published=true. No inventes datos ni respuestas. Si no hay coincidencia publicada, usa uncovered.\n\nAfirmación: ${text.slice(0, 4000)}\nEstructura extraída (no es evidencia): ${compiled ? JSON.stringify(compiled) : 'no disponible'}\nCandidatos:\n${candidates.map((entry) => `${entry.published ? 'published' : 'internal'}:${entry.slug} — ${entry.title}`).join('\n')}`;
  try { return parseModelJson((await ollama('/api/chat', { model: routerModel, stream: false, think: false, format: 'json', keep_alive: '-1', options: { temperature: 0, num_predict: 160, num_ctx: 4096 }, messages: [{ role: 'user', content: prompt }] }, 3500)).message?.content); } catch { return null; }
};

const classify = async (text) => {
  const key = normalise(text);
  const cached = answerCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) answerCache.delete(key);
  const index = await getIndex();
  const deterministicCompiler = fallbackCompiler(text);
  const deterministicHandler = handlerForInput(deterministicCompiler, deterministicCompiler.claimType);
  const lexicalRanked = index.entries.map((entry, position) => ({ entry, position, lexical: lexicalScore(text, entry) })).sort((left, right) => right.lexical - left.lexical);
  let vector = null;
  // Do not pay for an embedding request for obvious long-tail text. Exact and
  // alias matches are already covered lexically; semantic retrieval is only
  // useful when the input has a plausible relation to the published index.
  if ((lexicalRanked[0]?.lexical || 0) >= 0.1) {
    try { vector = (await ollama('/api/embed', { model: embedModel, input: text.slice(0, 4000), keep_alive: '-1' }, 3000)).embeddings?.[0] || null; } catch { /* Keep lexical matching. */ }
  }
  const ranked = lexicalRanked.map(({ entry, position, lexical }) => ({ entry, lexical, semantic: cosine(vector, index.embeddings[position]) })).map((item) => {
    // Semantic similarity is useful for paraphrases, but it must not outrank
    // distinctive words in a short political claim. Keep lexical evidence
    // dominant whenever the user supplied a meaningful direct match.
    const lexicalWeight = item.lexical >= 0.55 ? 0.75 : 0.55;
    return { ...item, score: vector ? item.lexical * lexicalWeight + item.semantic * (1 - lexicalWeight) : item.lexical };
  }).sort((a, b) => b.score - a.score);
  const publicRanked = ranked.filter((item) => item.entry.published);
  const usefulAlternatives = (items) => items.filter(({ score, lexical }) => score >= 0.32 && lexical >= 0.24).slice(0, 3).map(({ entry, score }) => ({ kind: entry.kind, slug: entry.slug, title: entry.title, href: entry.href, confidence: score }));
  const top = publicRanked[0];
  const margin = top ? top.score - (publicRanked[1]?.score || 0) : 0;
  const lexicalMargin = top ? top.lexical - (publicRanked[1]?.lexical || 0) : 0;
  // Derive compatibility from the canonical claim wording as well as its
  // metadata. Keywords often describe a broad topic and can incorrectly make
  // a causal claim look compatible with a group-comparison input.
  const topHandler = top ? handlerForInput({ retrievalHints: [top.entry.title, ...(top.entry.keywords || [])], entities: top.entry.aliases || [] }, top.entry.claimType) : '';
  const compatibleHandlers = top?.entry.kind !== 'claim' || !deterministicHandler || deterministicHandler === 'quantity' || deterministicHandler === 'mixed' || topHandler === deterministicHandler;
  if (top && top.score >= 0.5 && margin >= 0.08 && top.lexical >= 0.65 && lexicalMargin >= 0.2 && compatibleHandlers) return { status: top.entry.kind === 'claim' ? 'published' : 'related', input: { original: text }, primary: { kind: top.entry.kind, slug: top.entry.slug, title: top.entry.title, href: top.entry.href, confidence: top.score, reason: top.entry.kind === 'claim' ? 'La formulación coincide con una afirmación publicada.' : 'La formulación se relaciona con este tema publicado.', answer: top.entry.answer || '', assessment: top.entry.assessment || '', whatIsTrue: top.entry.whatIsTrue || '', whatIsMissing: top.entry.whatIsMissing || '', cannotProve: top.entry.cannotProve || '', scale: top.entry.scale || '', handlerId: topHandler, evidenceIds: top.entry.evidenceIds || [], sourceRefs: top.entry.sourceRefs || [] }, alternatives: usefulAlternatives(publicRanked.slice(1)) };
  const hasPlausibleCandidate = Boolean(top && top.score >= 0.34 && (top.lexical >= 0.2 || top.semantic >= 0.5));
  const meaningfulTokens = tokens(text).filter((token) => !lowSignalTokens.has(token));
  const compileEligible = meaningfulTokens.length >= 3 || (meaningfulTokens.length >= 2 && /\b\d[\d.,%]*\b/.test(text));
  const compiled = hasPlausibleCandidate || compileEligible ? await compileClaim(text) : fallbackCompiler(text);
  const model = hasPlausibleCandidate ? await rerank(text, ranked.slice(0, 8).map(({ entry }) => entry), compiled) : null;
  const handlerId = handlerForInput(compiled || { retrievalHints: [text] }, compiled?.claimType || '');
  const selectedCandidate = model?.primarySlug && ranked.find(({ entry }) => entry.slug === model.primarySlug && entry.published);
  const selected = selectedCandidate && selectedCandidate.score >= 0.5 && (selectedCandidate.lexical >= 0.2 || selectedCandidate.semantic >= 0.7) ? selectedCandidate.entry : undefined;
  const status = selected ? (model.status === 'published' ? 'published' : 'related') : 'uncovered';
  const result = { status, input: { original: text, canonical: typeof model?.canonical === 'string' ? model.canonical.slice(0, 220) : undefined }, compiler: compiled || undefined, primary: selected ? { kind: selected.kind, slug: selected.slug, title: selected.title, href: selected.href, confidence: typeof model.confidence === 'number' ? Math.max(0, Math.min(1, model.confidence)) : top?.score || 0, reason: typeof model.reason === 'string' ? model.reason.slice(0, 220) : '', answer: selected.answer || '', assessment: selected.assessment || '', whatIsTrue: selected.whatIsTrue || '', whatIsMissing: selected.whatIsMissing || '', cannotProve: selected.cannotProve || '', scale: selected.scale || '', handlerId, evidenceIds: selected.evidenceIds || [], sourceRefs: selected.sourceRefs || [] } : undefined, alternatives: usefulAlternatives(publicRanked.filter(({ entry }) => entry.slug !== selected?.slug)), guidance: status === 'uncovered' ? { questions: Array.isArray(model?.questions) ? model.questions.filter((question) => typeof question === 'string').slice(0, 2).map((question) => question.slice(0, 220)) : ['¿De qué periodo, lugar o decisión concreta estamos hablando?'], limitation: 'Todavía no tenemos una comprobación publicada de esta afirmación.' } : undefined };
  answerCache.set(key, { value: result, expiresAt: Date.now() + cacheTtlMs });
  pruneRuntimeState();
  return result;
};

const requestId = (text) => digest(normalise(text)).slice(0, 24);

const startResolveJob = (text) => {
  const id = requestId(text);
  const existing = resolveJobs.get(id);
  if (existing) return existing;
  pruneRuntimeState();
  const job = { status: 'processing', requestId: id, createdAt: Date.now() };
  resolveJobs.set(id, job);
  void classify(text).then(async (classified) => {
    const completed = { ...await enrichResolve(text, classified, undefined, id), createdAt: job.createdAt, completedAt: Date.now() };
    resolveJobs.set(id, completed);
    void recordKnowledgeGap(text, completed);
  }).catch(() => {
    resolveJobs.set(id, { status: 'unavailable', requestId: id, createdAt: job.createdAt, completedAt: Date.now() });
  });
  return job;
};

const startMediaResolveJob = (text, inputType, media) => {
  const id = requestId(`${inputType}:${media?.sha || text}`);
  const existing = resolveJobs.get(id);
  if (existing) return existing;
  pruneRuntimeState();
  const job = { status: 'processing', requestId: id, createdAt: Date.now() };
  resolveJobs.set(id, job);
  void (async () => {
    if (inputType !== 'image' && inputType !== 'audio') throw new Error('Unsupported media input');
    const extracted = inputType === 'image' ? await extractImageText(media) : await transcribeAudio(media);
    if (!extracted) throw new Error('No text extracted');
    const combined = [text, extracted].filter(Boolean).join('\n\n');
    const completed = { ...await enrichResolve(combined, await classify(combined), undefined, id), createdAt: job.createdAt, completedAt: Date.now() };
    resolveJobs.set(id, completed);
    void recordKnowledgeGap(combined, completed, inputType);
  })().catch((error) => { console.error('Media extraction failed:', error instanceof Error ? error.message : error); resolveJobs.set(id, { status: 'unavailable', requestId: id, createdAt: job.createdAt, completedAt: Date.now() }); });
  return job;
};

const startUrlResolveJob = (url) => {
  const id = requestId(`url:${url}`);
  const existing = resolveJobs.get(id);
  if (existing) return existing;
  pruneRuntimeState();
  const job = { status: 'processing', requestId: id, createdAt: Date.now() };
  resolveJobs.set(id, job);
  void (async () => {
    const extracted = await extractPageText(url);
    if (!extracted) throw new Error('No source text extracted');
    const source = { id: `url-${digest(url).slice(0, 20)}`, title: `Fuente oficial: ${new URL(url).hostname}`, url };
    resolveJobs.set(id, { ...await enrichResolve(extracted, await classify(extracted), source, id), createdAt: job.createdAt, completedAt: Date.now() });
  })().catch((error) => { console.error('Link extraction failed:', error instanceof Error ? error.message : error); resolveJobs.set(id, { status: 'unavailable', requestId: id, createdAt: job.createdAt, completedAt: Date.now() }); });
  return job;
};

const toResolveResult = (text, classified, source, resultRequestId = requestId(text), observations = []) => {
  const relatedClaims = (classified.alternatives || []).map((item) => ({
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
  const groupObservations = isGroupComparison ? directGroupObservations(text, observations) : observations;
  const quantityClaim = isQuantityLike ? claimedNumericValue(text, classified.compiler) : null;
  const quantity = isQuantityLike ? quantityAssessment(text, classified.compiler, observations) : null;
  const suppressGenericSource = (isGroupComparison && !groupObservations.length) || (isQuantityLike && quantityClaim && !quantity) || isLegal || isDefinition;
  const usableSource = suppressGenericSource ? undefined : source;
  const status = classified.status === 'published' ? 'complete' : classified.status === 'related' ? 'partial' : usableSource ? 'draft' : 'uncovered';
  const ranking = !primary && !isNormative && !isCausal && !isLegal && !isDefinition && !isGroupComparison ? summarizeWarehouseRanking(text, observations) : null;
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
  const predictionContext = isPrediction && !primary ? {
    headline: 'Esto es una predicción, no un hecho ya comprobable',
    summary: 'Una serie histórica puede aportar contexto, pero no confirma por sí sola lo que ocurrirá. Para evaluar la predicción hay que fijar una fecha, un indicador, una magnitud y las condiciones que podrían cambiar el resultado.',
  } : null;
  const legalContext = isLegal && !primary ? {
    headline: 'La respuesta legal depende del supuesto concreto',
    summary: 'No basta con una frase general sobre lo que “permite” o “prohíbe” la ley. Hay que identificar la jurisdicción, el procedimiento, las fechas, las excepciones y la situación concreta.',
  } : null;
  const definitionContext = isDefinition && !primary ? {
    headline: 'Primero hay que fijar qué significa la expresión',
    summary: 'La afirmación usa una categoría que puede tener varias definiciones estadísticas o jurídicas. Comparar cifras sin fijar esa definición puede producir una respuesta aparentemente precisa pero equivocada.',
  } : null;
  const compilerBreakdown = classified.compiler?.propositions?.length ? {
    type: 'claim_breakdown',
    propositionIds: [],
    items: classified.compiler.propositions.slice(0, 6).map((item) => ({ text: item.text, type: item.type, explicit: item.explicit !== false })),
  } : null;
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
    if (isLegal || isDefinition) return [
      { type: 'cannot_conclude', evidenceIds: [], points: [
        isLegal ? 'No hemos localizado una regla o resolución que corresponda exactamente al supuesto descrito.' : 'No hemos localizado una fuente que fije la definición exacta de la expresión utilizada.',
        isLegal ? 'La respuesta requiere jurisdicción, procedimiento, fechas y excepciones.' : 'Sin una definición común, las cifras relacionadas no son comparables.',
      ] },
    ];
    const grouped = observations.slice(0, 6);
    const numeric = grouped.filter((item) => typeof item.value === 'number' && Number.isFinite(item.value));
    const publications = grouped.filter((item) => item.kind === 'official_publication');
    const catalogueLeads = grouped.filter((item) => item.kind === 'dataset_catalogue');
    const publicationLike = [...publications, ...catalogueLeads];
    if (!numeric.length && publicationLike.length) return [
      ...(publications.find((item) => item.finding?.type === 'budget_transfer') ? (() => {
        const transfer = publications.find((item) => item.finding?.type === 'budget_transfer').finding;
        const evidenceIds = publications.filter((item) => item.finding?.type === 'budget_transfer').map((item) => item.id);
        const amount = `${Number(transfer.amount).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
        return [{ type: 'money_flow', evidenceIds, amount, origin: transfer.originEntity, destination: transfer.destinationEntity, purpose: transfer.purpose }];
      })() : []),
      ...(publicationLike.find((item) => item.excerpt) ? (() => {
        const item = publicationLike.find((candidate) => candidate.excerpt);
        return [{ type: 'source_excerpt', evidenceIds: [item.id], title: item.kind === 'dataset_catalogue' ? 'Conjunto de datos candidato en el catálogo público' : 'Fragmento localizado en la fuente oficial', excerpt: item.excerpt }];
      })() : []),
      ...(publications.find((item) => item.finding?.type === 'budget_transfer') ? (() => {
        const transfer = publications.find((item) => item.finding?.type === 'budget_transfer').finding;
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
      { type: 'key_number', evidenceId: keyObservation.id, label: ranking ? `España · ${keyObservation.metric || keyObservation.datasetId || 'Valor comparado'}` : keyObservation.metric || keyObservation.datasetId || 'Valor localizado', value: String(keyObservation.value), caveat: 'Dato localizado automáticamente en una fuente oficial; todavía no se ha revisado como respuesta a esta afirmación.' },
      ...((ranking || trend || causalContext) ? [{ type: 'data_finding', evidenceIds: series.map((item) => item.id), points: (ranking || trend || causalContext).points }, { type: 'conversation_reply', evidenceIds: (ranking || trend || causalContext).replyEvidenceIds || series.map((item) => item.id), text: (ranking || trend || causalContext).reply }] : []),
      ...(periods.length >= 2 && !isPrediction ? [{ type: 'line_chart', visualId: 'warehouse-observation', evidenceIds: series.map((item) => item.id) }] : []),
      { type: 'cannot_conclude', evidenceIds: series.map((item) => item.id), points: isPrediction
        ? ['Estos valores describen el pasado, pero no demuestran la predicción.', 'Faltan una fecha límite, un indicador y una magnitud que permitan comprobarla.']
        : isGroupComparison
          ? ['La comparación solo sería válida con el mismo grupo, población, denominador y periodo.', 'Una cifra total o de contexto no demuestra diferencias entre grupos.']
          : ['Estos valores describen la serie localizada, pero no demuestran por sí solos la causa del cambio.', 'La definición, población y periodo deben comprobarse antes de convertirlos en un veredicto completo.'] },
    ];
  })() : [];
  const numericObservations = ranking?.observations || trend?.observations || causalContext?.observations || quantity?.observations || (isGroupComparison ? groupObservations : (isPrediction ? observations.filter((item) => typeof item.value === 'number' && Number.isFinite(item.value)) : observations.filter((item) => typeof item.value === 'number' && Number.isFinite(item.value))));
  const evidenceObservations = isGroupComparison ? groupObservations : isQuantityLike ? (quantity?.observations || (!quantityClaim ? observations : [])) : (isLegal || isDefinition ? [] : observations);
  const seriesForVisual = ranking ? numericObservations.slice(0, 6) : numericObservations.slice(-6);
  const warehouseSeries = numericObservations.length >= 2 ? {
    labels: seriesForVisual.map((item) => ranking ? String(item.dimensionLabels?.geo || item.dimensions?.geo || item.id) : String(item.period || item.id)),
    values: seriesForVisual.map((item) => Number(item.value)),
    label: String(numericObservations[0].metric || numericObservations[0].datasetId || 'Dato localizado'),
    unit: displayUnit(numericObservations[0].unit),
  } : undefined;
  const sourceLinks = [...new Map(
    [usableSource, ...evidenceObservations.map((item) => item.source)]
      .filter((item) => item && item.url)
      .map((item) => [item.url, { id: item.id || item.url, title: item.title || item.url, url: item.url }]),
  ).values()].slice(0, 5);
  const result = {
    schemaVersion: '1',
    headline: primary?.title || valuesContext?.headline || groupContext?.headline || quantityContext?.headline || predictionContext?.headline || legalContext?.headline || definitionContext?.headline || causalContext?.headline || ranking?.headline || trend?.headline || (usableSource ? 'Hemos localizado una fuente, pero todavía falta comprobar la afirmación.' : 'Todavía no tenemos una comprobación publicada para esta afirmación.'),
    summary: primary ? answer : valuesContext?.summary || groupContext?.summary || quantityContext?.summary || predictionContext?.summary || legalContext?.summary || definitionContext?.summary || causalContext?.summary || ranking?.summary || trend?.summary || (usableSource ? 'Hemos localizado una fuente potencialmente relevante, pero no hemos encontrado todavía una coincidencia revisada que permita convertirla en una respuesta factual.' : answer),
    coverage: status === 'complete' ? 'strong' : status === 'partial' || causalContext || quantityContext ? 'qualified' : valuesContext ? 'values' : 'insufficient',
    claimType: classified.compiler?.claimType || 'mixed',
    blocks: primary ? [{ type: 'confirmed', propositionIds: [], evidenceIds: primary.evidenceIds || [], points: [primary.whatIsTrue, primary.scale].filter(Boolean) }, ...(visualBlock ? [visualBlock] : []), ...(primary.whatIsMissing || primary.cannotProve ? [{ type: 'cannot_conclude', evidenceIds: primary.evidenceIds || [], points: [primary.whatIsMissing, primary.cannotProve].filter(Boolean) }] : []), { type: 'conversation_reply', evidenceIds: primary.evidenceIds || [], text: answer }] : [ ...(compilerBreakdown ? [compilerBreakdown] : []), ...(provisionalBlocks.length ? provisionalBlocks : [{ type: 'cannot_conclude', evidenceIds: [], points: source ? ['La fuente está localizada, pero aún no tenemos una afirmación revisada que mida exactamente lo que se pregunta.', 'La coincidencia temática por sí sola no demuestra la conclusión de la publicación.'] : (classified.guidance?.questions || ['¿De qué periodo, lugar o decisión concreta estamos hablando?']) }]) ],
    clarificationQuestion: valuesContext ? '¿Qué regla concreta o criterio de reparto quieres comparar?' : groupContext ? '¿Qué dos grupos, prestación o población quieres comparar y en qué periodo?' : quantityContext || (isQuantityLike && quantityClaim) ? '¿Qué población, unidad y periodo deben usarse para validar la cifra?' : predictionContext ? '¿Qué fecha, indicador y resultado concreto permitirían comprobar la predicción?' : legalContext ? '¿Qué país, procedimiento y situación concreta quieres comprobar?' : definitionContext ? '¿Qué definición o indicador quieres utilizar para comparar la afirmación?' : ranking ? '¿Quieres cambiar el año, la definición o el conjunto de países?' : trend ? '¿Quieres comparar esta serie con otro periodo o territorio?' : observations.length ? '¿Quieres comprobar qué mide exactamente este dato?' : source ? '¿Qué afirmación concreta quieres comprobar de esta fuente?' : classified.guidance?.questions?.[0],
    limitation: valuesContext ? 'Los datos pueden describir las reglas vigentes y sus efectos, pero no resuelven por sí solos la prioridad normativa.' : observations.length && observations.every((item) => item.kind === 'official_publication') ? 'Hemos localizado documentos oficiales relacionados, pero todavía no hemos comprobado que su contenido demuestre la afirmación completa.' : observations.length ? 'Los datos son una pista provisional: todavía no se ha validado que midan exactamente la afirmación, su causalidad o el contexto completo.' : usableSource ? 'La fuente ha sido localizada, pero todavía no hay evidencia estructurada revisada que permita evaluar la afirmación.' : classified.guidance?.limitation,
    evidenceIds: primary ? evidenceIds : evidenceObservations.map((item) => item.id),
    sourceIds: primary ? sourceIds : [...new Set(evidenceObservations.map((item) => item.source?.id).filter(Boolean))],
    ...(sourceLinks.length ? { sourceLinks } : {}),
    knowledgeVersion: observations.length ? 'warehouse-draft-1' : 'legacy-index',
    ...(warehouseSeries ? { warehouseSeries } : {}),
  };
  const validation = validateAnswerPlan(result, { provisional: status === 'draft' });
  if (validation.ok) return { status, requestId: resultRequestId, canonicalSignature: classified.input?.canonical ? normalise(classified.input.canonical) : canonicalSignatureFor(text), result, relatedClaims: source && !primary ? [] : relatedClaims };
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
  const handlerId = handlerForInput(classified.compiler || { retrievalHints: [text] }, classified.compiler?.claimType || '');
  // A bare number is often a dimension label in statistical indexes (for
  // example, an index with base year 100). Keep exact amounts for budget
  // events, but do not let generic quantities retrieve unrelated numeric rows.
  const warehouseQuery = handlerId === 'budget_transfer' ? retrievalText : retrievalText.replace(/\b\d[\d.,%]*\b/g, ' ');
  const warehouse = !classified.primary ? await findWarehouseEvidence(warehouseQuery) : { observations: [], source: undefined };
  const indexedSource = !classified.primary && !warehouse.observations.length && !sourceOverride ? await findWarehouseSource(retrievalText) : null;
  // A normative statement is a question about priorities. Generic current
  // affairs search results would add false authority without answering it.
  const discovered = handlerId === 'budget_transfer' && !warehouse.observations.length && !indexedSource && !sourceOverride
    ? (await discoverOfficialDocuments(retrievalText, 3)).map(discoveryObservation)
    : [];
  const source = sourceOverride || warehouse.source || (indexedSource ? { id: indexedSource.id, title: `Fuente indexada: ${indexedSource.title}`, url: indexedSource.url } : undefined) || discovered[0]?.source;
  const observations = warehouse.observations.length ? warehouse.observations : discovered;
  const deterministic = toResolveResult(text, classified, source, resultRequestId, observations);
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
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks);
  const body = rawBody.toString('utf8');
  if (request.headers['content-type']?.includes('multipart/form-data')) {
    try {
      const form = await new Request('http://local', { method: 'POST', headers: request.headers, body: rawBody }).formData();
      const file = form.get('file');
      if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') return { text: String(form.get('text') || '').trim(), inputType: String(form.get('inputType') || 'text'), hasFile: false };
      const fileBytes = Buffer.from(await file.arrayBuffer());
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
    response.end(JSON.stringify({ status: 'ok', deterministic: true, dynamic: Date.now() >= inferenceDisabledUntil }));
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
      const result = body.hasFile ? startMediaResolveJob(body.text, body.inputType, body.media) : body.text && body.inputType === 'url' ? startUrlResolveJob(body.text) : body.text && body.inputType === 'text' ? startResolveJob(body.text) : body.inputType !== 'text' ? { status: 'unavailable', relatedClaims: [] } : { status: 'uncovered', relatedClaims: [] };
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
