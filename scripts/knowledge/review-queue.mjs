import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rankMaterializationCandidates } from './materialization-candidates.mjs';

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

const readJson = async (path) => {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return null; }
};

const queueAction = (candidate) => {
  if (candidate.newlyCovered) return 'Review the new evidence link, then decide whether to publish or link the existing answer.';
  if (!candidate.sourceIds.length) return 'Find a direct primary source or mark the cluster as not verifiable.';
  if (candidate.coverageStatus === 'partial') return 'Check which proposition is missing evidence and record the limitation before writing an answer.';
  return 'Confirm the wording, evidence directness, and claim boundaries before creating a reviewed static claim.';
};

export const buildReviewQueue = (clusterDocument, { minCount = 3, max = 25 } = {}) => {
  const clusters = asArray(clusterDocument?.clusters);
  const candidates = rankMaterializationCandidates(clusters, { minCount, max });
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
    })),
  };
};

const markdownTableRow = (candidate) => `| ${candidate.rank} | ${candidate.canonicalText.replaceAll('|', '\\|')} | ${formatNumber(candidate.queryCount)} | ${formatNumber(candidate.priorityScore)} | ${candidate.coverageStatus} | ${candidate.sourceIds.join(', ') || 'none'} | ${candidate.nextAction.replaceAll('|', '\\|')} |`;

export const renderReviewQueueMarkdown = (queue) => {
  const candidates = asArray(queue?.candidates);
  const newlyCovered = candidates.filter((candidate) => candidate.newlyCovered);
  const unresolved = candidates.filter((candidate) => !candidate.newlyCovered);
  const excluded = Object.entries(queue?.inputs?.excludedReasons || {}).map(([reason, count]) => `- ${reason}: ${formatNumber(count)}`).join('\n') || '- None recorded';
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

## Excluded operational records

${excluded}
`;
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const clusters = await readJson(inputPath);
  if (!clusters) {
    console.log(`No cluster file found at ${inputPath}. Run npm run knowledge:cluster first.`);
    process.exit(0);
  }
  const queue = buildReviewQueue(clusters, { minCount: minimumCount, max: limit });
  await writeFile(outputPath, JSON.stringify(queue, null, 2));
  await writeFile(markdownPath, renderReviewQueueMarkdown(queue));
  console.log(`Solo-maintainer review queue written: ${queue.summary.candidates} candidate(s) to ${markdownPath}.`);
}
