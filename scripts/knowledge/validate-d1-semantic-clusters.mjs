import { readFile } from 'node:fs/promises';

const failures = [];
const read = async (path) => {
  try { return await readFile(path, 'utf8'); } catch (error) { failures.push(path + ': ' + error.message); return ''; }
};
const migration = await read('migrations/0004_claim_semantic_signatures.sql');
const functionSource = await read('functions/api/questions.ts');
const exportSource = await read('scripts/knowledge/export-query-clusters.mjs');

if (!/ALTER TABLE resolve_requests ADD COLUMN semantic_signature TEXT/.test(migration)) failures.push('D1 migration must add semantic_signature to resolve_requests');
if (!/ALTER TABLE query_clusters ADD COLUMN semantic_signature TEXT/.test(migration)) failures.push('D1 migration must add semantic_signature to query_clusters');
if (!/CREATE UNIQUE INDEX IF NOT EXISTS idx_query_clusters_semantic_signature/.test(migration)) failures.push('D1 migration must deduplicate query_clusters by semantic_signature');
if (!/semanticQuerySignature/.test(functionSource)) failures.push('Questions Function must derive a semantic family signature');
if (!/ON CONFLICT\(semantic_signature\)/.test(functionSource)) failures.push('Questions Function must upsert clusters by semantic_signature');
if (!/c\.semantic_signature/.test(exportSource)) failures.push('D1 cluster export must include semantic_signature');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('D1 semantic-cluster contract valid: migration, API upsert, and semantic export are present.');
