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
requireText(compose, 'healthcheck:', 'Compose');
if (!packageJson.dependencies?.pg) errors.push('package.json: PostgreSQL runtime dependency is missing');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Local container contract valid: runtime dependencies, derived data paths, token, binding, and healthcheck are present.');
