import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/scripts/claim-input.ts', import.meta.url), 'utf8');
const required = [
  'const clearDynamicStatus',
  'const setDynamicStatus',
  'data-dynamic-status',
  "if (data.status === 'unavailable')",
  'La orientación rápida sigue disponible',
];
const missing = required.filter((snippet) => !source.includes(snippet));
if (missing.length) throw new Error(`Claim input lifecycle is missing: ${missing.join(', ')}`);
if (/if \(data\.status === 'processing'\)[\s\S]{0,180}renderCard\('unavailable'/.test(source)) throw new Error('Processing timeout replaces the deterministic result with an unavailable card');
console.log('Claim-input lifecycle validation passed: deterministic result is preserved during dynamic analysis.');
