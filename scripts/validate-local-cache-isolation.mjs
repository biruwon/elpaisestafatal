import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { claimCacheIdentity } from '../src/lib/knowledge/claim-cache-identity.mjs';

assert.equal(claimCacheIdentity('  cafe\u0301  '), claimCacheIdentity('café'));
assert.notEqual(claimCacheIdentity('El salario no sube'), claimCacheIdentity('El salario sube'));
assert.notEqual(claimCacheIdentity('2,5 %'), claimCacheIdentity('2.5 %'));

const reservation = createServer();
reservation.listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const child = spawn(process.execPath, ['scripts/local-claim-service.mjs'], {
  env: { ...process.env, LOCAL_CLASSIFIER_BIND_HOST: '127.0.0.1', LOCAL_CLASSIFIER_PORT: String(port), LOCAL_CLASSIFIER_TOKEN: '',
    LOCAL_CLAIM_COMPILER: '0', LOCAL_ANSWER_PLANNER: '0', CURRENT_EVENT_RESEARCH: '0', GENERAL_WEB_RESEARCH: '0' },
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
  const inputs = ['El salario no sube', 'El salario sube', 'El salario sube', 'La tasa de empleo es 2,5 %', 'La tasa de empleo es 2.5 %'];
  const responses = await Promise.all(inputs.map(async (text) => {
    const response = await fetch(`http://127.0.0.1:${port}/v1/classify`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, inputType: 'text' }), signal: AbortSignal.timeout(30000) });
    assert.ok(response.ok, `Request failed for ${text}: ${response.status}`);
    return response.json();
  }));
  for (const [index, response] of responses.entries()) assert.equal(response.claim, inputs[index], 'A response inherited a different submitted claim');
  assert.notEqual(responses[0].requestId, responses[1].requestId, 'Opposite claims shared a resolver job');
  assert.equal(responses[1].requestId, responses[2].requestId, 'Identical claims should reuse the same job');
  assert.notEqual(responses[3].requestId, responses[4].requestId, 'Numeric punctuation shared a resolver job');
} finally {
  child.kill('SIGTERM');
  await Promise.race([once(child, 'exit').catch(() => {}), new Promise((resolve) => setTimeout(resolve, 2000))]);
  if (child.exitCode === null) child.kill('SIGKILL');
}
console.log('Local resolver cache isolation passed: negation and numeric punctuation remain distinct; exact repeats reuse a job.');
