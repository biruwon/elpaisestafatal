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
  const refreshPath = join(dir, 'refresh.json');
  const recordsDir = join(dir, 'records');
  await mkdir(recordsDir, { recursive: true });
  await writeFile(join(recordsDir, 'government-revenue.json'), JSON.stringify({ source: { metricId: 'government_revenue_ratio', recordCount: 1, retrievedAt: new Date().toISOString(), publisher: 'fixture', role: 'primary' } }));
  const vacancyMetricMap = { indic_em: {
    JOBVAC: 'job_vacancy_count',
    JOBOCC: 'occupied_job_post_count',
    JVR: 'job_vacancy_rate',
    JVRCH_Q: 'job_vacancy_rate_quarterly_change',
  } };
  const vacancyUrl = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/jvs_q_r21?geo=ES&sinceTimePeriod=2015&nace_r2_1=B-T&sizeclas=TOTAL&s_adj=NSA';
  const vacancySource = { metricId: 'job_vacancy_rate', metricIdByDimension: vacancyMetricMap, recordCount: 4, retrievedAt: new Date().toISOString(), publisher: 'Eurostat', role: 'primary', schedule: 'daily', url: vacancyUrl };
  await writeFile(join(recordsDir, 'vacancies.json'), JSON.stringify({
    source: vacancySource,
    records: [
      { id: 'vacancy-count', metricId: 'job_vacancy_count', period: '2025-Q4', value: 154247 },
      { id: 'occupied-posts', metricId: 'occupied_job_post_count', period: '2025-Q4', value: 17106029 },
      { id: 'vacancy-rate', metricId: 'job_vacancy_rate', period: '2025-Q4', value: 0.9 },
      { id: 'vacancy-rate-change', metricId: 'job_vacancy_rate_quarterly_change', period: '2025-Q4', value: 0 },
    ],
  }));
  await writeFile(refreshPath, JSON.stringify({ eurostat: [
    { url: 'https://example.org/government-revenue?geo=ES', metricId: 'government_revenue_ratio' },
    { url: vacancyUrl, metricId: 'job_vacancy_rate', metricIdByDimension: vacancyMetricMap },
  ] }));
  await writeFile(clustersPath, JSON.stringify(clusters));
  await writeFile(researchPath, JSON.stringify({ results: [
    { id: 'cluster:llm-candidate', status: 'covered_by_llm', source: { title: 'Employment statistics', publisher: 'Fixture office', url: 'https://example.org/employment' } },
    { id: 'cluster:llm-candidate', status: 'partially_covered_by_llm', source: { title: 'Labour survey', publisher: 'Fixture office', url: 'https://example.org/labour-survey' } },
    { id: 'cluster:llm-no-match', status: 'unsupported_after_llm_review', source: { title: 'Youth labour statistics', publisher: 'Fixture office', url: 'https://example.org/youth-labour' } },
  ] }));
  await run(process.execPath, ['scripts/knowledge/audit-coverage.mjs', '--clusters', clustersPath, '--records', recordsDir, '--llm-research', researchPath, '--refresh', refreshPath, '--output', auditPath], { cwd: root });
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
  const vacancyMetrics = ['job_vacancy_count', 'occupied_job_post_count', 'job_vacancy_rate', 'job_vacancy_rate_quarterly_change'];
  for (const metricId of vacancyMetrics) {
    const metric = audit.metrics.find((item) => item.id === metricId);
    if (metric?.configuredFeedCount !== 1 || metric.materializedRecordCount !== 1 || metric.status !== 'ready') {
      throw new Error(`${metricId}: dimension-mapped source was not counted as configured and materialized (${JSON.stringify(metric)})`);
    }
  }
  const vacancyFeed = audit.feeds.find((feed) => feed.url === vacancyUrl);
  if (vacancyFeed?.metricIds?.length !== 4 || vacancyMetrics.some((metricId) => !vacancyFeed.metricIds.includes(metricId))) {
    throw new Error('dimension-mapped feed inventory did not show every indicator family');
  }
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
