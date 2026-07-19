import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const inputPath = join(root, '.local/knowledge-gaps.jsonl');
const outputPath = join(root, '.local/query-clusters.json');
let raw;
try { raw = await readFile(inputPath, 'utf8'); } catch { console.log('No local knowledge gaps yet.'); process.exit(0); }

const clusters = new Map();
const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 12000);
const tokens = (value) => new Set(normalise(value).split(' ').filter((token) => token.length > 2 && !['como', 'esta', 'este', 'para', 'pero', 'que', 'sus', 'tiene', 'una', 'uno', 'en', 'el', 'la', 'los', 'las', 'un', 'del', 'de', 'y', 'o', 'a', 'por', 'con', 'segun', 'dicen', 'grupo', 'insiste', 'hay', 'datos', 'todo', 'va', 'peor'].includes(token)));
const similarity = (left, right) => {
  const a = tokens(left); const b = tokens(right);
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / (a.size + b.size - overlap);
};
const harmWeight = (value) => /inmigr|delinc|crimen|violenc|salud|eleccion|corrup|ayuda|viviend/.test(normalise(value)) ? 1.5 : 1;
for (const line of raw.split('\n')) {
  if (!line.trim()) continue;
  try {
    const item = JSON.parse(line);
    const normalized = item.canonical || item.normalized || normalise(item.input || item.extractedText);
    if (!normalized) continue;
    let clusterKey = normalized;
    if (!clusters.has(clusterKey)) {
      const related = [...clusters.values()].find((candidate) => candidate.count >= 1 && similarity(candidate.signature, normalized) >= 0.62);
      if (related) clusterKey = related.signature;
    }
    const current = clusters.get(clusterKey) || { signature: clusterKey, text: normalized, count: 0, statuses: {}, inputTypes: {}, firstSeen: item.createdAt, lastSeen: item.createdAt, sourceIds: [] };
    current.count += 1;
    const status = item.status || (item.classification?.slug === 'none' ? 'uncovered' : item.classification?.slug) || 'unreviewed';
    const inputType = item.inputType || 'text';
    current.statuses[status] = (current.statuses[status] || 0) + 1;
    current.inputTypes[inputType] = (current.inputTypes[inputType] || 0) + 1;
    current.firstSeen = current.firstSeen < item.createdAt ? current.firstSeen : item.createdAt;
    current.lastSeen = current.lastSeen > item.createdAt ? current.lastSeen : item.createdAt;
    current.sourceIds = [...new Set([...current.sourceIds, ...(Array.isArray(item.sourceIds) ? item.sourceIds : [])])].slice(0, 10);
    clusters.set(clusterKey, current);
  } catch { /* Ignore one malformed local record. */ }
}

const result = [...clusters.values()].map((cluster) => {
  const unresolved = (cluster.statuses.uncovered || 0) + (cluster.statuses.draft || 0) + (cluster.statuses.partial || 0);
  const unresolvedRate = cluster.count ? unresolved / cluster.count : 0;
  const evidenceAvailability = cluster.sourceIds.length ? 1.2 : 1;
  return { ...cluster, priorityScore: Math.round(cluster.count * unresolvedRate * evidenceAvailability * harmWeight(cluster.text) * 100) / 100 };
}).sort((left, right) => right.priorityScore - left.priorityScore || right.count - left.count || right.lastSeen.localeCompare(left.lastSeen));
await writeFile(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), clusters: result }, null, 2));
console.log(`Knowledge-gap clusters written: ${result.length} clusters from ${raw.split('\n').filter(Boolean).length} records.`);
