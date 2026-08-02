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
  const required = [
    ['claim-top', 'missing claim page root'],
    ['claim-snapshot', 'missing answer-first snapshot'],
    ['claim-answer', 'missing concise answer visual'],
    ['claim-data', 'missing data section'],
    ['response-title', 'missing response action panel'],
    ['claim-sources', 'missing source section'],
  ];
  for (const [marker, message] of required) if (!source.includes(`id="${marker}"`)) failures.push(`${route}: ${message}`);
  if (!/<h1\b[^>]*>/.test(source)) failures.push(`${route}: missing h1`);
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
