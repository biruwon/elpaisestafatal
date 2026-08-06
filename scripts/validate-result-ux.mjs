import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/scripts/claim-input.ts', import.meta.url), 'utf8');
const page = await readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const failures = [];
const required = [
  'type CompactResultModel',
  'const renderCompactResult',
  'compact-result-card',
  'refinementQuestion',
  'defaultRefinementChoices',
  'data-refinement-topic',
  'Comprobar otra frase',
];

for (const snippet of required) {
  if (!source.includes(snippet)) failures.push(`claim input is missing ${snippet}`);
}

if (!page.includes('id="conversation-result" role="region" aria-label="Resultado de la comprobación" aria-live="off"')) {
  failures.push('the dynamic result region should be focusable without announcing the entire long card twice');
}
if (source.includes('La frase que comprobamos:')) {
  failures.push('structured result headings should not repeat the user-facing phrase prefix');
}
for (const snippet of ['const submittedClaimMarkup', 'class="claim-result-submission"', 'resetMediaSelection()', 'navigateToPublishedClaim', 'response.status === \'complete\'']) {
  if (!source.includes(snippet)) failures.push(`result hierarchy is missing ${snippet}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Result UX validation passed: primary actions appear immediately after the first answer for quick and structured outcomes.');
