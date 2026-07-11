import { existsSync, readFileSync } from 'node:fs';

const concernsFile = readFileSync(new URL('../src/data/concerns.ts', import.meta.url), 'utf8');
const merged = new Set(['gobierno-partidos', 'problemas-politicos', 'comportamiento-politico', 'partidos-politicos', 'acuerdos-politicos', 'paro', 'crispacion-social']);
const slugs = [...concernsFile.matchAll(/slug: '([^']+)'/g)].map((match) => match[1]).filter((slug) => !merged.has(slug));
const rows = slugs.map((slug) => {
  const markdownPath = new URL(`../investigaciones/${slug}.md`, import.meta.url);
  const structuredPath = new URL(`../src/data/investigations/${slug}.ts`, import.meta.url);
  const markdown = existsSync(markdownPath) ? readFileSync(markdownPath, 'utf8') : '';
  return {
    slug,
    markdown: Boolean(markdown),
    status: markdown.match(/^status:\s*(.+)$/m)?.[1] ?? 'published',
    structured: existsSync(structuredPath),
  };
});

console.table(rows);
const missingMarkdown = rows.filter((row) => !row.markdown);
if (missingMarkdown.length) {
  console.error(`Missing Markdown sources: ${missingMarkdown.map((row) => row.slug).join(', ')}`);
  process.exitCode = 1;
}
