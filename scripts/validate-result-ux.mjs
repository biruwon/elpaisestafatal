import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/scripts/claim-input.ts', import.meta.url), 'utf8');
const page = await readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const failures = [];
const required = [
  'const resultActionsMarkup',
  'claim-result-actions-primary',
  'data-result-target="actions"',
  'resultActionsMarkup(requestId ? shareUrl : undefined, Boolean(storyMarkup))',
  'resultActionsMarkup(primary?.answer ? shareUrlFor',
  'Fuente: ${sourceLinks[0].title}',
  'data-focus-result="sources"',
  'const visualStoryMarkup',
  'class="claim-visual-story"',
  'La idea en ${steps.length} pasos',
  'claim-story-mini-chart',
  'data-download-story',
  'canvas.toBlob',
  'aclaracion-visual.png',
  'getPropertyValue(\'--story-bar\')',
];

for (const snippet of required) {
  if (!source.includes(snippet)) failures.push(`claim input is missing ${snippet}`);
}

const structuredActions = source.indexOf('resultActionsMarkup(requestId ? shareUrl : undefined, Boolean(storyMarkup))');
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
  'const topicFollowUpPrompts',
  'const contextualFollowUps',
  'const generalFallbackPrompts',
  'Si no sabes por dónde empezar',
  'No es una respuesta a tu frase',
  'data-guidance-example',
  'Para concretar esta discusión',
  'form?.requestSubmit()',
]) {
  if (!page.includes(snippet) && !source.includes(snippet)) failures.push(`result modes are missing ${snippet}`);
}
for (const snippet of ['@keyframes claim-chart-draw', 'prefers-reduced-motion', 'claim-chart-bar-in']) {
  if (!page.includes(snippet)) failures.push(`dynamic chart motion is missing ${snippet}`);
}
if (!page.includes('.claim-visual-story ol{') || !page.includes('@media(prefers-reduced-motion:reduce){.claim-story-mini-chart')) {
  failures.push('visual story is missing responsive or reduced-motion styling');
}

if (!page.includes('id="conversation-result" role="region" aria-label="Resultado de la comprobación" aria-live="off"')) {
  failures.push('the dynamic result region should be focusable without announcing the entire long card twice');
}
if (source.includes('La frase que comprobamos:')) {
  failures.push('structured result headings should not repeat the user-facing phrase prefix');
}
for (const snippet of ['const submittedClaimMarkup', 'class="claim-result-submission"', 'resetMediaSelection()', 'const title = primary ? primary.title']) {
  if (!source.includes(snippet)) failures.push(`result hierarchy is missing ${snippet}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Result UX validation passed: primary actions appear immediately after the first answer for quick and structured outcomes.');
