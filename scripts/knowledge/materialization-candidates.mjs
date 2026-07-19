import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url).pathname;
const args = new Map(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), values[index + 1] && !values[index + 1].startsWith('--') ? values[index + 1] : 'true']);
  return pairs;
}, []));
const inputPath = args.get('input') || join(root, '.local/query-clusters.json');
const outputPath = args.get('output') || join(root, '.local/materialization-candidates.json');
const minimumCount = Math.max(1, Number(args.get('min-count') || 3));
const limit = Math.max(1, Number(args.get('limit') || 50));

const slugify = (value) => String(value || '')
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ñ/g, 'n')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 72) || 'aclaracion-sin-titulo';

export const rankMaterializationCandidates = (clusters, { minCount = 3, max = 50 } = {}) => (Array.isArray(clusters) ? clusters : [])
  .filter((cluster) => cluster && Number(cluster.count) >= minCount && Array.isArray(cluster.sourceIds) && cluster.sourceIds.length > 0 && cluster.reviewStatus !== 'published')
  .map((cluster) => ({
    clusterId: String(cluster.id || `cluster-${slugify(cluster.signature)}`),
    canonicalText: String(cluster.text || cluster.signature || '').slice(0, 400),
    suggestedSlug: slugify(cluster.text || cluster.signature),
    queryCount: Number(cluster.count),
    priorityScore: Number(cluster.priorityScore || 0),
    coverageStatus: String(cluster.coverageStatus || 'unresolved'),
    sourceIds: cluster.sourceIds.slice(0, 20),
    reviewStatus: 'needs_review',
    requiredActions: [
      'Confirm the canonical wording and separate its propositions.',
      'Promote only direct evidence and source records into reviewed Git content.',
      'Record what the selected evidence does not establish.',
      'Run knowledge validation before publishing the static claim.',
    ],
  }))
  .sort((left, right) => right.priorityScore - left.priorityScore || right.queryCount - left.queryCount)
  .slice(0, max);

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let input;
  try { input = JSON.parse(await readFile(inputPath, 'utf8')); } catch {
    console.log(`No cluster file found at ${inputPath}. Run npm run knowledge:cluster first.`);
    process.exit(0);
  }
  const candidates = rankMaterializationCandidates(input.clusters, { minCount: minimumCount, max: limit });
  await writeFile(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), minimumCount, candidates }, null, 2));
  console.log(`Materialization candidates written: ${candidates.length} candidate(s) from ${input.clusters?.length || 0} cluster(s).`);
}
