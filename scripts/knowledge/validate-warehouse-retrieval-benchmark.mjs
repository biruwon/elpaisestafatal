import { warehouseRetrievalBenchmarkCases } from './warehouse-retrieval-benchmark-cases.mjs';
import { readFile } from 'node:fs/promises';

const registry = JSON.parse(await readFile(new URL('../../config/metric-registry.json', import.meta.url), 'utf8'));
const ids = new Set();
for (const item of warehouseRetrievalBenchmarkCases) {
  if (!item.id || ids.has(item.id)) throw new Error(`Duplicate or missing benchmark id: ${item.id}`);
  ids.add(item.id);
  if (!item.query || item.query.length < 12) throw new Error(`${item.id}: benchmark query is too weak`);
  if (item.expectedMetricId !== null && !registry[item.expectedMetricId]) throw new Error(`${item.id}: unknown expected metric ${item.expectedMetricId}`);
}
if (warehouseRetrievalBenchmarkCases.length < 46) throw new Error('Warehouse benchmark must contain at least 46 Spanish inputs');
const covered = new Set(warehouseRetrievalBenchmarkCases.map((item) => item.expectedMetricId).filter(Boolean));
const expected = Object.keys(registry).filter((id) => id !== 'official_publication');
for (const id of expected) if (!covered.has(id)) throw new Error(`Warehouse benchmark does not cover ${id}`);
console.log(`Warehouse retrieval benchmark corpus valid: ${warehouseRetrievalBenchmarkCases.length} Spanish paraphrases across ${covered.size} metrics.`);
