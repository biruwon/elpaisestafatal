import { clearWarehouseRecordCache, findWarehouseObservations } from './warehouse-query.mjs';

clearWarehouseRecordCache();
const startedCold = performance.now();
const cold = await findWarehouseObservations('precio vivienda casas', 6);
const coldMs = performance.now() - startedCold;
const startedWarm = performance.now();
const warm = await findWarehouseObservations('precio vivienda casas', 6);
const warmMs = performance.now() - startedWarm;
if (cold.length !== warm.length || cold.some((item, index) => item.id !== warm[index]?.id)) throw new Error('Warehouse cache changed retrieval results');
if (cold.length && warmMs >= coldMs) throw new Error(`Warm warehouse lookup did not improve latency (${coldMs.toFixed(1)}ms cold, ${warmMs.toFixed(1)}ms warm)`);
console.log(`Warehouse cache validation passed: identical results; ${coldMs.toFixed(1)}ms cold and ${warmMs.toFixed(1)}ms warm.`);
