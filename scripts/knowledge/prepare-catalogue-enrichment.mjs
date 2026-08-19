import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const claimsDir = path.join(root, 'content/claims');
const output = path.join(root, '.local/catalogue-enrichment-queue.json');
const queue = [];
for (const file of (await readdir(claimsDir)).filter((name) => name.endsWith('.md'))) {
  const raw = await readFile(path.join(claimsDir, file), 'utf8');
  const frontmatter = raw.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] || '';
  const field = (name) => frontmatter.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1]?.trim() || '';
  if (field('basis') !== 'model' || field('status') !== 'planned') continue;
  const claim = field('claim').replace(/^['"]|['"]$/g, '');
  const topics = (() => { try { return JSON.parse(field('topicSlugs')); } catch { return []; } })();
  queue.push({ slug: field('slug') || file.replace(/\.md$/, ''), claim, topics, priority: topics.some((topic) => /vivienda|empleo|salario|sanidad|corrup|inmigr/i.test(topic)) ? 'high' : 'normal' });
}
queue.sort((left, right) => (left.priority === 'high' ? -1 : 1) - (right.priority === 'high' ? -1 : 1) || left.slug.localeCompare(right.slug));
await writeFile(output, JSON.stringify({ generatedAt: new Date().toISOString(), total: queue.length, policy: 'Research and deterministic evidence gates are required before upgrading basis from model to sourced.', queue }, null, 2));
console.log(`Catalogue enrichment queue written: ${queue.length} model entries -> ${output}`);
