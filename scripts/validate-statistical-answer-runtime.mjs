import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';
import { normalizeJsonPayload } from './knowledge/normalize-json.mjs';

// Exercise the real Pages handler, D1 hydration, local resolver and public
// response together; nullable dates and source flags cross all four boundaries.
const compiled = await build({ entryPoints: ['functions/api/check.ts'], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const api = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].contents).toString('base64')}`);
const d1Compiled = await build({ entryPoints: ['functions/lib/d1-warehouse.ts'], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const { searchD1Warehouse } = await import(`data:text/javascript;base64,${Buffer.from(d1Compiled.outputFiles[0].contents).toString('base64')}`);
const warehouseRoot = await mkdtemp(join(tmpdir(), 'statistical-break-fixture-'));
try {
  await mkdir(join(warehouseRoot, 'manifests'));
  const fixtureSource = { id: 'break-source', title: 'Statistical series', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/fixture', metricId: 'rental_price_index', retrievedAt: new Date().toISOString() };
  const records = normalizeJsonPayload({ id: ['time'], size: [3], dimension: { time: { category: { index: { '2015': 0, '2020': 1, '2025': 2 } } } }, value: { 0: 100, 2: 120 }, status: { 1: 'b' } }, fixtureSource);
  const recordPath = join(warehouseRoot, 'records.json');
  await writeFile(recordPath, JSON.stringify({ source: fixtureSource, records }));
  await writeFile(join(warehouseRoot, 'manifests', 'fixture.json'), JSON.stringify({ ...fixtureSource, recordPath }));
  execFileSync(process.execPath, ['scripts/knowledge/export-warehouse-sql.mjs'], { env: { ...process.env, SOURCE_WAREHOUSE_ROOT: warehouseRoot }, stdio: 'pipe' });
  const sql = await readFile(join(warehouseRoot, 'warehouse-load.sql'), 'utf8');
  const marker = sql.split('\n').find((line) => line.startsWith('INSERT INTO observations') && line.includes('break-source-observation-1'));
  assert.ok(marker && marker.includes("'rental_price_index', NULL") && marker.includes('"status":"b"'), 'A missing cell carrying a break must survive normalization and SQL export');
} finally { await rm(warehouseRoot, { recursive: true, force: true }); }
const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE source_documents (id TEXT PRIMARY KEY, publisher TEXT, title TEXT, url TEXT, published_at TEXT, retrieved_at TEXT, trust_tier TEXT, aliases_json TEXT, source_registry_id TEXT, schedule TEXT);
  CREATE TABLE observations (id TEXT PRIMARY KEY, kind TEXT, dataset_id TEXT, metric TEXT, metric_id TEXT, value REAL, unit TEXT, period TEXT, geography TEXT, population TEXT, dimensions_json TEXT, dimension_labels_json TEXT, url TEXT, excerpt TEXT, payload_json TEXT, source_document_id TEXT, search_text TEXT);
  CREATE VIRTUAL TABLE observations_fts USING fts5(search_text, content='observations', content_rowid='rowid');
  CREATE TRIGGER observations_fts_insert AFTER INSERT ON observations BEGIN INSERT INTO observations_fts(rowid, search_text) VALUES (new.rowid, new.search_text); END;
  CREATE TRIGGER observations_fts_update AFTER UPDATE ON observations BEGIN INSERT INTO observations_fts(observations_fts, rowid, search_text) VALUES ('delete', old.rowid, old.search_text); INSERT INTO observations_fts(rowid, search_text) VALUES (new.rowid, new.search_text); END;
`);
const retrieved = new Date().toISOString();
const url = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_midx?geo=ES';
db.prepare('INSERT INTO source_documents VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)').run('rent-source', 'Eurostat', 'Índice de precios del alquiler en España', url, retrieved, 'primary', '[]', 'eurostat', 'daily');
const insert = db.prepare('INSERT INTO observations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
for (const [year, value] of [[2015, 100], [2020, 110], [2025, 120]]) {
  for (const [code, unit, measured] of [['I96', 'Index, 1996=100', value], ['RCH_A', 'Annual rate of change', 5]]) {
    insert.run(`${code}-${year}`, 'observation', 'rent-data', 'Índice de precios del alquiler', 'rental_price_index', measured, unit, String(year), 'España', null,
      JSON.stringify({ geo: 'ES', unit: code, time: String(year) }), JSON.stringify({ geo: 'Spain', unit }), null, null, '{}', 'rent-source', 'índice precios alquiler España evolución subida tasa interanual');
  }
}
const d1 = { prepare(sql) { let values = []; return { bind(...args) { values = args; return this; }, async all() { const rows = db.prepare(sql).all(...values); if (process.env.DEBUG_STATISTICAL_FIXTURE) console.error('D1 rows', rows.length, values); return { results: rows }; }, async run() { return {}; } }; } };
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
child.stderr.on('data', (chunk) => { logs += chunk.toString(); });
const pending = [];
const env = { DB: d1, LOCAL_CLASSIFIER_ENDPOINT: `http://127.0.0.1:${port}`, LOCAL_CLASSIFIER_TOKEN: 'fixture' };
const context = (request) => ({ request, env, waitUntil: (promise) => pending.push(promise) });
const nativeFetch = globalThis.fetch;
if (process.env.DEBUG_STATISTICAL_FIXTURE) globalThis.fetch = async (...args) => {
  const response = await nativeFetch(...args);
  if (String(args[0]).includes('/v1/classify')) console.error('resolver', String(args[0]), await response.clone().text());
  return response;
};
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Resolver did not start: ${logs.slice(-1000)}`)), 20000);
    child.once('error', reject);
    child.once('exit', (code) => reject(new Error(`Resolver exited ${code}: ${logs.slice(-1000)}`)));
    child.stdout.on('data', (chunk) => { if (chunk.toString().includes('Local claim service listening')) { clearTimeout(timer); resolve(); } });
  });
  const check = async (text) => {
    const request = new Request('https://site.test/api/check?fresh=1', { method: 'POST', headers: { 'content-type': 'application/json', 'x-development-no-cache': '1' }, body: JSON.stringify({ text, inputType: 'text' }) });
    let response = await api.onRequestPost(context(request));
    let result = await response.json();
    const deadline = Date.now() + 45000;
    while (result.state === 'processing' && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      response = await api.onRequestGet(context(new Request(`https://site.test/api/check/${result.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ claim: text }) })));
      result = await response.json();
    }
    assert.notEqual(result.state, 'processing', `Timed out: ${text}`);
    return result;
  };
  for (const query of ['¿Cómo ha evolucionado el índice de precios del alquiler desde 2015?', '¿Ha subido el índice del alquiler en España desde 2015?']) {
    const result = await check(query);
    assert.match(result.result.reply, /índice \(1996=100\)/, JSON.stringify(result));
    assert.match(result.result.reply, /2015/);
    assert.match(result.result.reply, /2025/);
    assert.doesNotMatch(result.result.reply, /2015=100|no ha pasado todos los controles/);
    assert.ok(result.result.sources.some((source) => source.url === url));
  }
  const missing = await check('¿Cómo ha cambiado el índice de alquiler desde 2010?');
  assert.equal(missing.state, 'insufficient', JSON.stringify(missing));
  assert.match(missing.result.reply, /no incluye 2010/);
  assert.equal(missing.result.visual, undefined);
  for (const query of ['El índice de precios del alquiler subió un 300 % desde 2015', 'El índice del alquiler ha aumentado en un 300 % desde 2015']) {
    const magnitude = await check(query);
    assert.notEqual(magnitude.state, 'supported', JSON.stringify(magnitude));
    assert.doesNotMatch(magnitude.result.reply, /coincide.*300|confirma.*300/i);
  }
  db.prepare('UPDATE source_documents SET retrieved_at = ? WHERE id = ?').run('2020-01-01T00:00:00Z', 'rent-source');
  const stale = await check('¿Ha cambiado el índice de precios del alquiler en España desde 2015?');
  assert.notEqual(stale.state, 'supported');
  assert.match(stale.result.reply, /no se ha actualizado.*revisiones recientes/);
  db.prepare('UPDATE source_documents SET retrieved_at = ? WHERE id = ?').run(retrieved, 'rent-source');
  db.prepare('UPDATE observations SET value = NULL, payload_json = ? WHERE id = ?').run('{"status":"b"}', 'I96-2020');
  const broken = await check('¿Cómo han evolucionado los precios del alquiler desde 2015?');
  assert.equal(broken.state, 'insufficient', JSON.stringify(broken));
  assert.match(broken.result.reply, /ruptura de serie en 2020/);
  assert.equal(broken.result.visual, undefined);
  assert.doesNotMatch(logs, /invalid publishedAt/);
  for (let index = 0; index < 600; index += 1) {
    insert.run(`noise-${index}`, 'observation', 'rent-data', 'Índice de precios del alquiler', 'rental_price_index', 130, 'Index, 1996=100', '2025', 'España', null,
      JSON.stringify({ geo: 'ES', unit: `NOISE${index}`, time: '2025' }), '{}', null, null, '{}', 'rent-source', 'índice precios alquiler España evolución subida tasa interanual');
  }
  const baselineRows = await searchD1Warehouse(d1, '¿Cómo ha evolucionado el índice de precios del alquiler desde 2015?');
  assert.ok(baselineRows.some((row) => row.id === 'I96-2015'), 'A crowded search must retain observations from the requested baseline year');
  assert.ok(baselineRows.some((row) => row.id === 'I96-2020' && row.status === 'b'), 'A crowded historical search must retain a break between the endpoints');
  assert.ok(baselineRows.length <= 500, 'Historical retrieval must respect the public payload cap');
  await Promise.allSettled(pending);
} finally {
  globalThis.fetch = nativeFetch;
  child.kill('SIGTERM');
  await Promise.race([once(child, 'exit').catch(() => {}), new Promise((resolve) => setTimeout(resolve, 2000))]);
  if (child.exitCode === null) child.kill('SIGKILL');
  db.close();
}
console.log('Statistical answer runtime passed: public API, nullable dates, units, requested years and missing-cell break flags.');
