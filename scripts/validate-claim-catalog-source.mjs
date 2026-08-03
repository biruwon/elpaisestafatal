import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const failures = [];

try {
  await access(join(root, 'src/data/claims.ts'));
  failures.push('obsolete src/data/claims.ts catalogue still exists');
} catch { /* Expected: Markdown is the only claim source. */ }

const catalog = await readFile(join(root, 'src/data/claimCatalog.ts'), 'utf8');
if (!catalog.includes("from './content'")) failures.push('claimCatalog.ts does not derive from structured Markdown content');
for (const legacySymbol of ['baseClaims', 'additionalClaims', 'eventClaims', 'getConcern', 'concernSources']) {
  if (catalog.includes(legacySymbol)) failures.push(`claimCatalog.ts still contains legacy catalogue symbol ${legacySymbol}`);
}

const index = await readFile(join(root, 'src/data/claimIndexData.ts'), 'utf8');
if (index.includes("from './content'")) failures.push('browser claim index still has a second Markdown fallback source');

const files = await readdir(join(root, 'content/claims'));
let published = 0;
for (const file of files.filter((entry) => entry.endsWith('.md'))) {
  const raw = await readFile(join(root, 'content/claims', file), 'utf8');
  if (/^status:\s*published\s*$/m.test(raw)) published += 1;
}
if (published < 20) failures.push(`expected at least 20 published Markdown claims, found ${published}`);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Claim catalogue source passed: ${published} published claims derive from Markdown without a legacy catalogue.`);
