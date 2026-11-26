import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { domainMetricIds } from './domain-metric-ids.mjs';

const root = new URL('../../', import.meta.url).pathname;
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const metricRegistry = await readJson(join(root, 'config/metric-registry.json'));
const sourceRefresh = await readJson(join(root, 'config/source-refresh.json'));
const domainRefresh = await readJson(join(root, 'config/domain-source-refresh.json'));

const feeds = Object.entries(sourceRefresh).flatMap(([sourceId, resources]) => resources.map((resource) => ({ sourceId, ...(typeof resource === 'string' ? { url: resource } : resource), mode: 'warehouse' })));
const domainFeeds = (domainRefresh.feeds || []).map((feed) => ({ sourceId: feed.id, metricId: feed.metricId, metricIdByDimension: feed.metricIdByDimension, url: feed.url, title: feed.title, domain: feed.domain, schedule: feed.schedule, mode: feed.mode }));
const allFeeds = [...feeds, ...domainFeeds];
const metricFeedMap = new Map();
const metricIdsForFeed = (feed) => [...new Set([
  feed.metricId,
  ...Object.values(feed.metricIdByDimension || {}).flatMap((mapping) => Object.values(mapping || {})),
  ...(feed.metricId ? [] : domainMetricIds[feed.domain] || []),
].filter((id) => typeof id === 'string' && id))];
for (const feed of allFeeds) for (const metricId of metricIdsForFeed(feed)) {
  metricFeedMap.set(metricId, [...(metricFeedMap.get(metricId) || []), feed]);
}
const metricInputIds = new Map();
for (const [id, metric] of Object.entries(metricRegistry)) {
  const inputs = [...new Set(Object.values(metric.sourceComposition?.inputMetricsByDimensionValue || {}))];
  if (!metricFeedMap.has(id) && inputs.length && inputs.every((input) => metricFeedMap.has(input))) {
    metricInputIds.set(id, inputs);
    metricFeedMap.set(id, [...new Map(inputs.flatMap((input) => metricFeedMap.get(input)).map((feed) => [feed.sourceId, feed])).values()]);
  }
}
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
    ...(metricInputIds.has(id) ? { inputMetricIds: metricInputIds.get(id) } : {}),
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
