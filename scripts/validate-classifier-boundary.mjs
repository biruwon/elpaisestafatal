import { readFile } from 'node:fs/promises';
const failures = [];
const classify = await readFile('functions/api/check.ts', 'utf8');
const fallback = await readFile('src/lib/knowledge/deterministic-api-fallback.mjs', 'utf8');
const publicResponse = await readFile('src/lib/knowledge/public-response.mjs', 'utf8');
const gateway = await readFile('scripts/local-dev-gateway.mjs', 'utf8');
const client = await readFile('src/scripts/claim-checker.ts', 'utf8');
const publishedFallback = await readFile('functions/lib/catalogue-resolver.ts', 'utf8');
const pollingRoute = await readFile('functions/api/check/[id].ts', 'utf8');

for (const fragment of ["request.formData()", 'validateInputMetadata', 'LOCAL_CLASSIFIER_TOKEN', '}/v1/classify', '|| !env.LOCAL_CLASSIFIER_TOKEN']) {
  if (!classify.includes(fragment)) failures.push(`/api/check is missing required boundary behavior: ${fragment}`);
}
if (!classify.includes('unavailableCheck')) failures.push('/api/check must retain deterministic guidance when the optional origin is unavailable');
if (!classify.includes('routeCatalogueQuery') || !classify.includes('normalize(route.entry.claim)')) failures.push('/api/check must gate catalogue answers behind exact claim interpretation');
if (!publishedFallback.includes('publishedEntryFor')) failures.push('catalogue resolver is missing publishedEntryFor');
for (const fragment of ['export const deterministicApiFallback', 'claim_breakdown', 'RUNTIME_VERSIONS.fallbackKnowledge']) {
  if (!fallback.includes(fragment)) failures.push(`deterministic API fallback is missing ${fragment}`);
}
for (const fragment of ['publicResolveResponse', 'schemaVersion', 'processing']) {
  if (!publicResponse.includes(fragment)) failures.push(`public response contract is missing ${fragment}`);
}
if (!gateway.includes("replace(/^\\/api\\/check/, '/v1/classify')")) failures.push('local gateway must retain the internal /v1/classify contract');
if (!client.includes("'/api/check'")) failures.push('claim input must submit through /api/check');
if (!pollingRoute.includes("export { onRequestGet } from '../check'")) failures.push('dynamic /api/check/:id polling route is missing');

const publicDetails = /ollama|localhost|127\.0\.0\.1|host\.docker\.internal|whisper_command|cloudflare_api_token|cors/i;
if (publicDetails.test(classify)) failures.push('/api/check must not expose provider or runtime details');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Check boundary valid: JSON and multipart requests share the provider-neutral /api/check contract.');
