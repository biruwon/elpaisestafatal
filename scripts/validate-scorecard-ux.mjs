import { readFile } from 'node:fs/promises';

const input = await readFile(new URL('../src/scripts/claim-input.ts', import.meta.url), 'utf8');
const page = await readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8');

const requiredInput = [
  'renderScorecardPlan', 'answerMode === \'scorecard\'', 'data-scorecard-edit',
  'data-new-check', 'scorecard-row', 'scorecard-sources', 'Intl.NumberFormat(\'es-ES\'',
  'improved', 'worsened', 'roughly_unchanged', 'unavailable', 'condition_topic_evidence', 'population_context',
];
const requiredPage = [
  '.scorecard-result', '.scorecard-row', '.scorecard-sources',
  '.hero-checker.has-result', '.scorecard-result h3', '.scorecard-topics', '.scorecard-topic',
];
for (const marker of requiredInput) if (!input.includes(marker)) throw new Error(`Scorecard UX contract missing input marker: ${marker}`);
for (const marker of requiredPage) if (!page.includes(marker)) throw new Error(`Scorecard UX contract missing page marker: ${marker}`);
if (/renderCompactResult\(original, response\.result\)/.test(input.slice(input.indexOf('answerMode === \'scorecard\''), input.indexOf('answerMode === \'scorecard\'') + 500))) {
  throw new Error('Scorecard branch must not collapse into generic compact result');
}
if (input.includes('5 de 6') || input.includes('4 de 6')) throw new Error('Scorecard headline must be computed, not hardcoded');
console.log('Scorecard UX contract passed');
