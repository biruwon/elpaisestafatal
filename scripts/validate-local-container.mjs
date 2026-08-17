import { readFile } from 'node:fs/promises';

const dockerfile = await readFile('Dockerfile.local', 'utf8');
const compose = await readFile('docker-compose.local.yml', 'utf8');
const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const errors = [];

const requireText = (value, fragment, label) => {
  if (!value.includes(fragment)) errors.push(`${label}: missing ${fragment}`);
};

requireText(dockerfile, 'COPY package.json package-lock.json ./', 'Dockerfile');
requireText(dockerfile, 'RUN npm ci --omit=dev', 'Dockerfile');
requireText(dockerfile, 'COPY scripts ./scripts', 'Dockerfile');
requireText(dockerfile, 'COPY migrations ./migrations', 'Dockerfile');
requireText(dockerfile, 'COPY config ./config', 'Dockerfile');
requireText(compose, '127.0.0.1:8789:8789', 'Compose');
requireText(compose, 'LOCAL_CLASSIFIER_TOKEN', 'Compose');
requireText(compose, 'OLLAMA_ENDPOINT', 'Compose');
requireText(compose, 'WAREHOUSE_SEMANTIC_SEARCH', 'Compose');
requireText(compose, 'pgvector/pgvector:pg16', 'Compose');
requireText(compose, '0004_warehouse_vectors.sql', 'Compose');
requireText(compose, '0005_legal_rule_text.sql', 'Compose');
requireText(compose, 'LOCAL_CLASSIFIER_BIND_HOST: 0.0.0.0', 'Compose');
requireText(compose, 'cloudflare/cloudflared', 'Compose');
requireText(compose, 'CLOUDFLARED_TUNNEL_TOKEN', 'Compose');
requireText(compose, 'profiles: ["tunnel"]', 'Compose');
requireText(compose, 'claim-resolver:', 'Compose tunnel dependency');
requireText(compose, 'healthcheck:', 'Compose');
requireText(compose, '${CLOUDFLARED_TUNNEL_TOKEN:?Set CLOUDFLARED_TUNNEL_TOKEN', 'Compose tunnel fail-closed token guard');
if (!packageJson.dependencies?.pg) errors.push('package.json: PostgreSQL runtime dependency is missing');
const localService = await readFile('scripts/local-claim-service.mjs', 'utf8');
const provider = await readFile('scripts/local-inference-provider.mjs', 'utf8');
const modelAdapter = await readFile('scripts/model-provider.mjs', 'utf8');
if (/keep_alive:\s*['"]-1['"]/.test(`${provider}\n${modelAdapter}`)) errors.push('Local resolver: keep_alive must use numeric -1, not an invalid duration string');
if (!/keep_alive:\s*request\.keepAlive\s*\?\?\s*-1/.test(`${provider}\n${modelAdapter}`)) errors.push('Model provider: chat, structured-generation, and embedding paths must use the numeric keep_alive contract');
if (!/createModelTasks/.test(localService)) errors.push('Local resolver: provider-neutral model tasks are not wired into the resolver');
const localDevAi = await readFile('scripts/dev-local-ai.mjs', 'utf8');
for (const fragment of ['isPortInUse', 'LOCAL_GATEWAY_PORT', 'LOCAL_ASTRO_PORT', 'LOCAL_CLASSIFIER_PORT']) {
  if (!localDevAi.includes(fragment)) errors.push(`Local dev stack: missing startup port guard ${fragment}`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Local container contract valid: runtime dependencies, derived data paths, token, binding, and healthcheck are present.');
