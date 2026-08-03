import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/scripts/claim-input.ts', import.meta.url), 'utf8');
const page = await readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const failures = [];
const required = [
  'const resultActionsMarkup',
  'claim-result-actions-primary',
  'data-result-target="actions"',
  'resultActionsMarkup(requestId ? shareUrl : undefined)',
  'resultActionsMarkup(primary?.answer ? shareUrlFor',
];

for (const snippet of required) {
  if (!source.includes(snippet)) failures.push(`claim input is missing ${snippet}`);
}

const structuredActions = source.indexOf('resultActionsMarkup(requestId ? shareUrl : undefined)');
const structuredBlocks = source.indexOf('<div class="claim-plan-blocks">${structuredBlocksMarkup(plan)}</div>');
if (structuredActions < 0 || structuredBlocks < 0 || structuredActions > structuredBlocks) {
  failures.push('structured results place the primary action row after the analysis blocks');
}

const quickActions = source.indexOf('resultActionsMarkup(primary?.answer ? shareUrlFor');
const quickAlternatives = source.indexOf('${alternativesMarkup}', quickActions);
if (quickActions < 0 || quickAlternatives < 0 || quickActions > quickAlternatives) {
  failures.push('quick results place the primary action row after alternatives');
}

if (source.includes('const shareAction')) failures.push('quick results retain a duplicate share-action path');

for (const snippet of [
  '.claim-result-card[data-result-mode=understand] .claim-plan-reply{display:none}',
  '.claim-result-card[data-result-mode=reply]',
  'data-result-mode="understand"',
]) {
  if (!page.includes(snippet) && !source.includes(snippet)) failures.push(`result modes are missing ${snippet}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Result UX validation passed: primary actions appear immediately after the first answer for quick and structured outcomes.');
