import { readFile } from 'node:fs/promises';
const source = await readFile('src/pages/index.astro', 'utf8');
const required = [
  ['id="conversation-form"', 'checker form'],
  ['id="conversation-input"', 'checker input'],
  ['id="conversation-result"', 'result region'],
  ['id="recent-checks"', 'recent checks'],
  ['id="checker-suggestions"', 'suggestions disclosure'],
  ['class="checker-page"', 'checker page container'],
  ['data-example="Los inmigrantes crean inseguridad"', 'example one'],
  ['data-example="La vivienda se ha triplicado"', 'example two'],
  ['data-example="El paro está manipulado"', 'example three'],
];
const failures = required.filter(([fragment]) => !source.includes(fragment)).map(([, label]) => `homepage is missing ${label}`);
if (source.includes('claim-catalog.json') || source.includes('claimIndexData')) failures.push('homepage must not embed or fetch the full catalogue');
for (const retiredSection of ['popular-home', 'latest-home', 'warehouse-home', 'topics-home', 'home-how']) {
  if (source.includes(`class="${retiredSection}"`)) failures.push(`homepage still contains retired discovery section: ${retiredSection}`);
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Homepage UX validation passed: checker, examples, recent checks, and no embedded catalogue.');
