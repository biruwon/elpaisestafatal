import { closeWarehousePool, loadWarehouse, migrateWarehouse, postgresEnabled } from './postgres-warehouse.mjs';

if (!postgresEnabled()) {
  console.error('Set WAREHOUSE_DATABASE_URL to load the derived warehouse into PostgreSQL.');
  process.exit(1);
}

try {
  await migrateWarehouse();
  const result = await loadWarehouse();
  if (!result) throw new Error('PostgreSQL warehouse connection failed');
  console.log(`PostgreSQL warehouse loaded: ${result.sourceCount} sources and ${result.observationCount} observations.`);
} finally {
  await closeWarehousePool();
}
