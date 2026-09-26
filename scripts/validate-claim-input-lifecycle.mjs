import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/scripts/claim-checker.ts', import.meta.url), 'utf8');
const required = [
  "fetchJson('/api/check'",
  "fetchJson(`/api/check/${encodeURIComponent(response.id)}`",
  "state: 'clarification'",
  'validateInputMetadata',
  "form?.addEventListener('submit', submit)",
  "if (file) form?.requestSubmit()",
  'data-media-dropzone',
  'dataTransfer?.files',
  'localStorage',
  'data-recent-query',
  "state: 'processing'",
  'data-copy-answer',
  'Respuesta provisional',
  'Esperando respuesta final',
  'Copiar contexto provisional',
  'const submission = new AbortController()',
  'const isCurrentSubmission = (submission: AbortController)',
  'if (!isCurrentSubmission(submission)) return;',
  'submission.signal',
  'request !== submission',
];
const missing = required.filter((item) => !source.includes(item));
if (missing.length) throw new Error(`Claim checker lifecycle is missing: ${missing.join(', ')}`);
if (!source.includes("response.state === 'processing'")) throw new Error('Claim checker must poll processing responses');
if (source.includes('request.signal')) throw new Error('Claim checker must use a submission-local abort signal, not mutable global request state');
const retainsPreviewAfterTimeout = source.includes("if (response.state === 'processing') {\n      if (initialPreview)")
  && source.includes('No han llegado más datos; esta respuesta conserva su carácter provisional.')
  && source.includes('Copiar contexto provisional');
if (!retainsPreviewAfterTimeout && !source.includes("response.state === 'processing') { renderUnavailable")) throw new Error('Claim checker must retain a timed-out preview or end the processing state visibly');
if (!source.includes('const renderStalledPreview =') || !source.includes('renderStalledPreview(initialPreview, \'La revisión adicional no se pudo completar; conservamos esta respuesta provisional con sus fuentes.\')')) throw new Error('A failed enrichment must retain and make the reviewed preview copyable rather than replacing it with a generic service error');
if (!source.includes("state: 'unavailable'")) throw new Error('Claim checker must preserve unavailable state');
console.log('Claim-checker lifecycle validation passed: unified submission, media, polling, recent checks, and terminal states are wired.');
