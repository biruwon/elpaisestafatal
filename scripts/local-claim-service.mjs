import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const port = Number(process.env.LOCAL_CLASSIFIER_PORT || 8789);
const endpoint = process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434';
const routerModel = process.env.OLLAMA_ROUTER_MODEL || 'gemma3:4b';
const embedModel = process.env.OLLAMA_EMBED_MODEL || 'bge-m3';
const catalogUrl = process.env.LOCAL_CATALOG_URL || 'http://127.0.0.1:4321/claim-catalog.json';
const indexPath = join(root, '.local/claim-semantic-index.json');
const answerCache = new Map();
let indexPromise;

const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
const tokens = (value) => [...new Set(normalise(value).split(' ').filter((token) => token.length > 2 && !['como', 'esta', 'este', 'para', 'pero', 'que', 'sus', 'tiene', 'una', 'uno'].includes(token)))];
const digest = (value) => createHash('sha256').update(value).digest('hex');

const checkLocalEndpoint = () => {
  const host = new URL(endpoint).hostname;
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) throw new Error('Inference endpoint is not local');
};

const ollama = async (path, body, timeout = 5000) => {
  checkLocalEndpoint();
  const response = await fetch(`${endpoint}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error(`Inference request failed: ${response.status}`);
  return response.json();
};

const parseModelJson = (value) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value || '');
  const object = text.match(/\{[\s\S]*\}/)?.[0];
  try { return object ? JSON.parse(object) : null; } catch { return null; }
};

const searchText = (entry) => [entry.title, ...(entry.aliases || []), ...(entry.keywords || [])].join(' ');
const lexicalScore = (query, entry) => {
  const queryText = normalise(query);
  const haystack = normalise(searchText(entry));
  if (!queryText || !haystack) return 0;
  if (haystack === queryText) return 1;
  if (haystack.includes(queryText) || queryText.includes(haystack)) return 0.9;
  const wanted = tokens(queryText);
  const available = new Set(tokens(haystack));
  return wanted.length ? wanted.filter((token) => available.has(token)).length / wanted.length : 0;
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
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const response = await fetch(catalogUrl, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return response.json();
    } catch { /* The Astro server may still be starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 400));
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

const rerank = async (text, candidates) => {
  const prompt = `Clasifica una afirmación en español. Devuelve solo JSON válido: {"status":"published|related|uncovered","primarySlug":"","canonical":"","reason":"","questions":[]}. Solo puedes usar como primarySlug un candidato con published=true. No inventes datos ni respuestas. Si no hay coincidencia publicada, usa uncovered.\n\nAfirmación: ${text.slice(0, 4000)}\nCandidatos:\n${candidates.map((entry) => `${entry.published ? 'published' : 'internal'}:${entry.slug} — ${entry.title}`).join('\n')}`;
  try { return parseModelJson((await ollama('/api/chat', { model: routerModel, stream: false, think: false, format: 'json', keep_alive: '-1', options: { temperature: 0, num_predict: 160, num_ctx: 4096 }, messages: [{ role: 'user', content: prompt }] }, 3500)).message?.content); } catch { return null; }
};

const classify = async (text) => {
  const key = normalise(text);
  if (answerCache.has(key)) return answerCache.get(key);
  const index = await getIndex();
  let vector = null;
  try { vector = (await ollama('/api/embed', { model: embedModel, input: text.slice(0, 4000), keep_alive: '-1' }, 3000)).embeddings?.[0] || null; } catch { /* Keep lexical matching. */ }
  const ranked = index.entries.map((entry, position) => ({ entry, lexical: lexicalScore(text, entry), semantic: cosine(vector, index.embeddings[position]) })).map((item) => ({ ...item, score: vector ? item.lexical * 0.35 + item.semantic * 0.65 : item.lexical })).sort((a, b) => b.score - a.score);
  const publicRanked = ranked.filter((item) => item.entry.published);
  const top = publicRanked[0];
  const margin = top ? top.score - (publicRanked[1]?.score || 0) : 0;
  if (top && top.score >= 0.68 && margin >= 0.12 && top.lexical >= 0.6) return { status: top.entry.kind === 'claim' ? 'published' : 'related', input: { original: text }, primary: { kind: top.entry.kind, slug: top.entry.slug, title: top.entry.title, href: top.entry.href, confidence: top.score, reason: top.entry.kind === 'claim' ? 'La formulación coincide con una afirmación publicada.' : 'La formulación se relaciona con este tema publicado.', evidenceIds: top.entry.evidenceIds || [], sourceRefs: top.entry.sourceRefs || [] }, alternatives: publicRanked.slice(1, 3).map(({ entry, score }) => ({ kind: entry.kind, slug: entry.slug, title: entry.title, href: entry.href, confidence: score })) };
  const model = await rerank(text, ranked.slice(0, 8).map(({ entry }) => entry));
  const selected = model?.primarySlug && index.entries.find((entry) => entry.slug === model.primarySlug && entry.published);
  const status = selected ? (model.status === 'published' ? 'published' : 'related') : 'uncovered';
  const result = { status, input: { original: text, canonical: typeof model?.canonical === 'string' ? model.canonical.slice(0, 220) : undefined }, primary: selected ? { kind: selected.kind, slug: selected.slug, title: selected.title, href: selected.href, confidence: typeof model.confidence === 'number' ? Math.max(0, Math.min(1, model.confidence)) : top?.score || 0, reason: typeof model.reason === 'string' ? model.reason.slice(0, 220) : '', evidenceIds: selected.evidenceIds || [], sourceRefs: selected.sourceRefs || [] } : undefined, alternatives: publicRanked.slice(0, 3).filter(({ entry }) => entry.slug !== selected?.slug).map(({ entry, score }) => ({ kind: entry.kind, slug: entry.slug, title: entry.title, href: entry.href, confidence: score })), guidance: status === 'uncovered' ? { questions: Array.isArray(model?.questions) ? model.questions.filter((question) => typeof question === 'string').slice(0, 2).map((question) => question.slice(0, 220)) : ['¿De qué periodo, lugar o decisión concreta estamos hablando?'], limitation: 'Todavía no tenemos una comprobación publicada de esta afirmación.' } : undefined };
  answerCache.set(key, result);
  return result;
};

const requestId = (text) => digest(normalise(text)).slice(0, 24);

const toResolveResult = (text, classified) => {
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
  const status = classified.status === 'published' ? 'complete' : classified.status === 'related' ? 'partial' : 'uncovered';
  const result = {
    schemaVersion: '1',
    headline: primary?.title || 'Todavía no tenemos una comprobación publicada para esta afirmación.',
    summary: primary?.reason || classified.guidance?.limitation || 'La formulación no coincide con una evidencia publicada suficientemente directa.',
    coverage: status === 'complete' ? 'strong' : status === 'partial' ? 'qualified' : 'insufficient',
    claimType: 'mixed',
    blocks: primary ? [{ type: 'confirmed', propositionIds: [] }, { type: 'conversation_reply', text: 'Puedes concretar el periodo, lugar o fuente para comprobar mejor esta afirmación.' }] : [{ type: 'cannot_conclude', evidenceIds: [], points: classified.guidance?.questions || ['¿De qué periodo, lugar o decisión concreta estamos hablando?'] }],
    clarificationQuestion: classified.guidance?.questions?.[0],
    limitation: classified.guidance?.limitation,
    evidenceIds,
    sourceIds,
    knowledgeVersion: 'legacy-index',
  };
  return { status, requestId: requestId(text), result, relatedClaims };
};

const readText = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString('utf8');
  if (request.headers['content-type']?.includes('application/json')) return String(JSON.parse(body).text || '').trim();
  const form = await new Request('http://local', { method: 'POST', headers: request.headers, body: Buffer.from(body) }).formData();
  return String(form.get('text') || '').trim();
};

const readJson = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString('utf8');
  try {
    const value = JSON.parse(body);
    return { text: String(value.text || '').trim(), inputType: String(value.inputType || 'text') };
  } catch {
    return { text: '', inputType: 'text' };
  }
};

const server = createServer(async (request, response) => {
  if (!request.url?.startsWith('/api/classify') && !request.url?.startsWith('/v1/resolve')) { response.writeHead(404); response.end(); return; }
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (request.url.startsWith('/v1/resolve')) {
      const body = await readJson(request);
      const result = body.text ? toResolveResult(body.text, await classify(body.text)) : { status: 'uncovered', relatedClaims: [] };
      response.writeHead(body.text ? 200 : 400, { 'content-type': 'application/json', 'cache-control': 'no-store' });
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
