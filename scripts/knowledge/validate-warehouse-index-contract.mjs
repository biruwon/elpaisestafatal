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
console.log(`Warehouse index contract passed: ${files.length} derived indexes share metric search aliases.`);
