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
const educationComparisonRecords = [
  { id: 'early-es-2025', metricId: 'early_school_leaving_rate_europe', datasetId: 'Early school leaving comparison', value: 12.8, unit: 'Percentage of population aged 18 to 24', period: '2025', dimensions: { geo: 'ES', age: 'Y18-24', sex: 'T' }, dimensionLabels: { geo: 'Spain' }, source },
  { id: 'early-eu-2025', metricId: 'early_school_leaving_rate_europe', datasetId: 'Early school leaving comparison', value: 9.1, unit: 'Percentage of population aged 18 to 24', period: '2025', dimensions: { geo: 'EU27_2020', age: 'Y18-24', sex: 'T' }, dimensionLabels: { geo: 'European Union - 27 countries (from 2020)' }, source },
];
const educationComparison = summarizeWarehouseEuropeanComparison('¿España tiene más abandono escolar que la Unión Europea?', educationComparisonRecords);
if (!educationComparison || educationComparison.metricId !== 'early_school_leaving_rate_europe' || !educationComparison.summary.includes('12,8') || !educationComparison.summary.includes('9,1') || !educationComparison.points.some((point) => point.includes('3,7 puntos porcentuales más')) || !educationComparison.reply.includes('tasa española de abandono escolar temprano fue más alta')) throw new Error('European education comparison did not preserve the same-period Spain/EU comparison or education denominator caveat');
const neetComparisonRecords = [
  { id: 'neet-es-2025', metricId: 'neet_rate_europe', datasetId: 'NEET comparison', value: 11.5, unit: 'Percentage of population aged 15 to 29', period: '2025', dimensions: { geo: 'ES', age: 'Y15-29', sex: 'T', training: 'NO_FE_NO_NFE', wstatus: 'NEMP' }, dimensionLabels: { geo: 'Spain' }, source },
  { id: 'neet-eu-2025', metricId: 'neet_rate_europe', datasetId: 'NEET comparison', value: 11, unit: 'Percentage of population aged 15 to 29', period: '2025', dimensions: { geo: 'EU27_2020', age: 'Y15-29', sex: 'T', training: 'NO_FE_NO_NFE', wstatus: 'NEMP' }, dimensionLabels: { geo: 'European Union - 27 countries (from 2020)' }, source },
];
const neetComparison = summarizeWarehouseEuropeanComparison('¿España tiene más ninis que la Unión Europea?', neetComparisonRecords);
if (!neetComparison || neetComparison.metricId !== 'neet_rate_europe' || !neetComparison.summary.includes('11,5') || !neetComparison.summary.includes('11') || !neetComparison.points.some((point) => point.includes('0,5 puntos porcentuales más')) || !neetComparison.reply.includes('tasa española fue más alta')) throw new Error('European NEET comparison did not preserve the same-period Spain/EU comparison or NEET caveat');
const aropeComparisonRecords = [
  { id: 'arope-es-2025', metricId: 'arope_rate_europe', datasetId: 'AROPE comparison', value: 25.7, unit: 'Percentage of total population', period: '2025', dimensions: { geo: 'ES', age: 'TOTAL', sex: 'T' }, dimensionLabels: { geo: 'Spain' }, source },
  { id: 'arope-eu-2025', metricId: 'arope_rate_europe', datasetId: 'AROPE comparison', value: 20.9, unit: 'Percentage of total population', period: '2025', dimensions: { geo: 'EU27_2020', age: 'TOTAL', sex: 'T' }, dimensionLabels: { geo: 'European Union - 27 countries (from 2020)' }, source },
];
const aropeComparison = summarizeWarehouseEuropeanComparison('¿España tiene más riesgo de pobreza o exclusión que la Unión Europea?', aropeComparisonRecords);
if (!aropeComparison || aropeComparison.metricId !== 'arope_rate_europe' || !aropeComparison.summary.includes('25,7') || !aropeComparison.summary.includes('20,9') || !aropeComparison.points.some((point) => point.includes('4,8 puntos porcentuales más')) || !aropeComparison.reply.includes('tasa española fue más alta')) throw new Error('European AROPE comparison did not preserve the same-period Spain/EU comparison or composite-indicator caveat');
const lifeExpectancyComparison = summarizeWarehouseEuropeanComparison('¿España vive más que Europa?', [
  { id: 'life-es-2024', metricId: 'life_expectancy_at_birth_europe', datasetId: 'Life expectancy comparison', value: 84, unit: 'Years', period: '2024', dimensions: { geo: 'ES', age: 'Y_LT1', sex: 'T' }, dimensionLabels: { geo: 'Spain' }, source },
  { id: 'life-eu-2024', metricId: 'life_expectancy_at_birth_europe', datasetId: 'Life expectancy comparison', value: 81.5, unit: 'Years', period: '2024', dimensions: { geo: 'EU27_2020', age: 'Y_LT1', sex: 'T' }, dimensionLabels: { geo: 'European Union - 27 countries (from 2020)' }, source },
]);
if (!lifeExpectancyComparison || lifeExpectancyComparison.metricId !== 'life_expectancy_at_birth_europe' || !lifeExpectancyComparison.summary.includes('84') || !lifeExpectancyComparison.summary.includes('81,5') || !lifeExpectancyComparison.reply.includes('esperanza de vida española fue más alta')) throw new Error('European life-expectancy comparison did not preserve the same-period Spain/EU comparison');
const gdpPerCapitaRecords = [
  { id: 'gdp-capita-es-2025', metricId: 'gdp_per_capita_europe', datasetId: 'GDP per capita comparison', value: 38135.7, unit: 'Current prices, purchasing power standard (PPS, EU27 from 2020) per capita', period: '2025', dimensions: { geo: 'ES' }, dimensionLabels: { geo: 'Spain' }, source },
  { id: 'gdp-capita-eu-2025', metricId: 'gdp_per_capita_europe', datasetId: 'GDP per capita comparison', value: 41565.7, unit: 'Current prices, purchasing power standard (PPS, EU27 from 2020) per capita', period: '2025', dimensions: { geo: 'EU27_2020' }, dimensionLabels: { geo: 'European Union - 27 countries (from 2020)' }, source },
];
const gdpPerCapitaComparison = summarizeWarehouseEuropeanComparison('¿Tiene España más PIB por habitante que la Unión Europea?', gdpPerCapitaRecords);
if (!gdpPerCapitaComparison || gdpPerCapitaComparison.metricId !== 'gdp_per_capita_europe' || !gdpPerCapitaComparison.summary.includes('38.135,7') || !gdpPerCapitaComparison.summary.includes('41.565,7') || !gdpPerCapitaComparison.summary.includes('por debajo de la Unión Europea') || !gdpPerCapitaComparison.points.some((point) => point.includes('3430 PPS por habitante menos')) || !gdpPerCapitaComparison.reply.includes('PIB por habitante español fue más bajo')) throw new Error('European GDP-per-capita comparison did not preserve the same-period comparison or metric caveat');
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
const youthComparisonRecords = [
  { id: 'youth-es-2025', metricId: 'youth_unemployment_rate_europe', datasetId: 'Youth unemployment comparison', value: 24.9, unit: 'Percentage of population in the labour force', period: '2025', dimensions: { geo: 'ES', age: 'Y15-24', sex: 'T' }, dimensionLabels: { geo: 'Spain' }, source },
  { id: 'youth-eu-2025', metricId: 'youth_unemployment_rate_europe', datasetId: 'Youth unemployment comparison', value: 15.2, unit: 'Percentage of population in the labour force', period: '2025', dimensions: { geo: 'EU27_2020', age: 'Y15-24', sex: 'T' }, dimensionLabels: { geo: 'European Union - 27 countries (from 2020)' }, source },
];
const youthComparison = summarizeWarehouseEuropeanComparison('¿Tiene España más paro juvenil que la Unión Europea?', youthComparisonRecords);
if (!youthComparison || youthComparison.metricId !== 'youth_unemployment_rate_europe' || !youthComparison.summary.includes('24,9') || !youthComparison.summary.includes('15,2') || !youthComparison.points.some((point) => point.includes('9,7 puntos porcentuales más')) || !youthComparison.reply.includes('tasa de paro juvenil española fue más alta')) throw new Error('European youth-unemployment comparison did not preserve the same-period Spain/EU comparison or youth denominator caveat');
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
const incomeRecords = [
  { id: 'income-es-2025', metricId: 'median_equivalised_income_europe', datasetId: 'Median equivalised income comparison', value: 22408, unit: 'Purchasing power standard (PPS)', period: '2025', dimensions: { geo: 'ES' }, dimensionLabels: { geo: 'Spain' }, source },
  { id: 'income-eu-2025', metricId: 'median_equivalised_income_europe', datasetId: 'Median equivalised income comparison', value: 22638, unit: 'Purchasing power standard (PPS)', period: '2025', dimensions: { geo: 'EU27_2020' }, dimensionLabels: { geo: 'European Union - 27 countries (from 2020)' }, source },
];
const incomeComparison = summarizeWarehouseEuropeanComparison('¿España tiene más renta mediana que la Unión Europea?', incomeRecords);
if (!incomeComparison || incomeComparison.metricId !== 'median_equivalised_income_europe' || !incomeComparison.summary.includes('22.408') || !incomeComparison.summary.includes('22.638') || !incomeComparison.summary.includes('por debajo de la Unión Europea') || !incomeComparison.points.some((point) => point.includes('230 PPS por persona menos')) || !incomeComparison.reply.includes('renta mediana española fue más baja')) throw new Error('European median-income comparison did not preserve the same-period comparison or income caveat');
const pensionComparisonRecords = [
  { id: 'pensions-es-2023', metricId: 'old_age_survivors_benefits_per_capita_europe', datasetId: 'Old-age and survivors benefits comparison', value: 3935.86, unit: 'Euro per inhabitant', period: '2023', dimensions: { geo: 'ES', spdeps: 'SPR', spfunc: 'OLD_SRV', unit: 'EUR_HAB' }, dimensionLabels: { geo: 'Spain' }, source },
  { id: 'pensions-eu-2023', metricId: 'old_age_survivors_benefits_per_capita_europe', datasetId: 'Old-age and survivors benefits comparison', value: 4816.84, unit: 'Euro per inhabitant', period: '2023', dimensions: { geo: 'EU27_2020', spdeps: 'SPR', spfunc: 'OLD_SRV', unit: 'EUR_HAB' }, dimensionLabels: { geo: 'European Union - 27 countries (from 2020)' }, source },
];
const pensionComparison = summarizeWarehouseEuropeanComparison('¿España gasta más por habitante en pensiones que la Unión Europea?', pensionComparisonRecords);
if (!pensionComparison || pensionComparison.metricId !== 'old_age_survivors_benefits_per_capita_europe' || !pensionComparison.summary.includes('3935,86') || !pensionComparison.summary.includes('4816,84') || !pensionComparison.summary.includes('por debajo de la Unión Europea') || !pensionComparison.points.some((point) => point.includes('880,98 € por habitante menos')) || !pensionComparison.reply.includes('gasto español fue más bajo')) throw new Error('European pension-spending comparison did not preserve the same-period comparison or pension caveat');
const taxComparisonRecords = [
  { id: 'tax-es-2025', metricId: 'government_current_taxes_income_wealth_europe', datasetId: 'Current taxes on income and wealth comparison', value: 12.5, unit: 'Percentage of gross domestic product (GDP)', period: '2025', dimensions: { geo: 'ES', unit: 'PC_GDP', na_item: 'D5', sector: 'S13' }, dimensionLabels: { geo: 'Spain' }, source },
  { id: 'tax-eu-2025', metricId: 'government_current_taxes_income_wealth_europe', datasetId: 'Current taxes on income and wealth comparison', value: 13.2, unit: 'Percentage of gross domestic product (GDP)', period: '2025', dimensions: { geo: 'EU27_2020', unit: 'PC_GDP', na_item: 'D5', sector: 'S13' }, dimensionLabels: { geo: 'European Union - 27 countries (from 2020)' }, source },
];
const taxComparison = summarizeWarehouseEuropeanComparison('¿España cobra más impuestos sobre renta y riqueza que la Unión Europea?', taxComparisonRecords);
if (!taxComparison || taxComparison.metricId !== 'government_current_taxes_income_wealth_europe' || !taxComparison.summary.includes('12,5') || !taxComparison.summary.includes('13,2') || !taxComparison.summary.includes('por debajo de la Unión Europea') || !taxComparison.points.some((point) => point.includes('0,7 puntos porcentuales menos')) || !taxComparison.reply.includes('proporción española fue más baja') || !taxComparison.points.some((point) => point.includes('factura fiscal de un hogar'))) throw new Error('European current-taxes comparison did not preserve the same-period comparison or household-tax caveat');
console.log('Warehouse ranking validation passed: same-period comparable regions are ranked with Spanish geography preserved.');
