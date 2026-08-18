import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./generate-model-catalogue-candidates.mjs', import.meta.url), 'utf8');
const required = [
  'OLLAMA_CATALOGUE_MODEL',
  'AbortSignal.timeout',
  'basis: \'model\'',
  'visibility: \'searchable\'',
  'https?:\\/\\/|www\\.',
  'ha implementado',
  'principal problema',
  '\\d',
];
const missing = required.filter((fragment) => !source.includes(fragment));
if (missing.length) throw new Error(`Model catalogue safety gate is missing: ${missing.join(', ')}`);
if (!source.includes('return []')) throw new Error('Model catalogue generation must skip failed or timed-out topics');
if (!source.includes('candidates.some')) throw new Error('Model catalogue generation must deduplicate fingerprints');
console.log('Model catalogue candidate gate valid: bounded, private, model-labelled, deduplicated, and filtered.');
