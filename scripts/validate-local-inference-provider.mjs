import { createLocalInferenceProvider, createUnavailableInferenceProvider } from './local-inference-provider.mjs';

const unavailable = createUnavailableInferenceProvider();
if (unavailable.kind !== 'unavailable' || typeof unavailable.chat !== 'function' || typeof unavailable.embed !== 'function') {
  throw new Error('Unavailable inference adapter does not implement the shared contract');
}

const local = createLocalInferenceProvider({ endpoint: 'http://127.0.0.1:11434' });
if (local.kind !== 'local' || typeof local.chat !== 'function' || typeof local.embed !== 'function') {
  throw new Error('Local inference adapter does not implement the shared contract');
}

const rejected = createLocalInferenceProvider({ endpoint: 'https://example.test/inference' });
if (rejected.kind !== 'unavailable') throw new Error('Non-local inference endpoint bypassed the local-only adapter gate');

console.log('Local inference provider contract valid: local and unavailable adapters share bounded chat/embed methods.');

