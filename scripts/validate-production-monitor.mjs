import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { promisify } from 'node:util';

const execute = promisify(execFile);
let scenario = 'valid';
let polls = 0;
const answer = (state, { family, sourceId } = {}) => ({ id: 'fixture', state, result: {
  evidenceLevel: state,
  reply: 'Respuesta de prueba',
  ...(family ? { answerScope: { family } } : {}),
  sources: sourceId ? [{ id: sourceId, url: 'https://www.ine.es/ftp/microdatos/ecv/ecv_b2013/datos_2025.zip' }]
    : state === 'supported' ? [{ url: 'https://example.org/source' }] : [],
} });
const server = createServer(async (request, response) => {
  response.setHeader('content-type', 'application/json');
  if (request.method === 'GET' && request.url === '/api/check/pending') {
    polls += 1;
    response.end(JSON.stringify(answer('limited')));
    return;
  }
  if (request.method !== 'POST' || request.url !== '/api/check') {
    response.writeHead(404).end('{}');
    return;
  }
  let body = '';
  for await (const chunk of request) body += chunk;
  const input = JSON.parse(body);
  if (input.text.startsWith('España supera')) response.end(JSON.stringify(answer(scenario === 'missing-evidence' ? 'insufficient' : 'supported')));
  else if (input.text === 'No hay trabajo') response.writeHead(202).end(JSON.stringify({ id: 'pending', state: 'processing' }));
  else if (input.answerScopeFamily && input.requiredSourceId) response.end(JSON.stringify(answer('limited', { family: input.answerScopeFamily, sourceId: input.requiredSourceId })));
  else response.end(JSON.stringify(answer('insufficient')));
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const env = { ...process.env, SMOKE_BASE_URL: `http://127.0.0.1:${server.address().port}`, SMOKE_REQUIRE_TERMINAL: '1' };
try {
  await execute(process.execPath, ['scripts/smoke-production.mjs'], { env, timeout: 15000 });
  assert.ok(polls > 0, 'A queued check must be polled to a terminal response');
  scenario = 'missing-evidence';
  await assert.rejects(() => execute(process.execPath, ['scripts/smoke-production.mjs'], { env, timeout: 15000 }), (error) => {
    assert.match(error.stderr, /expected one of supported/);
    return true;
  });
} finally {
  await new Promise((resolve) => server.close(resolve));
}
console.log('Production monitor passed: queued checks are polled and a missing supported result fails.');
