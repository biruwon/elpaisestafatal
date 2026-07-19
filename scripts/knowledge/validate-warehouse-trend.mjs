import { compatibleTrendSeries, summarizeWarehouseTrend } from './warehouse-trend.mjs';

const source = { id: 'eurostat', title: 'Población de España', url: 'https://ec.europa.eu/eurostat/' };
const records = [
  { id: 'total-2015', datasetId: 'Population', value: 46, unit: 'million', period: '2015', dimensions: { age: 'TOTAL', sex: 'T', geo: 'ES' }, source },
  { id: 'female-2015', datasetId: 'Population', value: 24, unit: 'million', period: '2015', dimensions: { age: 'TOTAL', sex: 'F', geo: 'ES' }, source },
  { id: 'total-2020', datasetId: 'Population', value: 47, unit: 'million', period: '2020', dimensions: { age: 'TOTAL', sex: 'T', geo: 'ES' }, source },
  { id: 'female-2020', datasetId: 'Population', value: 25, unit: 'million', period: '2020', dimensions: { age: 'TOTAL', sex: 'F', geo: 'ES' }, source },
  { id: 'total-2025', datasetId: 'Population', value: 49, unit: 'million', period: '2025', dimensions: { age: 'TOTAL', sex: 'T', geo: 'ES' }, source },
];
const compatible = compatibleTrendSeries(records);
if (compatible.map((item) => item.id).join(',') !== 'total-2015,total-2020,total-2025') throw new Error('Trend handler mixed incompatible dimensions');
const rising = summarizeWarehouseTrend('España tiene más población que hace diez años', records);
if (!rising || !rising.points.some((point) => point.includes('coincide'))) throw new Error('Trend handler did not recognize a matching direction');
const falling = summarizeWarehouseTrend('España tiene más población que hace diez años', records.map((item) => ({ ...item, value: 100 - item.value })));
if (!falling || !falling.points.some((point) => point.includes('no coincide'))) throw new Error('Trend handler did not flag a contradictory direction');
console.log('Warehouse trend validation passed: compatible dimensions are isolated.');
