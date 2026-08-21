import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createLocalInferenceProvider } from '../local-inference-provider.mjs';
import { createModelTasks } from '../model-tasks.mjs';
import { sourceEvidenceSchema } from './model-task-contracts.mjs';

const root = new URL('../../', import.meta.url).pathname;
const args = new Map(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), values[index + 1] && !values[index + 1].startsWith('--') ? values[index + 1] : 'true']);
  return pairs;
}, []));
const inputPath = args.get('input') || join(root, '.local/research-job.json');
const outputPath = args.get('output') || join(root, '.local/research-evidence.json');
const endpoint = process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434';
const model = args.get('model') || process.env.OLLAMA_ROUTER_MODEL || 'gemma4:26b';
const limit = Math.max(1, Number(args.get('limit') || 1000));
const concurrency = Math.max(1, Number(args.get('concurrency') || 2));
const timeoutMs = Math.max(15000, Number(args.get('timeout') || 120000));
const retryCount = Math.max(0, Number(args.get('retries') || 1));
const report = JSON.parse(await readFile(inputPath, 'utf8'));
const provider = createLocalInferenceProvider({ endpoint });
const tasks = createModelTasks({ provider, models: { router: model } });
const fetchText = async (url) => {
  const response = await fetch(url, { headers: { accept: 'text/html,application/pdf,text/plain,*/*' }, signal: AbortSignal.timeout(Math.max(3000, Number(process.env.RESEARCH_SOURCE_TIMEOUT_MS || 7000))) });
  if (!response.ok) throw new Error(`source_http_${response.status}`);
  const type = response.headers.get('content-type') || '';
  if (type.includes('pdf')) return `[PDF source: ${url}]`;
  return (await response.text()).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 8000);
};
const assess = async (item, lead) => {
  const sourceText = await fetchText(lead.url);
  const prompt = `Actúa como investigador de datos. Evalúa si la fuente oficial responde a la carencia indicada. No inventes valores. Devuelve solo JSON según el esquema.\n\nCarencia: ${item.canonicalText || item.id}\nDominio: ${item.domain || 'general'}\nDimensiones requeridas: ${(item.requiredDimensions || []).join(', ')}\nFuente: ${lead.title} (${lead.url})\nContenido: ${sourceText}`;
  let result;
  let lastError;
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      result = await tasks.extractSourceEvidence({ model, schema: sourceEvidenceSchema, options: { temperature: 0, num_predict: 420, num_ctx: 8192 }, messages: [{ role: 'user', content: prompt }], timeoutMs });
      break;
    } catch (error) {
      lastError = error;
      if (attempt < retryCount) await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  if (!result) throw lastError || new Error('llm_empty_result');
  const findings = Array.isArray(result?.findings) ? result.findings : [];
  const useful = findings.filter((finding) => ['supports', 'contradicts', 'context'].includes(finding.support));
  const insufficient = findings.length === 0 || findings.every((finding) => finding.support === 'insufficient');
  return { source: lead, findings, status: insufficient ? 'unsupported_after_llm_review' : useful.length && useful.length < findings.length ? 'partially_covered_by_llm' : 'covered_by_llm', reviewedAt: new Date().toISOString(), model };
};
const candidates = (report.results || []).flatMap((item) => (item.leads || []).slice(0, 2).map((lead) => ({ item, lead }))).slice(0, limit);
const checkpointPath = `${outputPath}.partial`;
let results = [];
try { const checkpoint = JSON.parse(await readFile(checkpointPath, 'utf8')); if (Array.isArray(checkpoint.results)) results = checkpoint.results; } catch {}
// Errors are deliberately retried on the next run; only substantive LLM
// outcomes are checkpoints that can be safely skipped.
const completedKeys = new Set(results.filter((item) => item.status !== 'llm_error').map((item) => `${item.id}|${item.source?.url || ''}`));
const pending = candidates.filter(({ item, lead }) => !completedKeys.has(`${item.id}|${lead.url}`));
let cursor = 0;
const persist = async () => { await mkdir(join(outputPath, '..'), { recursive: true }); await writeFile(checkpointPath, JSON.stringify({ schemaVersion: '1', generatedAt: new Date().toISOString(), model, input: inputPath, total: candidates.length, completed: results.length, results }, null, 2)); };
const worker = async () => { while (cursor < pending.length) { const current = pending[cursor++]; try { results.push({ id: current.item.id, clusterId: current.item.clusterId || null, auditClass: current.item.auditClass, domain: current.item.domain || null, ...(await assess(current.item, current.lead)) }); } catch (error) { results.push({ id: current.item.id, clusterId: current.item.clusterId || null, auditClass: current.item.auditClass, domain: current.item.domain || null, source: current.lead, status: 'llm_error', error: error instanceof Error ? error.message : String(error), reviewedAt: new Date().toISOString(), model }); } await persist(); console.log(`LLM research progress: ${results.length}/${candidates.length}`); } };
await Promise.all(Array.from({ length: Math.min(concurrency, candidates.length) }, worker));
const latest = new Map();
for (const item of results) latest.set(`${item.id}|${item.source?.url || ''}`, item);
results = [...latest.values()];
const counts = Object.fromEntries(['covered_by_llm', 'partially_covered_by_llm', 'unsupported_after_llm_review', 'llm_error'].map((status) => [status, results.filter((item) => item.status === status).length]));
await writeFile(outputPath, JSON.stringify({ schemaVersion: '1', generatedAt: new Date().toISOString(), model, input: inputPath, counts, results }, null, 2));
await writeFile(checkpointPath, JSON.stringify({ schemaVersion: '1', completed: results.length, total: candidates.length, finishedAt: new Date().toISOString(), results }, null, 2));
console.log(`LLM research assessment complete: ${counts.covered_by_llm || 0} covered, ${counts.partially_covered_by_llm || 0} partial, ${counts.unsupported_after_llm_review || 0} unsupported, ${counts.llm_error || 0} errors. Output: ${outputPath}`);
