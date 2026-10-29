import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const root = await mkdtemp(join(tmpdir(), 'evidence-mirror-'));
try {
  const mock = join(root, 'fetch.mjs');
  await writeFile(mock, `globalThis.fetch = async () => new Response('period;territorio;grupo;beneficiarios\\n2025;España;total;100', {headers: {'content-type': 'text/csv'}});`);
  const env = { ...process.env, SOURCE_WAREHOUSE_ROOT: root };
  await execute(process.execPath, ['--import', mock, 'scripts/knowledge/ingest-domain-source.mjs', '--domain', 'immigration_benefits', '--url', 'https://www.ine.es/fixture.csv', '--title', 'Fixture official programme'], { env });
  const files = await readdir(join(root, 'manifests'));
  assert.equal(files.length, 1);
  const manifest = JSON.parse(await readFile(join(root, 'manifests', files[0]), 'utf8'));
  const record = JSON.parse(await readFile(manifest.recordPath, 'utf8'));
  assert.equal(record.records[0].value, 100);
  assert.equal(manifest.trust, 'approved-domain');
  // Model a projection/budget row: its type, comparison population and legal
  // stage must survive the SQL mirror rather than becoming an observed value.
  record.records[0].dataKind = 'projected';
  record.records[0].periodType = 'projection';
  record.records[0].comparison = { denominator: 'population of the same age' };
  record.records[0].stage = 'budget';
  await writeFile(manifest.recordPath, JSON.stringify(record));
  await execute(process.execPath, ['scripts/knowledge/export-warehouse-sql.mjs'], { env });
  const sql = await readFile(join(root, 'warehouse-load.sql'), 'utf8');
  assert.ok(sql.includes(manifest.id), 'Domain evidence was omitted from the production export');
  for (const value of ['"dataKind":"projected"', '"periodType":"projection"', '"stage":"budget"', 'population of the same age', '"sourceDomain":"immigration_benefits"']) assert.ok(sql.includes(value), `Dropped evidence scope metadata: ${value}`);
} finally { await rm(root, { recursive: true, force: true }); }
console.log('Domain-to-D1 mirror passed: ingested specialist sources and projection/budget/population metadata survive production export.');
