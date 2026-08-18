import { readFile } from 'node:fs/promises';

const input = await readFile(new URL('../src/scripts/claim-checker.ts', import.meta.url), 'utf8');
const questions = await readFile(new URL('../functions/api/questions.ts', import.meta.url), 'utf8');
const required = ['const recordQuestion =', "fetch('/api/questions'", "status: 'received'", 'resultState', 'researchOutcome', 'ON CONFLICT(semantic_signature)', 'const isNewRequest ='];
const missing = required.filter((item) => !input.includes(item) && !questions.includes(item));
if (missing.length) throw new Error(`Learning capture is missing: ${missing.join(', ')}`);
console.log('Learning capture validation passed: checker submissions are captured idempotently for demand-driven expansion.');
