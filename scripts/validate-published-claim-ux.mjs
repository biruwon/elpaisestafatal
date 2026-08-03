import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = new URL('../dist/', import.meta.url).pathname;
const pages = [];

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
    ['claim-snapshot', 'missing answer-first snapshot'],
    ['claim-answer', 'missing concise answer visual'],
    ['claim-data', 'missing data section'],
    ['claim-evidence', 'missing claim-specific evidence trail'],
    ['response-title', 'missing response action panel'],
    ['claim-sources', 'missing source section'],
  ];
  for (const [marker, message] of required) if (!source.includes(`id="${marker}"`)) failures.push(`${route}: ${message}`);
  if (!source.includes('class="claim-next-check"')) failures.push(`${route}: missing contextual checker handoff`);
  if (!/<h1\b[^>]*>/.test(source)) failures.push(`${route}: missing h1`);
  if (!/evidence-trail-card/.test(source)) failures.push(`${route}: evidence trail has no records`);
  if (!/class="evidence-label"/.test(source)) failures.push(`${route}: evidence trail has no explicit finding label`);
  if (!/class="evidence-finding"/.test(source)) failures.push(`${route}: evidence trail does not expose the finding inline`);
  if (!/class="evidence-relation-details"/.test(source) || !source.includes('Por qué está vinculado')) failures.push(`${route}: evidence trail does not explain proposition-level relationships`);
  const hasChart = /class="claim-series-chart"/.test(source);
  const hasDirectVisual = /class="claim-data-direct"/.test(source);
  if (!hasChart && !hasDirectVisual) failures.push(`${route}: missing accessible evidence visual`);
  if (hasChart) {
    if (!/<svg\b[^>]*role="img"[^>]*aria-labelledby=/.test(source)) failures.push(`${route}: chart is missing an accessible SVG label`);
    if (!/<title\b[^>]*>/.test(source)) failures.push(`${route}: chart is missing a title`);
    if (!source.includes('Ver valores exactos')) failures.push(`${route}: chart is missing exact-value fallback`);
    if (!/<table\b[^>]*>/.test(source)) failures.push(`${route}: chart is missing a data table`);
  } else if (!/Evidencia directa/.test(source)) failures.push(`${route}: direct visual is missing its evidence label`);
  if (!/<details|class="deep-link"/.test(source)) failures.push(`${route}: missing path to deeper context`);
  const snapshotPosition = source.indexOf('id="claim-snapshot"');
  const responsePosition = source.indexOf('id="response-title"');
  const dataPosition = source.indexOf('id="claim-data"');
  if (snapshotPosition < 0 || responsePosition < 0 || dataPosition < 0 || snapshotPosition > responsePosition || responsePosition > dataPosition) failures.push(`${route}: answer-first order is incorrect`);
}

if (pages.length < 20) failures.push(`expected at least 20 published claim pages, found ${pages.length}`);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Published claim UX passed: ${pages.length} answer-first pages.`);
