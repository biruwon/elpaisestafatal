import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const metricRegistry = await readJson(join(root, 'config/metric-registry.json'));
const sourceRefresh = await readJson(join(root, 'config/source-refresh.json'));
const domainRefresh = await readJson(join(root, 'config/domain-source-refresh.json'));

const feeds = Object.entries(sourceRefresh).flatMap(([sourceId, resources]) => resources.map((resource) => ({ sourceId, ...(typeof resource === 'string' ? { url: resource } : resource), mode: 'warehouse' })));
const domainFeeds = (domainRefresh.feeds || []).map((feed) => ({ sourceId: feed.id, url: feed.url, title: feed.title, domain: feed.domain, schedule: feed.schedule, mode: feed.mode }));
const allFeeds = [...feeds, ...domainFeeds];
const metricFeedMap = new Map();
for (const feed of feeds) if (feed.metricId) metricFeedMap.set(feed.metricId, [...(metricFeedMap.get(feed.metricId) || []), feed]);
const domainMetricIds = {
  immigration_benefits: ['benefit_recipients_by_group', 'imv_title_holders_by_nationality', 'imv_beneficiary_average_age'],
  immigration_crime: ['crime_rate_by_group'],
  public_housing_allocation: ['public_housing_allocations_by_group', 'public_housing_actions'],
  wildfire_statistics: ['wildfire_incidents', 'wildfire_surface_affected'],
  health_emergency_wait: ['emergency_wait_declared'],
};
for (const feed of domainFeeds) for (const metricId of domainMetricIds[feed.domain] || []) metricFeedMap.set(metricId, [...(metricFeedMap.get(metricId) || []), feed]);
const aliases = (metric) => new Set([metric.name, ...(metric.aliases || [])].map((value) => String(value).toLocaleLowerCase('es')));
const records = Object.entries(metricRegistry).map(([id, metric]) => {
  const linked = metricFeedMap.get(id) || [];
  const hasEuropeVariant = id.endsWith('_europe') || Object.hasOwn(metricRegistry, `${id}_europe`);
  return {
    id,
    name: metric.name,
    aliasCount: aliases(metric).size,
    sourceCount: linked.length,
    sourceIds: linked.map((feed) => feed.sourceId),
    schedules: [...new Set(linked.map((feed) => feed.schedule).filter(Boolean))],
    hasNationalFeed: linked.some((feed) => /(?:geo=ES|geoLevel=nuts|España|Espana)/i.test(feed.url || '') || ['boe', 'ine'].includes(feed.sourceId) || Boolean(feed.domain) || (id.endsWith('_europe') && /(?:geo=ES|geo=EU27_2020)/i.test(feed.url || ''))),
    hasEuropeVariant,
    dimensions: metric.dimensions,
    status: linked.length ? 'fed' : 'ontology_only',
  };
});
const report = {
  generatedAt: new Date().toISOString(),
  summary: {
    metrics: records.length,
    fedMetrics: records.filter((item) => item.status === 'fed').length,
    ontologyOnlyMetrics: records.filter((item) => item.status === 'ontology_only').length,
    warehouseFeeds: feeds.length,
    domainFeeds: domainFeeds.length,
    activeDomainFeeds: domainFeeds.filter((item) => item.mode === 'active').length,
    comparativeMetrics: records.filter((item) => item.hasEuropeVariant).length,
  },
  metrics: records,
  unlinkedMetrics: records.filter((item) => item.status === 'ontology_only').map((item) => item.id),
  feeds: allFeeds.map(({ sourceId, url, title, domain, schedule, mode }) => ({ sourceId, url, title, domain, schedule, mode })),
};

const output = process.env.COVERAGE_REPORT_OUTPUT || join(root, '.local/coverage-report.json');
await mkdir(join(root, '.local'), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2));
console.log(`Coverage report written: ${report.summary.fedMetrics}/${report.summary.metrics} metrics have configured feeds; ${report.summary.comparativeMetrics} have Spain/EU variants.`);
