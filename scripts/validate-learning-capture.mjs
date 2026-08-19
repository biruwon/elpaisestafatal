import { readFile } from 'node:fs/promises';

const input = await readFile(new URL('../src/scripts/claim-checker.ts', import.meta.url), 'utf8');
const questions = await readFile(new URL('../functions/api/questions.ts', import.meta.url), 'utf8');
const required = ['const statuses =', 'const status = statuses.has', 'resultState', 'researchOutcome', 'ON CONFLICT(semantic_signature)', 'const isNewRequest ='];
const missing = required.filter((item) => !questions.includes(item));
if (missing.length) throw new Error(`Learning capture is missing: ${missing.join(', ')}`);
if (input.includes("fetch('/api/questions'")) throw new Error('Checker must not persist provisional questions from the browser.');
console.log('Learning capture validation passed: private demand capture remains server-side and provisional checker results stay session-only.');
