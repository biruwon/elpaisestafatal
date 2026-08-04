import { readFile } from 'node:fs/promises';

const workflow = await readFile(new URL('../.github/workflows/knowledge-refresh.yml', import.meta.url), 'utf8');
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const failures = [];
const required = [
  'WAREHOUSE_DATABASE_URL',
  'knowledge:warehouse:postgres',
  'knowledge:postgres:benchmark',
  'knowledge:postgres:benchmark:validate',
  'postgres-warehouse-benchmark-${{ github.run_id }}',
  '.local/postgres-warehouse-benchmark.json',
];
for (const text of required) if (!workflow.includes(text)) failures.push(`refresh workflow is missing ${text}`);
if (!workflow.includes("if: env.WAREHOUSE_DATABASE_URL != ''")) failures.push('PostgreSQL work must remain optional when no database secret is configured');
if (!packageJson.scripts?.['knowledge:postgres:benchmark:validate']) failures.push('PostgreSQL benchmark validator is not exposed as a package script');
if (workflow.includes('echo "${WAREHOUSE_DATABASE_URL}"') || workflow.includes('printenv WAREHOUSE_DATABASE_URL')) failures.push('refresh workflow must not print the database URL');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('PostgreSQL benchmark workflow valid: optional secret-backed refresh, benchmark, validation, and artifact retention are configured without exposing credentials.');
