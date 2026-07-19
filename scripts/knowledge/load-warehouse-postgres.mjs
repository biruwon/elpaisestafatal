import { closeWarehousePool, loadWarehouse, migrateWarehouse, populateWarehouseEmbeddings, postgresEnabled } from './postgres-warehouse.mjs';

if (!postgresEnabled()) {
  console.error('Set WAREHOUSE_DATABASE_URL to load the derived warehouse into PostgreSQL.');
  process.exit(1);
}

try {
  await migrateWarehouse();
  const result = await loadWarehouse();
  if (!result) throw new Error('PostgreSQL warehouse connection failed');
  console.log(`PostgreSQL warehouse loaded: ${result.sourceCount} sources and ${result.observationCount} observations.`);
  if (process.env.WAREHOUSE_EMBEDDINGS === '1') {
    const embedded = await populateWarehouseEmbeddings({ endpoint: process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434', model: process.env.OLLAMA_EMBED_MODEL || 'bge-m3' });
    if (!embedded) throw new Error('PostgreSQL warehouse embedding population failed');
    console.log(`PostgreSQL warehouse embeddings updated: ${embedded.written} observations.`);
  }
} finally {
  await closeWarehousePool();
}
