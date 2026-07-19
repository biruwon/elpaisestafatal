import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const inputPath = join(root, '.local/knowledge-gaps.jsonl');
const outputPath = join(root, '.local/query-clusters.json');
let raw;
try { raw = await readFile(inputPath, 'utf8'); } catch { console.log('No local knowledge gaps yet.'); process.exit(0); }

const clusters = new Map();
const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 12000);
for (const line of raw.split('\n')) {
  if (!line.trim()) continue;
  try {
    const item = JSON.parse(line);
    const normalized = item.normalized || normalise(item.input || item.extractedText);
    if (!normalized) continue;
    const current = clusters.get(normalized) || { signature: normalized, text: normalized, count: 0, statuses: {}, inputTypes: {}, firstSeen: item.createdAt, lastSeen: item.createdAt, sourceIds: [] };
    current.count += 1;
    const status = item.status || (item.classification?.slug === 'none' ? 'uncovered' : item.classification?.slug) || 'unreviewed';
    const inputType = item.inputType || 'text';
    current.statuses[status] = (current.statuses[status] || 0) + 1;
    current.inputTypes[inputType] = (current.inputTypes[inputType] || 0) + 1;
    current.firstSeen = current.firstSeen < item.createdAt ? current.firstSeen : item.createdAt;
    current.lastSeen = current.lastSeen > item.createdAt ? current.lastSeen : item.createdAt;
    current.sourceIds = [...new Set([...current.sourceIds, ...(Array.isArray(item.sourceIds) ? item.sourceIds : [])])].slice(0, 10);
    clusters.set(normalized, current);
  } catch { /* Ignore one malformed local record. */ }
}

const result = [...clusters.values()].sort((left, right) => right.count - left.count || right.lastSeen.localeCompare(left.lastSeen));
await writeFile(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), clusters: result }, null, 2));
console.log(`Knowledge-gap clusters written: ${result.length} clusters from ${raw.split('\n').filter(Boolean).length} records.`);
