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
const socialProtectionRecords = [
  { id: 'social-2015', datasetId: 'spr_exp_func', metricId: 'social_protection_benefits_per_capita', value: 5630.92, unit: 'Euro per inhabitant', period: '2015', dimensions: { geo: 'ES', spdeps: 'SPR', spfunc: 'TOTAL', unit: 'EUR_HAB' }, source },
  { id: 'social-2024', datasetId: 'spr_exp_func', metricId: 'social_protection_benefits_per_capita', value: 8221.52, unit: 'Euro per inhabitant', period: '2024', dimensions: { geo: 'ES', spdeps: 'SPR', spfunc: 'TOTAL', unit: 'EUR_HAB' }, source },
];
const socialProtection = summarizeWarehouseTrend('¿Cuánto gasta España en prestaciones de protección social por habitante?', socialProtectionRecords);
if (!socialProtection || !socialProtection.headline.includes('2015') || !socialProtection.headline.includes('2024') || !socialProtection.points.some((point) => point.includes('€ por habitante')) || !socialProtection.reply.includes('no demuestra la causa')) throw new Error('Trend handler did not keep social protection benefits distinct, readable, and caveated');
const oldAgeSurvivorsRecords = [
  { id: 'pensions-2015', datasetId: 'spr_exp_func', metricId: 'old_age_survivors_benefits_per_capita', value: 2803.07, unit: 'Euro per inhabitant', period: '2015', dimensions: { geo: 'ES', spdeps: 'SPR', spfunc: 'OLD_SRV', unit: 'EUR_HAB' }, source },
  { id: 'pensions-2024', datasetId: 'spr_exp_func', metricId: 'old_age_survivors_benefits_per_capita', value: 4194.66, unit: 'Euro per inhabitant', period: '2024', dimensions: { geo: 'ES', spdeps: 'SPR', spfunc: 'OLD_SRV', unit: 'EUR_HAB' }, source },
];
const oldAgeSurvivors = summarizeWarehouseTrend('¿Cuánto gasta España en pensiones y prestaciones de supervivencia por habitante?', oldAgeSurvivorsRecords);
if (!oldAgeSurvivors || !oldAgeSurvivors.headline.includes('2015') || !oldAgeSurvivors.headline.includes('2024') || !oldAgeSurvivors.points.some((point) => point.includes('€ por habitante')) || !/no equivale a la pensión media/i.test(oldAgeSurvivors.reply)) throw new Error('Trend handler did not keep old-age benefits distinct, readable, and caveated');
console.log('Warehouse trend validation passed: compatible dimensions are isolated.');
