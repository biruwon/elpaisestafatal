import { readFile } from 'node:fs/promises';

const failures = [];
const script = await readFile('scripts/backup-operations.mjs', 'utf8');
for (const required of ['elpaisestafatal-ops', 'source-warehouse', 'metric-registry.json', 'd1.sql', 'postgres.sql', 'manifest.json']) {
  if (!script.includes(required)) failures.push(`backup script is missing ${required}`);
}
if (script.includes('console.log(process.env.WAREHOUSE_DATABASE_URL)')) failures.push('backup script must not print the PostgreSQL connection string');
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Backup contract valid: D1, optional PostgreSQL, local warehouse, and configuration snapshots are covered.');
