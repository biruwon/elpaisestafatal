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
  assert.deepEqual(manifest.metricIds, [...new Set(record.records.map((item) => item.metricId).filter(Boolean))], 'The source manifest must index every metric in its domain payload');
  const htmlMock = join(root, 'dynamic-html-fetch.mjs');
  await writeFile(htmlMock, `
    const archive = '<a href="https://revista.seg-social.es/-/afiliacion-extranjeros-octubre-2026">Afiliados extranjeros, octubre 2026</a><p>13/11/2026</p>';
    const article = '<p>Los trabajadores extranjeros destacan en sectores del Régimen General de la Seguridad Social.</p><p>En Hostelería suponen el 33,5% de los afiliados; en Agricultura, el 29,1%; en Construcción, el 28,9%.</p><p>Los Sistemas Especiales representan el 42,7% del Sistema Especial de Trabajadores Agrarios.</p><span data-cache="' + process.env.FIXTURE_MARKER + '"></span>';
    globalThis.fetch = async (url) => new Response(String(url).includes('tag-search') ? archive : article, { headers: { 'content-type': 'text/html' } });
  `);
  const foreignArgs = ['--import', htmlMock, 'scripts/knowledge/ingest-domain-source.mjs', '--domain', 'foreign_affiliation', '--url', 'https://revista.seg-social.es/tag-search?p_r_p_tag=afiliaci%C3%B3n%20de%20extranjeros', '--title', 'Foreign affiliation fixture'];
  await execute(process.execPath, foreignArgs, { env: { ...env, FIXTURE_MARKER: 'first' } });
  const manifests = await Promise.all((await readdir(join(root, 'manifests'))).map(async (file) => ({ path: join(root, 'manifests', file), manifest: JSON.parse(await readFile(join(root, 'manifests', file), 'utf8')) })));
  const foreignBefore = manifests.find(({ manifest: item }) => item.domain === 'foreign_affiliation');
  assert.ok(foreignBefore, 'Dynamic HTML source should be ingested into the domain warehouse');
  assert.equal(foreignBefore.manifest.publishedAt, '2026-11-13');
  const foreignOriginalHash = foreignBefore.manifest.sha256;
  await execute(process.execPath, foreignArgs, { env: { ...env, FIXTURE_MARKER: 'changed-page-shell' } });
  const afterFiles = await readdir(join(root, 'manifests'));
  const afterManifests = await Promise.all(afterFiles.map(async (file) => JSON.parse(await readFile(join(root, 'manifests', file), 'utf8'))));
  const foreignAfter = afterManifests.filter((item) => item.domain === 'foreign_affiliation');
  assert.equal(foreignAfter.length, 1, 'Changing page shell must update one source version instead of duplicating observations');
  assert.equal(foreignAfter[0].id, foreignBefore.manifest.id, 'A content-shell change must preserve the semantic source identity');
  assert.notEqual(foreignAfter[0].sha256, foreignOriginalHash, 'The raw content checksum must still track page changes');
  const foreignRecord = JSON.parse(await readFile(foreignAfter[0].recordPath, 'utf8'));
  assert.deepEqual(foreignRecord.records.map((item) => item.value), [33.5, 29.1, 42.7]);
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
