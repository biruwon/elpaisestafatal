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
const minimumWageRecords = [
  { id: 'smi-2015-s1', datasetId: 'earn_mw_cur', metricId: 'minimum_wage_monthly', value: 757, unit: 'Euro', period: '2015-S1', dimensions: { currency: 'EUR', geo: 'ES', freq: 'S' }, source },
  { id: 'smi-2026-s1', datasetId: 'earn_mw_cur', metricId: 'minimum_wage_monthly', value: 1425, unit: 'Euro', period: '2026-S1', dimensions: { currency: 'EUR', geo: 'ES', freq: 'S' }, source },
];
const minimumWage = summarizeWarehouseTrend('¿Ha subido el salario mínimo en España?', minimumWageRecords);
if (!minimumWage || !minimumWage.headline.includes('primer semestre de 2015') || !minimumWage.headline.includes('primer semestre de 2026') || !minimumWage.points.some((point) => point.includes('€ al mes')) || !minimumWage.reply.includes('no demuestra la causa')) throw new Error('Trend handler did not keep minimum wage distinct, readable, and caveated');
console.log('Warehouse trend validation passed: compatible dimensions are isolated.');
