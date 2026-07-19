import { summarizeWarehouseRanking } from './warehouse-ranking.mjs';

const source = { id: 'eurostat', title: 'Desempleo en Europa', url: 'https://ec.europa.eu/eurostat/' };
const records = [
  { id: 'es', datasetId: 'Unemployment', value: 12, unit: '%', period: '2025', dimensions: { geo: 'ES', age: 'Y15-74', sex: 'T' }, dimensionLabels: { geo: 'España' }, source },
  { id: 'de', datasetId: 'Unemployment', value: 4, unit: '%', period: '2025', dimensions: { geo: 'DE', age: 'Y15-74', sex: 'T' }, dimensionLabels: { geo: 'Alemania' }, source },
  { id: 'fr', datasetId: 'Unemployment', value: 8, unit: '%', period: '2025', dimensions: { geo: 'FR', age: 'Y15-74', sex: 'T' }, dimensionLabels: { geo: 'Francia' }, source },
  { id: 'es-old', datasetId: 'Unemployment', value: 13, unit: '%', period: '2024', dimensions: { geo: 'ES', age: 'Y15-74', sex: 'T' }, dimensionLabels: { geo: 'España' }, source },
];
const result = summarizeWarehouseRanking('España tiene la tasa de paro más alta de Europa', records);
if (!result || !result.points.some((point) => point.includes('España ocupa la posición'))) throw new Error('Ranking handler did not rank Spain correctly');
const contradictory = summarizeWarehouseRanking('España tiene la tasa de paro más baja de Europa', records);
if (!contradictory || !contradictory.points.some((point) => point.includes('España no ocupa la posición'))) throw new Error('Ranking handler did not flag a contradictory ranking');
console.log('Warehouse ranking validation passed: same-period comparable countries are ranked.');
