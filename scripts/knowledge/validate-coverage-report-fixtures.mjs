import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('../../', import.meta.url).pathname;
const fixtureRoot = await mkdtemp(join(tmpdir(), 'coverage-report-fixtures-'));
const reportPath = join(fixtureRoot, 'coverage-report.json');
const warehousePath = join(fixtureRoot, 'records');
const report = {
  generatedAt: '2026-01-01T00:00:00.000Z',
  summary: { metrics: 2, fedMetrics: 2, comparativeMetrics: 0, ontologyOnlyMetrics: 0 },
  metrics: [
    { id: 'fixture_one', status: 'fed', aliasCount: 1, sourceCount: 1, hasNationalFeed: true, hasEuropeVariant: false },
    { id: 'fixture_two', status: 'fed', aliasCount: 1, sourceCount: 1, hasNationalFeed: true, hasEuropeVariant: false },
  ],
  feeds: [],
};

const run = ({ strict = false, expectSuccess, label }) => {
  const result = spawnSync(process.execPath, [
    join(root, 'scripts/knowledge/validate-coverage-report.mjs'),
    ...(strict ? ['--require-materialized'] : []),
  ], {
    cwd: root,
    env: { ...process.env, COVERAGE_REPORT_INPUT: reportPath, COVERAGE_WAREHOUSE_DIR: warehousePath },
    encoding: 'utf8',
  });
  if ((result.status === 0) !== expectSuccess) {
    throw new Error(`${label} returned ${result.status}\n${result.stdout}${result.stderr}`);
  }
};

const record = (metricId) => ({
  source: { metricId, recordCount: 1, retrievedAt: '2026-01-01T00:00:00.000Z', publisher: 'Fixture publisher' },
  records: [{ id: `${metricId}-record`, metricId, value: 1 }],
});

try {
  await writeFile(reportPath, JSON.stringify(report));
  run({ expectSuccess: true, label: 'absent warehouse structural validation' });

  await mkdir(warehousePath);
  await writeFile(join(warehousePath, 'one.json'), JSON.stringify(record('fixture_one')));
  run({ expectSuccess: true, label: 'partial warehouse structural validation' });
  run({ strict: true, expectSuccess: false, label: 'partial warehouse materialized validation' });

  await writeFile(join(warehousePath, 'invalid.json'), '{');
  run({ expectSuccess: false, label: 'invalid warehouse structural validation' });
  await rm(join(warehousePath, 'invalid.json'));

  await writeFile(join(warehousePath, 'two.json'), JSON.stringify(record('fixture_two')));
  run({ strict: true, expectSuccess: true, label: 'complete warehouse materialized validation' });
} finally {
  await rm(fixtureRoot, { recursive: true, force: true });
}

console.log('Coverage report fixtures passed: absent, partial, invalid, and complete warehouses behave as intended.');
