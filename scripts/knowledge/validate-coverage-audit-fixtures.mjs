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
    { id: 'housing', text: 'las personas extranjeras reciben prioridad en vivienda publica', count: 8, sourceIds: ['source-direct'], coverageStatus: 'uncovered' },
    { id: 'generic-benefit', text: 'han subido las prestaciones sociales en Espana', count: 8, sourceIds: [], coverageStatus: 'uncovered' },
    { id: 'generic-crime', text: 'la delincuencia ha aumentado en Espana', count: 8, sourceIds: [], coverageStatus: 'uncovered' },
    { id: 'generic-priority', text: 'los espanoles deberian tener prioridad en las ayudas', count: 8, sourceIds: [], coverageStatus: 'uncovered' },
    { id: 'immigrant-benefits', text: 'los inmigrantes reciben mas prestaciones', count: 8, sourceIds: [], coverageStatus: 'uncovered' },
    { id: 'foreign-benefits-paraphrase', text: 'las personas extranjeras cobran mas ayudas', count: 8, sourceIds: [], coverageStatus: 'uncovered' },
    { id: 'immigrant-crime', text: 'los inmigrantes cometen mas delitos en Espana', count: 8, sourceIds: [], coverageStatus: 'uncovered' },
    { id: 'foreign-crime-paraphrase', text: 'la tasa de delitos es mayor entre personas extranjeras', count: 8, sourceIds: [], coverageStatus: 'uncovered' },
    { id: 'llm-candidate', text: 'el empleo sube en toda España', count: 8, sourceIds: [], coverageStatus: 'uncovered' },
    { id: 'llm-no-match', text: 'el desempleo juvenil se ha duplicado', count: 8, sourceIds: [], coverageStatus: 'uncovered' },
    { id: 'published-llm', text: 'el empleo crece en toda Espana', count: 8, sourceIds: [], coverageStatus: 'covered', reviewStatus: 'published', linkedClaimSlug: 'employment-growth' },
    { id: 'broken', text: 'Audio transcription is not available', count: 8, sourceIds: [], coverageStatus: 'uncovered', reviewable: false },
  ] };
  const clustersPath = join(dir, 'clusters.json');
  const auditPath = join(dir, 'audit.json');
  const incompleteCompositionAuditPath = join(dir, 'audit-incomplete-composition.json');
  const promotedPath = join(dir, 'promoted.json');
  const promotedAgainPath = join(dir, 'promoted-again.json');
  const researchPath = join(dir, 'research.json');
  const refreshPath = join(dir, 'refresh.json');
  const domainsPath = join(dir, 'domains.json');
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
  const subjectiveComponents = [
    ['DIF', 'subjective_poverty_difficulty_rate', 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ilc_mdes09?geo=ES&lev_diff=DIF'],
    ['GRT', 'subjective_poverty_great_difficulty_rate', 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ilc_mdes09?geo=ES&lev_diff=GRT'],
  ];
  for (const [level, metricId, url] of subjectiveComponents) await writeFile(join(recordsDir, `subjective-${level}.json`), JSON.stringify({
    source: { id: `subjective-${level}`, title: `Eurostat response ${level}`, publisher: 'Eurostat', retrievedAt: new Date().toISOString(), url },
    records: [{ id: `subjective-${level}-2025`, metricId, period: '2025', value: level === 'DIF' ? 12.1 : 8.5 }],
  }));
  const touristFeeds = [
    { id: 'ine-tourist-housing-count', metricId: 'tourist_housing_count', domain: 'tourist_housing', url: 'https://www.ine.es/jaxiT3/files/t/es/csv_bdsc/39364.csv', schedule: 'semiannual', mode: 'active', title: 'INE tourist dwellings count' },
    { id: 'ine-tourist-housing-share', metricId: 'tourist_housing_share', domain: 'tourist_housing', url: 'https://www.ine.es/jaxiT3/files/t/es/csv_bdsc/39365.csv', schedule: 'semiannual', mode: 'active', title: 'INE tourist dwellings share' },
  ];
  await writeFile(domainsPath, JSON.stringify({ feeds: touristFeeds }));
  for (const [index, metricId] of ['tourist_housing_count', 'tourist_housing_share'].entries()) {
    const feed = touristFeeds[index];
    await writeFile(join(recordsDir, `tourist-${index}.json`), JSON.stringify({
      source: { id: `tourist-${index}`, title: feed.title, publisher: 'INE', retrievedAt: new Date().toISOString(), url: feed.url },
      records: [{ id: `tourist-${index}-2026`, metricId, period: '2026M05', value: index ? 1.28 : 341001 }],
    }));
  }
  await writeFile(refreshPath, JSON.stringify({ eurostat: [
    { url: 'https://example.org/government-revenue?geo=ES', metricId: 'government_revenue_ratio' },
    { url: vacancyUrl, metricId: 'job_vacancy_rate', metricIdByDimension: vacancyMetricMap },
    ...subjectiveComponents.map(([, metricId, url]) => ({ url, metricId })),
  ] }));
  await writeFile(clustersPath, JSON.stringify(clusters));
  await writeFile(researchPath, JSON.stringify({ results: [
    { id: 'cluster:llm-candidate', status: 'covered_by_llm', domain: 'immigration_crime', source: { title: 'Employment statistics', publisher: 'Fixture office', url: 'https://example.org/employment' } },
    { id: 'cluster:llm-candidate', status: 'partially_covered_by_llm', source: { title: 'Labour survey', publisher: 'Fixture office', url: 'https://example.org/labour-survey' } },
    { id: 'cluster:llm-no-match', status: 'unsupported_after_llm_review', source: { title: 'Youth labour statistics', publisher: 'Fixture office', url: 'https://example.org/youth-labour' } },
    { id: 'cluster:published-llm', status: 'covered_by_llm', source: { title: 'Employment statistics', publisher: 'Fixture office', url: 'https://example.org/published-employment' } },
  ] }));
  await run(process.execPath, ['scripts/knowledge/audit-coverage.mjs', '--clusters', clustersPath, '--records', recordsDir, '--llm-research', researchPath, '--refresh', refreshPath, '--domains', domainsPath, '--output', auditPath], { cwd: root });
  const audit = JSON.parse(await readFile(auditPath, 'utf8'));
  const classes = new Map(audit.clusters.map((item) => [item.clusterId, item.auditClass]));
  if (classes.get('metric') !== 'covered_existing_evidence') throw new Error(`existing metric was not promoted: ${classes.get('metric')}`);
  if (classes.get('scorecard') !== 'covered_existing_evidence') throw new Error(`broad scorecard was not recognized: ${classes.get('scorecard')}`);
  if (classes.get('named-scorecard') !== 'covered_existing_evidence') throw new Error(`named broad scorecard was not recognized: ${classes.get('named-scorecard')}`);
  if (classes.get('positive-scorecard') !== 'covered_existing_evidence') throw new Error(`positive broad scorecard was not recognized: ${classes.get('positive-scorecard')}`);
  if (classes.get('local') !== 'unsupported_scope') throw new Error(`local claim was not scoped: ${classes.get('local')}`);
  if (classes.get('housing') !== 'partial_domain_evidence') throw new Error(`partial domain was not preserved: ${classes.get('housing')}`);
  if (audit.clusters.find((item) => item.clusterId === 'housing')?.domain !== 'public_housing_allocation') {
    throw new Error('a public-housing claim crossed into the immigration-benefit domain');
  }
  for (const id of ['generic-benefit', 'generic-crime', 'generic-priority']) {
    const item = audit.clusters.find((cluster) => cluster.clusterId === id);
    if (item?.domain) throw new Error(`${id} crossed into an immigration or housing domain: ${item.domain}`);
    const workItem = audit.sourceWorkItems.find((entry) => entry.clusterId === id);
    if (workItem?.requiredDimensions?.some((dimension) => ['beneficiary_group', 'group_denominator', 'age_sex_adjustment', 'eligible_applicants'].includes(dimension))) {
      throw new Error(`${id} inherited population-specific dimensions without a matching group claim`);
    }
  }
  for (const id of ['immigrant-benefits', 'foreign-benefits-paraphrase']) {
    const item = audit.clusters.find((cluster) => cluster.clusterId === id);
    const workItem = audit.sourceWorkItems.find((entry) => entry.clusterId === id);
    if (item?.domain !== 'immigration_benefits' || !workItem?.requiredDimensions?.includes('denominator')) {
      throw new Error(`${id} did not retain the immigration-benefit scope and denominator requirement (${JSON.stringify(item)})`);
    }
  }
  for (const id of ['immigrant-crime', 'foreign-crime-paraphrase']) {
    const item = audit.clusters.find((cluster) => cluster.clusterId === id);
    const workItem = audit.sourceWorkItems.find((entry) => entry.clusterId === id);
    if (item?.domain !== 'immigration_crime' || !workItem?.requiredDimensions?.includes('legal_stage') || !workItem?.requiredDimensions?.includes('group_denominator')) {
      throw new Error(`${id} did not retain legal-stage and population-denominator requirements (${JSON.stringify(item)})`);
    }
  }
  if (classes.get('llm-candidate') !== 'source_assessment_review_required') throw new Error(`model suggestion was treated as evidence: ${classes.get('llm-candidate')}`);
  const llmCandidate = audit.clusters.find((item) => item.clusterId === 'llm-candidate');
  if (llmCandidate.domain) throw new Error(`an unreviewed model domain was trusted for an employment claim: ${llmCandidate.domain}`);
  if (llmCandidate.action !== 'review_source_candidate' || audit.sourceWorkItems.some((item) => item.clusterId === 'llm-candidate') === false) throw new Error('model suggestion did not enter the private review queue');
  if (llmCandidate.reviewSources?.length !== 2 || !llmCandidate.reviewSources.some((source) => source.url === 'https://example.org/employment') || !llmCandidate.reviewSources.some((source) => source.url === 'https://example.org/labour-survey')) throw new Error('all model source leads were not preserved for review');
  const llmNoMatch = audit.clusters.find((item) => item.clusterId === 'llm-no-match');
  if (llmNoMatch.auditClass !== 'source_assessment_review_required' || /suggested a possible source match/i.test(audit.sourceWorkItems.find((item) => item.clusterId === 'llm-no-match')?.reason || '')) throw new Error('a negative model assessment was treated as a coverage decision');
  if (classes.get('published-llm') !== 'covered_existing_evidence' || audit.sourceWorkItems.some((item) => item.clusterId === 'published-llm')) {
    throw new Error('a model source lead downgraded an already published and linked claim');
  }
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
  const composedPoverty = audit.metrics.find((item) => item.id === 'subjective_poverty_rate');
  if (composedPoverty?.status !== 'ready' || composedPoverty.coverageMode !== 'derived_from_inputs'
    || composedPoverty.inputMetricIds?.length !== 2 || composedPoverty.materializedRecordCount !== 2) {
    throw new Error(`composed metric did not inherit complete, fresh input coverage (${JSON.stringify(composedPoverty)})`);
  }
  for (const metricId of ['tourist_housing_count', 'tourist_housing_share']) {
    const metric = audit.metrics.find((item) => item.id === metricId);
    if (metric?.configuredFeedCount !== 1 || metric.materializedRecordCount !== 1 || metric.status !== 'ready') {
      throw new Error(`${metricId}: domain source was not counted as configured and materialized (${JSON.stringify(metric)})`);
    }
  }
  for (const feed of audit.feeds.filter((item) => item.domain === 'tourist_housing')) {
    if (feed.metricIds?.length !== 1 || !['tourist_housing_count', 'tourist_housing_share'].includes(feed.metricIds[0])) {
      throw new Error(`tourist-housing domain feed inventory omitted its metric mapping (${JSON.stringify(feed)})`);
    }
  }
  const incompleteRefreshPath = join(dir, 'refresh-incomplete-composition.json');
  const incompleteRefresh = JSON.parse(await readFile(refreshPath, 'utf8'));
  incompleteRefresh.eurostat = incompleteRefresh.eurostat.filter((feed) => feed.metricId !== 'subjective_poverty_great_difficulty_rate');
  await writeFile(incompleteRefreshPath, JSON.stringify(incompleteRefresh));
  await run(process.execPath, ['scripts/knowledge/audit-coverage.mjs', '--clusters', clustersPath, '--records', recordsDir, '--llm-research', researchPath, '--refresh', incompleteRefreshPath, '--domains', domainsPath, '--output', incompleteCompositionAuditPath], { cwd: root });
  const incompleteCompositionAudit = JSON.parse(await readFile(incompleteCompositionAuditPath, 'utf8'));
  const incompletePoverty = incompleteCompositionAudit.metrics.find((item) => item.id === 'subjective_poverty_rate');
  if (incompletePoverty?.status !== 'missing_configuration' || incompletePoverty.action !== 'find_source') {
    throw new Error(`derived metric appeared ready after losing a required component feed (${JSON.stringify(incompletePoverty)})`);
  }
  await run(process.execPath, ['scripts/knowledge/promote-existing-coverage.mjs', '--audit', auditPath, '--clusters', clustersPath, '--output', promotedPath], { cwd: root });
  const promoted = JSON.parse(await readFile(promotedPath, 'utf8'));
  if (promoted.clusters.filter((item) => item.newlyCovered).length !== 4) throw new Error('promotion did not produce exactly four existing-evidence promotions');
  await run(process.execPath, ['scripts/knowledge/promote-existing-coverage.mjs', '--audit', auditPath, '--clusters', promotedPath, '--output', promotedAgainPath], { cwd: root });
  const promotedAgain = JSON.parse(await readFile(promotedAgainPath, 'utf8'));
  if (JSON.stringify(promoted.clusters) !== JSON.stringify(promotedAgain.clusters)) throw new Error('promotion is not idempotent');
  console.log('Coverage audit fixtures passed: text domains stay scope-matched, paraphrases share evidence requirements, published claims stay covered, model suggestions stay in review, and operational failures stay separate.');
} finally {
  await rm(dir, { recursive: true, force: true });
}
