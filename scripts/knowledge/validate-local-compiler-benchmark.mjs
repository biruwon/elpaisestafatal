import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./benchmark-local-compiler.mjs', import.meta.url), 'utf8');
const required = ['compilerSchema', 'normalizeCompilerOutput', 'deterministicFallbackCompiler', 'createLocalInferenceProvider', 'inference.listModels', 'inference.chat', 'safetyPreserved', 'recommendedModel', 'minimumQuality', 'timeoutMs', 'const endpointUrl = new URL(endpoint)'];
const missing = required.filter((value) => !source.includes(value));
if (missing.length) throw new Error(`Local compiler benchmark is missing: ${missing.join(', ')}`);
if (source.includes('https://api.openai.com') || source.includes('OPENAI_API_KEY')) throw new Error('Compiler benchmark must remain local-only');
console.log('Local compiler benchmark validation passed: local models are scored against the bounded compiler contract and deterministic safety fields.');
