import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { coalesceObservationInserts, warehouseImportBatches } from './warehouse-import.mjs';
import { warehouseUpsert } from './warehouse-upsert.mjs';

const database = new DatabaseSync(':memory:');
database.exec('CREATE TABLE observations (id TEXT PRIMARY KEY, value TEXT);');
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
await assert.rejects(async () => { for await (const _ of warehouseImportBatches(['x'.repeat(100_001)])) void _; });
database.close();
console.log(`Warehouse import passed: 2,000 records, no-op writes skipped, changed rows updated, quoted values, bounded statements and ${batches} streaming batches.`);
