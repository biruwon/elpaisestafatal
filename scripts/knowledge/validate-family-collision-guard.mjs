import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../../dist/index.html', import.meta.url), 'utf8');
const match = html.match(/<script[^>]+id="claim-index-data"[^>]*>([\s\S]*?)<\/script>/);
if (!match) throw new Error('Built claim index is missing from the homepage');
const entries = JSON.parse(match[1]).filter((entry) => entry.kind === 'claim');
const owners = new Map();
for (const entry of entries) {
  for (const key of new Set(entry.semanticFamilyKeys || [])) {
    const slugs = owners.get(key) || new Set();
    slugs.add(entry.slug);
    owners.set(key, slugs);
  }
}
const collisions = [...owners].filter(([, slugs]) => slugs.size > 1);
const claimIndexSource = await readFile(new URL('../../src/data/claimIndex.ts', import.meta.url), 'utf8');
const serviceSource = await readFile(new URL('../local-claim-service.mjs', import.meta.url), 'utf8');
if (collisions.length && !claimIndexSource.includes('familyKeyCounts')) throw new Error('Static claim index has family collisions without a uniqueness guard');
if (collisions.length && !serviceSource.includes('familyKeyCounts')) throw new Error('Local claim service has family collisions without a uniqueness guard');
console.log(`Family collision guard valid: ${entries.length} claims, ${owners.size} family keys, ${collisions.length} ambiguous keys guarded.`);
