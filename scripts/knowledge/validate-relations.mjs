import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const contentRoot = new URL('../../content/', import.meta.url).pathname;
const records = [];

const walk = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (file.endsWith('.md') && !file.endsWith('/README.md')) records.push({ file, raw: await readFile(file, 'utf8') });
  }
};

const frontmatter = (raw) => {
  const block = raw.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] || '';
  return Object.fromEntries(block.split('\n').flatMap((line) => {
    const index = line.indexOf(':');
    return index >= 0 ? [[line.slice(0, index).trim(), line.slice(index + 1).trim()]] : [];
  }));
};

const list = (value) => {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

await walk(contentRoot);

const sources = new Set(records.filter(({ file }) => file.includes('/sources/')).map(({ raw }) => frontmatter(raw).id));
const evidence = new Map(records.filter(({ file }) => file.includes('/evidence/')).map(({ raw }) => {
  const data = frontmatter(raw);
  return [data.id, data];
}));
const claims = records.filter(({ file }) => file.includes('/claims/')).map(({ file, raw }) => ({ file, ...frontmatter(raw) }));
const failures = [];

for (const item of records.filter(({ file }) => file.includes('/evidence/'))) {
  const data = frontmatter(item.raw);
  if (!data.id) failures.push(`${item.file}: evidence is missing id`);
  for (const sourceId of list(data.sourceIds)) {
    if (!sources.has(sourceId)) failures.push(`${item.file}: evidence references missing source ${sourceId}`);
  }
}

for (const claim of claims) {
  for (const sourceId of list(claim.sourceRefs)) {
    if (!sources.has(sourceId)) failures.push(`${claim.file}: claim references missing source ${sourceId}`);
  }
  for (const evidenceId of list(claim.evidenceIds)) {
    if (!evidence.has(evidenceId)) failures.push(`${claim.file}: claim references missing evidence ${evidenceId}`);
  }
  if (claim.status === 'published' && list(claim.evidenceIds).length === 0) {
    failures.push(`${claim.file}: published claim has no evidence references`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Knowledge relations passed: ${claims.length} claims, ${evidence.size} evidence records, ${sources.size} sources.`);
