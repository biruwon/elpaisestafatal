import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

await mkdir('.local', { recursive: true });
const path = resolve('.local/submission-api-test.mjs');
await build({ entryPoints: ['functions/api/check.ts'], outfile: path, bundle: true, format: 'esm', platform: 'node', target: 'node22', logLevel: 'silent' });
const api = await import(pathToFileURL(path));
const originalFetch = globalThis.fetch;
let upstreamCalls = 0;
let lastExtraction;
const plan = (claim) => ({ schemaVersion: '1', headline: 'Resultado de prueba', summary: claim, evidenceLevel: 'supported',
  blocks: [{ type: 'data_finding', propositionIds: ['p1'], evidenceIds: ['source-1'], points: [claim] }, { type: 'conversation_reply', evidenceIds: ['source-1'], text: claim }],
  evidenceIds: ['source-1'], sourceIds: ['source-1'], sourceLinks: [{ id: 'source-1', title: 'Fuente de prueba', url: 'https://www.ine.es/' }], knowledgeVersion: 'test' });
const pending = [];
const env = { LOCAL_CLASSIFIER_ENDPOINT: 'https://resolver.test', LOCAL_CLASSIFIER_TOKEN: 'test' };
const waitUntil = (promise) => pending.push(promise);
const post = async (body, type = 'application/json') => {
  const request = new Request('https://site.test/api/check', { method: 'POST', ...(type ? { headers: { 'content-type': type } } : {}), body: type ? JSON.stringify(body) : body });
  const response = await api.onRequestPost({ request, env, waitUntil });
  return { status: response.status, body: await response.json() };
};
try {
  globalThis.fetch = async (_, init) => {
    upstreamCalls += 1;
    let claim;
    let extraction;
    if (init.body instanceof FormData) {
      const file = init.body.get('file');
      claim = await file.text();
      extraction = { inputType: 'document', text: claim, submittedText: String(init.body.get('text') || ''), status: 'complete', warnings: [] };
      lastExtraction = extraction;
    } else claim = JSON.parse(init.body).text;
    return Response.json({ status: 'complete', requestId: crypto.randomUUID(), result: plan(claim), ...(extraction ? { extraction } : {}) });
  };
  for (const text of ['Primera prueba.', 'Segunda prueba.']) {
    const form = new FormData();
    form.set('text', 'Comprueba este archivo');
    form.set('inputType', 'document');
    form.set('file', new File([text], 'same.txt', { type: 'text/plain' }));
    const response = await post(form, null);
    assert.equal(response.status, 200);
    assert.equal(response.body.result.extraction.text, text);
    assert.match(response.body.result.claim, new RegExp(text));
  }
  assert.equal(upstreamCalls, 2, 'Different uploads with identical metadata must not share answers');
  for (const text of ['Valor 1.2', 'Valor 1,2', 'Valor 1 2']) await post({ text });
  assert.equal(upstreamCalls, 5, 'Numeric punctuation must survive response cache identity');
  await post({ text: 'Valor 1.2' });
  assert.equal(upstreamCalls, 5, 'An identical text request should still use its bounded cache');
  const clarified = await post({ text: 'Original caption', clarification: { prompt: 'Specific measure 42', interpretation: { normalizedClaim: 'Specific measure 42' } } });
  assert.equal(clarified.body.result.reply, 'Specific measure 42', 'Clarification must re-enter retrieval with the selected meaning');
  assert.equal((await post({ text: 'Claim', inputType: 'unknown' })).status, 400);
  assert.equal((await post({ text: 'Claim', clarification: { prompt: 'a'.repeat(12_001) } })).status, 413);
  globalThis.fetch = async () => Response.json({ status: 'complete', requestId: 'poll-id', inputType: 'document', extraction: lastExtraction, result: plan(lastExtraction.text) });
  const poll = await api.onRequestGet({ request: new Request('https://site.test/api/check/poll-id', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ claim: 'Wrong caption from client' }) }), env, waitUntil });
  const polled = await poll.json();
  assert.match(polled.result.claim, /Segunda prueba/);
  assert.ok(!polled.result.claim.includes('Wrong caption'));
  const database = new DatabaseSync(':memory:');
  database.exec('CREATE TABLE resolve_requests (id TEXT PRIMARY KEY, normalized_text TEXT, input_type TEXT, created_at TEXT); CREATE TABLE query_clusters (id TEXT PRIMARY KEY, canonical_text TEXT, canonical_signature TEXT, semantic_signature TEXT UNIQUE, query_count INTEGER, last_seen_at TEXT, coverage_status TEXT); CREATE TABLE query_cluster_members (request_id TEXT, cluster_id TEXT, PRIMARY KEY(request_id, cluster_id));');
  const d1 = { prepare: (sql) => { let values = []; return { bind(...bound) { values = bound; return this; }, async all() { return { results: database.prepare(sql).all(...values) }; }, async run() { return database.prepare(sql).run(...values); } }; } };
  for (let count = 0; count < 2; count += 1) {
    await api.onRequestGet({ request: new Request('https://site.test/api/check/extraction-job'), env: { ...env, DB: d1 }, waitUntil });
    await Promise.all(pending);
  }
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM resolve_requests').get().n, 1, 'Repeated polling must capture one upload event');
  assert.equal(database.prepare('SELECT query_count FROM query_clusters').get().query_count, 1, 'Polling must not inflate claim demand');
  database.close();
  globalThis.fetch = async () => Response.json({ status: 'complete', requestId: 'text-poll', inputType: 'text', claim: 'Resolved clarification', result: plan('Resolved clarification') });
  const clarifiedPoll = await api.onRequestGet({ request: new Request('https://site.test/api/check/text-poll', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ claim: 'Original caption' }) }), env, waitUntil });
  assert.equal((await clarifiedPoll.json()).result.claim, 'Resolved clarification', 'Client polling context must not undo a resolved clarification');
  globalThis.fetch = async () => Response.json({ status: 'complete', result: plan('Caption only') });
  const unknown = new FormData(); unknown.set('text', 'Caption only'); unknown.set('inputType', 'image'); unknown.set('file', new File(['xx'], 'image.png', { type: 'image/png' }));
  assert.equal((await post(unknown, null)).body.state, 'unavailable', 'Unconfirmed extraction must not become a caption verdict');
  await Promise.all(pending);
} finally { globalThis.fetch = originalFetch; }
console.log('Submission API passed: upload isolation, precise numeric cache keys, extraction-aware polling, unknown-type rejection and clarification bounds.');
