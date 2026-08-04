import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createLocalInferenceProvider } from '../local-inference-provider.mjs';

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
const publishedClaimRecords = async () => {
  const directory = join(root, 'content/claims');
  let files = [];
  try { files = (await readdir(directory)).filter((file) => file.endsWith('.md')); } catch { return []; }
  return (await Promise.all(files.map(async (file) => {
    const frontmatter = parseFrontmatter(await readFile(join(directory, file), 'utf8'));
    if (frontmatter.status !== 'published' || !frontmatter.slug || !frontmatter.claim) return null;
    return {
      slug: scalar(frontmatter.slug),
      phrases: [scalar(frontmatter.claim), ...list(frontmatter.aliases)],
    };
  }))).filter(Boolean);
};
const stripConversationWrapper = (value) => normalise(value)
  .replace(/^(?:es verdad que|de verdad|segun los datos|en el grupo dicen que|mi cunado insiste|he leido esto|que hay de cierto en que)\s+/, '')
  .replace(/^no me creo que\s+/, '')
  .replace(/\s+y por eso todo va peor$/, '')
  .replace(/[?¿.!]+$/g, '')
  .trim();
const publishedClaimFor = (record, publishedClaims) => {
  const values = [record?.canonical, record?.normalized, record?.text, record?.extractedText, record?.input]
    .filter(Boolean).map(stripConversationWrapper).filter(Boolean);
  if (!values.length) return null;
  return publishedClaims.find((claim) => {
    const phrases = claim.phrases.map(stripConversationWrapper).filter(Boolean);
    return values.some((value) => phrases.includes(value));
  }) || null;
};

const meaningfulTokens = (value) => [...tokens(value)].filter((token) => token.length >= 3);
const operationalFailurePattern = /ollama|local transcription|transcription (?:is )?unavailable|audio input requires|no se ejecuto|fetch failed|provider|runtime (?:is )?not installed|screenshot attached/i;
const excludedOrigins = new Set(['evaluation', 'smoke', 'fixture', 'test']);
const discoverySourceId = (value) => /(?:^|-)discovery-/i.test(String(value || ''));
const directSourceIds = (values) => asArray(values).filter((value) => !discoverySourceId(value));
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
    triageStatus: item.triage_status || item.triageStatus || 'untriaged',
    triagePriority: Number(item.triage_priority ?? item.triagePriority ?? 0),
    triageNextAction: item.triage_next_action || item.triageNextAction || null,
    triagedAt: item.triaged_at || item.triagedAt || null,
    sourceIds: asArray(item.source_ids || item.sourceIds),
    fromD1: true,
  })).filter((item) => item.signature || item.text);
};

const clusterRecords = (records, publishedClaims = []) => {
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
    const publishedClaim = publishedClaimFor(item, publishedClaims);
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
      linkedClaimReason: null,
    };
    if (publishedClaim) {
      current.coverageStatus = 'covered';
      current.reviewStatus = 'published';
      current.linkedClaimSlug = publishedClaim.slug;
      current.linkedClaimReason = 'Matched to a published claim by canonical wording or alias.';
    }
    if (item.fromD1) {
      current.count = Math.max(current.count, Number(item.count) || 0);
      current.count7d = Math.max(current.count7d, Number(item.count7d) || 0);
      current.count30d = Math.max(current.count30d, Number(item.count30d) || 0);
      current.id = item.id || current.id;
      current.text = publicText(item.text || current.text);
      current.firstSeen = earliest(current.firstSeen, item.firstSeen);
      current.lastSeen = latest(current.lastSeen, item.lastSeen);
      if (current.coverageStatus !== 'covered') current.coverageStatus = item.coverageStatus || current.coverageStatus;
      if (current.reviewStatus !== 'published') current.reviewStatus = item.reviewStatus || current.reviewStatus;
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
    const unresolved = cluster.linkedClaimSlug
      ? 0
      : (cluster.statuses.uncovered || 0) + (cluster.statuses.draft || 0) + (cluster.statuses.partial || 0) || (cluster.coverageStatus !== 'covered' ? cluster.count : 0);
    const unresolvedRate = cluster.count ? unresolved / cluster.count : 0;
    const recentCount = cluster.count7d || (timestamp(cluster.lastSeen) >= sevenDaysAgo ? cluster.count : 0);
    const baseline = Math.max(1, cluster.count30d - recentCount);
    const growthRate = recentCount ? Math.round((recentCount / baseline) * 100) / 100 : 0;
    const newlyCovered = cluster.coverageStatus === 'covered' && cluster.reviewStatus !== 'published';
    const directSources = directSourceIds(cluster.sourceIds);
    const evidenceAvailability = directSources.length ? 1.2 : cluster.sourceIds.length ? 0.9 : 1;
    const momentum = 1 + Math.min(growthRate, 4) * 0.15;
    const priorityScore = Math.round(cluster.count * Math.max(unresolvedRate, newlyCovered ? 0.25 : 0) * evidenceAvailability * harmWeight(cluster.text) * momentum * 100) / 100;
    return {
      ...cluster,
      text: cluster.text || `Afirmación sobre ${cluster.signature}`,
      exampleCount: cluster.count,
      growthRate,
      newlyCovered,
      unresolved: !newlyCovered && cluster.coverageStatus !== 'covered',
      reason: cluster.linkedClaimSlug
        ? cluster.linkedClaimReason || 'Ya existe una ficha publicada para esta formulación.'
        : newlyCovered
          ? 'Nueva cobertura disponible: necesita revisión antes de publicarse.'
          : directSources.length
            ? 'Tiene fuentes directas o candidatas: comprobar cobertura, geografía y límites.'
            : cluster.sourceIds.length
              ? 'Solo tiene fuentes de descubrimiento: sirven como pistas, no como evidencia suficiente.'
            : 'Sin fuentes vinculadas: investigar o marcar como no verificable.',
      priorityScore,
    };
  }).sort((left, right) => right.priorityScore - left.priorityScore || right.count - left.count || right.lastSeen.localeCompare(left.lastSeen));
};

const refreshCluster = (cluster) => {
  const unresolved = cluster.linkedClaimSlug
    ? 0
    : (cluster.statuses?.uncovered || 0) + (cluster.statuses?.draft || 0) + (cluster.statuses?.partial || 0) || (cluster.coverageStatus !== 'covered' ? cluster.count : 0);
  const unresolvedRate = cluster.count ? unresolved / cluster.count : 0;
  const recentCount = cluster.count7d || (timestamp(cluster.lastSeen) >= sevenDaysAgo ? cluster.count : 0);
  const baseline = Math.max(1, cluster.count30d - recentCount);
  const growthRate = recentCount ? Math.round((recentCount / baseline) * 100) / 100 : 0;
  const newlyCovered = cluster.coverageStatus === 'covered' && cluster.reviewStatus !== 'published';
  const directSources = directSourceIds(cluster.sourceIds);
  const evidenceAvailability = directSources.length ? 1.2 : cluster.sourceIds.length ? 0.9 : 1;
  const momentum = 1 + Math.min(growthRate, 4) * 0.15;
  const priorityScore = Math.round(cluster.count * Math.max(unresolvedRate, newlyCovered ? 0.25 : 0) * evidenceAvailability * harmWeight(cluster.text) * momentum * 100) / 100;
  return {
    ...cluster,
    text: cluster.text || `Afirmación sobre ${cluster.signature}`,
    exampleCount: cluster.count,
    growthRate,
    newlyCovered,
    unresolved: !newlyCovered && cluster.coverageStatus !== 'covered',
    reason: cluster.linkedClaimSlug
      ? cluster.linkedClaimReason || 'Ya existe una ficha publicada para esta formulación.'
      : newlyCovered
        ? 'Nueva cobertura disponible: necesita revisión antes de publicarse.'
        : directSources.length
          ? 'Tiene fuentes directas o candidatas: comprobar cobertura, geografía y límites.'
          : cluster.sourceIds.length
            ? 'Solo tiene fuentes de descubrimiento: sirven como pistas, no como evidencia suficiente.'
            : 'Sin fuentes vinculadas: investigar o marcar como no verificable.',
    priorityScore,
  };
};

const mergeClusterMetadata = (left, right) => {
  if (left.linkedClaimSlug && right.linkedClaimSlug && left.linkedClaimSlug !== right.linkedClaimSlug) return null;
  const sumMaps = (first = {}, second = {}) => Object.entries(second).reduce((result, [key, value]) => {
    result[key] = (result[key] || 0) + Number(value || 0);
    return result;
  }, { ...first });
  const isCovered = (value) => ['covered', 'complete', 'published'].includes(String(value || '').toLowerCase());
  const isPartial = (value) => String(value || '').toLowerCase() === 'partial';
  const coverageStatus = isCovered(left.coverageStatus) || isCovered(right.coverageStatus)
    ? 'covered'
    : isPartial(left.coverageStatus) || isPartial(right.coverageStatus) ? 'partial' : 'uncovered';
  const reviewStatus = left.reviewStatus === 'published' || right.reviewStatus === 'published'
    ? 'published'
    : left.reviewStatus === 'reviewed' || right.reviewStatus === 'reviewed' ? 'reviewed' : 'unreviewed';
  return refreshCluster({
    ...left,
    count: left.count + right.count,
    count7d: left.count7d + right.count7d,
    count30d: left.count30d + right.count30d,
    statuses: sumMaps(left.statuses, right.statuses),
    inputTypes: sumMaps(left.inputTypes, right.inputTypes),
    firstSeen: earliest(left.firstSeen, right.firstSeen),
    lastSeen: latest(left.lastSeen, right.lastSeen),
    sourceIds: [...new Set([...asArray(left.sourceIds), ...asArray(right.sourceIds)])].slice(0, 20),
    surfaceSignatures: [...new Set([
      ...asArray(left.surfaceSignatures),
      left.signature,
      ...asArray(right.surfaceSignatures),
      right.signature,
    ])].filter(Boolean).slice(0, 100),
    coverageStatus,
    reviewStatus,
    linkedClaimSlug: left.linkedClaimSlug || right.linkedClaimSlug || null,
    linkedClaimReason: left.linkedClaimReason || right.linkedClaimReason || null,
  });
};

const cosine = (left, right) => {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length || !left.length) return 0;
  let dot = 0; let leftNorm = 0; let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    const a = Number(left[index]); const b = Number(right[index]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    dot += a * b; leftNorm += a * a; rightNorm += b * b;
  }
  return leftNorm && rightNorm ? dot / Math.sqrt(leftNorm * rightNorm) : 0;
};

const embedForClustering = async (clusters, endpoint, model, timeoutMs) => {
  const inference = createLocalInferenceProvider({ endpoint });
  if (inference.kind !== 'local') throw new Error('Embedding provider is unavailable');
  const vectors = [];
  for (let offset = 0; offset < clusters.length; offset += 32) {
    const batch = clusters.slice(offset, offset + 32).map((cluster) => String(cluster.text || '').slice(0, 1200));
    const payload = await inference.embed({ model, input: batch, keep_alive: -1 }, timeoutMs);
    if (!Array.isArray(payload.embeddings) || payload.embeddings.length !== batch.length) throw new Error('Embedding response length is invalid');
    if (payload.embeddings.some((vector) => !Array.isArray(vector) || !vector.length || vector.some((value) => !Number.isFinite(Number(value))))) throw new Error('Embedding response contains invalid vectors');
    vectors.push(...payload.embeddings);
  }
  return vectors;
};

const mergeByLocalEmbeddings = async (clusters) => {
  const endpoint = args.get('embedding-endpoint') || process.env.GAP_CLUSTER_EMBEDDING_ENDPOINT || '';
  const model = args.get('embedding-model') || process.env.GAP_CLUSTER_EMBEDDING_MODEL || process.env.OLLAMA_EMBED_MODEL || 'bge-m3';
  const configuredThreshold = Number(args.get('embedding-threshold') || process.env.GAP_CLUSTER_EMBEDDING_THRESHOLD || 0.88);
  const configuredMaxClusters = Number(args.get('embedding-max') || process.env.GAP_CLUSTER_EMBEDDING_MAX || 2000);
  const threshold = Math.min(0.99, Math.max(0.75, Number.isFinite(configuredThreshold) ? configuredThreshold : 0.88));
  const maxClusters = Math.max(1, Number.isFinite(configuredMaxClusters) ? Math.floor(configuredMaxClusters) : 2000);
  if (!endpoint) return { clusters, metadata: { enabled: false, model, threshold, merged: 0, skipped: 'endpoint_not_configured' } };
  if (!/^https?:\/\/127\.0\.0\.1(?::\d+)?(?:\/|$)/i.test(endpoint) && !/^https?:\/\/localhost(?::\d+)?(?:\/|$)/i.test(endpoint)) {
    return { clusters, metadata: { enabled: false, model, threshold, merged: 0, skipped: 'non_local_embedding_endpoint_rejected' } };
  }
  const candidates = clusters.slice(0, maxClusters);
  try {
    const vectors = await embedForClustering(candidates, endpoint, model, 30000);
    const merged = [];
    let mergeCount = 0;
    candidates.forEach((candidate, index) => {
      let targetIndex = -1;
      for (let candidateIndex = 0; candidateIndex < merged.length; candidateIndex += 1) {
        const target = merged[candidateIndex];
        if (!compatibleSemanticFamily(target.signature, candidate.signature)) continue;
        if (target.linkedClaimSlug && candidate.linkedClaimSlug && target.linkedClaimSlug !== candidate.linkedClaimSlug) continue;
        const targetVector = target.__embedding;
        if (cosine(targetVector, vectors[index]) >= threshold) { targetIndex = candidateIndex; break; }
      }
      if (targetIndex < 0) merged.push({ ...candidate, __embedding: vectors[index] });
      else {
        const target = merged[targetIndex];
        const combined = mergeClusterMetadata(target, candidate);
        if (combined) merged[targetIndex] = { ...combined, __embedding: target.__embedding };
        else merged.push({ ...candidate, __embedding: vectors[index] });
        if (combined) mergeCount += 1;
      }
    });
    const untouched = clusters.slice(maxClusters);
    return {
      clusters: [...merged, ...untouched].map(({ __embedding, ...cluster }) => cluster).sort((left, right) => right.priorityScore - left.priorityScore || right.count - left.count || right.lastSeen.localeCompare(left.lastSeen)),
      metadata: { enabled: true, model, threshold, merged: mergeCount, embedded: candidates.length, skipped: untouched.length ? `max_clusters_${maxClusters}` : null },
    };
  } catch (error) {
    return { clusters, metadata: { enabled: false, model, threshold, merged: 0, skipped: error instanceof Error ? error.message : 'embedding_failed' } };
  }
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
const publishedClaims = await publishedClaimRecords();
const initialClusters = clusterRecords([...localRecords, ...d1Records], publishedClaims);
const semanticResult = await mergeByLocalEmbeddings(initialClusters);
await writeFile(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), inputs: { localRecords: localRecords.length, parsedLocalRecords: parsedLocalRecords.length, excludedLocalRecords: parsedLocalRecords.length - localRecords.length, excludedReasons, d1Clusters: d1Records.length }, semanticClustering: semanticResult.metadata, clusters: semanticResult.clusters }, null, 2));
console.log(`Knowledge-gap review queue written: ${semanticResult.clusters.length} clusters from ${localRecords.length} reviewable local records and ${d1Records.length} D1 clusters; excluded ${parsedLocalRecords.length - localRecords.length} low-signal or failed records. Local semantic merge: ${semanticResult.metadata.enabled ? `${semanticResult.metadata.merged} merged` : `not used (${semanticResult.metadata.skipped})`}.`);
