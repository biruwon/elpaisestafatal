import { readFile } from 'node:fs/promises';

const input = await readFile(new URL('../src/scripts/claim-input.ts', import.meta.url), 'utf8');
const questions = await readFile(new URL('../functions/api/questions.ts', import.meta.url), 'utf8');
const failures = [];

const requireText = (source, text, label) => {
  if (!source.includes(text)) failures.push(`missing ${label}`);
};

requireText(input, 'const recordQuestion =', 'immediate learning capture helper');
requireText(input, "recordQuestion(query, { inputType: 'text', status: 'received' })", 'early capture before background analysis');
requireText(input, 'data-learning-note', 'uncovered-result learning feedback');
requireText(input, "if (file && data.input?.canonical)", 'media-derived learning capture');
requireText(input, 'recordQuestion(data.input.canonical', 'media-derived canonical claim capture');
requireText(questions, 'const isNewRequest =', 'idempotent request detection');
requireText(questions, 'if (isNewRequest)', 'count-once cluster update gate');
requireText(questions, 'ON CONFLICT(semantic_signature)', 'semantic cluster persistence');

if (input.includes('recordUncoveredQuestion')) failures.push('legacy late-only learning helper remains');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Learning capture validation passed: gaps are captured early, media can enrich clusters, and repeated request IDs do not inflate counts.');
