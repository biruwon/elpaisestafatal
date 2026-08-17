import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = new URL('../../', import.meta.url).pathname;
const dir = await mkdtemp(join(tmpdir(), 'coverage-audit-'));
try {
  const clusters = { clusters: [
    { id: 'metric', text: 'ingresos publicos porcentaje pib', count: 8, sourceIds: ['source-direct'], coverageStatus: 'uncovered' },
    { id: 'local', text: 'en mi barrio ha subido la inseguridad este mes', count: 8, sourceIds: ['source-direct'], coverageStatus: 'uncovered' },
    { id: 'housing', text: 'espanoles deberian tener prioridad ayudas', count: 8, sourceIds: ['source-direct'], coverageStatus: 'uncovered' },
    { id: 'broken', text: 'Audio transcription is not available', count: 8, sourceIds: [], coverageStatus: 'uncovered', reviewable: false },
  ] };
  const clustersPath = join(dir, 'clusters.json');
  const auditPath = join(dir, 'audit.json');
  const promotedPath = join(dir, 'promoted.json');
  const promotedAgainPath = join(dir, 'promoted-again.json');
  const recordsDir = join(dir, 'records');
  await mkdir(recordsDir, { recursive: true });
  await writeFile(join(recordsDir, 'government-revenue.json'), JSON.stringify({ source: { metricId: 'government_revenue_ratio', recordCount: 1, retrievedAt: new Date().toISOString(), publisher: 'fixture', role: 'primary' } }));
  await writeFile(clustersPath, JSON.stringify(clusters));
  await run(process.execPath, ['scripts/knowledge/audit-coverage.mjs', '--clusters', clustersPath, '--records', recordsDir, '--output', auditPath], { cwd: root });
  const audit = JSON.parse(await readFile(auditPath, 'utf8'));
  const classes = new Map(audit.clusters.map((item) => [item.clusterId, item.auditClass]));
  if (classes.get('metric') !== 'covered_existing_evidence') throw new Error(`existing metric was not promoted: ${classes.get('metric')}`);
  if (classes.get('local') !== 'unsupported_scope') throw new Error(`local claim was not scoped: ${classes.get('local')}`);
  if (classes.get('housing') !== 'partial_domain_evidence') throw new Error(`partial domain was not preserved: ${classes.get('housing')}`);
  if (classes.get('broken') !== 'operational_failure') throw new Error(`operational failure was treated as evidence: ${classes.get('broken')}`);
  await run(process.execPath, ['scripts/knowledge/promote-existing-coverage.mjs', '--audit', auditPath, '--clusters', clustersPath, '--output', promotedPath], { cwd: root });
  const promoted = JSON.parse(await readFile(promotedPath, 'utf8'));
  if (promoted.clusters.filter((item) => item.newlyCovered).length !== 1) throw new Error('promotion did not produce exactly one existing-evidence promotion');
  await run(process.execPath, ['scripts/knowledge/promote-existing-coverage.mjs', '--audit', auditPath, '--clusters', promotedPath, '--output', promotedAgainPath], { cwd: root });
  const promotedAgain = JSON.parse(await readFile(promotedAgainPath, 'utf8'));
  if (JSON.stringify(promoted.clusters) !== JSON.stringify(promotedAgain.clusters)) throw new Error('promotion is not idempotent');
  console.log('Coverage audit fixtures passed: existing evidence promotes, scoped and partial gaps remain gated, and operational failures stay separate.');
} finally {
  await rm(dir, { recursive: true, force: true });
}
