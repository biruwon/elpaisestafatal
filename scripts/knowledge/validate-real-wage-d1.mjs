import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';
import { rankWarehouseObservations } from './warehouse-query.mjs';
import { realWagePlan } from '../../src/lib/knowledge/real-wage-comparison.mjs';
import { focusedEvidencePlan } from '../../src/lib/knowledge/focused-evidence-plan.mjs';

const compiled = await build({ entryPoints: ['functions/lib/d1-warehouse.ts'], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const { searchD1WarehouseByMetricIds } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].contents).toString('base64')}`);
const database = new DatabaseSync(':memory:');
database.exec(`
  CREATE TABLE source_documents (id TEXT PRIMARY KEY, publisher TEXT, title TEXT, url TEXT, published_at TEXT, retrieved_at TEXT, trust_tier TEXT, aliases_json TEXT, source_registry_id TEXT, schedule TEXT);
  CREATE TABLE observations (id TEXT PRIMARY KEY, kind TEXT, dataset_id TEXT, metric TEXT, metric_id TEXT, value REAL, unit TEXT, period TEXT, geography TEXT, population TEXT, dimensions_json TEXT, dimension_labels_json TEXT, url TEXT, excerpt TEXT, payload_json TEXT, source_document_id TEXT);
  CREATE INDEX idx_observations_metric_period ON observations(metric_id, period);
`);
const now = Date.now(), recent = new Date(now - 1000).toISOString(), older = new Date(now - 30 * 86400000).toISOString();
const sources = [
  ['wages', 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lc_lci_r2_a', recent],
  ['prices', 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_ainr', recent],
  ['old-wages', 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lc_lci_r2_a', older],
  ['unemployment', 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/une_rt_a', recent],
];
const insertSource = database.prepare('INSERT INTO source_documents VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)');
for (const [id, url, retrieved] of sources) insertSource.run(id, 'Eurostat', id, url, retrieved, 'primary', '[]', 'eurostat', 'daily');
const insert = database.prepare('INSERT INTO observations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
for (const [year, wage, price] of [[2020, 100, 82.05], [2021, 100.3, 84.52], [2022, 103.4, 91.55], [2023, 108.5, 94.66], [2024, 112.9, 97.38], [2025, 116.3, 100]]) {
  const wageDimensions = { freq: 'A', geo: 'ES', unit: 'I20', nace_r2: 'B-S', lcstruct: 'D11', time: String(year) };
  const priceDimensions = { freq: 'A', geo: 'ES', unit: 'INX_A_AVG', coicop18: 'TOTAL', time: String(year) };
  insert.run(`w-${year}`, 'observation', 'wage-dataset', null, 'annual_hourly_wage_index', wage, 'Index, 2020=100', String(year), null, null, JSON.stringify(wageDimensions), '{}', null, null, JSON.stringify(year === 2025 ? { status: 'p' } : {}), 'wages');
  insert.run(`p-${year}`, 'observation', 'price-dataset', null, 'annual_hicp_index', price, 'Annual average index', String(year), null, null, JSON.stringify(priceDimensions), '{}', null, null, '{}', 'prices');
}
insert.run('old-2025', 'observation', 'old-dataset', null, 'annual_hourly_wage_index', 999, 'Index, 2020=100', '2025', null, null, JSON.stringify({ freq: 'A', geo: 'ES', unit: 'I20', nace_r2: 'B-S', lcstruct: 'D11' }), '{}', null, null, '{}', 'old-wages');
insert.run('unemployment-2025', 'observation', 'unemployment-dataset', null, 'unemployment_rate', 10.5, 'percent', '2025', 'España', null, JSON.stringify({ geo: 'ES', age: 'Y15-74', sex: 'T' }), '{}', null, null, JSON.stringify({ status: 'd' }), 'unemployment');
const d1 = { prepare(sql) { let values = []; return { bind(...args) { values = args; return this; }, async all() { return { results: database.prepare(sql).all(...values) }; } }; } };
const ids = ['annual_hourly_wage_index', 'annual_hicp_index'];
const rows = await searchD1WarehouseByMetricIds(d1, ids);
assert.equal(rows.length, 13);
assert.equal(rows.find((row) => row.id === 'w-2025').status, 'p', 'The D1 payload lost its provisional flag');
assert.equal(rows.find((row) => row.id === 'w-2020').source.id, 'wages');
assert.equal(rows.find((row) => row.id === 'w-2020').source.publishedAt, undefined, 'A missing D1 publication date must remain optional');
assert.equal(rows.find((row) => row.id === 'w-2025').freshness, 'fresh', 'D1 hydration must carry schedule-aware freshness');
assert.equal(rows.find((row) => row.id === 'old-2025').freshness, 'stale', 'An older daily source must be marked stale in the runtime payload');
const ranked = rankWarehouseObservations('índice anual de salarios y precios', rows, 100, { metricIds: new Set(ids) });
assert.equal(ranked.find((row) => row.id === 'w-2025').status, 'p', 'Retrieval lost its provisional flag');
const plan = realWagePlan('Los salarios pierden poder adquisitivo frente a los precios', { observations: ranked, now });
assert.match(plan.shareableReply, /2020 y 2025/);
assert.match(plan.shareableReply, /índice salarial bajó aproximadamente un 4,6 %/);
assert.match(plan.shareableReply, /datos provisionales/);
assert.ok(!plan.evidenceIds.includes('old-2025'), 'The older source revision entered the comparison');

// Exercise the real Pages submission handler with a D1 adapter and a mock
// resolver. The database intentionally lacks FTS: explicit metric retrieval
// must still supply both series instead of depending on keyword ranking.
const apiBuilt = await build({ entryPoints: ['functions/api/check.ts'], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const api = await import(`data:text/javascript;base64,${Buffer.from(apiBuilt.outputFiles[0].contents).toString('base64')}`);
const originalFetch = globalThis.fetch;
const pending = [];
let received;
const postCheck = (text, env) => api.onRequestPost({
  request: new Request('https://site.test/api/check?fresh=1', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, inputType: 'text' }) }),
  env,
  waitUntil: (promise) => pending.push(promise),
});
try {
  globalThis.fetch = async (_url, init) => {
    received = JSON.parse(init.body);
    const resolvedRows = rankWarehouseObservations(received.text, received.warehouseRecords, 100, { metricIds: new Set(ids) });
    const answer = realWagePlan(received.text, { observations: resolvedRows, now });
    return Response.json({ status: 'complete', requestId: 'real-wage-api-test', result: answer });
  };
  const claim = 'Los salarios pierden poder adquisitivo frente a los precios';
  const response = await api.onRequestPost({ request: new Request('https://site.test/api/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: claim, inputType: 'text' }) }),
    env: { DB: d1, LOCAL_CLASSIFIER_ENDPOINT: 'https://resolver.test', LOCAL_CLASSIFIER_TOKEN: 'test' }, waitUntil: (promise) => pending.push(promise) });
  const publicResult = await response.json();
  assert.equal(publicResult.state, 'limited');
  assert.equal(publicResult.result.arguments?.[0]?.verdict, 'mixed', 'The public answer should label a measured, scope-limited comparison as partial');
  assert.match(publicResult.result.reply, /índice salarial bajó aproximadamente un 4,6 %/);
  assert.deepEqual(new Set(received.warehouseRecords.map((item) => item.metricId)), new Set(ids));
  assert.ok(publicResult.result.criteria.every((criterion) => criterion.sourceIds.every((id) => publicResult.result.sources.some((source) => source.id === id))));
  await Promise.all(pending);

  const outageClaim = 'Los salarios españoles han perdido poder adquisitivo desde 2020';
  const noDatabase = await postCheck(outageClaim, {});
  const noDatabaseResult = await noDatabase.json();
  assert.equal(noDatabaseResult.state, 'unavailable', 'No D1 binding must not be described as missing evidence');
  assert.match(noDatabaseResult.message, /no hemos podido consultar las series estadísticas/i);

  const failedDatabase = {
    prepare() {
      return { bind() { return this; }, async all() { throw new Error('warehouse read failed'); }, async run() { return {}; } };
    },
  };
  const failedLookup = await postCheck(outageClaim, { DB: failedDatabase });
  const failedLookupResult = await failedLookup.json();
  assert.equal(failedLookupResult.state, 'unavailable', 'A failed warehouse read must not be described as missing evidence');
  assert.match(failedLookupResult.message, /no hemos podido consultar las series estadísticas/i);

  const emptyDatabase = {
    prepare() {
      return { bind() { return this; }, async all() { return { results: [] }; }, async run() { return {}; } };
    },
  };
  const emptyLookup = await postCheck(outageClaim, { DB: emptyDatabase });
  const emptyLookupResult = await emptyLookup.json();
  assert.equal(emptyLookupResult.state, 'insufficient', 'A successful empty lookup is an evidence gap, not a retrieval outage');
  assert.doesNotMatch(emptyLookupResult.result.reply, /no hemos podido consultar las series estadísticas/i);
  await Promise.all(pending);

  globalThis.fetch = async (_url, init) => {
    received = JSON.parse(init.body);
    const observations = rankWarehouseObservations(received.text, received.warehouseRecords, 100, { metricIds: new Set(['unemployment_rate']) });
    return Response.json({ status: 'complete', requestId: 'jobs-api-test', result: focusedEvidencePlan(received.text, { observations, now }) });
  };
  const shortClaim = 'No hay trabajo';
  const jobsResponse = await api.onRequestPost({ request: new Request('https://site.test/api/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: shortClaim, inputType: 'text' }) }),
    env: { DB: d1, LOCAL_CLASSIFIER_ENDPOINT: 'https://resolver.test', LOCAL_CLASSIFIER_TOKEN: 'test' }, waitUntil: (promise) => pending.push(promise) });
  const jobsResult = await jobsResponse.json();
  assert.equal(jobsResult.state, 'insufficient');
  assert.ok(received.warehouseRecords.some((item) => item.metricId === 'unemployment_rate'), 'A short job claim must retrieve the relevant D1 metric even when FTS has no usable query');
  assert.match(jobsResult.result.reply, /10,5 %/);
  assert.match(jobsResult.result.reply, /definición de este dato difiere/);
  assert.match(jobsResult.result.reply, /no cuenta los puestos disponibles/);
  assert.ok(jobsResult.result.sources.some((source) => /une_rt_a/.test(source.url)));
  await Promise.all(pending);
  const noResolverJobs = await api.onRequestPost({ request: new Request('https://site.test/api/check?fresh=1', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: shortClaim, inputType: 'text' }) }),
    env: { DB: d1 }, waitUntil: (promise) => pending.push(promise) });
  const noResolverResult = await noResolverJobs.json();
  assert.match(noResolverResult.result.reply, /10,5 %/);
  assert.match(noResolverResult.result.reply, /no cuenta los puestos disponibles/);
  assert.ok(noResolverResult.result.sources.some((source) => /une_rt_a/.test(source.url)), 'A text measurement family must use compatible D1 evidence even when the optional resolver is offline');
  await Promise.all(pending);
} finally { globalThis.fetch = originalFetch; }
database.close();
console.log('Real-wage D1 retrieval passed: evidence, source revisions, observation flags, empty searches and warehouse outages keep distinct public outcomes.');
