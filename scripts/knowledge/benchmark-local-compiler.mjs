import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { compilerInstruction, compilerSchema, normalizeCompilerOutput } from './local-compiler-contract.mjs';
import { deterministicFallbackCompiler } from './fallback-compiler.mjs';
import { createLocalInferenceProvider } from '../local-inference-provider.mjs';

const root = new URL('../../', import.meta.url).pathname;
const args = new Map(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), values[index + 1] && !values[index + 1].startsWith('--') ? values[index + 1] : 'true']);
  return pairs;
}, []));
const endpoint = args.get('endpoint') || process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434';
const endpointUrl = new URL(endpoint);
const outputPath = args.get('output') || join(root, '.local/compiler-benchmark.json');
const timeoutMs = Math.min(30000, Math.max(1500, Number(args.get('timeout-ms') || process.env.COMPILER_BENCHMARK_TIMEOUT_MS || 10000)));
const minimumQuality = Math.min(1, Math.max(0, Number(args.get('min-quality') || process.env.COMPILER_BENCHMARK_MIN_QUALITY || 0.8)));
const maxWarmP95Ms = Math.max(1000, Number(args.get('max-p95-ms') || process.env.COMPILER_BENCHMARK_MAX_P95_MS || 15000));
const requestedModels = String(args.get('models') || process.env.COMPILER_BENCHMARK_MODELS || 'gemma4:26b,qwen3.6:27b')
  .split(',').map((model) => model.trim()).filter(Boolean);

const inference = createLocalInferenceProvider({ endpoint });
if (inference.kind !== 'local') throw new Error('Compiler benchmark provider is unavailable.');

const cases = [
  { id: 'immigration-crime', input: 'Los inmigrantes crean inseguridad', claimTypes: ['causal'], mustMention: ['inmigrantes', 'inseguridad'] },
  { id: 'housing-cause', input: 'Los pisos turísticos han causado la crisis de vivienda', claimTypes: ['causal'], mustMention: ['pisos', 'vivienda'] },
  { id: 'tax-ranking', input: 'España cobra más impuestos que Europa', claimTypes: ['comparative', 'descriptive'], mustMention: ['impuestos', 'europa'] },
  { id: 'employment-trend', input: 'Cada vez hay más empleo en España', claimTypes: ['trend'], mustMention: ['empleo'] },
  { id: 'public-debt', input: '¿Cuánto debe España en euros?', claimTypes: ['descriptive', 'comparative'], mustMention: ['debe', 'españa'] },
  { id: 'pension-prediction', input: 'Sin inmigración el sistema de pensiones quebraría inmediatamente', claimTypes: ['predictive', 'causal'], mustMention: ['pensiones', 'inmigración'] },
  { id: 'budget-transfer', input: 'El Gobierno quita 310 millones de Educación para pagar personal de Presidencia', claimTypes: ['descriptive', 'mixed'], mustMention: ['educación', 'presidencia'] },
  { id: 'local-anecdote', input: 'En mi barrio ha subido la inseguridad este mes', claimTypes: ['descriptive', 'trend'], mustMention: ['barrio', 'inseguridad'] },
  { id: 'broad-complaint', input: 'España está destruida', claimTypes: ['definition', 'mixed'], mustMention: ['españa'] },
  { id: 'value-disagreement', input: 'Primero los españoles en las ayudas públicas', claimTypes: ['normative', 'mixed'], mustMention: ['españoles', 'ayudas'] },
  { id: 'compound-housing', input: 'Los alquileres han subido y los salarios no alcanzan para vivir', claimTypes: ['mixed', 'comparative', 'trend'], mustMention: ['alquileres', 'salarios'], mustNeed: ['métrica', 'comparación'] },
  { id: 'compound-budget-impact', input: 'El Gobierno mueve dinero de Educación para pagar personal y eso recorta las becas', claimTypes: ['mixed', 'descriptive'], mustMention: ['educación', 'becas'], mustNeed: ['partida', 'impacto'] },
  { id: 'novel-local-causality', input: 'En mi municipio la llegada de turistas está expulsando a los vecinos', claimTypes: ['causal', 'descriptive'], mustMention: ['municipio', 'turistas'], mustNeed: ['territorio', 'causa'] },
  { id: 'salary-europe', input: 'Los sueldos españoles son de los peores de Europa', claimTypes: ['comparative', 'descriptive'], mustMention: ['sueldos', 'europa'] },
  { id: 'revenue-vs-deficit', input: 'España recauda una parte mayor de su economía que Europa', claimTypes: ['comparative', 'descriptive'], mustMention: ['recauda', 'europa'] },
  { id: 'benefits-group-comparison', input: 'Los inmigrantes reciben más ayudas que los españoles', claimTypes: ['comparative', 'descriptive'], mustMention: ['inmigrantes', 'ayudas'], mustNeed: ['programa', 'denominador'] },
  { id: 'healthcare-collapse', input: 'La sanidad española está colapsada', claimTypes: ['definition', 'descriptive'], mustMention: ['sanidad'], mustNeed: ['definición', 'indicador'] },
  { id: 'energy-causality', input: 'La transición energética está arruinando a las familias españolas', claimTypes: ['causal', 'descriptive'], mustMention: ['energética', 'familias'], mustNeed: ['causa', 'coste'] },
  { id: 'housing-prediction', input: 'Los alquileres van a bajar a la mitad el año que viene', claimTypes: ['predictive'], mustMention: ['alquileres'], mustNeed: ['fecha', 'indicador'] },
  { id: 'everything-worse', input: 'España va cada vez peor en todo', claimTypes: ['definition', 'mixed'], mustMention: ['españa'], mustNeed: ['métrica', 'comparación'] },
];

const bounded = (value, limit) => String(value || '').slice(0, limit);
const parseJson = (value) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value || '');
  const object = text.match(/\{[\s\S]*\}/)?.[0];
  try { return object ? JSON.parse(object) : null; } catch { return null; }
};
const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');
const propositionText = (value) => Array.isArray(value) ? value.map((item) => item?.text || '').join(' ') : '';
const hasRequiredConcepts = (output, required) => {
  const text = normalise(`${output?.normalized || ''} ${propositionText(output?.propositions)} ${output?.entities?.join(' ') || ''}`);
  return required.every((term) => text.includes(normalise(term)));
};
const hasRequiredNeeds = (output, required = []) => {
  const needs = new Set((output?.evidenceNeeds || []).map((item) => normalise(item)));
  return required.every((term) => needs.has(normalise(term)));
};
const sameList = (left, right) => JSON.stringify(left || []) === JSON.stringify(right || []);

const getAvailableModels = async () => {
  const payload = await inference.listModels(timeoutMs);
  return new Set(Array.isArray(payload.models) ? payload.models.map((model) => String(model.name || '')) : []);
};

const runCase = async (model, testCase) => {
  const startedAt = Date.now();
  const prompt = `${compilerInstruction} Identifica también entidades, periodo y números.\n\nAfirmación:\n${testCase.input}`;
  try {
    // Match the production compiler budget. A 240-token benchmark budget
    // routinely truncates the required routing object and measures JSON
    // truncation rather than extraction quality.
    const payload = await inference.chat({ model, stream: false, think: false, format: compilerSchema, keep_alive: 600, options: { temperature: 0, num_predict: 420, num_ctx: 8192 }, messages: [{ role: 'user', content: prompt }] }, timeoutMs);
    const raw = parseJson(payload.message?.content);
    const deterministic = deterministicFallbackCompiler(testCase.input);
    const normalized = normalizeCompilerOutput(raw, testCase.input);
    const validJson = Boolean(raw && Array.isArray(raw.propositions));
    const typeMatch = testCase.claimTypes.includes(normalized.claimType);
    const conceptMatch = hasRequiredConcepts(normalized, testCase.mustMention);
    const evidenceNeedMatch = hasRequiredNeeds(normalized, testCase.mustNeed);
    const safetyPreserved = sameList(normalized.numbers, deterministic.numbers)
      && normalized.semanticSignature === deterministic.semanticSignature
      && normalized.geography === deterministic.geography
      && normalized.period === deterministic.period;
    const quality = Math.round((Number(validJson) * 0.3 + Number(typeMatch) * 0.18 + Number(conceptMatch) * 0.22 + Number(evidenceNeedMatch) * 0.1 + Number(safetyPreserved) * 0.2) * 100) / 100;
    return { id: testCase.id, validJson, typeMatch, conceptMatch, evidenceNeedMatch, safetyPreserved, quality, latencyMs: Date.now() - startedAt, propositionCount: normalized.propositions.length, error: null };
  } catch (error) {
    return { id: testCase.id, validJson: false, typeMatch: false, conceptMatch: false, evidenceNeedMatch: false, safetyPreserved: false, quality: 0, latencyMs: Date.now() - startedAt, propositionCount: 0, error: bounded(error instanceof Error ? error.message : 'benchmark failure', 180) };
  }
};

const average = (values) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 100) / 100 : 0;
const percentile = (values, fraction) => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] : 0;
};

const available = await getAvailableModels();
const models = requestedModels.filter((model) => available.has(model));
if (!models.length) throw new Error(`None of the requested local models is available: ${requestedModels.join(', ')}`);

const reports = [];
for (const model of models) {
  console.log(`Benchmarking local model ${model} (${cases.length} cases; timeout ${timeoutMs}ms each)...`);
  const results = [];
  for (const [index, testCase] of cases.entries()) {
    const result = await runCase(model, testCase);
    results.push(result);
    console.log(`  [${index + 1}/${cases.length}] ${testCase.id}: quality=${result.quality} latency=${result.latencyMs}ms${result.error ? ` error=${result.error}` : ''}`);
  }
  const quality = average(results.map((result) => result.quality));
  const validRate = average(results.map((result) => Number(result.validJson)));
  const safetyRate = average(results.map((result) => Number(result.safetyPreserved)));
  const latencies = results.map((result) => result.latencyMs);
  const p95Ms = percentile(latencies, 0.95);
  reports.push({ model, cases: results.length, quality, validRate, safetyRate, p50Ms: percentile(latencies, 0.5), p95Ms, passed: quality >= minimumQuality && safetyRate === 1 && p95Ms <= maxWarmP95Ms, results });
}

const recommended = reports.find((report) => report.passed)?.model || null;
const report = {
  generatedAt: new Date().toISOString(),
  endpoint: `${endpointUrl.protocol}//${endpointUrl.hostname}:${endpointUrl.port || (endpointUrl.protocol === 'https:' ? 443 : 80)}`,
  minimumQuality, maxWarmP95Ms, cases: cases.length, requestedModels, reports, recommendedModel: recommended,
  recommendation: recommended ? 'The first passing model in the configured order is the smallest tested candidate meeting the safety and quality threshold.' : 'No tested model met the threshold; keep deterministic fallback as the release path and review the failing cases before changing the default.',
};
await writeFile(outputPath, JSON.stringify(report, null, 2));
console.log(`Local compiler benchmark written: ${reports.length} model(s), ${cases.length} cases, recommended=${recommended || 'none'}.`);
