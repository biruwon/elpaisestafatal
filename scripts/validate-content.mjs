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
let topicCount = 0; let claimCount = 0; let publishedClaims = 0; let plannedClaims = 0;
for (const file of files) {
  const raw = await readFile(file, 'utf8');
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) { failures.push(`${file}: missing frontmatter`); continue; }
  const values = Object.fromEntries(match[1].split('\n').flatMap((line) => {
    const index = line.indexOf(':');
    return index < 0 ? [] : [[line.slice(0, index).trim(), line.slice(index + 1).trim()]];
  }));
  if (file.includes('/sources/') || file.includes('/evidence/')) continue;
  const slug = values.slug;
  if (!slug) failures.push(`${file}: missing slug`);
  if (seen.has(slug)) failures.push(`${file}: duplicate slug ${slug}`);
  seen.add(slug);
  if (!validStatuses.has(values.status)) failures.push(`${file}: invalid status ${values.status}`);
  if (file.includes('/topics/')) {
    if (!values.title) failures.push(`${file}: missing title`);
    if (!/^\d+$/.test(values.order || '')) failures.push(`${file}: order must be an integer`);
    if (!/^\d+$/.test(values.claimCount || '')) failures.push(`${file}: claimCount must be an integer`);
  }
  if (file.includes('/claims/')) {
    claimCount += 1; if (values.status === 'published') publishedClaims += 1; if (values.status === 'planned') plannedClaims += 1;
    for (const key of ['claim','assessment','topicSlugs','aliases','claimType','evidenceStrength','geography','period','reviewed','status','sourceRefs','evidenceIds']) if (!values[key]) failures.push(`${file}: missing ${key}`);
    if (!new Set(['true','mostly-true','misleading','unsupported','uncertain','false']).has(values.assessment)) failures.push(`${file}: invalid assessment ${values.assessment}`);
    if (!new Set(['descriptive','comparative','causal','predictive','legal','normative','mixed']).has(values.claimType)) failures.push(`${file}: invalid claimType ${values.claimType}`);
    if (!new Set(['high','medium','limited','insufficient']).has(values.evidenceStrength)) failures.push(`${file}: invalid evidenceStrength ${values.evidenceStrength}`);
    if (values.status === 'published' && !raw.includes('## Qué es cierto')) failures.push(`${file}: published claim missing evidence body`);
  }
  if (file.includes('/topics/')) topicCount += 1;
}
if (topicCount !== 10) failures.push(`expected 10 planned topic records, found ${topicCount}`);
if (claimCount !== 202) failures.push(`expected 202 claim records, found ${claimCount}`);
if (publishedClaims !== 20) failures.push(`expected 20 published claims, found ${publishedClaims}`);
if (plannedClaims !== 182) failures.push(`expected 182 planned claims, found ${plannedClaims}`);
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Content validation passed: ${files.length} Markdown records.`);
