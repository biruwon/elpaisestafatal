import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { coalesceObservationInserts, parseD1CompletedSourceSnapshots, skipUnchangedSourceData, warehouseImportBatches, warehouseSnapshotHash, warehouseSourceMarker } from './warehouse-import.mjs';
import { warehouseUpsert } from './warehouse-upsert.mjs';

const database = new DatabaseSync(':memory:');
database.exec('PRAGMA foreign_keys = ON; CREATE TABLE source_documents (id TEXT PRIMARY KEY);');
database.exec(await readFile(new URL('../../migrations/0011_warehouse_source_imports.sql', import.meta.url), 'utf8'));
database.exec('CREATE TABLE observations (id TEXT PRIMARY KEY, value TEXT);');
database.prepare("INSERT INTO source_documents (id) VALUES ('source-ready')").run();
database.prepare("INSERT INTO warehouse_source_imports (source_id, sha256, status, updated_at) VALUES ('source-ready', 'ready-hash', 'in_progress', '2026-01-01T00:00:00Z')").run();
database.prepare("UPDATE warehouse_source_imports SET status = 'complete' WHERE source_id = 'source-ready'").run();
assert.equal(database.prepare("SELECT status FROM warehouse_source_imports WHERE source_id = 'source-ready'").get().status, 'complete', 'Checkpoint migration must support completed source snapshots');
async function* statements() {
  yield '/* warehouse header */';
  for (let index = 0; index < 2000; index += 1) yield warehouseUpsert({
    table: 'observations', columns: ['id', 'value'],
    values: [`'row-${index}'`, `'value, with apostrophe: '' ${index}'`],
    updateColumns: ['value'],
  });
}
let batches = 0, statementsCount = 0;
for await (const chunk of warehouseImportBatches(coalesceObservationInserts(statements()), { maxStatements: 2, maxBytes: 100_000 })) {
  assert.ok(Buffer.byteLength(chunk.join('\n')) <= 100_000);
  for (const statement of chunk) { assert.ok(Buffer.byteLength(statement) < 100_000); database.exec(statement); statementsCount += 1; }
  batches += 1;
}
assert.ok(statementsCount < 20, 'Observation inserts should be grouped into bounded SQL statements');
assert.equal(database.prepare('SELECT COUNT(*) AS n FROM observations').get().n, 2000);
assert.equal(database.prepare("SELECT value FROM observations WHERE id = 'row-1999'").get().value, "value, with apostrophe: ' 1999");
const changesBeforeRepeat = database.prepare('SELECT total_changes() AS n').get().n;
for await (const chunk of warehouseImportBatches(coalesceObservationInserts(statements()))) for (const statement of chunk) database.exec(statement);
assert.equal(database.prepare('SELECT COUNT(*) AS n FROM observations').get().n, 2000, 'Imports must be idempotent');
assert.equal(database.prepare('SELECT total_changes() AS n').get().n, changesBeforeRepeat, 'Repeated identical observations must not consume D1 row writes');
database.exec(warehouseUpsert({ table: 'observations', columns: ['id', 'value'], values: ["'row-1999'", "'revised value'"], updateColumns: ['value'] }));
assert.equal(database.prepare("SELECT value FROM observations WHERE id = 'row-1999'").get().value, 'revised value', 'Changed observations must still update');
const d1SourceState = parseD1CompletedSourceSnapshots(JSON.stringify([{ results: [
  { id: 'source-legacy', source_sha256: 'legacy-hash', imported_sha256: null, import_status: null },
  { id: 'source-ready', source_sha256: 'ready-hash', imported_sha256: 'ready-hash', import_status: 'complete' },
  { id: 'source-partial', source_sha256: 'partial-hash', imported_sha256: 'partial-hash', import_status: 'in_progress' },
  { id: 'source-changed', source_sha256: 'new-hash', imported_sha256: 'old-hash', import_status: 'complete' },
] }]));
assert.deepEqual([...d1SourceState], [JSON.stringify(['source-legacy', 'legacy-hash']), JSON.stringify(['source-ready', 'ready-hash'])], 'Only legacy or explicitly completed matching snapshots should be skipped');
const mappedParserVersion = 'json-stat-v1+metric-map-abcdef012345';
const mappedImportHash = warehouseSnapshotHash('mapping-source-hash', mappedParserVersion);
assert.notEqual(mappedImportHash, 'mapping-source-hash', 'A changed dimension-to-metric contract must change the warehouse import version');
const mappedSourceState = parseD1CompletedSourceSnapshots(JSON.stringify([{ results: [
  { id: 'source-needs-remap', source_sha256: 'mapping-source-hash', parser_version: mappedParserVersion, imported_sha256: 'mapping-source-hash', import_status: 'complete' },
  { id: 'source-remapped', source_sha256: 'mapping-source-hash', parser_version: mappedParserVersion, imported_sha256: mappedImportHash, import_status: 'complete' },
] }]));
assert.deepEqual([...mappedSourceState], [JSON.stringify(['source-remapped', mappedImportHash])], 'A completed raw import with stale indicator mapping must be reprocessed');
await assert.rejects(async () => parseD1CompletedSourceSnapshots('not json'));
await assert.rejects(async () => parseD1CompletedSourceSnapshots('[]'));
await assert.rejects(async () => parseD1CompletedSourceSnapshots('[{"success":true}]'));
await assert.rejects(async () => parseD1CompletedSourceSnapshots('[{"success":false,"results":[]}]'));
const sourceLines = [
  "INSERT INTO source_documents (id) VALUES ('source-ready');",
  warehouseSourceMarker('data', 'source-ready', 'ready-hash'),
  "INSERT INTO warehouse_source_imports (source_id, status) VALUES ('source-ready', 'in_progress');",
  "INSERT INTO observations (id, value) VALUES ('old-row', 'unchanged');",
  "INSERT INTO warehouse_source_imports (source_id, status) VALUES ('source-ready', 'complete');",
  warehouseSourceMarker('end', 'source-ready', 'ready-hash'),
  "INSERT INTO source_documents (id) VALUES ('source-new');",
  warehouseSourceMarker('data', 'source-new', 'new-hash'),
  "INSERT INTO observations (id, value) VALUES ('new-row', 'value');",
  warehouseSourceMarker('end', 'source-new', 'new-hash'),
  "INSERT INTO source_documents (id) VALUES ('source-changed');",
  warehouseSourceMarker('data', 'source-changed', 'new-hash'),
  "INSERT INTO observations (id, value) VALUES ('changed-row', 'new snapshot');",
  warehouseSourceMarker('end', 'source-changed', 'new-hash'),
];
const skippedSources = new Set();
const filteredSourceLines = [];
for await (const line of skipUnchangedSourceData(sourceLines, d1SourceState, skippedSources)) filteredSourceLines.push(line);
assert.deepEqual(filteredSourceLines, [
  "INSERT INTO source_documents (id) VALUES ('source-ready');",
  "INSERT INTO source_documents (id) VALUES ('source-new');",
  "INSERT INTO observations (id, value) VALUES ('new-row', 'value');",
  "INSERT INTO source_documents (id) VALUES ('source-changed');",
  "INSERT INTO observations (id, value) VALUES ('changed-row', 'new snapshot');",
], 'Only observation batches for already completed source snapshots should be skipped');
assert.deepEqual([...skippedSources], ['source-ready']);
await assert.rejects(async () => { for await (const _ of skipUnchangedSourceData([warehouseSourceMarker('data', 'unfinished', 'hash')], new Set())) void _; }, /Unclosed warehouse source block/);
await assert.rejects(async () => { for await (const _ of warehouseImportBatches(['x'.repeat(100_001)])) void _; });
database.close();

// Exercise the real exporter and loader filter together against a temporary
// source manifest, including a changed snapshot with a stable source ID.
const fixtureRoot = await mkdtemp(join(tmpdir(), 'warehouse-export-fixture-'));
try {
  await mkdir(join(fixtureRoot, 'manifests'));
  await mkdir(join(fixtureRoot, 'records'));
  const fixtureDate = '2026-11-16T00:00:00.000Z';
  const fixtureManifestPath = join(fixtureRoot, 'manifests', 'fixture.json');
  const fixtureRecordPath = join(fixtureRoot, 'records', 'fixture.json');
  const fixtureManifest = {
    id: 'fixture-source', url: 'https://data.example/fixture', sha256: 'fixture-hash-v1', retrievedAt: fixtureDate,
    publisher: 'Fixture office', title: 'Fixture data', contentType: 'application/json', metricId: 'fixture_metric',
    sourceRegistryId: 'fixture', connector: 'fixture-v1', parserVersion: 'fixture-v1', trust: 'primary', recordPath: fixtureRecordPath,
  };
  const writeFixtureRecord = async (value, metricId = 'fixture_metric') => writeFile(fixtureRecordPath, JSON.stringify({
    source: { publisher: 'Fixture office', sourceRegistryId: 'fixture' },
    records: [{ id: 'fixture-row', value, metric: 'Fixture metric', metricId, period: '2025', unit: 'people', datasetId: 'fixture-series', dimensions: { indic_em: metricId === 'fixture_rate' ? 'JVR' : 'JOBVAC' } }],
  }));
  await writeFixtureRecord(2);
  await writeFile(fixtureManifestPath, JSON.stringify(fixtureManifest));

  const exporterPath = new URL('./export-warehouse-sql.mjs', import.meta.url).pathname;
  const fixtureRepoRoot = new URL('../../', import.meta.url).pathname;
  const exportFixture = async () => {
    const result = spawnSync(process.execPath, [exporterPath], {
      cwd: fixtureRepoRoot, env: { ...process.env, SOURCE_WAREHOUSE_ROOT: fixtureRoot }, encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return readFile(join(fixtureRoot, 'warehouse-load.sql'), 'utf8');
  };

  const exportDatabase = new DatabaseSync(':memory:');
  exportDatabase.exec(`
    CREATE TABLE source_documents (id TEXT PRIMARY KEY, publisher TEXT NOT NULL, title TEXT NOT NULL, aliases_json TEXT NOT NULL, source_registry_id TEXT, schedule TEXT, url TEXT NOT NULL, content_type TEXT NOT NULL, published_at TEXT, retrieved_at TEXT NOT NULL, sha256 TEXT NOT NULL, trust_tier TEXT NOT NULL, parser_version TEXT);
    CREATE TABLE datasets (id TEXT PRIMARY KEY, source_document_id TEXT, title TEXT, metric TEXT, unit TEXT, geography TEXT, population TEXT, period_start TEXT, period_end TEXT, definition TEXT);
    CREATE TABLE observations (id TEXT PRIMARY KEY, dataset_id TEXT, source_document_id TEXT, metric TEXT, metric_id TEXT, value REAL, unit TEXT, period TEXT, geography TEXT, population TEXT, dimensions_json TEXT, dimension_labels_json TEXT, kind TEXT, url TEXT, excerpt TEXT, search_text TEXT, payload_json TEXT);
  `);
  exportDatabase.exec(await readFile(new URL('../../migrations/0011_warehouse_source_imports.sql', import.meta.url), 'utf8'));
  const applyThroughLoader = async (sql) => {
    const stateRows = exportDatabase.prepare('SELECT sd.id, sd.sha256 AS source_sha256, sd.parser_version, wsi.sha256 AS imported_sha256, wsi.status AS import_status FROM source_documents sd LEFT JOIN warehouse_source_imports wsi ON wsi.source_id = sd.id').all();
    const completed = parseD1CompletedSourceSnapshots(JSON.stringify([{ results: stateRows }]));
    const filtered = skipUnchangedSourceData(sql.split(/\r?\n/), completed);
    const statements = [];
    for await (const statement of coalesceObservationInserts(filtered)) statements.push(statement);
    exportDatabase.exec(statements.join('\n'));
  };

  const firstSql = await exportFixture();
  assert.match(firstSql, /'in_progress'/);
  assert.match(firstSql, /'complete'/);
  exportDatabase.exec(firstSql);
  assert.equal(exportDatabase.prepare("SELECT status FROM warehouse_source_imports WHERE source_id = 'fixture-source'").get().status, 'complete');
  assert.equal(exportDatabase.prepare("SELECT value FROM observations WHERE id = 'fixture-row'").get().value, 2);
  const changesBeforeRepeat = exportDatabase.prepare('SELECT total_changes() AS n').get().n;
  await applyThroughLoader(firstSql);
  assert.equal(exportDatabase.prepare('SELECT total_changes() AS n').get().n, changesBeforeRepeat, 'The production filter must skip completed unchanged snapshots');

  fixtureManifest.metricIdByDimension = { indic_em: { JVR: 'fixture_rate' } };
  fixtureManifest.parserVersion = 'json-stat-v1+metric-map-abcdef012345';
  await writeFixtureRecord(0.9, 'fixture_rate');
  await writeFile(fixtureManifestPath, JSON.stringify(fixtureManifest));
  await applyThroughLoader(await exportFixture());
  assert.equal(exportDatabase.prepare("SELECT metric_id FROM observations WHERE id = 'fixture-row'").get().metric_id, 'fixture_rate', 'A dimension mapping change with an unchanged source hash must reclassify existing observations');
  const changesAfterRemap = exportDatabase.prepare('SELECT total_changes() AS n').get().n;
  await applyThroughLoader(await exportFixture());
  assert.equal(exportDatabase.prepare('SELECT total_changes() AS n').get().n, changesAfterRemap, 'The remapped source should skip no-op writes on subsequent imports');

  fixtureManifest.sha256 = 'fixture-hash-v2';
  await writeFixtureRecord(3, 'fixture_rate');
  await writeFile(fixtureManifestPath, JSON.stringify(fixtureManifest));
  await applyThroughLoader(await exportFixture());
  assert.equal(exportDatabase.prepare("SELECT value FROM observations WHERE id = 'fixture-row'").get().value, 3, 'A changed snapshot with a stable ID must update its observation');
  assert.equal(exportDatabase.prepare("SELECT status FROM warehouse_source_imports WHERE source_id = 'fixture-source'").get().status, 'complete');
  exportDatabase.close();
} finally {
  await rm(fixtureRoot, { recursive: true, force: true });
}
console.log(`Warehouse import passed: 2,000 records, no-op writes skipped, changed rows updated, quoted values, bounded statements and ${batches} streaming batches.`);
