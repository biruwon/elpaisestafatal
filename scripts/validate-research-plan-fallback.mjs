import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./local-claim-service.mjs', import.meta.url), 'utf8');
const required = [
  'Research planning must remain useful when Ollama is cold',
  'neutralQueries:',
  'requiredDimensions,',
  'clarificationQuestion:',
  'fact, source, number, or verdict',
];
const missing = required.filter((fragment) => !source.includes(fragment));
if (missing.length) throw new Error(`research-plan fallback is incomplete: ${missing.join(', ')}`);
if (!/catch \{[\s\S]{0,1800}return \{[\s\S]*neutralQueries/.test(source)) throw new Error('research-plan fallback is not inside the model failure path');
console.log('Research-plan fallback contract valid: model failures retain neutral queries, missing dimensions, and clarification.');
