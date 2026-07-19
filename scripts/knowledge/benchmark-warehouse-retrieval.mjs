import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { reciprocalRankFusion, resolveMetricConflict, validateEmbedding } from './hybrid-retrieval.mjs';
import { warehouseRetrievalBenchmarkCases } from './warehouse-retrieval-benchmark-cases.mjs';

const endpoint = (process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434').replace(/\/$/, '');
const model = process.env.OLLAMA_EMBED_MODEL || 'bge-m3';
const url = new URL(endpoint);
if (!['127.0.0.1', 'localhost', '::1', 'host.docker.internal'].includes(url.hostname)) throw new Error('Benchmark embedding endpoint must be local');

const registry = JSON.parse(await readFile(new URL('../../config/metric-registry.json', import.meta.url), 'utf8'));
const candidates = Object.entries(registry)
  .filter(([id]) => id !== 'official_publication')
  .map(([id, definition]) => ({ id, text: [definition.name, ...(definition.aliases || []), definition.unit, definition.population, ...(definition.dimensions || [])].join(' '), notEquivalentTo: definition.notEquivalentTo || [] }));
const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
const stopWords = new Set(['como', 'esta', 'este', 'para', 'pero', 'que', 'una', 'uno', 'los', 'las', 'del', 'por', 'con', 'cada', 'espana', 'espanola', 'espanol']);
const tokens = (value) => [...new Set(normalise(value).split(' ').filter((token) => token.length > 2 && !stopWords.has(token)))];
const lexicalRank = (query) => {
  const wanted = tokens(query);
  return candidates.map((candidate) => {
    const available = new Set(tokens(candidate.text));
    const matched = wanted.filter((token) => available.has(token));
    return { ...candidate, score: wanted.length ? matched.length / wanted.length : 0 };
  }).filter((candidate) => candidate.score > 0).sort((left, right) => right.score - left.score);
};
const cosine = (left, right) => {
  let dot = 0; let leftNorm = 0; let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) { dot += left[index] * right[index]; leftNorm += left[index] ** 2; rightNorm += right[index] ** 2; }
  return leftNorm && rightNorm ? dot / Math.sqrt(leftNorm * rightNorm) : 0;
};
const embed = async (input) => {
  const response = await fetch(`${endpoint}/api/embed`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model, input, keep_alive: -1 }), signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`Local embedding benchmark failed with ${response.status}: ${String(await response.text()).slice(0, 240)}`);
  const embeddings = (await response.json()).embeddings;
  if (!Array.isArray(embeddings) || embeddings.length !== input.length || embeddings.some((item) => !validateEmbedding(item))) throw new Error('Benchmark received malformed embeddings');
  return embeddings;
};

const candidateEmbeddings = await embed(candidates.map((candidate) => candidate.text));
const queryEmbeddings = await embed(warehouseRetrievalBenchmarkCases.map((item) => item.query));
const outcomes = warehouseRetrievalBenchmarkCases.map((item, caseIndex) => {
  const lexical = lexicalRank(item.query);
  const semantic = candidates.map((candidate, candidateIndex) => ({ ...candidate, score: cosine(queryEmbeddings[caseIndex], candidateEmbeddings[candidateIndex]) })).sort((left, right) => right.score - left.score);
  const resolved = resolveMetricConflict(lexical, semantic);
  const hybrid = reciprocalRankFusion(resolved.lexical, resolved.semantic, { limit: 5, preferredId: resolved.preferredId });
  const expected = registry[item.expectedMetricId];
  const forbidden = new Set(expected?.notEquivalentTo || []);
  return {
    id: item.id,
    query: item.query,
    expectedMetricId: item.expectedMetricId,
    lexicalTop: lexical[0]?.id || null,
    hybridTop: hybrid[0]?.id || null,
    hybridTop3: hybrid.slice(0, 3).map((candidate) => candidate.id),
    semanticTop: semantic[0]?.id || null,
    semanticTopScore: Number((semantic[0]?.score || 0).toFixed(4)),
    semanticMargin: Number(((semantic[0]?.score || 0) - (semantic[1]?.score || 0)).toFixed(4)),
    expectedSemanticScore: Number((semantic.find((candidate) => candidate.id === item.expectedMetricId)?.score || 0).toFixed(4)),
    unsafeTop: forbidden.has(hybrid[0]?.id),
    conflictWinner: resolved.winner,
  };
});
const count = (predicate) => outcomes.filter(predicate).length;
const report = {
  generatedAt: new Date().toISOString(),
  model,
  cases: outcomes.length,
  positiveCases: count((item) => item.expectedMetricId !== null),
  negativeCases: count((item) => item.expectedMetricId === null),
  lexicalTop1: count((item) => item.expectedMetricId !== null && item.lexicalTop === item.expectedMetricId),
  hybridTop1: count((item) => item.expectedMetricId !== null && item.hybridTop === item.expectedMetricId),
  hybridRecallAt3: count((item) => item.expectedMetricId !== null && item.hybridTop3.includes(item.expectedMetricId)),
  negativeRejections: count((item) => item.expectedMetricId === null && item.hybridTop === null),
  unsafeTopMatches: count((item) => item.unsafeTop),
  outcomes,
};
const root = new URL('../../.local/', import.meta.url).pathname;
await mkdir(root, { recursive: true });
await writeFile(new URL('../../.local/warehouse-retrieval-benchmark.json', import.meta.url), JSON.stringify(report, null, 2));
console.log(`Warehouse retrieval benchmark: lexical top-1 ${report.lexicalTop1}/${report.positiveCases}; hybrid top-1 ${report.hybridTop1}/${report.positiveCases}; hybrid recall@3 ${report.hybridRecallAt3}/${report.positiveCases}; negative rejections ${report.negativeRejections}/${report.negativeCases}; unsafe top matches ${report.unsafeTopMatches}.`);
if (report.hybridRecallAt3 / report.positiveCases < 0.9 || report.negativeRejections !== report.negativeCases || report.unsafeTopMatches > 0) process.exitCode = 1;
