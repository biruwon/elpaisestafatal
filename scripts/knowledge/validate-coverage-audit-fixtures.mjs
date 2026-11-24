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
    { id: 'scorecard', text: 'España destruida', count: 8, sourceIds: [], coverageStatus: 'partial' },
    { id: 'named-scorecard', text: 'Sánchez está hundiendo España', count: 8, sourceIds: [], coverageStatus: 'partial' },
    { id: 'positive-scorecard', text: 'España está mejorando', count: 8, sourceIds: [], coverageStatus: 'partial' },
    { id: 'local', text: 'en mi barrio ha subido la inseguridad este mes', count: 8, sourceIds: ['source-direct'], coverageStatus: 'uncovered' },
    { id: 'housing', text: 'espanoles deberian tener prioridad ayudas', count: 8, sourceIds: ['source-direct'], coverageStatus: 'uncovered' },
    { id: 'llm-candidate', text: 'el empleo sube en toda España', count: 8, sourceIds: [], coverageStatus: 'uncovered' },
    { id: 'llm-no-match', text: 'el desempleo juvenil se ha duplicado', count: 8, sourceIds: [], coverageStatus: 'uncovered' },
    { id: 'broken', text: 'Audio transcription is not available', count: 8, sourceIds: [], coverageStatus: 'uncovered', reviewable: false },
  ] };
  const clustersPath = join(dir, 'clusters.json');
  const auditPath = join(dir, 'audit.json');
  const promotedPath = join(dir, 'promoted.json');
  const promotedAgainPath = join(dir, 'promoted-again.json');
  const researchPath = join(dir, 'research.json');
  const recordsDir = join(dir, 'records');
  await mkdir(recordsDir, { recursive: true });
  await writeFile(join(recordsDir, 'government-revenue.json'), JSON.stringify({ source: { metricId: 'government_revenue_ratio', recordCount: 1, retrievedAt: new Date().toISOString(), publisher: 'fixture', role: 'primary' } }));
  await writeFile(clustersPath, JSON.stringify(clusters));
  await writeFile(researchPath, JSON.stringify({ results: [
    { id: 'cluster:llm-candidate', status: 'covered_by_llm', source: { title: 'Employment statistics', publisher: 'Fixture office', url: 'https://example.org/employment' } },
    { id: 'cluster:llm-candidate', status: 'partially_covered_by_llm', source: { title: 'Labour survey', publisher: 'Fixture office', url: 'https://example.org/labour-survey' } },
    { id: 'cluster:llm-no-match', status: 'unsupported_after_llm_review', source: { title: 'Youth labour statistics', publisher: 'Fixture office', url: 'https://example.org/youth-labour' } },
  ] }));
  await run(process.execPath, ['scripts/knowledge/audit-coverage.mjs', '--clusters', clustersPath, '--records', recordsDir, '--llm-research', researchPath, '--output', auditPath], { cwd: root });
  const audit = JSON.parse(await readFile(auditPath, 'utf8'));
  const classes = new Map(audit.clusters.map((item) => [item.clusterId, item.auditClass]));
  if (classes.get('metric') !== 'covered_existing_evidence') throw new Error(`existing metric was not promoted: ${classes.get('metric')}`);
  if (classes.get('scorecard') !== 'covered_existing_evidence') throw new Error(`broad scorecard was not recognized: ${classes.get('scorecard')}`);
  if (classes.get('named-scorecard') !== 'covered_existing_evidence') throw new Error(`named broad scorecard was not recognized: ${classes.get('named-scorecard')}`);
  if (classes.get('positive-scorecard') !== 'covered_existing_evidence') throw new Error(`positive broad scorecard was not recognized: ${classes.get('positive-scorecard')}`);
  if (classes.get('local') !== 'unsupported_scope') throw new Error(`local claim was not scoped: ${classes.get('local')}`);
  if (classes.get('housing') !== 'partial_domain_evidence') throw new Error(`partial domain was not preserved: ${classes.get('housing')}`);
  if (classes.get('llm-candidate') !== 'source_assessment_review_required') throw new Error(`model suggestion was treated as evidence: ${classes.get('llm-candidate')}`);
  const llmCandidate = audit.clusters.find((item) => item.clusterId === 'llm-candidate');
  if (llmCandidate.action !== 'review_source_candidate' || audit.sourceWorkItems.some((item) => item.clusterId === 'llm-candidate') === false) throw new Error('model suggestion did not enter the private review queue');
  if (llmCandidate.reviewSources?.length !== 2 || !llmCandidate.reviewSources.some((source) => source.url === 'https://example.org/employment') || !llmCandidate.reviewSources.some((source) => source.url === 'https://example.org/labour-survey')) throw new Error('all model source leads were not preserved for review');
  const llmNoMatch = audit.clusters.find((item) => item.clusterId === 'llm-no-match');
  if (llmNoMatch.auditClass !== 'source_assessment_review_required' || /suggested a possible source match/i.test(audit.sourceWorkItems.find((item) => item.clusterId === 'llm-no-match')?.reason || '')) throw new Error('a negative model assessment was treated as a coverage decision');
  if (classes.get('broken') !== 'operational_failure') throw new Error(`operational failure was treated as evidence: ${classes.get('broken')}`);
  await run(process.execPath, ['scripts/knowledge/promote-existing-coverage.mjs', '--audit', auditPath, '--clusters', clustersPath, '--output', promotedPath], { cwd: root });
  const promoted = JSON.parse(await readFile(promotedPath, 'utf8'));
  if (promoted.clusters.filter((item) => item.newlyCovered).length !== 4) throw new Error('promotion did not produce exactly four existing-evidence promotions');
  await run(process.execPath, ['scripts/knowledge/promote-existing-coverage.mjs', '--audit', auditPath, '--clusters', promotedPath, '--output', promotedAgainPath], { cwd: root });
  const promotedAgain = JSON.parse(await readFile(promotedAgainPath, 'utf8'));
  if (JSON.stringify(promoted.clusters) !== JSON.stringify(promotedAgain.clusters)) throw new Error('promotion is not idempotent');
  console.log('Coverage audit fixtures passed: reviewed evidence promotes, model suggestions stay in source review, scoped gaps remain gated, and operational failures stay separate.');
} finally {
  await rm(dir, { recursive: true, force: true });
}
