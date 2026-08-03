import { readdirSync, readFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preferredMetricIdsForQuery } from './metric-query-hints.mjs';
import { isPublicReuseQuery } from './boe-legal-discovery.mjs';
import { handlerForInput } from './handlers.mjs';

const root = new URL('../../', import.meta.url).pathname;
const args = new Map(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), values[index + 1] && !values[index + 1].startsWith('--') ? values[index + 1] : 'true']);
  return pairs;
}, []));
const inputPath = args.get('input') || join(root, '.local/query-clusters.json');
const outputPath = args.get('output') || join(root, '.local/materialization-candidates.json');
const minimumCount = Math.max(1, Number(args.get('min-count') || 3));
const limit = Math.max(1, Number(args.get('limit') || 50));

const normalise = (value) => String(value || '')
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ñ/g, 'n')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .slice(0, 12000);
const stripConversationWrapper = (value) => normalise(value)
  .replace(/^(?:es verdad que|de verdad|segun los datos|en el grupo dicen que|mi cunado insiste|he leido esto|que hay de cierto en que)\s+/, '')
  .replace(/^no me creo que\s+/, '')
  .replace(/\s+y por eso todo va peor$/, '')
  .replace(/[?¿.!]+$/g, '')
  .trim();
const parseFrontmatter = (raw) => {
  const match = String(raw || '').match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  return Object.fromEntries(match[1].split('\n').flatMap((line) => {
    const index = line.indexOf(':');
    return index < 0 ? [] : [[line.slice(0, index).trim(), line.slice(index + 1).trim()]];
  }));
};
const scalar = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';
  try { return typeof JSON.parse(text) === 'string' ? JSON.parse(text) : text; } catch { return text.replace(/^['"]|['"]$/g, ''); }
};
const list = (value) => {
  try {
    const parsed = JSON.parse(String(value || '[]'));
    return Array.isArray(parsed) ? parsed.map(scalar).filter(Boolean) : [];
  } catch { return []; }
};
const publishedClaimRecords = () => {
  let files = [];
  try { files = readdirSync(join(root, 'content/claims')).filter((file) => file.endsWith('.md')); } catch { return []; }
  return files.flatMap((file) => {
    const frontmatter = parseFrontmatter(readFileSync(join(root, 'content/claims', file), 'utf8'));
    if (frontmatter.status !== 'published' || !frontmatter.slug || !frontmatter.claim) return [];
    return [{ slug: scalar(frontmatter.slug), phrases: [scalar(frontmatter.claim), ...list(frontmatter.aliases)] }];
  });
};
const publishedClaims = publishedClaimRecords();
const clusterPhrases = (cluster) => [
  cluster?.canonicalText,
  cluster?.canonical,
  cluster?.text,
  cluster?.normalized,
  ...(Array.isArray(cluster?.surfaceSignatures) ? cluster.surfaceSignatures : []),
].filter(Boolean).map(stripConversationWrapper).filter(Boolean);
const publishedClaimForCluster = (cluster) => {
  const values = clusterPhrases(cluster);
  if (!values.length) return null;
  return publishedClaims.find((claim) => {
    const phrases = claim.phrases.map(stripConversationWrapper).filter(Boolean);
    return values.some((value) => phrases.includes(value));
  }) || null;
};
const warehouseRouteForCluster = (cluster) => preferredMetricIdsForQuery(clusterPhrases(cluster).join(' ')).size > 0;
const legalRouteForCluster = (cluster) => isPublicReuseQuery(clusterPhrases(cluster).join(' '));
const automaticEventRouteForCluster = (cluster) => handlerForInput({ retrievalHints: clusterPhrases(cluster) }, '') === 'budget_transfer';
const discoverySourceId = (value) => /(?:^|-)discovery-/i.test(String(value || ''));
const directSourceIdsForCluster = (cluster) => (Array.isArray(cluster?.sourceIds) ? cluster.sourceIds : []).filter((id) => !discoverySourceId(id));
const localSpecificClaim = (cluster) => /(?:mi|en mi|de mi)\s+(?:calle|barrio|portal|municipio|pueblo|edificio|zona|ciudad)|\b(?:barrio|municipio|pueblo|portal|edificio)\b|\b(?:en la zona|delitos zona|inseguridad zona)\b/i.test(clusterPhrases(cluster).join(' '));
export const reconcileMaterializationCluster = (cluster) => {
  if (!cluster || cluster.newlyCovered) return cluster;
  const publishedClaim = cluster.linkedClaimSlug
    ? { slug: cluster.linkedClaimSlug }
    : publishedClaimForCluster(cluster);
  if (!publishedClaim) return cluster;
  return {
    ...cluster,
    coverageStatus: 'covered',
    reviewStatus: 'published',
    linkedClaimSlug: cluster.linkedClaimSlug || publishedClaim.slug,
    newlyCovered: false,
  };
};

const slugify = (value) => String(value || '')
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ñ/g, 'n')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 72) || 'aclaracion-sin-titulo';

export const rankMaterializationCandidates = (clusters, { minCount = 3, max = 50 } = {}) => (Array.isArray(clusters) ? clusters : [])
  .map(reconcileMaterializationCluster)
  .filter((cluster) => !warehouseRouteForCluster(cluster))
  .filter((cluster) => !legalRouteForCluster(cluster))
  .filter((cluster) => !automaticEventRouteForCluster(cluster))
  .filter((cluster) => cluster && cluster.reviewable !== false && !localSpecificClaim(cluster) && directSourceIdsForCluster(cluster).length > 0 && Number(cluster.count ?? cluster.exampleCount) >= minCount && Array.isArray(cluster.sourceIds) && cluster.sourceIds.length > 0 && cluster.reviewStatus !== 'published' && (cluster.coverageStatus !== 'covered' || cluster.newlyCovered))
  .map((cluster) => ({
    clusterId: String(cluster.id || `cluster-${slugify(cluster.signature)}`),
    canonicalText: String(cluster.text || cluster.signature || '').slice(0, 400),
    suggestedSlug: slugify(cluster.text || cluster.signature),
    queryCount: Number(cluster.count ?? cluster.exampleCount),
    count7d: Number(cluster.count7d || 0),
    growthRate: Number(cluster.growthRate || 0),
    newlyCovered: Boolean(cluster.newlyCovered),
    priorityScore: Number(cluster.priorityScore || 0),
    coverageStatus: String(cluster.coverageStatus || 'unresolved'),
    sourceIds: cluster.sourceIds.slice(0, 20),
    reviewStatus: 'needs_review',
    reason: String(cluster.reason || 'Requiere revisión de evidencia antes de publicarse.'),
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
