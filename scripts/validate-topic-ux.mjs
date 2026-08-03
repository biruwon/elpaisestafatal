import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = new URL('../dist/', import.meta.url).pathname;
const pages = [];
const assetsRoot = join(root, '_astro');
const bundledStyles = (await Promise.all((await readdir(assetsRoot, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.css'))
  .map((entry) => readFile(join(assetsRoot, entry.name), 'utf8')))).join('\n') + await readFile(join(root, 'topic.css'), 'utf8').catch(() => '');

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (path.endsWith('/index.html') && path.includes('/preocupaciones/') && !path.endsWith('/preocupaciones/index.html')) pages.push(path);
  }
}

await walk(root);
const failures = [];
for (const file of pages) {
  const source = await readFile(file, 'utf8');
  const route = '/' + relative(root, file).replace(/\\/g, '/').replace(/index\.html$/, '');
  const required = [
    ['id="respuesta"', 'missing 60-second answer'],
    ['class="evidence"', 'missing evidence section'],
    ['class="source-section"', 'missing source section'],
    ['class="check-next"', 'missing contextual checker handoff'],
  ];
  for (const [marker, message] of required) if (!source.includes(marker)) failures.push(`${route}: ${message}`);
  if (!/<h1\b[^>]*>/.test(source)) failures.push(`${route}: missing h1`);
  if (source.includes('class="chart"')) {
    if (!source.includes('class="chart-data"')) failures.push(`${route}: chart is missing exact-value fallback`);
    if (!bundledStyles.includes('topic-bar-rise') || !bundledStyles.includes('prefers-reduced-motion')) failures.push(`${route}: chart motion is missing reduced-motion-safe behavior`);
  }

  if (source.includes('class="investigation"')) {
    for (const [marker, message] of [
      ['class="investigation-guide"', 'missing investigation reading guidance'],
      ['class="chapter-index"', 'missing chapter index'],
      ['<details class="chapter"', 'chapters are not collapsible details'],
      ['<summary class="chapter-summary"', 'missing accessible chapter summary'],
      ['class="chapter-toggle"', 'missing chapter toggle affordance'],
    ]) if (!source.includes(marker)) failures.push(`${route}: ${message}`);
    if (!/<details class="chapter"[^>]*\bopen\b/.test(source)) failures.push(`${route}: first chapter is not open by default`);
  }
}

if (pages.length !== 14) failures.push(`expected 14 topic pages, found ${pages.length}`);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Topic UX passed: ${pages.length} answer-first topic pages.`);
