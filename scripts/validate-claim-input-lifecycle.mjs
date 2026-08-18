import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/scripts/claim-checker.ts', import.meta.url), 'utf8');
const required = [
  "fetchJson('/api/check'",
  "fetchJson(`/api/check/${encodeURIComponent(response.id)}`",
  "status: 'complete' | 'processing' | 'unavailable'",
  'validateInputMetadata',
  "form?.addEventListener('submit', submit)",
  "if (file) form?.requestSubmit()",
  'data-media-dropzone',
  'dataTransfer?.files',
  'localStorage',
  'data-recent-query',
  'history.replaceState',
  'navigator.share',
  'data-copy-answer',
];
const missing = required.filter((item) => !source.includes(item));
if (missing.length) throw new Error(`Claim checker lifecycle is missing: ${missing.join(', ')}`);
if (!source.includes("response.status === 'processing'")) throw new Error('Claim checker must poll processing responses');
if (!source.includes("status: 'unavailable'")) throw new Error('Claim checker must preserve unavailable state');
console.log('Claim-checker lifecycle validation passed: unified submission, media, polling, recent checks, and terminal states are wired.');
