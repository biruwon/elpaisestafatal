import { spawn } from 'node:child_process';

const classifierPort = Number(process.env.FAST_RESPONSE_CLASSIFIER_PORT || 8793);
const gatewayPort = Number(process.env.FAST_RESPONSE_GATEWAY_PORT || 4327);
const base = `http://127.0.0.1:${gatewayPort}`;
const claim = 'Según los datos, el árbol demográfico está completamente invertido y el sistema de pensiones es completamente insostenible.';
const children = [];
const failures = [];

const start = (script, extraEnv) => {
  const child = spawn(process.execPath, [script], {
    cwd: process.cwd(),
    env: { ...process.env, ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  children.push(child);
  return child;
};

const waitFor = async (url, predicate, timeoutMs = 15_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (response.ok) {
        const payload = await response.json();
        if (predicate(payload)) return payload;
      }
    } catch { /* The child may still be starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
};

const cleanup = () => { for (const child of children) child.kill('SIGTERM'); };
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });

try {
  start('scripts/local-claim-service.mjs', {
    LOCAL_CLASSIFIER_PORT: String(classifierPort),
    LOCAL_CLASSIFIER_BIND_HOST: '127.0.0.1',
    LOCAL_ANSWER_PLANNER: '0',
    LOCAL_CLAIM_COMPILER: '0',
  });
  start('scripts/local-dev-gateway.mjs', {
    LOCAL_GATEWAY_PORT: String(gatewayPort),
    LOCAL_ASTRO_PORT: process.env.FAST_RESPONSE_ASTRO_PORT || '4322',
    LOCAL_CLASSIFIER_PORT: String(classifierPort),
  });
  await waitFor(`${base}/healthz`, (payload) => payload.deterministic === true);

  const coldStart = Date.now();
  const initialResponse = await fetch(`${base}/api/check`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: claim, inputType: 'text' }),
    signal: AbortSignal.timeout(5000),
  });
  const initial = await initialResponse.json();
  if (initial.state !== 'processing') failures.push(`cold request state: ${initial.state}`);
  if (!initial.preview || !/Contexto|envejecimiento|pensiones/i.test(JSON.stringify(initial.preview))) failures.push('cold request did not expose a reviewed preview');
  if (Date.now() - coldStart >= 5000) failures.push(`cold request acceptance took ${Date.now() - coldStart}ms`);

  const completed = await waitFor(`${base}/api/check/${encodeURIComponent(initial.id)}`, (payload) => payload.state !== 'processing');
  if (!['limited', 'supported', 'insufficient'].includes(completed.state)) failures.push(`completed state: ${completed.state}`);
  if (!completed.result?.answer && !completed.result?.reply) failures.push('completed response has no answer');

  const warmStart = Date.now();
  const warmResponse = await fetch(`${base}/api/check`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: claim, inputType: 'text' }),
    signal: AbortSignal.timeout(2000),
  });
  const warm = await warmResponse.json();
  if (warm.state === 'processing') failures.push('warm request missed the completed resolver cache');
  if (Date.now() - warmStart >= 2000) failures.push(`warm request took ${Date.now() - warmStart}ms`);

  const generalResponse = await fetch(`${base}/api/check`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'España supera los 49 millones de residentes.', inputType: 'text' }),
    signal: AbortSignal.timeout(5000),
  });
  const general = await generalResponse.json();
  if (!['supported', 'limited', 'insufficient', 'processing'].includes(general.state)) failures.push(`general claim state: ${general.state}`);
  if (general.state !== 'processing' && !general.result?.answer && !general.result?.reply) failures.push('general claim has no answer');
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
} finally {
  cleanup();
}

if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Fast response path validation passed: immediate preview, bounded enrichment, and warm cache.');
