import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/scripts/claim-input.ts', import.meta.url), 'utf8');
const required = [
  'const clearDynamicStatus',
  'const setDynamicStatus',
  'data-dynamic-status',
  "renderCard('invalid'",
  'validateInputMetadata',
  'form?.requestSubmit()',
  'conversation-counter',
  "primary?.kind === 'topic'",
  "if (data.status === 'unavailable')",
  'La orientación rápida sigue disponible',
  'const assessmentLabels',
  'const resetChecker',
  'data-new-check',
  'input?.focus()',
  'aria-labelledby="claim-result-title"',
  "const alternativesMarkup = ['published', 'related', 'unavailable']",
  "renderCard('uncovered', original, undefined, [],",
];
const missing = required.filter((snippet) => !source.includes(snippet));
if (missing.length) throw new Error(`Claim input lifecycle is missing: ${missing.join(', ')}`);
if (/if \(data\.status === 'processing'\)[\s\S]{0,180}renderCard\('unavailable'/.test(source)) throw new Error('Processing timeout replaces the deterministic result with an unavailable card');
console.log('Claim-input lifecycle validation passed: deterministic result is preserved during dynamic analysis.');
