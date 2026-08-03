import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { compilerSchema, normalizeCompilerOutput } from './local-compiler-contract.mjs';
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
const requestedModels = String(args.get('models') || process.env.COMPILER_BENCHMARK_MODELS || 'gemma3:4b,qwen3.6:latest')
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
const sameList = (left, right) => JSON.stringify(left || []) === JSON.stringify(right || []);

const getAvailableModels = async () => {
  const payload = await inference.listModels(timeoutMs);
  return new Set(Array.isArray(payload.models) ? payload.models.map((model) => String(model.name || '')) : []);
};

const runCase = async (model, testCase) => {
  const startedAt = Date.now();
  const prompt = `Extrae la estructura de esta afirmación en español. No evalúes si es verdadera y no añadas datos. Separa afirmaciones explícitas e implícitas mediante el campo explicit. Identifica entidades, población, periodo, números y tipo de afirmación. Devuelve únicamente JSON según el esquema proporcionado.\n\nAfirmación:\n${testCase.input}`;
  try {
    const payload = await inference.chat({ model, stream: false, think: false, format: compilerSchema, keep_alive: -1, options: { temperature: 0, num_predict: 240, num_ctx: 3072 }, messages: [{ role: 'user', content: prompt }] }, timeoutMs);
    const raw = parseJson(payload.message?.content);
    const deterministic = deterministicFallbackCompiler(testCase.input);
    const normalized = normalizeCompilerOutput(raw, testCase.input);
    const validJson = Boolean(raw && Array.isArray(raw.propositions));
    const typeMatch = testCase.claimTypes.includes(normalized.claimType);
    const conceptMatch = hasRequiredConcepts(normalized, testCase.mustMention);
    const safetyPreserved = sameList(normalized.numbers, deterministic.numbers)
      && normalized.semanticSignature === deterministic.semanticSignature
      && normalized.geography === deterministic.geography
      && normalized.period === deterministic.period;
    const quality = Math.round((Number(validJson) * 0.35 + Number(typeMatch) * 0.2 + Number(conceptMatch) * 0.25 + Number(safetyPreserved) * 0.2) * 100) / 100;
    return { id: testCase.id, validJson, typeMatch, conceptMatch, safetyPreserved, quality, latencyMs: Date.now() - startedAt, propositionCount: normalized.propositions.length, error: null };
  } catch (error) {
    return { id: testCase.id, validJson: false, typeMatch: false, conceptMatch: false, safetyPreserved: false, quality: 0, latencyMs: Date.now() - startedAt, propositionCount: 0, error: bounded(error instanceof Error ? error.message : 'benchmark failure', 180) };
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
  const results = [];
  for (const testCase of cases) results.push(await runCase(model, testCase));
  const quality = average(results.map((result) => result.quality));
  const validRate = average(results.map((result) => Number(result.validJson)));
  const safetyRate = average(results.map((result) => Number(result.safetyPreserved)));
  const latencies = results.map((result) => result.latencyMs);
  reports.push({ model, cases: results.length, quality, validRate, safetyRate, p50Ms: percentile(latencies, 0.5), p95Ms: percentile(latencies, 0.95), passed: quality >= minimumQuality && safetyRate === 1, results });
}

const recommended = reports.find((report) => report.passed)?.model || null;
const report = {
  generatedAt: new Date().toISOString(),
  endpoint: `${endpointUrl.protocol}//${endpointUrl.hostname}:${endpointUrl.port || (endpointUrl.protocol === 'https:' ? 443 : 80)}`,
  minimumQuality, cases: cases.length, requestedModels, reports, recommendedModel: recommended,
  recommendation: recommended ? 'The first passing model in the configured order is the smallest tested candidate meeting the safety and quality threshold.' : 'No tested model met the threshold; keep deterministic fallback as the release path and review the failing cases before changing the default.',
};
await writeFile(outputPath, JSON.stringify(report, null, 2));
console.log(`Local compiler benchmark written: ${reports.length} model(s), ${cases.length} cases, recommended=${recommended || 'none'}.`);
