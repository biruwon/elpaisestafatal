import { readFile } from 'node:fs/promises';

const checker = await readFile(new URL('../src/scripts/claim-checker.ts', import.meta.url), 'utf8');
const checkFunction = await readFile(new URL('../functions/api/check.ts', import.meta.url), 'utf8');
const capture = await readFile(new URL('../functions/lib/claim-demand.ts', import.meta.url), 'utf8');
const questions = await readFile(new URL('../functions/api/questions.ts', import.meta.url), 'utf8');

const required = [
  'stripSensitiveDetails',
  'crypto.randomUUID()',
  'INSERT INTO resolve_requests',
  'ON CONFLICT(semantic_signature)',
  'INSERT OR IGNORE INTO query_cluster_members',
];
const missing = required.filter((item) => !capture.includes(item));
if (missing.length) throw new Error(`Private claim capture is missing: ${missing.join(', ')}`);
if (!checkFunction.includes('waitUntil(captureClaimDemand(env.DB, effectiveClaim')) {
  throw new Error('Checker submissions must schedule server-side claim capture.');
}
if (questions.includes('export const onRequestPost')) {
  throw new Error('Claim submissions must enter through the validated checker endpoint.');
}
if (checker.includes("fetch('/api/questions'") || checker.includes('fetch("/api/questions"')) {
  throw new Error('Checker must not persist submitted claims from the browser.');
}
console.log('Learning capture contract valid: scrubbed claims enter D1 server-side and provisional results stay session-only.');
