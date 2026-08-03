import { readFile } from 'node:fs/promises';

const failures = [];
const classify = await readFile('functions/api/classify.ts', 'utf8');
const classifyPolling = await readFile('functions/api/classify/[requestId].ts', 'utf8');
const fallback = await readFile('src/lib/knowledge/deterministic-api-fallback.mjs', 'utf8');
const gateway = await readFile('scripts/local-dev-gateway.mjs', 'utf8');
const client = await readFile('src/scripts/claim-input.ts', 'utf8');

if (!classifyPolling.includes('export const onRequestGet')) failures.push('/api/classify/:requestId must expose the polling handler');

for (const fragment of ["request.formData()", 'validateInputMetadata', 'LOCAL_CLASSIFIER_TOKEN', '}/v1/classify']) {
  if (!classify.includes(fragment)) failures.push(`/api/classify is missing required boundary behavior: ${fragment}`);
}
if (!classify.includes('deterministicApiFallback')) failures.push('/api/classify must retain deterministic guidance when the optional origin is unavailable');
for (const fragment of ['export const deterministicApiFallback', 'claim_breakdown', 'deterministic-fallback-2']) {
  if (!fallback.includes(fragment)) failures.push(`deterministic API fallback is missing ${fragment}`);
}
if (!gateway.includes("replace(/^\\/api\\/classify/, '/v1/classify')")) failures.push('local gateway must map /api/classify to the local /v1/classify contract');
if (!client.includes("'/api/classify'")) failures.push('claim input must submit through /api/classify');
if (!client.includes('`/api/classify/${encodeURIComponent(pendingRequestId)}`')) failures.push('claim input must poll through /api/classify/:requestId');

const publicDetails = /ollama|localhost|127\.0\.0\.1|host\.docker\.internal|whisper_command|cloudflare_api_token|cors/i;
if (publicDetails.test(classify)) failures.push('/api/classify must not expose provider or runtime details');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Classifier boundary valid: JSON and multipart requests share the provider-neutral /api/classify contract with bounded polling.');
