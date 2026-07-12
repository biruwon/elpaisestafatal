import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const source = await readFile(join(root, 'src/data/claims.ts'), 'utf8');
const rows = [...source.matchAll(/^\{slug:'([^']+)',claim:'([^']*)',assessment:'([^']+)',topic:'([^']+)',topicSlug:'([^']+)',whatIsTrue:'([^']*)',whatIsMissing:'([^']*)',scale:'([^']*)',cannotProve:'([^']*)',shareable:'([^']*)',keywords:\[([^\]]*)\]/gm)];
if (rows.length !== 20) throw new Error(`Expected 20 legacy claims, found ${rows.length}`);
const target = join(root, 'content/claims');
await mkdir(target, { recursive: true });
for (const row of rows) {
  const [, slug, claim, assessment, , topicSlug, whatIsTrue, whatIsMissing, scale, cannotProve, shareable, keywords] = row;
  const terms = keywords.split(',').map((item) => item.trim()).filter(Boolean);
  const frontmatter = [
    '---', `slug: ${slug}`, `claim: ${JSON.stringify(claim)}`, `assessment: ${assessment}`, `topicSlugs: ${JSON.stringify([topicSlug])}`,
    `aliases: ${JSON.stringify(terms)}`, 'claimType: mixed', 'evidenceStrength: medium', 'geography: España', 'period: 2025-2026', 'reviewed: 2026-07-12', 'status: published',
    `sourceTopic: ${topicSlug}`, `sourceRefs: ${JSON.stringify([`${topicSlug}-source-registry`])}`, `evidenceIds: ${JSON.stringify([`${topicSlug}-evidence-registry`])}`, '---', '',
    '## Qué es cierto', '', whatIsTrue, '', '## Qué falta', '', whatIsMissing, '', '## Escala', '', scale, '', '## Límite', '', cannotProve, '', '## Respuesta compartible', '', shareable, '',
  ].join('\n');
  await writeFile(join(target, `${slug}.md`), frontmatter);
}
console.log(`Migrated ${rows.length} claims to Markdown.`);
