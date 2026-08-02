import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const args = new Map(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), values[index + 1] && !values[index + 1].startsWith('--') ? values[index + 1] : 'true']);
  return pairs;
}, []));
const inputPath = args.get('input') || join(root, '.local/knowledge-gaps.jsonl');
const d1InputPath = args.get('d1-input') || '';
const outputPath = args.get('output') || join(root, '.local/query-clusters.json');

const now = Date.now();
const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
const normalise = (value) => String(value || '')
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ñ/g, 'n')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .slice(0, 12000);
const publicText = (value) => String(value || '')
  .replace(/[\u0000-\u001f\u007f]/g, ' ')
  .replace(/\b(?:gilipollas|idiota|idiotas|imbecil|imbeciles|subnormal|basura|mierda|puto|puta|p mierda)\b/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 400);
const tokens = (value) => new Set(normalise(value).split(' ').filter((token) => token.length > 2 && ![
  'como', 'esta', 'este', 'para', 'pero', 'que', 'sus', 'tiene', 'una', 'uno', 'en', 'el', 'la', 'los', 'las',
  'un', 'del', 'de', 'y', 'o', 'a', 'por', 'con', 'segun', 'dicen', 'grupo', 'insiste', 'hay', 'datos', 'todo',
  'va', 'peor', 'verdad', 'cierto', 'cierta', 'esto', 'eso', 'sobre', 'ser', 'son', 'esta',
].includes(token)));
const similarity = (left, right) => {
  const a = tokens(left); const b = tokens(right);
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / (a.size + b.size - overlap);
};
const signatureParts = (value) => {
  const parts = new Set(String(value || '').split('|').filter(Boolean));
  const claimType = [...parts][0] || '';
  const polarity = [...parts].find((part) => part.startsWith('polarity:')) || '';
  const geo = [...parts].find((part) => part.startsWith('geo:')) || '';
  const population = [...parts].find((part) => part.startsWith('population:')) || '';
  const period = [...parts].find((part) => part.startsWith('period:')) || '';
  const relations = [...parts].filter((part) => /:(?:more_than|less_than|causes|reduces):/.test(part));
  const numbers = [...parts].filter((part) => part.startsWith('number:'));
  return { claimType, polarity, geo, population, period, relations, numbers };
};
const compatibleSemanticFamily = (left, right) => {
  const a = signatureParts(left); const b = signatureParts(right);
  if (!a.claimType || !b.claimType || a.claimType !== b.claimType) return false;
  if (a.polarity && b.polarity && a.polarity !== b.polarity) return false;
  for (const field of ['geo', 'population', 'period']) {
    if (a[field] && b[field] && a[field] !== b[field]) return false;
  }
  if (a.relations.length && b.relations.length && a.relations.some((relation) => !b.relations.includes(relation))) return false;
  if (a.numbers.length && b.numbers.length && a.numbers.some((number) => !b.numbers.includes(number))) return false;
  return true;
};
const relatedClusterFor = (clusters, signature, normalized) => [...clusters.values()]
  .map((candidate) => ({
    candidate,
    score: compatibleSemanticFamily(candidate.signature, signature)
      ? Math.max(similarity(candidate.signature, normalized), similarity(candidate.signature, signature), similarity(signature, normalized))
      : 0,
  }))
  .filter(({ score }) => score >= 0.78)
  .sort((left, right) => right.score - left.score)[0]?.candidate || null;
const harmWeight = (value) => /inmigr|delinc|crimen|violenc|salud|eleccion|corrup|ayuda|viviend/.test(normalise(value)) ? 1.5 : 1;
const timestamp = (value) => {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : 0;
};
const earliest = (left, right) => !left ? right : !right ? left : timestamp(left) <= timestamp(right) ? left : right;
const latest = (left, right) => !left ? right : !right ? left : timestamp(left) >= timestamp(right) ? left : right;
const increment = (map, key, amount = 1) => { if (!key) return; map[key] = (map[key] || 0) + amount; };
const asArray = (value) => Array.isArray(value) ? value : [];

const meaningfulTokens = (value) => [...tokens(value)].filter((token) => token.length >= 3);
const operationalFailurePattern = /ollama|local transcription|transcription (?:is )?unavailable|audio input requires|no se ejecuto|fetch failed|provider|runtime (?:is )?not installed|screenshot attached/i;
const excludedOrigins = new Set(['evaluation', 'smoke', 'fixture', 'test']);
const isReviewableRecord = (item) => {
  if (item?.fromD1) return true;
  if (excludedOrigins.has(String(item?.origin || '').toLowerCase())) return false;
  const inputType = String(item?.inputType || 'text').toLowerCase();
  const rawText = [item?.input, item?.text, item?.normalized, item?.extractedText, item?.classification?.reason].filter(Boolean).join(' ');
  const candidateText = item?.canonical || item?.normalized || item?.extractedText || item?.input || item?.text || '';
  if (!candidateText || meaningfulTokens(candidateText).length < 2) return false;
  if (inputType === 'audio' && (!item?.extractedText || operationalFailurePattern.test(rawText))) return false;
  if (inputType === 'image' && operationalFailurePattern.test(rawText)) return false;
  if (operationalFailurePattern.test(rawText)) return false;
  if (/^(?:audio|screenshot|image|archivo|file)\b/i.test(String(candidateText).trim())) return false;
  if (/^(?:\/|[a-z]:\\|https?:\/\/localhost)/i.test(String(item?.input || ''))) return false;
  return true;
};

const readText = async (path) => {
  try { return await readFile(path, 'utf8'); } catch { return ''; }
};
const parseD1Clusters = (value) => {
  let parsed;
  try { parsed = JSON.parse(value); } catch { return []; }
  const possible = Array.isArray(parsed) ? parsed.flatMap((item) => item?.results || []) : parsed?.results || parsed?.clusters || [];
  return asArray(possible).map((item) => ({
    id: item.id,
    signature: item.canonical_signature || item.signature,
    semanticSignature: item.semantic_signature || item.semanticSignature,
    text: item.canonical_text || item.text,
    count: Number(item.query_count ?? item.count ?? 0),
    count7d: Number(item.count_7d ?? item.count7d ?? 0),
    count30d: Number(item.count_30d ?? item.count30d ?? item.count ?? 0),
    lastSeen: item.last_seen_at || item.lastSeenAt,
    firstSeen: item.first_seen_at || item.firstSeenAt,
    coverageStatus: item.coverage_status || item.coverageStatus || 'uncovered',
    reviewStatus: item.review_status || item.reviewStatus || 'unreviewed',
    linkedClaimSlug: item.linked_claim_slug || item.linkedClaimSlug || null,
    sourceIds: asArray(item.source_ids || item.sourceIds),
    fromD1: true,
  })).filter((item) => item.signature || item.text);
};

const clusterRecords = (records) => {
  const clusters = new Map();
  for (const item of records) {
    const createdAt = item.createdAt || item.lastSeen || item.lastSeenAt || new Date().toISOString();
    const normalized = item.canonical || item.normalized || item.signature || normalise(item.input || item.extractedText || item.text);
    if (!normalized) continue;
    let clusterKey = item.semanticSignature || item.signature || normalized;
    const surfaceSignature = item.signature || item.canonical || item.normalized || normalized;
    if (!clusters.has(clusterKey)) {
      const related = relatedClusterFor(clusters, clusterKey, normalized);
      if (related) clusterKey = related.signature;
    }
    const current = clusters.get(clusterKey) || {
      id: item.id || `cluster-${normalise(clusterKey).replace(/ /g, '-').slice(0, 72)}`,
      signature: clusterKey,
      surfaceSignatures: surfaceSignature !== clusterKey ? [surfaceSignature] : [],
      text: publicText(item.text || item.canonical || item.normalized || normalized),
      count: 0,
      count7d: 0,
      count30d: 0,
      statuses: {},
      inputTypes: {},
      firstSeen: '',
      lastSeen: '',
      sourceIds: [],
      coverageStatus: 'uncovered',
      reviewStatus: 'unreviewed',
      linkedClaimSlug: null,
    };
    if (item.fromD1) {
      current.count = Math.max(current.count, Number(item.count) || 0);
      current.count7d = Math.max(current.count7d, Number(item.count7d) || 0);
      current.count30d = Math.max(current.count30d, Number(item.count30d) || 0);
      current.id = item.id || current.id;
      current.text = publicText(item.text || current.text);
      current.firstSeen = earliest(current.firstSeen, item.firstSeen);
      current.lastSeen = latest(current.lastSeen, item.lastSeen);
      current.coverageStatus = item.coverageStatus || current.coverageStatus;
      current.reviewStatus = item.reviewStatus || current.reviewStatus;
      current.linkedClaimSlug = item.linkedClaimSlug || current.linkedClaimSlug;
      current.sourceIds = [...new Set([...current.sourceIds, ...asArray(item.sourceIds)])].slice(0, 20);
      if (surfaceSignature !== current.signature) current.surfaceSignatures = [...new Set([...current.surfaceSignatures, surfaceSignature])].slice(0, 10);
      clusters.set(clusterKey, current);
      continue;
    }
    current.count += 1;
    if (timestamp(createdAt) >= sevenDaysAgo) current.count7d += 1;
    if (timestamp(createdAt) >= thirtyDaysAgo) current.count30d += 1;
    const status = item.status || (item.classification?.slug === 'none' ? 'uncovered' : item.classification?.slug) || 'unreviewed';
    const inputType = item.inputType || 'text';
    increment(current.statuses, status);
    increment(current.inputTypes, inputType);
    current.firstSeen = earliest(current.firstSeen, createdAt);
    current.lastSeen = latest(current.lastSeen, createdAt);
    current.sourceIds = [...new Set([...current.sourceIds, ...asArray(item.sourceIds)])].slice(0, 20);
    if (surfaceSignature !== current.signature) current.surfaceSignatures = [...new Set([...current.surfaceSignatures, surfaceSignature])].slice(0, 10);
    if (status === 'complete' || status === 'covered') current.coverageStatus = 'covered';
    else if (status === 'partial' && current.coverageStatus !== 'covered') current.coverageStatus = 'partial';
    clusters.set(clusterKey, current);
  }
  return [...clusters.values()].map((cluster) => {
    const unresolved = (cluster.statuses.uncovered || 0) + (cluster.statuses.draft || 0) + (cluster.statuses.partial || 0) || (cluster.coverageStatus !== 'covered' ? cluster.count : 0);
    const unresolvedRate = cluster.count ? unresolved / cluster.count : 0;
    const recentCount = cluster.count7d || (timestamp(cluster.lastSeen) >= sevenDaysAgo ? cluster.count : 0);
    const baseline = Math.max(1, cluster.count30d - recentCount);
    const growthRate = recentCount ? Math.round((recentCount / baseline) * 100) / 100 : 0;
    const newlyCovered = cluster.coverageStatus === 'covered' && cluster.reviewStatus !== 'published';
    const evidenceAvailability = cluster.sourceIds.length ? 1.2 : 1;
    const momentum = 1 + Math.min(growthRate, 4) * 0.15;
    const priorityScore = Math.round(cluster.count * Math.max(unresolvedRate, newlyCovered ? 0.25 : 0) * evidenceAvailability * harmWeight(cluster.text) * momentum * 100) / 100;
    return {
      ...cluster,
      text: cluster.text || `Afirmación sobre ${cluster.signature}`,
      exampleCount: cluster.count,
      growthRate,
      newlyCovered,
      unresolved: !newlyCovered && cluster.coverageStatus !== 'covered',
      reason: newlyCovered ? 'Nueva cobertura disponible: necesita revisión antes de publicarse.' : cluster.sourceIds.length ? 'Tiene fuentes candidatas: comprobar cobertura directa y límites.' : 'Sin fuentes vinculadas: investigar o marcar como no verificable.',
      priorityScore,
    };
  }).sort((left, right) => right.priorityScore - left.priorityScore || right.count - left.count || right.lastSeen.localeCompare(left.lastSeen));
};

const localRaw = await readText(inputPath);
const parsedLocalRecords = localRaw.split('\n').filter(Boolean).flatMap((line) => {
  try { return [JSON.parse(line)]; } catch { return []; }
});
const excludedReasons = {};
const localRecords = parsedLocalRecords.filter((item) => {
  if (isReviewableRecord(item)) return true;
  const reason = item?.inputType === 'audio' && !item?.extractedText ? 'media_without_text' : operationalFailurePattern.test([item?.input, item?.text, item?.extractedText, item?.classification?.reason].filter(Boolean).join(' ')) ? 'operational_failure' : 'low_signal';
  increment(excludedReasons, reason);
  return false;
});
const d1Records = d1InputPath ? parseD1Clusters(await readText(d1InputPath)) : [];
if (!localRecords.length && !d1Records.length) {
  console.log('No local or exported operational knowledge gaps yet.');
  process.exit(0);
}
const result = clusterRecords([...localRecords, ...d1Records]);
await writeFile(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), inputs: { localRecords: localRecords.length, parsedLocalRecords: parsedLocalRecords.length, excludedLocalRecords: parsedLocalRecords.length - localRecords.length, excludedReasons, d1Clusters: d1Records.length }, clusters: result }, null, 2));
console.log(`Knowledge-gap review queue written: ${result.length} clusters from ${localRecords.length} reviewable local records and ${d1Records.length} D1 clusters; excluded ${parsedLocalRecords.length - localRecords.length} low-signal or failed records.`);
