import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createTcpServer } from 'node:net';

const prompts = [];
const model = createHttpServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const payload = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
  const prompt = payload.messages?.[0]?.content || '';
  prompts.push(prompt);
  const value = prompt.includes('ok=true') ? { ok: true }
    : prompt.startsWith('Plan research') ? { propositions: [], metricCandidates: [], neutralQueries: ['consumo té azul España'], requiredDimensions: ['periodo'] }
      : { headline: 'La cifra es 25 millones', directAnswer: 'La cifra de 25 millones está confirmada.',
        factualClaims: [{ text: 'La cifra es 25 millones.', evidenceIds: ['e1'] }], limitations: ['Sin límites.'], followUps: ['¿Continuamos?'] };
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ message: { content: JSON.stringify(value) }, embeddings: [] }));
});
model.listen(0, '127.0.0.1');
await once(model, 'listening');
const reservation = createTcpServer();
reservation.listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const child = spawn(process.execPath, ['scripts/local-claim-service.mjs'], {
  env: { ...process.env, LOCAL_CLASSIFIER_BIND_HOST: '127.0.0.1', LOCAL_CLASSIFIER_PORT: String(port), LOCAL_CLASSIFIER_TOKEN: '',
    OLLAMA_ENDPOINT: `http://127.0.0.1:${model.address().port}`, LOCAL_CLAIM_COMPILER: '0', LOCAL_ANSWER_PLANNER: '1',
    CURRENT_EVENT_RESEARCH: '0', GENERAL_WEB_RESEARCH: '0' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stderr.on('data', (chunk) => { logs += chunk.toString().slice(0, 10000); });
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Resolver did not start: ${logs.slice(-1000)}`)), 20000);
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Resolver exited ${code}: ${logs.slice(-1000)}`)); });
    child.stdout.on('data', (chunk) => { if (chunk.toString().includes('Local claim service listening')) { clearTimeout(timer); resolve(); } });
  });
  const base = `http://127.0.0.1:${port}/v1/classify`;
  const response = await fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'En 2025 el consumo de té azul en España fue de 2,5 millones de litros.', inputType: 'text' }), signal: AbortSignal.timeout(10000) });
  let result = await response.json();
  const deadline = Date.now() + 30000;
  while (result.status === 'processing' && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    result = await (await fetch(`${base}/${encodeURIComponent(result.requestId)}`, { signal: AbortSignal.timeout(5000) })).json();
  }
  assert.ok(result.result && result.status !== 'processing', `Resolver did not finish: ${result.status}`);
  assert.ok(prompts.some((prompt) => prompt.startsWith('Plan research')), 'The model-backed research path was not exercised');
  assert.ok(!prompts.some((prompt) => prompt.startsWith('Adapta únicamente la presentación')), 'A model was asked to rewrite the evidence-based answer');
  assert.doesNotMatch(JSON.stringify(result.result), /La cifra de 25 millones está confirmada|La cifra es 25 millones/, 'An unsupported model answer reached the result');
  assert.notEqual(result.result.evidenceLevel, 'supported', 'An unsupported claim became supported');
} finally {
  child.kill('SIGTERM');
  await Promise.race([once(child, 'exit').catch(() => {}), new Promise((resolve) => setTimeout(resolve, 2000))]);
  if (child.exitCode === null) child.kill('SIGKILL');
  await new Promise((resolve) => model.close(resolve));
}
console.log('Model answer boundary passed: research can run without replacing a cautious answer with invented prose or numbers.');
