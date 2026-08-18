import { access, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const directory = new URL('../content/claims/', import.meta.url).pathname;
const sourceDirectory = new URL('../content/sources/', import.meta.url).pathname;
const evidenceDirectory = new URL('../content/evidence/', import.meta.url).pathname;
const failures = [];
const list = (raw, key) => {
  const value = raw.match(new RegExp(`^${key}:\\s*(\\[.*?\\])`, 'm'))?.[1] || '[]';
  try { return JSON.parse(value); } catch { return []; }
};
const numericVisualValue = (value) => {
  const compact = String(value).replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
  return Number(compact);
};
for (const file of (await readdir(directory)).filter((item) => item.endsWith('.md'))) {
  const raw = await readFile(join(directory, file), 'utf8');
  const frontmatter = raw.match(/^---\s*\n([\s\S]*?)\n---/m)?.[1] || '';
  const body = raw.replace(/^---\s*[\s\S]*?\n---\s*/m, '');
  const status = frontmatter.match(/^status:\s*([^\n]+)/m)?.[1]?.trim();
  const basis = frontmatter.match(/^basis:\s*([^\n]+)/m)?.[1]?.trim() || 'sourced';
  if (status !== 'published') continue;
  const evidenceIds = list(frontmatter, 'evidenceIds');
  const sourceRefs = list(frontmatter, 'sourceRefs');
  const visualType = frontmatter.match(/^visualType:\s*([^\n]+)/m)?.[1]?.trim();
  const visualLabels = list(frontmatter, 'visualComparisonLabels');
  const visualValues = list(frontmatter, 'visualComparisonValues');
  if (basis === 'sourced' && (!evidenceIds.length || !sourceRefs.length)) failures.push(`${file}: sourced publication requires evidenceIds and sourceRefs`);
  for (const id of sourceRefs) {
    try { await access(join(sourceDirectory, `${id}.md`)); } catch { failures.push(`${file}: sourceRef has no source snapshot: ${id}`); }
  }
  for (const id of evidenceIds) {
    try { await access(join(evidenceDirectory, `${id}.md`)); } catch { failures.push(`${file}: evidenceId has no evidence record: ${id}`); }
  }
  if (basis === 'sourced' && /\b\d+(?:[,.]\d+)?\s*(?:%|€|euros?|por\s+mil|millones?|mil)\b/i.test(body) && !evidenceIds.length) failures.push(`${file}: displayed numeric claim has no evidenceIds`);
  if (visualType === 'comparison') {
    if (!visualLabels.length || visualLabels.length !== visualValues.length) failures.push(`${file}: comparison visual labels and values must be paired`);
    if (!evidenceIds.length) failures.push(`${file}: comparison visual requires evidenceIds`);
    if (visualValues.some((value) => !Number.isFinite(numericVisualValue(value)))) failures.push(`${file}: comparison visual contains a non-numeric value`);
  }
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Publication evidence validation passed: sourced claims have traceable evidence and numeric claims are gated.');
