import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';
import { rankWarehouseObservations } from './warehouse-query.mjs';
import { realWagePlan } from '../../src/lib/knowledge/real-wage-comparison.mjs';

const compiled = await build({ entryPoints: ['functions/lib/d1-warehouse.ts'], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const { searchD1WarehouseByMetricIds } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].contents).toString('base64')}`);
const database = new DatabaseSync(':memory:');
database.exec(`
  CREATE TABLE source_documents (id TEXT PRIMARY KEY, publisher TEXT, title TEXT, url TEXT, published_at TEXT, retrieved_at TEXT, trust_tier TEXT, aliases_json TEXT, source_registry_id TEXT, schedule TEXT);
  CREATE TABLE observations (id TEXT PRIMARY KEY, kind TEXT, dataset_id TEXT, metric TEXT, metric_id TEXT, value REAL, unit TEXT, period TEXT, geography TEXT, population TEXT, dimensions_json TEXT, dimension_labels_json TEXT, url TEXT, excerpt TEXT, payload_json TEXT, source_document_id TEXT);
  CREATE INDEX idx_observations_metric_period ON observations(metric_id, period);
`);
const now = Date.now(), recent = new Date(now - 1000).toISOString(), older = new Date(now - 86400000).toISOString();
const sources = [
  ['wages', 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lc_lci_r2_a', recent],
  ['prices', 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_ainr', recent],
  ['old-wages', 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lc_lci_r2_a', older],
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
const d1 = { prepare(sql) { let values = []; return { bind(...args) { values = args; return this; }, async all() { return { results: database.prepare(sql).all(...values) }; } }; } };
const ids = ['annual_hourly_wage_index', 'annual_hicp_index'];
const rows = await searchD1WarehouseByMetricIds(d1, ids);
assert.equal(rows.length, 13);
assert.equal(rows.find((row) => row.id === 'w-2025').status, 'p', 'The D1 payload lost its provisional flag');
assert.equal(rows.find((row) => row.id === 'w-2020').source.id, 'wages');
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
  assert.match(publicResult.result.reply, /índice salarial bajó aproximadamente un 4,6 %/);
  assert.deepEqual(new Set(received.warehouseRecords.map((item) => item.metricId)), new Set(ids));
  assert.ok(publicResult.result.criteria.every((criterion) => criterion.sourceIds.every((id) => publicResult.result.sources.some((source) => source.id === id))));
  await Promise.all(pending);
} finally { globalThis.fetch = originalFetch; }
database.close();
console.log('Real-wage D1 retrieval passed: both complete annual series, source revisions and observation flags survive the public submission path.');
