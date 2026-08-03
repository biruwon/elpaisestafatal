import { summarizeWarehouseRanking, summarizeWarehouseRegionalComparison } from './warehouse-ranking.mjs';

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
const regionalSource = { id: 'eurostat-regional', title: 'Densidad de población por región · Eurostat', url: 'https://ec.europa.eu/eurostat/' };
const regionalRecords = [
  { id: 'madrid-2024', metricId: 'regional_population_density', value: 850, unit: 'Persons per square kilometre', period: '2024', dimensions: { geo: 'ES30' }, dimensionLabels: { geo: 'Comunidad de Madrid' }, source: regionalSource },
  { id: 'andalucia-2024', metricId: 'regional_population_density', value: 97, unit: 'Persons per square kilometre', period: '2024', dimensions: { geo: 'ES61' }, dimensionLabels: { geo: 'Andalucía' }, source: regionalSource },
  { id: 'madrid-2023', metricId: 'regional_population_density', value: 840, unit: 'Persons per square kilometre', period: '2023', dimensions: { geo: 'ES30' }, dimensionLabels: { geo: 'Comunidad de Madrid' }, source: regionalSource },
  { id: 'andalucia-2023', metricId: 'regional_population_density', value: 96, unit: 'Persons per square kilometre', period: '2023', dimensions: { geo: 'ES61' }, dimensionLabels: { geo: 'Andalucía' }, source: regionalSource },
  { id: 'brussels-2024', metricId: 'regional_population_density', value: 7800, unit: 'Persons per square kilometre', period: '2024', dimensions: { geo: 'BE10' }, dimensionLabels: { geo: 'Région de Bruxelles-Capitale' }, source: regionalSource },
];
const regional = summarizeWarehouseRegionalComparison('Madrid tiene más densidad que Andalucía', regionalRecords);
if (!regional || !regional.regional || !regional.headline.includes('Comunidad de Madrid') || !regional.reply.includes('850')) throw new Error('Regional comparison did not use the requested Spanish regions and common period');
const spanishRanking = summarizeWarehouseRanking('¿Qué comunidad tiene mayor densidad de población?', regionalRecords);
if (!spanishRanking || !spanishRanking.summary.includes('Comunidad de Madrid') || !spanishRanking.reply.includes('personas por km²') || spanishRanking.observations.some((item) => item.dimensions?.geo === 'BE10')) throw new Error('Regional ranking did not restrict a Spanish community query to Spanish regions');
console.log('Warehouse ranking validation passed: same-period comparable regions are ranked with Spanish geography preserved.');
