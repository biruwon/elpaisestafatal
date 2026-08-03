import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const failures = [];
const [layout, homepage, search, claimCatalogue, topicPage] = await Promise.all([
  read('src/layouts/BaseLayout.astro'),
  read('dist/index.html'),
  read('dist/buscar/index.html'),
  read('dist/afirmaciones/index.html'),
  read('dist/preocupaciones/vivienda/index.html'),
]);

for (const [name, page] of [['homepage', homepage], ['search', search], ['claim catalogue', claimCatalogue], ['topic page', topicPage]]) {
  if (!page.includes('class="site-header"')) failures.push(`${name} is missing the global header`);
  if (!page.includes('href="/buscar"')) failures.push(`${name} is missing the direct search path`);
  if (!page.includes('href="/#comprobar"')) failures.push(`${name} is missing the direct checker path`);
}
if (!layout.includes('const isSearch')) failures.push('layout has no search route state');
if (!layout.includes("'is-current': isSearch") || !layout.includes('aria-current={isSearch ? \'page\' : undefined}')) failures.push('search navigation has no route-aware active state');
if (!layout.includes('position:sticky') || !layout.includes('scroll-padding-top')) failures.push('global navigation is not persistent or anchor-safe');
if (!layout.includes('a:focus-visible')) failures.push('global navigation has no visible keyboard focus treatment');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Global navigation UX passed: persistent checker/search paths, active state, focus treatment, and anchor-safe scrolling are present.');
