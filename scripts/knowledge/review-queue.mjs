import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  rankMaterializationCandidates,
} from './materialization-candidates.mjs';
import { preferredMetricIdsForQuery } from './metric-query-hints.mjs';
import { isPublicReuseQuery } from './boe-legal-discovery.mjs';
import { handlerForInput } from './handlers.mjs';

const root = new URL('../../', import.meta.url).pathname;
const args = new Map(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), values[index + 1] && !values[index + 1].startsWith('--') ? values[index + 1] : 'true']);
  return pairs;
}, []));
const inputPath = args.get('input') || join(root, '.local/query-clusters.json');
const outputPath = args.get('output') || join(root, '.local/review-queue.json');
const markdownPath = args.get('markdown') || join(root, '.local/review-queue.md');
const minimumCount = Math.max(1, Number(args.get('min-count') || 3));
const limit = Math.max(1, Number(args.get('limit') || 25));

const asArray = (value) => Array.isArray(value) ? value : [];
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const safeText = (value) => String(value || '')
  .replace(/[\u0000-\u001f\u007f]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 400);
const date = (value) => {
  const parsed = new Date(value || '');
  return Number.isNaN(parsed.getTime()) ? 'unknown' : parsed.toISOString().slice(0, 10);
};
const formatNumber = (value) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(number(value));
const normalise = (value) => String(value || '')
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ñ/g, 'n')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();
const discoverySourceId = (value) => /(?:^|-)discovery-/i.test(String(value || ''));
const directSourceIds = (cluster) => asArray(cluster?.sourceIds).filter((id) => !discoverySourceId(id));
const clusterText = (cluster) => [cluster?.text, cluster?.canonicalText, cluster?.canonical, cluster?.signature].filter(Boolean).join(' ');
const localSpecificClaim = (cluster) => /(?:mi|en mi|de mi)\s+(?:calle|barrio|portal|municipio|pueblo|edificio|zona|ciudad)|\b(?:barrio|municipio|pueblo|portal|edificio)\b|\b(?:en la zona|delitos zona|inseguridad zona)\b/i.test(clusterText(cluster));
const routedByStructuredHandler = (cluster) => {
  const text = clusterText(cluster);
  return preferredMetricIdsForQuery(text).size > 0
    || isPublicReuseQuery(text)
    || handlerForInput({ retrievalHints: [text] }, '') === 'budget_transfer';
};

const readJson = async (path) => {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return null; }
};

const queueAction = (candidate) => {
  if (candidate.newlyCovered) return 'Review the new evidence link, then decide whether to publish or link the existing answer.';
  if (!candidate.sourceIds.length) return 'Find a direct primary source or mark the cluster as not verifiable.';
  if (candidate.coverageStatus === 'partial') return 'Check which proposition is missing evidence and record the limitation before writing an answer.';
  return 'Confirm the wording, evidence directness, and claim boundaries before creating a reviewed static claim.';
};

const researchAction = (candidate) => {
  if (candidate.localSpecific) return 'Find territorial or administrative data; do not generalise from national evidence.';
  if (candidate.sourceAvailability === 'discovery_only') return 'Use discovery records as leads only; verify the claim with a direct primary source.';
  if (candidate.sourceAvailability === 'none') return 'Find a direct primary source or mark the claim as not verifiable.';
  if (candidate.coverageStatus === 'partial') return 'Identify the missing proposition and record the limitation before writing an answer.';
  return 'Investigate the claim, then promote it only after direct evidence is linked and reviewed.';
};

export const buildResearchCandidates = (clusters, { minCount = 3, max = 25 } = {}) => (Array.isArray(clusters) ? clusters : [])
  .filter((cluster) => cluster && cluster.reviewable !== false)
  .filter((cluster) => Number(cluster.count ?? cluster.exampleCount) >= minCount)
  .filter((cluster) => cluster.reviewStatus !== 'published' && cluster.coverageStatus !== 'covered' && !cluster.linkedClaimSlug)
  .filter((cluster) => !routedByStructuredHandler(cluster))
  .map((cluster) => {
    const sourceIds = asArray(cluster.sourceIds).slice(0, 20);
    const directIds = directSourceIds(cluster);
    const sourceAvailability = directIds.length ? 'direct_candidate' : sourceIds.length ? 'discovery_only' : 'none';
    return {
      clusterId: String(cluster.id || `cluster-${normalise(cluster.signature)}`),
      canonicalText: safeText(cluster.text || cluster.signature),
      queryCount: number(cluster.count ?? cluster.exampleCount),
      count7d: number(cluster.count7d),
      growthRate: number(cluster.growthRate),
      priorityScore: number(cluster.priorityScore),
      coverageStatus: String(cluster.coverageStatus || 'uncovered'),
      reviewStatus: 'research_needed',
      researchOnly: true,
      localSpecific: localSpecificClaim(cluster),
      sourceAvailability,
      sourceIds,
      reason: safeText(cluster.reason || 'Requires source investigation before it can be answered.'),
      nextAction: researchAction({
        localSpecific: localSpecificClaim(cluster),
        sourceAvailability,
        coverageStatus: cluster.coverageStatus,
      }),
      auditClass: cluster.auditClass || 'unclassified',
      auditAction: cluster.auditAction || 'human_review',
      matchedMetricIds: asArray(cluster.matchedMetricIds),
      evidenceStatus: cluster.evidenceStatus || 'not_ready',
    };
  })
  .sort((left, right) => right.priorityScore - left.priorityScore || right.queryCount - left.queryCount || right.count7d - left.count7d)
  .slice(0, max)
  .map((candidate, index) => ({ rank: index + 1, ...candidate }));

export const buildReviewQueue = (clusterDocument, { minCount = 3, max = 25, audit = null } = {}) => {
  const clusters = asArray(clusterDocument?.clusters);
  const candidates = rankMaterializationCandidates(clusters, { minCount, max });
  const auditItems = new Map(asArray(audit?.sourceWorkItems).map((item) => [String(item.clusterId), item]));
  const researchCandidates = buildResearchCandidates(clusters, { minCount, max }).map((candidate) => {
    const item = auditItems.get(String(candidate.clusterId));
    return item ? { ...candidate, auditClass: item.auditClass, auditAction: item.action, matchedMetricIds: item.metricIds || [], requiredDimensions: item.requiredDimensions || [], sourceWorkReason: item.reason } : candidate;
  });
  const newlyCovered = candidates.filter((candidate) => candidate.newlyCovered);
  const unresolved = candidates.filter((candidate) => !candidate.newlyCovered);
  const excludedReasons = clusterDocument?.inputs?.excludedReasons || {};

  return {
    generatedAt: new Date().toISOString(),
    inputs: {
      clusters: clusters.length,
      reviewableLocalRecords: number(clusterDocument?.inputs?.localRecords),
      excludedLocalRecords: number(clusterDocument?.inputs?.excludedLocalRecords),
      excludedReasons,
    },
    summary: {
      candidates: candidates.length,
      newlyCovered: newlyCovered.length,
      unresolved: unresolved.length,
      researchCandidates: researchCandidates.length,
      topPriorityScore: candidates[0]?.priorityScore || 0,
    },
    candidates: candidates.map((candidate, index) => ({
      rank: index + 1,
      clusterId: candidate.clusterId,
      canonicalText: safeText(candidate.canonicalText),
      suggestedSlug: candidate.suggestedSlug,
      queryCount: number(candidate.queryCount),
      count7d: number(candidate.count7d),
      growthRate: number(candidate.growthRate),
      priorityScore: number(candidate.priorityScore),
      coverageStatus: candidate.coverageStatus,
      reviewStatus: candidate.reviewStatus,
      newlyCovered: Boolean(candidate.newlyCovered),
      sourceIds: asArray(candidate.sourceIds).slice(0, 12),
      reason: safeText(candidate.reason),
      nextAction: queueAction(candidate),
      auditClass: candidate.auditClass || 'unclassified',
      auditAction: candidate.auditAction || (candidate.newlyCovered ? 'auto_route' : 'human_review'),
      matchedMetricIds: asArray(candidate.matchedMetricIds),
      evidenceStatus: candidate.evidenceStatus || (candidate.newlyCovered ? 'warehouse_ready' : 'not_ready'),
    })),
    researchCandidates,
    sourceWork: asArray(audit?.sourceWorkItems).slice(0, max).map((item, index) => ({
      rank: index + 1,
      ...item,
      queryCount: item.recurrence || 0,
      count7d: item.recentVelocity || 0,
      priorityScore: item.rankScore ?? item.priorityScore ?? 0,
      reason: item.reason || 'Requires source work before publication.',
      nextAction: item.action || 'Review the required evidence dimensions.',
      coverageStatus: item.auditClass || 'uncovered',
      researchOnly: true,
      sourceAvailability: item.sourceIds?.length ? 'direct_candidate' : 'none',
    })),
  };
};

const markdownTableRow = (candidate) => `| ${candidate.rank} | ${candidate.canonicalText.replaceAll('|', '\\|')} | ${formatNumber(candidate.queryCount)} | ${formatNumber(candidate.priorityScore)} | ${candidate.coverageStatus} | ${candidate.sourceIds.join(', ') || 'none'} | ${candidate.nextAction.replaceAll('|', '\\|')} |`;
const researchMarkdownTableRow = (candidate) => `| ${candidate.rank} | ${candidate.canonicalText.replaceAll('|', '\\|')} | ${formatNumber(candidate.queryCount)} | ${formatNumber(candidate.priorityScore)} | ${candidate.sourceAvailability} | ${candidate.localSpecific ? 'local' : 'general'} | ${candidate.nextAction.replaceAll('|', '\\|')} |`;

export const renderReviewQueueMarkdown = (queue) => {
  const candidates = asArray(queue?.candidates);
  const researchCandidates = asArray(queue?.researchCandidates);
  const newlyCovered = candidates.filter((candidate) => candidate.newlyCovered);
  const unresolved = candidates.filter((candidate) => !candidate.newlyCovered);
  const excluded = Object.entries(queue?.inputs?.excludedReasons || {}).map(([reason, count]) => `- ${reason}: ${formatNumber(count)}`).join('\n') || '- None recorded';
  const sourceWork = asArray(queue?.sourceWork);
  const table = candidates.length
    ? [
      '| Rank | Cluster | Queries | Priority | Coverage | Source IDs | Next action |',
      '| ---: | --- | ---: | ---: | --- | --- | --- |',
      ...candidates.map(markdownTableRow),
    ].join('\n')
    : '_No review candidates are ready._';

  return `# Local review queue

Generated: ${date(queue?.generatedAt)}

This report is for the maintainer only. It is derived from clustered submissions and never publishes an unreviewed claim.

## At a glance

- Candidates: ${formatNumber(queue?.summary?.candidates)}
- Newly covered clusters: ${formatNumber(queue?.summary?.newlyCovered)}
- Unresolved clusters: ${formatNumber(queue?.summary?.unresolved)}
- Research gaps: ${formatNumber(queue?.summary?.researchCandidates)}
- Reviewable local records: ${formatNumber(queue?.inputs?.reviewableLocalRecords)}
- Excluded local records: ${formatNumber(queue?.inputs?.excludedLocalRecords)}

## Recommended order

${table}

## Review rules

1. Confirm the cluster’s canonical wording and separate its propositions.
2. Prefer direct, current primary evidence over topical context.
3. Record what the evidence does not establish.
4. Only then create or update reviewed Git content.
5. Run the knowledge and UX validators before publishing.

## Newly covered

${newlyCovered.length ? newlyCovered.map((candidate) => `- ${candidate.canonicalText} — ${candidate.nextAction}`).join('\n') : '- None in this batch.'}

## Unresolved

${unresolved.length ? unresolved.slice(0, 10).map((candidate) => `- ${candidate.canonicalText} — ${candidate.reason}`).join('\n') : '- None in this batch.'}

## Research gaps requiring source work

These are high-demand unresolved clusters that are not ready for publication. They need new source retrieval or a clear “not verifiable” outcome. They are intentionally separate from materialisation candidates.

${researchCandidates.length ? [
  '| Rank | Cluster | Queries | Priority | Sources | Scope | Next action |',
  '| ---: | --- | ---: | ---: | --- | --- | --- |',
  ...researchCandidates.map(researchMarkdownTableRow),
].join('\n') : '_No research gaps in this batch._'}

## Ranked coverage-audit work

${sourceWork.length ? [
  '| Rank | Cluster | Audit class | Action | Required dimensions |',
  '| ---: | --- | --- | --- | --- |',
  ...sourceWork.map((item) => `| ${item.rank} | ${String(item.canonicalText || '').replaceAll('|', '\\|')} | ${item.auditClass || 'unclassified'} | ${item.action || 'human_review'} | ${(item.requiredDimensions || []).join(', ')} |`),
].join('\n') : '_Run the coverage audit to attach per-cluster source work._'}

## Excluded operational records

${excluded}
`;
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const clusters = args.has('input') ? await readJson(inputPath) : await readJson(join(root, '.local/query-clusters.promoted.json')) || await readJson(inputPath);
  if (!clusters) {
    console.log(`No cluster file found at ${inputPath}. Run npm run knowledge:cluster first.`);
    process.exit(0);
  }
  const audit = await readJson(join(root, '.local/coverage-audit.json'));
  const queue = buildReviewQueue(clusters, { minCount: minimumCount, max: limit, audit });
  await writeFile(outputPath, JSON.stringify(queue, null, 2));
  await writeFile(markdownPath, renderReviewQueueMarkdown(queue));
  console.log(`Solo-maintainer review queue written: ${queue.summary.candidates} candidate(s) to ${markdownPath}.`);
}
