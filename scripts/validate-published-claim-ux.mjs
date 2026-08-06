import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = new URL('../dist/', import.meta.url).pathname;
const pages = [];
const assetsRoot = join(root, '_astro');
const styleSources = (await readdir(assetsRoot, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.css'))
  .map((entry) => readFile(join(assetsRoot, entry.name), 'utf8'));
const bundledStyles = (await Promise.all(styleSources)).join('\n');

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (path.endsWith('/index.html') && path.includes('/afirmaciones/') && !path.endsWith('/afirmaciones/index.html')) pages.push(path);
  }
}

await walk(root);
const failures = [];
for (const file of pages) {
  const source = await readFile(file, 'utf8');
  const route = '/' + relative(root, file).replace(/\\/g, '/').replace(/index\.html$/, '');
  const redirectTarget = source.match(/<meta http-equiv="refresh" content="0;url=([^"]+)">/)?.[1];
  if (redirectTarget) {
    if (!source.includes('name="robots" content="noindex"') || !source.includes(`<link rel="canonical" href="${redirectTarget}">`)) {
      failures.push(`${route}: compatibility redirect is missing noindex or canonical metadata`);
    }
    continue;
  }
  const required = [
    ['claim-top', 'missing claim page root'],
    ['claim-answer', 'missing concise answer visual'],
    ['claim-data', 'missing data section'],
    ['claim-evidence', 'missing claim-specific evidence trail'],
    ['response-title', 'missing response action panel'],
    ['claim-sources', 'missing source section'],
  ];
  for (const [marker, message] of required) if (!source.includes(`id="${marker}"`)) failures.push(`${route}: ${message}`);
  if (!source.includes('class="claim-next-check"')) failures.push(`${route}: missing contextual checker handoff`);
  if (!source.includes('class="claim-verdict"')) failures.push(`${route}: missing compact verdict block`);
  if (!source.includes('Ver explicación y fuentes')) failures.push(`${route}: missing details action`);
  if (source.includes('claim-reading-nav') || source.includes('claim-action-bar')) failures.push(`${route}: duplicate reading navigation remains`);
  if (source.includes('<details open')) failures.push(`${route}: claim details should be closed by default`);
  if (!source.includes('expandClaimHash')) failures.push(`${route}: hash links do not expand their disclosure`);
  if (!/<h1\b[^>]*>/.test(source)) failures.push(`${route}: missing h1`);
  if (!/evidence-trail-card/.test(source)) failures.push(`${route}: evidence trail has no records`);
  if (!/class="evidence-label"/.test(source)) failures.push(`${route}: evidence trail has no explicit finding label`);
  if (!/class="evidence-finding"/.test(source)) failures.push(`${route}: evidence trail does not expose the finding inline`);
  if (!/class="evidence-relation-details"/.test(source) || !source.includes('Por qué está vinculado')) failures.push(`${route}: evidence trail does not explain proposition-level relationships`);
  if (!/class="evidence-review-meta"/.test(source) || !source.includes('Vínculo revisado')) failures.push(`${route}: evidence trail does not expose relationship review provenance`);
  if (!source.includes('No es una revisión independiente')) failures.push(`${route}: evidence trail does not distinguish maintainer review from independent review`);
  const hasChart = /class="claim-series-chart"/.test(source);
  const hasDirectVisual = /class="claim-data-direct"/.test(source);
  if (!hasChart && !hasDirectVisual) failures.push(`${route}: missing accessible evidence visual`);
  if (hasChart) {
    if (!/<svg\b[^>]*role="img"[^>]*aria-labelledby=/.test(source)) failures.push(`${route}: chart is missing an accessible SVG label`);
    if (!/<title\b[^>]*>/.test(source)) failures.push(`${route}: chart is missing a title`);
    if (!source.includes('Ver valores exactos')) failures.push(`${route}: chart is missing exact-value fallback`);
    if (!/<table\b[^>]*>/.test(source)) failures.push(`${route}: chart is missing a data table`);
    if (!bundledStyles.includes('claim-series-draw') || !bundledStyles.includes('prefers-reduced-motion')) failures.push(`${route}: chart animation is missing reduced-motion-safe behavior`);
  } else if (!/Evidencia directa/.test(source)) failures.push(`${route}: direct visual is missing its evidence label`);
  if (!/<details|class="deep-link"/.test(source)) failures.push(`${route}: missing path to deeper context`);
  const responsePosition = source.indexOf('id="response-title"');
  const dataPosition = source.indexOf('id="claim-data"');
  const answerPosition = source.indexOf('id="claim-answer"');
  if (answerPosition < 0 || responsePosition < 0 || dataPosition < 0 || answerPosition > responsePosition || responsePosition > dataPosition) failures.push(`${route}: answer-first order is incorrect`);
}

if (pages.length < 20) failures.push(`expected at least 20 published claim pages, found ${pages.length}`);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Published claim UX passed: ${pages.length} answer-first pages.`);
