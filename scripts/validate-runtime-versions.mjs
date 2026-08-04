import { readFile } from 'node:fs/promises';
import { RUNTIME_VERSIONS } from '../src/lib/knowledge/runtime-versions.mjs';

const fallback = await readFile('src/lib/knowledge/deterministic-api-fallback.mjs', 'utf8');
const resolver = await readFile('scripts/local-claim-service.mjs', 'utf8');
const failures = [];

for (const version of Object.values(RUNTIME_VERSIONS)) {
  if (typeof version !== 'string' || !version.trim()) failures.push('runtime version values must be non-empty strings');
}
for (const [name, source, marker] of [
  ['deterministic fallback', fallback, 'RUNTIME_VERSIONS.fallbackKnowledge'],
  ['local resolver', resolver, 'RUNTIME_VERSIONS.warehouseKnowledge'],
  ['local semantic index', resolver, 'RUNTIME_VERSIONS.indexKnowledge'],
]) {
  if (!source.includes("runtime-versions.mjs")) failures.push(`${name} does not import the central runtime version manifest`);
  if (!source.includes(marker)) failures.push(`${name} does not use ${marker}`);
}
for (const stale of ["'deterministic-fallback-2'", "'warehouse-draft-1'", "'index-only'"]) {
  if (fallback.includes(stale) || resolver.includes(stale)) failures.push(`stale hardcoded runtime version remains: ${stale}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Runtime version contract valid: ${Object.keys(RUNTIME_VERSIONS).length} central versions.`);
