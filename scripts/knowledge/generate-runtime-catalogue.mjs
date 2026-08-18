import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url).pathname;
const claimsDirectory = `${root}content/claims/`;
const output = `${root}dist/claim-catalog.json`;
const list = (value) => { try { return JSON.parse(value); } catch { return []; } };
const entries = [];
let seedRecords = [];
try {
  const seed = JSON.parse(await readFile(`${root}.local/catalogue-seed.json`, 'utf8'));
  seedRecords = Array.isArray(seed.records) ? seed.records : [];
} catch { /* Seed generation is optional outside the production build. */ }

for (const file of (await readdir(claimsDirectory)).filter((name) => name.endsWith('.md'))) {
  const raw = await readFile(`${claimsDirectory}${file}`, 'utf8');
  const frontmatter = raw.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] || '';
  const field = (name) => frontmatter.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1]?.trim() || '';
  if (field('status') !== 'published') continue;
  const slug = field('slug') || file.replace(/\.md$/, '');
  const formulations = seedRecords.filter((record) => record.slug === slug).map((record) => record.formulation);
  entries.push({
    kind: 'claim', slug, title: field('claim').replace(/^['"]|['"]$/g, ''),
    href: `/afirmaciones/${slug}`,
    aliases: [...new Set([...list(field('aliases')), ...formulations])],
    keywords: list(field('topicSlugs')),
    answer: field('shareable'),
    published: true,
    evidenceIds: list(field('evidenceIds')),
    sourceRefs: list(field('sourceRefs')),
  });
}

await mkdir(`${root}dist`, { recursive: true });
await writeFile(output, JSON.stringify(entries));
console.log(`Runtime catalogue written: ${entries.length} entries -> dist/claim-catalog.json`);
