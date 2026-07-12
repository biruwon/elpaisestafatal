import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../content/', import.meta.url).pathname;
const validStatuses = new Set(['published', 'planned', 'in-progress']);
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (file.endsWith('.md') && !file.endsWith('/README.md')) files.push(file);
  }
}
await walk(root);

const seen = new Set();
const failures = [];
for (const file of files) {
  const raw = await readFile(file, 'utf8');
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) { failures.push(`${file}: missing frontmatter`); continue; }
  const values = Object.fromEntries(match[1].split('\n').flatMap((line) => {
    const index = line.indexOf(':');
    return index < 0 ? [] : [[line.slice(0, index).trim(), line.slice(index + 1).trim()]];
  }));
  const slug = values.slug;
  if (!slug) failures.push(`${file}: missing slug`);
  if (seen.has(slug)) failures.push(`${file}: duplicate slug ${slug}`);
  seen.add(slug);
  if (!values.title) failures.push(`${file}: missing title`);
  if (!validStatuses.has(values.status)) failures.push(`${file}: invalid status ${values.status}`);
  if (!/^\d+$/.test(values.order || '')) failures.push(`${file}: order must be an integer`);
  if (!/^\d+$/.test(values.claimCount || '')) failures.push(`${file}: claimCount must be an integer`);
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Content validation passed: ${files.length} Markdown records.`);
