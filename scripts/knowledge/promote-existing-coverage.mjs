import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const args = new Map(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), values[index + 1] && !values[index + 1].startsWith('--') ? values[index + 1] : 'true']);
  return pairs;
}, []));
const input = args.get('audit') || join(root, '.local/coverage-audit.json');
const clustersPath = args.get('clusters') || join(root, '.local/query-clusters.json');
const output = args.get('output') || join(root, '.local/query-clusters.promoted.json');
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const audit = await readJson(input);
const clusters = await readJson(clustersPath);
const byId = new Map((audit.clusters || []).map((item) => [String(item.clusterId), item]));
let promoted = 0;
const next = { ...clusters, generatedAt: new Date().toISOString(), promotion: { source: 'coverage-audit', promotedAt: new Date().toISOString(), staticPublication: 'human_gate' }, clusters: (clusters.clusters || []).map((cluster) => {
  const item = byId.get(String(cluster.id || ''));
  if (!item || item.auditClass !== 'covered_existing_evidence' || !item.metricIds?.length) return cluster;
  if (cluster.reviewStatus === 'published') return cluster;
  promoted += 1;
  return { ...cluster, coverageStatus: 'covered', newlyCovered: true, auditClass: item.auditClass, auditAction: 'auto_route', matchedMetricIds: item.metricIds, matchedSourceIds: item.sourceIds || [], evidenceStatus: 'warehouse_ready', answerMode: 'provisional_evidence', reviewStatus: cluster.reviewStatus || 'unreviewed' };
}) };
await writeFile(output, JSON.stringify(next, null, 2));
console.log(`Existing coverage promoted: ${promoted}; static publication remains human-gated.`);
