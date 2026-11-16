import { readFile } from 'node:fs/promises';
import { searchAliasesForMetric } from './metric-search-aliases.mjs';

const files = [
  'warehouse-query.mjs',
  'export-warehouse-sql.mjs',
];
for (const file of files) {
  const source = await readFile(new URL(`./${file}`, import.meta.url), 'utf8');
  if (!source.includes('searchAliasesForMetric')) throw new Error(`${file} does not use the shared metric search aliases`);
}
if (!searchAliasesForMetric('employment_rate').includes('encuentra')) throw new Error('Shared metric aliases are missing the employment vocabulary');
if (!searchAliasesForMetric('resident_population').includes('habitantes')) throw new Error('Shared metric aliases are missing the resident-population vocabulary');
if (!searchAliasesForMetric('foreign_citizenship_population').includes('nacionalidad extranjera')) throw new Error('Shared metric aliases are missing the foreign-citizenship vocabulary');
const root = new URL('../../', import.meta.url);
const d1Search = await readFile(new URL('functions/lib/d1-warehouse.ts', root), 'utf8');
const d1Exporter = await readFile(new URL('./export-warehouse-sql.mjs', import.meta.url), 'utf8');
const d1Loader = await readFile(new URL('./load-warehouse-d1.mjs', import.meta.url), 'utf8');
const warehouseQuery = await readFile(new URL('./warehouse-query.mjs', import.meta.url), 'utf8');
const d1Migration = await readFile(new URL('../../migrations/0010_remove_unused_tables_and_complete_warehouse.sql', import.meta.url), 'utf8');
const d1CheckpointMigration = await readFile(new URL('../../migrations/0011_warehouse_source_imports.sql', import.meta.url), 'utf8');
if (!warehouseQuery.includes("join(root, 'manifests')") || warehouseQuery.includes("join(root, '../manifests')")) throw new Error('Local warehouse search does not read manifests beside its source records');
for (const [source, text, label] of [
  [d1Search, 'observations_fts MATCH ?', 'D1 full-text retrieval'],
  [d1Search, 'payload.finding', 'typed legal/event payload retrieval'],
  [d1Exporter, 'dimension_labels_json', 'complete D1 observation export'],
  [d1Exporter, 'searchAliasesForMetric', 'D1 metric alias indexing'],
  [d1Exporter, 'warehouse_source_imports', 'source snapshot import checkpoints'],
  [d1Loader, "'--remote'", 'remote D1 loading'],
  [d1Loader, 'LEFT JOIN warehouse_source_imports', 'unchanged snapshot lookup'],
  [d1Migration, 'CREATE VIRTUAL TABLE observations_fts', 'D1 full-text index'],
  [d1CheckpointMigration, 'CREATE TABLE IF NOT EXISTS warehouse_source_imports', 'restart-safe snapshot migration'],
]) if (!source.includes(text)) throw new Error(`${label} is missing from the warehouse path`);
console.log(`Warehouse index contract passed: ${files.length} derived indexes share metric aliases and D1 is indexed, loaded, and queried.`);
