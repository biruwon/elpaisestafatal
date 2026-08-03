import { readFile } from 'node:fs/promises';
import { createLocalInferenceProvider, createUnavailableInferenceProvider } from './local-inference-provider.mjs';

const unavailable = createUnavailableInferenceProvider();
if (unavailable.kind !== 'unavailable' || typeof unavailable.chat !== 'function' || typeof unavailable.embed !== 'function' || typeof unavailable.listModels !== 'function') {
  throw new Error('Unavailable inference adapter does not implement the shared contract');
}

const local = createLocalInferenceProvider({ endpoint: 'http://127.0.0.1:11434' });
if (local.kind !== 'local' || typeof local.chat !== 'function' || typeof local.embed !== 'function' || typeof local.listModels !== 'function') {
  throw new Error('Local inference adapter does not implement the shared contract');
}

const rejected = createLocalInferenceProvider({ endpoint: 'https://example.test/inference' });
if (rejected.kind !== 'unavailable') throw new Error('Non-local inference endpoint bypassed the local-only adapter gate');

const integrationFiles = [
  'scripts/local-claim-service.mjs',
  'scripts/knowledge/benchmark-warehouse-retrieval.mjs',
  'scripts/knowledge/postgres-warehouse.mjs',
  'scripts/knowledge/benchmark-local-compiler.mjs',
  'scripts/knowledge/cluster-gaps.mjs',
];
for (const file of integrationFiles) {
  const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  if (/\/api\/(?:chat|embed|tags)|ollama\(/i.test(source)) throw new Error(`${file} bypasses the shared local inference provider`);
  if (!source.includes('local-inference-provider.mjs')) throw new Error(`${file} does not declare the shared local inference provider dependency`);
}

console.log('Local inference provider contract valid: local and unavailable adapters share bounded chat/embed/model-inventory methods.');
