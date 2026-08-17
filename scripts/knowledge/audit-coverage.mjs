import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { preferredMetricIdsForQuery } from './metric-query-hints.mjs';
import { sourceFreshness, staleSourceReason } from './source-freshness.mjs';

const root = new URL('../../', import.meta.url).pathname;
const args = new Map(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), values[index + 1] && !values[index + 1].startsWith('--') ? values[index + 1] : 'true']);
  return pairs;
}, []));
const pathArg = (name, fallback) => args.get(name) || join(root, fallback);
const readJson = async (path, fallback) => { try { return JSON.parse(await readFile(path, 'utf8')); } catch { return fallback; } };
const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
const textOf = (cluster) => [cluster?.text, cluster?.canonicalText, cluster?.canonical, cluster?.normalized, cluster?.signature].filter(Boolean).join(' ');
const localPattern = /(?:mi barrio|mi municipio|en la zona|edificio|portal|municipio|pueblo|barrio|familia concreta|persona concreta)/i;
const operationalPattern = /(?:ollama|transcri|runtime|provider|fetch failed|no disponible|audio input)/i;
const domainPattern = (text) => {
  const value = normalise(text);
  if (/benefici|ayuda|imv|prestacion|subsidio/.test(value)) return 'immigration_benefits';
  if (/delinc|crimen|delito|inseguridad|policia/.test(value)) return 'immigration_crime';
  if (/vivienda publica|vivienda protegida|prioridad.*(ayuda|vivienda)|ayudas.*prioridad/.test(value)) return 'public_housing_allocation';
  return '';
};
const directSources = (ids) => (Array.isArray(ids) ? ids : []).filter((id) => !/(?:^|-)discovery-/i.test(String(id)));

const registry = await readJson(pathArg('registry', 'config/metric-registry.json'), {});
const refresh = await readJson(pathArg('refresh', 'config/source-refresh.json'), {});
const domains = await readJson(pathArg('domains', 'config/domain-source-refresh.json'), { feeds: [] });
const clustersDoc = await readJson(pathArg('clusters', '.local/query-clusters.json'), { clusters: [] });
const gapContracts = await readJson(pathArg('gap-contracts', 'config/domain-source-gaps.json'), { gaps: [] });
const recordsDir = pathArg('records', '.local/source-warehouse/records');
let recordFiles = [];
try { recordFiles = (await readdir(recordsDir)).filter((file) => file.endsWith('.json')); } catch { /* first refresh may not have run */ }
const records = [];
for (const file of recordFiles) {
  const record = await readJson(join(recordsDir, file), null);
  if (record?.source) {
    const observations = Array.isArray(record.records) ? record.records : [];
    const metricIds = [...new Set(observations.map((item) => item?.metricId).filter(Boolean))];
    if (metricIds.length) for (const metricId of metricIds) records.push({ file, ...record.source, metricId, recordCount: observations.filter((item) => item?.metricId === metricId).length });
    else records.push({ file, ...record.source });
  }
}
const configured = Object.entries(refresh).flatMap(([sourceId, list]) => (Array.isArray(list) ? list : []).map((feed) => ({ sourceId, ...(typeof feed === 'string' ? { url: feed } : feed), mode: 'warehouse' })));
const domainFeeds = (domains.feeds || []).map((feed) => ({ ...feed, sourceId: feed.id, mode: feed.mode || 'active' }));
const allFeeds = [...configured, ...domainFeeds];
const recordByMetric = new Map();
for (const record of records) if (record.metricId) recordByMetric.set(record.metricId, [...(recordByMetric.get(record.metricId) || []), record]);
const configByMetric = new Map();
for (const feed of configured) if (feed.metricId) configByMetric.set(feed.metricId, [...(configByMetric.get(feed.metricId) || []), feed]);
const domainMetricIds = {
  immigration_benefits: ['benefit_recipients_by_group', 'imv_title_holders_by_nationality'],
  immigration_crime: ['crime_rate_by_group'],
  public_housing_allocation: ['public_housing_allocations_by_group', 'public_housing_actions'],
  wildfire_statistics: ['wildfire_incidents', 'wildfire_surface_affected'],
  health_emergency_wait: ['emergency_wait_declared'],
};
const domainMetricSet = new Set(Object.values(domainMetricIds).flat());
const incompleteDomainMetrics = new Set(['benefit_recipients_by_group', 'imv_title_holders_by_nationality', 'crime_rate_by_group', 'public_housing_allocations_by_group']);
for (const feed of domainFeeds) for (const id of domainMetricIds[feed.domain] || []) {
  if (!recordByMetric.has(id)) recordByMetric.set(id, [feed]);
  configByMetric.set(id, [...(configByMetric.get(id) || []), feed]);
}
const now = Date.now();
const metricAudit = Object.entries(registry).map(([id, metric]) => {
  const feeds = configByMetric.get(id) || [];
  const materialized = recordByMetric.get(id) || [];
  const invalid = materialized.filter((record) => !record.recordCount || !record.retrievedAt || !record.publisher || !record.metricId);
  const freshMaterialized = materialized.filter((record) => sourceFreshness(record, now) === 'fresh');
  const stale = freshMaterialized.length ? [] : materialized.filter((record) => sourceFreshness(record, now) === 'stale' || sourceFreshness(record, now) === 'unknown');
  const hasSpain = feeds.some((feed) => /(?:geo=ES|geoLevel=nuts|España|Espana)/i.test(`${feed.url || ''} ${feed.title || ''}`) || ['boe', 'ine'].includes(feed.sourceId) || feed.domain || id.endsWith('_europe') && /(?:EU27_2020|Europa)/i.test(`${feed.url || ''} ${feed.title || ''}`));
  const hasEurope = id.endsWith('_europe') || Object.hasOwn(registry, `${id}_europe`);
  const hasSpainAndEurope = !id.endsWith('_europe') || feeds.some((feed) => /(?:geo=ES|España|Espana)/i.test(`${feed.url || ''} ${feed.title || ''}`) && /(?:EU27_2020|geo=EU|Europa)/i.test(`${feed.url || ''} ${feed.title || ''}`));
  let status = 'ready';
  let action = 'none';
  if (incompleteDomainMetrics.has(id) && feeds.length) { status = 'partial_domain_evidence'; action = 'human_review'; }
  else if (!feeds.length) { status = 'missing_configuration'; action = 'find_source'; }
  else if (!materialized.length) { status = 'source_configured_not_refreshed'; action = 'refresh_source'; }
  else if (invalid.length) { status = 'data_quality_failure'; action = 'repair_source'; }
  else if (stale.length) { status = 'stale'; action = 'refresh_source'; }
  else if (!hasSpain) { status = 'missing_national_variant'; action = 'find_source'; }
  else if (!hasSpainAndEurope) { status = 'missing_comparative_variant'; action = 'find_source'; }
  return { id, name: metric.name, status, action, configuredFeedCount: feeds.length, materializedRecordCount: materialized.length, recordCounts: materialized.map((item) => item.recordCount || 0), staleReasons: stale.map((item) => staleSourceReason(item, now)), dimensions: metric.dimensions || [], hasNationalFeed: hasSpain, hasEuropeVariant: hasEurope, hasSpainAndEurope };
});
const metricById = new Map(metricAudit.map((item) => [item.id, item]));
const classifyCluster = (cluster) => {
  const text = textOf(cluster);
  const ids = [...preferredMetricIdsForQuery(text)].filter((id) => metricById.has(id));
  const domain = domainPattern(text);
  const sourceIds = directSources(cluster.sourceIds);
  if (operationalPattern.test(text) || cluster.reviewable === false) return { auditClass: 'operational_failure', action: 'repair_infrastructure', metricIds: ids, domain };
  if (localPattern.test(text)) return { auditClass: 'unsupported_scope', action: 'find_local_source', metricIds: ids, domain };
  if (domain && (domain === 'public_housing_allocation' || domain === 'immigration_benefits' || domain === 'immigration_crime')) return { auditClass: 'partial_domain_evidence', action: 'human_review', metricIds: ids, domain };
  if (ids.length) {
    const readiness = ids.map((id) => metricById.get(id));
    if (readiness.some((item) => item.status === 'ready')) return { auditClass: 'covered_existing_evidence', action: 'auto_route', metricIds: ids, domain, sourceIds };
    if (readiness.some((item) => item.status === 'source_configured_not_refreshed' || item.status === 'missing_configuration')) return { auditClass: 'covered_but_not_materialized', action: 'refresh_source', metricIds: ids, domain, sourceIds };
    if (readiness.some((item) => item.status === 'stale')) return { auditClass: 'source_configured_not_refreshed', action: 'refresh_source', metricIds: ids, domain, sourceIds };
    return { auditClass: 'true_research_gap', action: 'find_source', metricIds: ids, domain, sourceIds };
  }
  if (cluster.coverageStatus === 'partial' || sourceIds.length) return { auditClass: 'true_research_gap', action: 'human_review', metricIds: [], domain, sourceIds };
  return { auditClass: 'true_research_gap', action: 'find_source', metricIds: [], domain, sourceIds };
};
const clusterAudit = (clustersDoc.clusters || []).map((cluster) => ({
  clusterId: String(cluster.id || ''), canonicalText: String(cluster.text || cluster.canonicalText || '').slice(0, 400), count: Number(cluster.count || 0), count7d: Number(cluster.count7d || 0), priorityScore: Number(cluster.priorityScore || 0), coverageStatus: cluster.coverageStatus || 'uncovered', sourceIds: cluster.sourceIds || [], ...classifyCluster(cluster),
}));
const counts = (items, field) => Object.fromEntries([...new Set(items.map((item) => item[field]))].map((key) => [key, items.filter((item) => item[field] === key).length]));
const sourceWork = [...clusterAudit.filter((item) => !['covered_existing_evidence', 'operational_failure'].includes(item.auditClass)).reduce((map, item) => {
  const key = `${item.auditClass}:${item.domain || 'general'}`;
  const current = map.get(key) || { id: key, auditClass: item.auditClass, domain: item.domain || null, action: item.action, recurrence: 0, recentVelocity: 0, priorityScore: 0, examples: [] };
  current.recurrence += item.count; current.recentVelocity += item.count7d; current.priorityScore = Math.max(current.priorityScore, item.priorityScore); if (current.examples.length < 5) current.examples.push(item.canonicalText); map.set(key, current); return map;
}, new Map()).values()];
for (const gap of gapContracts.gaps || []) sourceWork.push({ id: `gap:${gap.id}`, auditClass: 'partial_domain_evidence', domain: gap.domain, action: 'find_source', recurrence: 0, recentVelocity: 0, priorityScore: 0, examples: [gap.permittedConclusion || gap.nextEvidence || gap.id] });
sourceWork.sort((a, b) => b.recurrence - a.recurrence || b.priorityScore - a.priorityScore);
const requiredDimensionsFor = (item) => {
  const dimensions = new Set(['geography', 'period', 'source_role']);
  if (item.domain === 'immigration_benefits') ['programme', 'eligibility_rule', 'beneficiary_group', 'denominator'].forEach((value) => dimensions.add(value));
  if (item.domain === 'immigration_crime') ['offence_definition', 'legal_stage', 'group_denominator', 'territory', 'age_sex_adjustment'].forEach((value) => dimensions.add(value));
  if (item.domain === 'public_housing_allocation') ['programme', 'eligible_applicants', 'allocation_rule', 'group_field', 'territory'].forEach((value) => dimensions.add(value));
  if (!item.domain && item.metricIds?.length) dimensions.add('metric_compatible_observation');
  if (item.auditClass === 'unsupported_scope') dimensions.add('local_territory');
  return [...dimensions];
};
const clusterSourceWorkItems = clusterAudit
  .filter((item) => !['covered_existing_evidence', 'operational_failure'].includes(item.auditClass))
  .map((item) => ({
    id: `cluster:${item.clusterId}`,
    clusterId: item.clusterId,
    auditClass: item.auditClass,
    action: item.action,
    domain: item.domain || null,
    canonicalText: item.canonicalText,
    recurrence: item.count,
    recentVelocity: item.count7d,
    priorityScore: item.priorityScore,
    metricIds: item.metricIds,
    sourceIds: item.sourceIds,
    requiredDimensions: requiredDimensionsFor(item),
    reason: item.auditClass === 'unsupported_scope' ? 'The claim requires territory-specific evidence and must not be generalized nationally.' : item.auditClass === 'partial_domain_evidence' ? 'The domain has only partial evidence; collect the missing definitions, denominators, and legal or programme stages.' : item.auditClass === 'covered_but_not_materialized' || item.auditClass === 'source_configured_not_refreshed' ? 'A compatible metric or feed exists, but the warehouse is not ready or is stale.' : 'No compatible reviewed evidence was found; identify a primary source before considering publication.',
  }))
  .sort((a, b) => b.priorityScore - a.priorityScore || b.recentVelocity - a.recentVelocity || b.recurrence - a.recurrence);
const contractSourceWorkItems = (gapContracts.gaps || []).map((gap) => ({
  id: `gap:${gap.id}`,
  clusterId: null,
  auditClass: 'partial_domain_evidence',
  action: 'find_source',
  domain: gap.domain || null,
  canonicalText: gap.permittedConclusion || gap.id,
  recurrence: 0,
  recentVelocity: 0,
  priorityScore: 0,
  metricIds: [],
  sourceIds: gap.officialSourcesChecked || [],
  requiredDimensions: gap.missingFields || [],
  reason: gap.nextEvidence || 'A source contract is incomplete and requires additional official evidence.',
}));
const sourceWorkItems = [...clusterSourceWorkItems, ...contractSourceWorkItems];
const scoreSourceWork = (item) => {
  const text = normalise(item.canonicalText);
  const harmScore = item.harmScore ?? (/(inmigr|delinc|viol|acus|corrup|fraude|menor|persona concreta)/.test(text) ? 3 : 1);
  const urgencyScore = item.urgencyScore ?? (/(hoy|ayer|actual|reciente|este mes|invasion|incendio|catastrofe)/.test(text) ? 3 : 1);
  const evidenceReadiness = item.evidenceReadiness ?? (item.sourceIds?.length ? (item.auditClass === 'partial_domain_evidence' ? 2 : 3) : 0);
  return { ...item, harmScore, urgencyScore, evidenceReadiness, rankScore: Math.round((item.priorityScore || 0) + harmScore * 4 + urgencyScore * 3 + evidenceReadiness * 2) };
};
for (let index = 0; index < sourceWorkItems.length; index += 1) sourceWorkItems[index] = scoreSourceWork(sourceWorkItems[index]);
sourceWorkItems.sort((a, b) => b.rankScore - a.rankScore || b.priorityScore - a.priorityScore || b.recentVelocity - a.recentVelocity || b.recurrence - a.recurrence);
const report = { schemaVersion: '1', generatedAt: new Date().toISOString(), summary: { registryMetrics: metricAudit.length, configuredFeeds: configured.length, warehouseRecords: records.length, clusters: clusterAudit.length, clusterClasses: counts(clusterAudit, 'auditClass'), metricStatuses: counts(metricAudit, 'status'), sourceWorkCandidates: sourceWork.length, sourceWorkItems: sourceWorkItems.length }, metrics: metricAudit, clusters: clusterAudit, sourceWorkCandidates: sourceWork, sourceWorkItems, domainGaps: gapContracts.gaps || [], feeds: allFeeds.map(({ sourceId, metricId, url, schedule, mode, domain }) => ({ sourceId, metricId, url, schedule, mode, domain })) };
const output = pathArg('output', '.local/coverage-audit.json');
await mkdir(join(output, '..'), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2));
const markdown = [`# Coverage audit`, `Generated: ${report.generatedAt}`, '', `## Summary`, '', `- Registry metrics: ${metricAudit.length}`, `- Configured feeds: ${configured.length}`, `- Warehouse records: ${records.length}`, `- Clusters replayed: ${clusterAudit.length}`, `- Aggregate source-work candidates: ${sourceWork.length}`, `- Ranked source-work items: ${sourceWorkItems.length}`, '', '## Cluster classes', '', ...Object.entries(report.summary.clusterClasses).map(([key, value]) => `- ${key}: ${value}`), '', '## Metric readiness', '', ...Object.entries(report.summary.metricStatuses).map(([key, value]) => `- ${key}: ${value}`), '', '## Ranked source work', '', ...sourceWorkItems.slice(0, 50).map((item) => `- **${item.id}** — ${item.canonicalText}; rank ${item.rankScore} (recurrence ${item.recurrence}, harm ${item.harmScore}, urgency ${item.urgencyScore}, evidence readiness ${item.evidenceReadiness}); ${item.action}; requires ${item.requiredDimensions.join(', ')}.`), ''].join('\n');
await writeFile(output.replace(/\.json$/, '.md'), markdown);
console.log(`Coverage audit written: ${output}`);
console.log(`Clusters: ${clusterAudit.length}; existing evidence: ${report.summary.clusterClasses.covered_existing_evidence || 0}; true gaps: ${report.summary.clusterClasses.true_research_gap || 0}`);
