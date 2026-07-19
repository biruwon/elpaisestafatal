import { closeWarehousePool, postgresEnabled, queryPostgresWarehouse } from './postgres-warehouse.mjs';

if (!postgresEnabled()) {
  console.log('PostgreSQL warehouse validation skipped: WAREHOUSE_DATABASE_URL is not configured.');
  process.exit(0);
}

try {
  const rows = await queryPostgresWarehouse('house price index quarterly Spain', 3);
  if (!Array.isArray(rows) || !rows.length) throw new Error('PostgreSQL warehouse returned no matching observations');
  if (!rows.every((row) => row.source?.url && row.evidenceFit !== 'weak')) throw new Error('PostgreSQL warehouse returned an untraceable or weak observation');
  console.log(`PostgreSQL warehouse validation passed: ${rows.length} directly matched observations.`);
} finally {
  await closeWarehousePool();
}
