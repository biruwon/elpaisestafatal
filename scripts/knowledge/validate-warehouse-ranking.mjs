import { summarizeWarehouseEuropeanComparison, summarizeWarehouseRanking, summarizeWarehouseRegionalComparison } from './warehouse-ranking.mjs';

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
const europeanRanking = summarizeWarehouseRanking('¿Qué región europea tiene mayor densidad de población?', regionalRecords);
if (!europeanRanking || !europeanRanking.summary.includes('Région de Bruxelles-Capitale') || !europeanRanking.observations.some((item) => item.dimensions?.geo === 'BE10')) throw new Error('Regional ranking incorrectly applied Spain-only scope to an explicit European query');
const gdpComparisonRecords = [
  { id: 'gdp-es-2026q2', metricId: 'gdp_real_growth_europe', datasetId: 'Real GDP comparison', value: 2.7, unit: 'Chain linked volumes, percentage change compared to same period in previous year', period: '2026-Q2', dimensions: { geo: 'ES' }, dimensionLabels: { geo: 'Spain' }, source },
  { id: 'gdp-eu-2026q2', metricId: 'gdp_real_growth_europe', datasetId: 'Real GDP comparison', value: 1.2, unit: 'Chain linked volumes, percentage change compared to same period in previous year', period: '2026-Q2', dimensions: { geo: 'EU27_2020' }, dimensionLabels: { geo: 'European Union - 27 countries (from 2020)' }, source },
  { id: 'gdp-es-2026q1', metricId: 'gdp_real_growth_europe', datasetId: 'Real GDP comparison', value: 2.7, unit: 'Chain linked volumes, percentage change compared to same period in previous year', period: '2026-Q1', dimensions: { geo: 'ES' }, dimensionLabels: { geo: 'Spain' }, source },
  { id: 'gdp-eu-2026q1', metricId: 'gdp_real_growth_europe', datasetId: 'Real GDP comparison', value: 1.6, unit: 'Chain linked volumes, percentage change compared to same period in previous year', period: '2026-Q1', dimensions: { geo: 'EU27_2020' }, dimensionLabels: { geo: 'European Union - 27 countries (from 2020)' }, source },
];
const gdpComparison = summarizeWarehouseEuropeanComparison('¿Crece España más que la Unión Europea?', gdpComparisonRecords);
if (!gdpComparison || !gdpComparison.european || !gdpComparison.summary.includes('2,7') || !gdpComparison.summary.includes('1,2') || !gdpComparison.reply.includes('España creció más')) throw new Error('European GDP comparison did not preserve the same-period Spain/EU comparison');
const inflationRecords = [
  { id: 'inflation-es-2026-06', metricId: 'inflation_rate_europe', datasetId: 'Harmonised inflation comparison', value: 2.3, unit: 'Percentage change compared to same period in previous year', period: '2026-06', dimensions: { geo: 'ES' }, dimensionLabels: { geo: 'Spain' }, source },
  { id: 'inflation-eu-2026-06', metricId: 'inflation_rate_europe', datasetId: 'Harmonised inflation comparison', value: 2, unit: 'Percentage change compared to same period in previous year', period: '2026-06', dimensions: { geo: 'EU27_2020' }, dimensionLabels: { geo: 'European Union - 27 countries (from 2020)' }, source },
];
const inflationComparison = summarizeWarehouseEuropeanComparison('¿Está la inflación de España por encima de la Unión Europea?', inflationRecords);
if (!inflationComparison || inflationComparison.metricId !== 'inflation_rate_europe' || !inflationComparison.summary.includes('2,3') || !inflationComparison.summary.includes('2') || !inflationComparison.reply.includes('inflación española fue más alta')) throw new Error('European inflation comparison did not preserve the same-period Spain/EU comparison');
const employmentRecords = [
  { id: 'employment-es-2025', metricId: 'employment_rate_europe', datasetId: 'Employment comparison', value: 75.8, unit: 'Percentage of total population', period: '2025', dimensions: { geo: 'ES' }, dimensionLabels: { geo: 'Spain' }, source },
  { id: 'employment-eu-2025', metricId: 'employment_rate_europe', datasetId: 'Employment comparison', value: 75.0, unit: 'Percentage of total population', period: '2025', dimensions: { geo: 'EU27_2020' }, dimensionLabels: { geo: 'European Union - 27 countries (from 2020)' }, source },
];
const employmentComparison = summarizeWarehouseEuropeanComparison('¿Tiene España una tasa de empleo mayor que la Unión Europea?', employmentRecords);
if (!employmentComparison || employmentComparison.metricId !== 'employment_rate_europe' || !employmentComparison.summary.includes('75,8') || !employmentComparison.summary.includes('75') || !employmentComparison.reply.includes('tasa de empleo española fue más alta') || employmentComparison.reply.includes('interanual')) throw new Error('European employment comparison did not preserve the same-period Spain/EU comparison or localized its unit');
const revenueRecords = [
  { id: 'revenue-es-2025', metricId: 'government_revenue_ratio_europe', datasetId: 'Government revenue comparison', value: 42.9, unit: 'Percentage of gross domestic product', period: '2025', dimensions: { geo: 'ES' }, dimensionLabels: { geo: 'Spain' }, source },
  { id: 'revenue-eu-2025', metricId: 'government_revenue_ratio_europe', datasetId: 'Government revenue comparison', value: 46.4, unit: 'Percentage of gross domestic product', period: '2025', dimensions: { geo: 'EU27_2020' }, dimensionLabels: { geo: 'European Union - 27 countries (from 2020)' }, source },
];
const revenueComparison = summarizeWarehouseEuropeanComparison('¿España recauda más o menos que la media de la Unión Europea?', revenueRecords);
if (!revenueComparison || revenueComparison.metricId !== 'government_revenue_ratio_europe' || !revenueComparison.summary.includes('42,9') || !revenueComparison.summary.includes('46,4') || !revenueComparison.reply.includes('ingresos públicos españoles fueron más bajos')) throw new Error('European public-revenue comparison did not preserve the same-period comparison or public-aggregate caveat');
const expenditureRecords = [
  { id: 'expenditure-es-2025', metricId: 'government_expenditure_ratio_europe', datasetId: 'Government expenditure comparison', value: 45.3, unit: 'Percentage of gross domestic product', period: '2025', dimensions: { geo: 'ES' }, dimensionLabels: { geo: 'Spain' }, source },
  { id: 'expenditure-eu-2025', metricId: 'government_expenditure_ratio_europe', datasetId: 'Government expenditure comparison', value: 49.5, unit: 'Percentage of gross domestic product', period: '2025', dimensions: { geo: 'EU27_2020' }, dimensionLabels: { geo: 'European Union - 27 countries (from 2020)' }, source },
];
const expenditureComparison = summarizeWarehouseEuropeanComparison('¿España gasta más o menos que la media de la Unión Europea?', expenditureRecords);
if (!expenditureComparison || expenditureComparison.metricId !== 'government_expenditure_ratio_europe' || !expenditureComparison.summary.includes('45,3') || !expenditureComparison.summary.includes('49,5') || !expenditureComparison.reply.includes('gasto público español fue más bajo')) throw new Error('European public-expenditure comparison did not preserve the same-period comparison or public-aggregate caveat');
const healthRecords = [
  { id: 'health-es-2023', metricId: 'health_expenditure_per_capita_europe', datasetId: 'Health expenditure comparison', value: 2857.25, unit: 'Euro per inhabitant', period: '2023', dimensions: { geo: 'ES' }, dimensionLabels: { geo: 'Spain' }, source },
  { id: 'health-eu-2023', metricId: 'health_expenditure_per_capita_europe', datasetId: 'Health expenditure comparison', value: 3836.68, unit: 'Euro per inhabitant', period: '2023', dimensions: { geo: 'EU27_2020' }, dimensionLabels: { geo: 'European Union - 27 countries (from 2020)' }, source },
];
const healthComparison = summarizeWarehouseEuropeanComparison('¿España gasta más por habitante en sanidad que la Unión Europea?', healthRecords);
if (!healthComparison || healthComparison.metricId !== 'health_expenditure_per_capita_europe' || !healthComparison.summary.includes('2857,25') || !healthComparison.summary.includes('3836,68') || !healthComparison.summary.includes('por debajo de la Unión Europea') || !healthComparison.points.some((point) => point.includes('979,43 € por habitante menos')) || !healthComparison.reply.includes('gasto sanitario por habitante español fue más bajo')) throw new Error('European health-spending comparison did not preserve the same-period comparison or health caveat');
console.log('Warehouse ranking validation passed: same-period comparable regions are ranked with Spanish geography preserved.');
