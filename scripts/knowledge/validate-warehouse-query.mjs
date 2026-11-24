import { filterObservationsForRequestedGroup, indexLegacyWarehouseRecordPayload, indexWarehouseRecordFiles, populationEvidenceFit, rankWarehouseObservations, recordedOffenceCategoryForQuery, selectWarehouseRecordFiles, warehouseEvidenceFit } from './warehouse-query.mjs';
import { excludedMetricIdsForQuery, metricCandidatesForQuery, preferredMetricIdsForQuery } from './metric-query-hints.mjs';
import { handlerForInput } from './handlers.mjs';
import { observationMatchesAgeScope, requestedAgeScopes } from '../../src/lib/knowledge/age-scope.mjs';

const records = [
  { id: 'obs-1', datasetId: 'Tasa de empleo', metric: 'employment rate', value: 68.2, unit: '%', period: '2026-Q1', dimensions: { geography: 'Spain' }, source: { id: 'source-ine', publisher: 'INE', url: 'https://www.ine.es/' } },
  { id: 'obs-2', datasetId: 'Tasa de empleo', metric: 'employment rate', value: 67.4, unit: '%', period: '2025-Q1', dimensions: { geography: 'Spain' }, source: { id: 'source-ine', publisher: 'INE', url: 'https://www.ine.es/' } },
  { id: 'obs-3', datasetId: 'Foreign trade', metric: 'exports', value: 1, unit: 'EUR', period: '2026', dimensions: { geography: 'Spain' }, source: { id: 'source-ine', publisher: 'INE', url: 'https://www.ine.es/' } },
];
const result = rankWarehouseObservations('employment rate Spain', records);
if (result.length !== 2 || result[0].id !== 'obs-1') throw new Error('Warehouse query did not rank matching observations');
if (result.some((item) => item.evidenceFit !== 'direct' || !item.matchedTerms?.length)) throw new Error('Warehouse query did not preserve evidence-fit metadata');
if (rankWarehouseObservations('unknown metric', records).length) throw new Error('Warehouse query returned unrelated observations');
const modelResearchRecord = { id: 'llm-candidate', kind: 'llm-research-evidence', datasetId: 'Tasa de empleo', metric: 'employment rate', value: 99, unit: '%', period: '2026', finding: 'The model says employment is 99%.', source: { id: 'llm-source', publisher: 'INE', url: 'https://www.ine.es/' } };
if (rankWarehouseObservations('employment rate Spain', [modelResearchRecord]).length) throw new Error('Warehouse query exposed a model-generated research lead as source evidence');
if (warehouseEvidenceFit(0.34) !== 'weak' || warehouseEvidenceFit(0.5) !== 'qualified' || warehouseEvidenceFit(0.8) !== 'direct') throw new Error('Warehouse evidence-fit thresholds are invalid');

const ageSource = { id: 'source-age-rates', title: 'Unemployment by age', url: 'https://example.org/unemployment-by-age' };
const ageRows = [
  { id: 'unemployment-15-24', metricId: 'unemployment_rate', metric: 'unemployment rate', value: 23.1, unit: '%', period: '2025', dimensions: { geo: 'ES', age: 'Y15-24' }, dimensionLabels: { age: '15 to 24 years' }, source: ageSource },
  { id: 'unemployment-20-34', metricId: 'unemployment_rate', metric: 'unemployment rate', value: 14.8, unit: '%', period: '2025', dimensions: { geo: 'ES', age: 'Y20-34' }, dimensionLabels: { age: '20 to 34 years' }, source: ageSource },
  { id: 'unemployment-25-34', metricId: 'unemployment_rate', metric: 'unemployment rate', value: 12.6, unit: '%', period: '2025', dimensions: { geo: 'ES', age: 'Y25-34' }, dimensionLabels: { age: '25 to 34 years' }, source: ageSource },
  { id: 'unemployment-35-44', metricId: 'unemployment_rate', metric: 'unemployment rate', value: 9.4, unit: '%', period: '2025', dimensions: { geo: 'ES', age: 'Y35-44' }, dimensionLabels: { age: '35 to 44 years' }, source: ageSource },
  { id: 'unemployment-all-ages', metricId: 'unemployment_rate', metric: 'unemployment rate', value: 10.2, unit: '%', period: '2025', dimensions: { geo: 'ES', age: 'TOTAL' }, dimensionLabels: { age: 'All ages' }, source: ageSource },
  { id: 'unemployment-age-missing', metricId: 'unemployment_rate', metric: 'unemployment rate', value: 8.7, unit: '%', dimensions: { geo: 'ES' }, source: ageSource },
];
const ageQuery = (query) => rankWarehouseObservations(query, ageRows, 20, { metricIds: new Set(['unemployment_rate']) });
for (const query of ['Tasa de paro de personas de 25 a 34 años', 'Unemployment rate for people aged 25 to 34']) {
  const scoped = ageQuery(query);
  if (scoped.length !== 1 || scoped[0].id !== 'unemployment-25-34') throw new Error(`Explicit age request returned evidence from another age band: ${query}`);
}
const adjacentAge = ageQuery('Tasa de paro de personas de 35 a 44 años');
if (adjacentAge.length !== 1 || adjacentAge[0].id !== 'unemployment-35-44') throw new Error('A nearby age claim crossed into the 25–34 group');
const yearRows = [2015, 2016, 2018, 2020, 2021].map((year) => ({
  id: `unemployment-${year}`, metricId: 'unemployment_rate', metric: 'unemployment rate', value: 10, unit: '%', period: String(year), geography: 'Spain', dimensions: { geo: 'ES' }, source: ageSource,
})).concat([{ id: 'unemployment-period-missing', metricId: 'unemployment_rate', metric: 'unemployment rate', value: 10, unit: '%', geography: 'Spain', dimensions: { geo: 'ES' }, source: ageSource }]);
const yearQuery = (query) => rankWarehouseObservations(query, yearRows, 20, { metricIds: new Set(['unemployment_rate']) });
for (const query of ['Unemployment rate from 2015 to 2020', 'Unemployment rate between 2015 and 2020']) {
  const scoped = yearQuery(query);
  if (scoped.length !== 4 || scoped.some((item) => ![2015, 2016, 2018, 2020].some((year) => item.id === `unemployment-${year}`))) throw new Error(`An inclusive year range returned a record outside its requested period: ${query}`);
}
const selectedYears = yearQuery('Compare unemployment in 2015 and 2020');
if (selectedYears.length !== 2 || selectedYears.some((item) => !['unemployment-2015', 'unemployment-2020'].includes(item.id))) throw new Error('A comparison of selected years was broadened into an interval');
for (const query of ['Unemployment rate since 2018', 'Tasa de paro desde el año 2018']) {
  const sinceYear = yearQuery(query);
  if (sinceYear.length !== 3 || sinceYear.some((item) => !['unemployment-2018', 'unemployment-2020', 'unemployment-2021'].includes(item.id))) throw new Error(`A since-year request did not retain later observations or included earlier data: ${query}`);
}
const untilYear = yearQuery('Unemployment rate up to 2016');
if (untilYear.length !== 2 || untilYear.some((item) => !['unemployment-2015', 'unemployment-2016'].includes(item.id))) throw new Error('An up-to-year request did not stop at its stated end year');
if (yearQuery('Unemployment rate in Spain').length !== yearRows.length) throw new Error('An unscoped query was unexpectedly restricted to a year');
const quarterRows = ['2020-Q1', '2020-Q2', '2020-Q3', '2020-Q4', '2020'].map((period) => ({
  id: `unemployment-${period}`, metricId: 'unemployment_rate', metric: 'unemployment rate', value: 10, unit: '%', period, source: ageSource,
}));
const quarterQuery = (query) => rankWarehouseObservations(query, quarterRows, 20, { metricIds: new Set(['unemployment_rate']) });
for (const query of ['Unemployment rate in Q2 2020', 'Unemployment rate in Q2 of 2020', 'Tasa de paro en el segundo trimestre de 2020', 'Tasa de paro en 2020-Q2']) {
  const scoped = quarterQuery(query);
  if (scoped.length !== 1 || scoped[0].id !== 'unemployment-2020-Q2') throw new Error(`An explicit quarter request returned another quarter or an annual total: ${query}`);
}
const monthRows = ['2025-01', '2025-02', '2025-03', '2025'].map((period) => ({
  id: `unemployment-${period}`, metricId: 'unemployment_rate', metric: 'unemployment rate', value: 10, unit: '%', period, source: ageSource,
}));
const monthQuery = (query) => rankWarehouseObservations(query, monthRows, 20, { metricIds: new Set(['unemployment_rate']) });
for (const query of ['Tasa de paro en febrero de 2025', 'Unemployment rate in February 2025']) {
  const scoped = monthQuery(query);
  if (scoped.length !== 1 || scoped[0].id !== 'unemployment-2025-02') throw new Error(`An explicit month request returned another month or an annual total: ${query}`);
}
const geographyRows = [
  { id: 'unemployment-spain', metricId: 'unemployment_rate', metric: 'unemployment rate', value: 10, period: '2025', dimensions: { geo: 'ES' }, dimensionLabels: { geo: 'Spain' }, geography: 'Spain', source: ageSource },
  { id: 'unemployment-france', metricId: 'unemployment_rate', metric: 'unemployment rate', value: 8, period: '2025', dimensions: { geo: 'FR' }, dimensionLabels: { geo: 'France' }, geography: 'France', source: ageSource },
  { id: 'unemployment-germany', metricId: 'unemployment_rate', metric: 'unemployment rate', value: 6, period: '2025', dimensions: { geo: 'DE' }, dimensionLabels: { geo: 'Germany' }, geography: 'Germany', source: ageSource },
  { id: 'unemployment-eu', metricId: 'unemployment_rate', metric: 'unemployment rate', value: 7, period: '2025', dimensions: { geo: 'EU27_2020' }, dimensionLabels: { geo: 'European Union (27 countries)' }, geography: 'European Union', source: ageSource },
  { id: 'unemployment-madrid', metricId: 'unemployment_rate', metric: 'unemployment rate', value: 9, period: '2025', dimensions: { geo: 'ES30' }, dimensionLabels: { geo: 'Community of Madrid' }, geography: 'Spain', source: ageSource },
  { id: 'unemployment-geography-missing', metricId: 'unemployment_rate', metric: 'unemployment rate', value: 11, period: '2025', source: ageSource },
];
const geographyQuery = (query) => rankWarehouseObservations(query, geographyRows, 20, { metricIds: new Set(['unemployment_rate']) });
for (const query of ['Tasa de paro en Francia', 'Unemployment rate in France']) {
  const scoped = geographyQuery(query);
  if (scoped.length !== 1 || scoped[0].id !== 'unemployment-france') throw new Error(`A country-specific claim returned another country's data: ${query}`);
}
const internationalComparison = geographyQuery('Compare unemployment in Spain with the European Union');
if (internationalComparison.length !== 2 || internationalComparison.some((item) => !['unemployment-spain', 'unemployment-eu'].includes(item.id))) throw new Error('A Spain/EU comparison included an unrelated geography');
const regionalClaim = geographyQuery('Tasa de paro en Madrid, España');
if (regionalClaim.length !== 1 || regionalClaim[0].id !== 'unemployment-madrid') throw new Error('A regional request was answered with national data');
const regionalComparison = geographyQuery('Compare unemployment in Madrid with Spain');
if (regionalComparison.length !== 2 || regionalComparison.some((item) => !['unemployment-madrid', 'unemployment-spain'].includes(item.id))) throw new Error('A regional/national comparison did not retain exactly its requested places');
if (geographyQuery('Unemployment rate in France').some((item) => item.id === 'unemployment-geography-missing')) throw new Error('A geography-specific claim accepted an observation with unknown geography');
const sexRows = [
  { id: 'unemployment-women', metricId: 'unemployment_rate', metric: 'unemployment rate', value: 12, period: '2025', dimensions: { geo: 'ES', sex: 'F' }, dimensionLabels: { geo: 'Spain', sex: 'Women' }, source: ageSource },
  { id: 'unemployment-men', metricId: 'unemployment_rate', metric: 'unemployment rate', value: 8, period: '2025', dimensions: { geo: 'ES', sex: 'M' }, dimensionLabels: { geo: 'Spain', sex: 'Men' }, source: ageSource },
  { id: 'unemployment-total-sex', metricId: 'unemployment_rate', metric: 'unemployment rate', value: 10, period: '2025', dimensions: { geo: 'ES', sex: 'T' }, dimensionLabels: { geo: 'Spain', sex: 'Total' }, source: ageSource },
];
const sexQuery = (query) => rankWarehouseObservations(query, sexRows, 20, { metricIds: new Set(['unemployment_rate']) });
for (const query of ['Tasa de paro de las mujeres', 'Unemployment rate among women']) {
  const scoped = sexQuery(query);
  if (scoped.length !== 1 || scoped[0].id !== 'unemployment-women') throw new Error(`A women-specific claim did not use the women-only series: ${query}`);
}
const menRate = sexQuery('Tasa de paro de los hombres');
if (menRate.length !== 1 || menRate[0].id !== 'unemployment-men') throw new Error('A men-specific claim did not use the men-only series');
const sexBreakdownRows = sexQuery('Unemployment rate by sex');
if (sexBreakdownRows.length !== 2 || sexBreakdownRows.some((item) => !['unemployment-women', 'unemployment-men'].includes(item.id))) throw new Error('A sex breakdown included the aggregate total or omitted a requested group');
const defaultSexTotal = sexQuery('Unemployment rate in Spain');
if (defaultSexTotal.length !== 1 || defaultSexTotal[0].id !== 'unemployment-total-sex') throw new Error('An unqualified metric claim selected a sex subgroup over the total');
const periodAndAmountQueries = ['La tasa pasó del 20 al 34 % entre 2015 y 2020', 'El coste está entre 20 y 34 euros al mes'];
for (const query of periodAndAmountQueries) {
  if (requestedAgeScopes(query).length) throw new Error(`A year range or money amount was parsed as an age request: ${query}`);
}
const historicalAgeQuery = ageQuery('Tasa de paro de 25 a 34 años entre 2020 y 2025');
if (historicalAgeQuery.length !== 1 || historicalAgeQuery[0].id !== 'unemployment-25-34') throw new Error('A period range contaminated the explicitly requested age band');
const ageComparison = ageQuery('Compara la tasa de paro de personas de 20 a 34 años y de 35 a 44 años');
if (ageComparison.length !== 2 || ageComparison.some((item) => !['unemployment-20-34', 'unemployment-35-44'].includes(item.id))) throw new Error('An age-group comparison did not retain exactly its requested groups');
const unscopedAgeRows = ageQuery('Unemployment rate in Spain');
if (unscopedAgeRows.length !== ageRows.length) throw new Error('An unscoped query was unexpectedly restricted to an age group');
for (const query of ['Tasa de paro de todas las edades', 'Unemployment rate for all ages']) {
  const allAges = ageQuery(query);
  if (allAges.length !== 1 || allAges[0].id !== 'unemployment-all-ages') throw new Error(`An all-ages request was answered with an age subgroup: ${query}`);
}
if (ageQuery('Tasa de paro para menores de 15 años').length) throw new Error('An age request was answered using missing or unrelated age metadata');
if (!observationMatchesAgeScope('Tasa de paro para menores de 15 años', { dimensions: { age: 'Y_LT15' } })) throw new Error('The exact under-15 dimension did not match');
if (observationMatchesAgeScope('Tasa de paro para menores de 15 años', { dimensions: { age: 'Y_LE15' } })) throw new Error('An inclusive at-most age dimension was treated as strictly under the requested age');
if (!observationMatchesAgeScope('Tasa de paro de personas de 65 años o más', { dimensions: { age: 'Y_GE65' } })) throw new Error('The exact 65-or-older dimension did not match');
if (observationMatchesAgeScope('Tasa de paro de personas de 65 años o más', { dimensions: { age: 'Y_GT65' } })) throw new Error('A strictly over-65 dimension was treated as 65-or-older');

const residentRows = [
  { id: 'resident-total', metricId: 'resident_population', metric: 'resident population', value: 49128297, unit: 'Number', period: '2025', dimensions: { geo: 'ES', age: 'TOTAL', sex: 'T' }, source: { id: 'source-population', title: 'Eurostat resident population', url: 'https://ec.europa.eu/eurostat/' } },
  { id: 'resident-men', metricId: 'resident_population', metric: 'resident population', value: 24090369, unit: 'Number', period: '2025', dimensions: { geo: 'ES', age: 'TOTAL', sex: 'M' }, source: { id: 'source-population', title: 'Eurostat resident population', url: 'https://ec.europa.eu/eurostat/' } },
  { id: 'resident-women', metricId: 'resident_population', metric: 'resident population', value: 25037928, unit: 'Number', period: '2025', dimensions: { geo: 'ES', age: 'TOTAL', sex: 'F' }, source: { id: 'source-population', title: 'Eurostat resident population', url: 'https://ec.europa.eu/eurostat/' } },
  { id: 'resident-child', metricId: 'resident_population', metric: 'resident population', value: 318907, unit: 'Number', period: '2025', dimensions: { geo: 'ES', age: 'Y_LT1', sex: 'T' }, source: { id: 'source-population', title: 'Eurostat resident population', url: 'https://ec.europa.eu/eurostat/' } },
];
const residents = (query) => rankWarehouseObservations(query, residentRows, 20, { metricIds: new Set(['resident_population']) });
const totalResidents = residents('Población residente en España, habitantes');
if (totalResidents.length !== 1 || totalResidents[0].id !== 'resident-total') throw new Error('A general population query mixed the total with age or sex subgroups');
const womenResidents = residents('Población residente de mujeres en España');
if (womenResidents.length !== 1 || womenResidents[0].id !== 'resident-women') throw new Error('A women-only population query used the overall total or another sex');
const sexBreakdown = residents('Población residente por sexo en España');
if (sexBreakdown.length !== 2 || sexBreakdown.some((item) => !['resident-men', 'resident-women'].includes(item.id))) throw new Error('A sex breakdown did not preserve the two requested groups');
const sourceRevisions = rankWarehouseObservations('España población habitantes', [
  { ...residentRows[0], id: 'resident-old', value: 48000000, source: { id: 'source-old', title: 'Eurostat resident population', url: 'https://ec.europa.eu/eurostat/', retrievedAt: '2025-01-01T00:00:00.000Z' } },
  { ...residentRows[0], id: 'resident-current', value: 49128297, source: { id: 'source-current', title: 'Eurostat resident population', url: 'https://ec.europa.eu/eurostat/', retrievedAt: '2026-11-16T00:00:00.000Z' } },
], 20, { metricIds: new Set(['resident_population']) });
if (sourceRevisions.length !== 1 || sourceRevisions[0].id !== 'resident-current') throw new Error('An older copy of the same source series overrode the newest retrieval');

const immigrantObservation = { population: 'Foreign-born residents', dimensions: { geo: 'ES' }, dimensionLabels: { group: 'Foreign nationals' } };
const residentObservation = { population: 'Resident population', dimensions: { geo: 'ES' }, dimensionLabels: { group: 'Total' } };
if (populationEvidenceFit('personas inmigrantes o extranjeras', immigrantObservation) !== 'direct') throw new Error('Warehouse population fit did not recognize the requested group');
if (populationEvidenceFit('personas inmigrantes o extranjeras', residentObservation) !== 'context') throw new Error('Warehouse population fit did not protect total-population context');
if (populationEvidenceFit('personas beneficiarias', { population: 'households receiving rent assistance' }) !== 'mismatch') throw new Error('Warehouse population fit did not reject a mismatched population');
if (!preferredMetricIdsForQuery('paro juvenil en España').has('youth_unemployment_rate')) throw new Error('Metric hints did not prefer youth unemployment for youth wording');
if (preferredMetricIdsForQuery('Los jóvenes no pueden permitirse una vivienda').has('youth_unemployment_rate')) throw new Error('Metric hints confused a housing affordability claim with youth unemployment');
if (!preferredMetricIdsForQuery('España tiene más paro juvenil que la Unión Europea').has('youth_unemployment_rate_europe')) throw new Error('Metric hints did not prefer the Spain/EU youth unemployment comparison');
if (preferredMetricIdsForQuery('España tiene más paro juvenil que la Unión Europea').has('youth_unemployment_rate')) throw new Error('Metric hints did not keep Spain/EU youth unemployment distinct from the Spain-only series');
if (!excludedMetricIdsForQuery('evolución del desempleo en España').has('youth_unemployment_rate')) throw new Error('Metric hints did not suppress youth unemployment for generic wording');
if (excludedMetricIdsForQuery('desempleo juvenil en España').size) throw new Error('Metric hints incorrectly suppressed youth unemployment when youth wording was explicit');
if (!preferredMetricIdsForQuery('evolución de la recaudación pública').has('government_revenue_ratio')) throw new Error('Metric hints did not prefer public revenue for revenue wording');
if (!preferredMetricIdsForQuery('gasto público sobre PIB').has('government_expenditure_ratio')) throw new Error('Metric hints did not prefer public expenditure for spending wording');
if (!preferredMetricIdsForQuery('España recauda más o menos que la media de la Unión Europea').has('government_revenue_ratio_europe')) throw new Error('Metric hints did not prefer European public revenue for comparison wording');
if (preferredMetricIdsForQuery('España recauda más o menos que la media de la Unión Europea').has('government_revenue_ratio')) throw new Error('Metric hints kept Spain-only public revenue alongside European comparison wording');
if (!preferredMetricIdsForQuery('¿España cobra más impuestos sobre renta y riqueza que la Unión Europea?').has('government_current_taxes_income_wealth_europe')) throw new Error('Metric hints did not prefer the Spain/EU current-taxes comparison family');
if (preferredMetricIdsForQuery('¿España cobra más impuestos sobre renta y riqueza que la Unión Europea?').has('government_revenue_ratio_europe')) throw new Error('Metric hints confused current taxes with total public revenue');
if (preferredMetricIdsForQuery('¿España cobra más impuestos sobre renta y riqueza que la Unión Europea?').has('government_revenue_ratio')) throw new Error('Metric hints kept Spain-only public revenue alongside the current-taxes comparison');
if (preferredMetricIdsForQuery('España tiene demasiados impuestos').size) throw new Error('Metric hints promoted an underspecified tax judgement to a measurable series');
if (!preferredMetricIdsForQuery('España gasta más o menos que la media de la Unión Europea').has('government_expenditure_ratio_europe')) throw new Error('Metric hints did not prefer European public expenditure for comparison wording');
if (preferredMetricIdsForQuery('España gasta más o menos que la media de la Unión Europea').has('government_expenditure_ratio')) throw new Error('Metric hints kept Spain-only public expenditure alongside European comparison wording');
if (!preferredMetricIdsForQuery('España gasta más por habitante en sanidad que la Unión Europea').has('health_expenditure_per_capita_europe')) throw new Error('Metric hints did not prefer European health spending for comparison wording');
if (preferredMetricIdsForQuery('España gasta más por habitante en sanidad que la Unión Europea').has('health_expenditure_per_capita')) throw new Error('Metric hints kept Spain-only health spending alongside European comparison wording');
if (!preferredMetricIdsForQuery('España tiene más renta mediana que la Unión Europea').has('median_equivalised_income_europe')) throw new Error('Metric hints did not prefer European median income for comparison wording');
if (preferredMetricIdsForQuery('España tiene más renta mediana que la Unión Europea').has('median_equivalised_income')) throw new Error('Metric hints kept Spain-only median income alongside European comparison wording');
if (!preferredMetricIdsForQuery('sobrecarga del coste de la vivienda').has('housing_cost_overburden_rate')) throw new Error('Metric hints did not prefer housing cost overburden for affordability wording');
const monetaryRentQuestion = preferredMetricIdsForQuery('¿Cuál es el importe en euros del alquiler medio más reciente en España?');
if (!monetaryRentQuestion.has('rental_price_index') || monetaryRentQuestion.has('house_price_index')) throw new Error('Metric hints did not keep a monetary rent request on the rent measure or protect it from home-sale prices');
const rentVerbAmountQuestion = preferredMetricIdsForQuery('¿Qué último dato oficial indica cuánto cuesta alquilar una vivienda al mes, en euros, en España?');
if (!rentVerbAmountQuestion.has('rental_price_index') || rentVerbAmountQuestion.has('house_price_index') || rentVerbAmountQuestion.has('housing_cost_overburden_rate')) throw new Error('Metric hints routed a monthly rent amount to home-sale or affordability measures');
if (!preferredMetricIdsForQuery('gasto sanitario por habitante').has('health_expenditure_per_capita')) throw new Error('Metric hints did not prefer health expenditure for resource wording');
if (!preferredMetricIdsForQuery('¿España paga más por la electricidad que Europa?').has('household_electricity_price_europe')) throw new Error('Metric hints did not prefer the Spain/EU household electricity comparison');
if (preferredMetricIdsForQuery('¿España paga más por la electricidad que Europa?').has('household_electricity_price')) throw new Error('Metric hints kept Spain-only household electricity alongside European comparison wording');
if (!excludedMetricIdsForQuery('¿Cómo ha cambiado el precio de la electricidad para los hogares en España?').has('household_electricity_price_europe')) throw new Error('Metric hints did not suppress the European electricity series for Spain-only wording');
const industrialElectricitySpain = preferredMetricIdsForQuery('¿Qué precio pagan por electricidad las grandes industrias españolas?');
if (!industrialElectricitySpain.has('industrial_electricity_price') || industrialElectricitySpain.has('household_electricity_price')) throw new Error('An industrial electricity-price query did not select its non-household measure exclusively');
const industrialElectricityEurope = preferredMetricIdsForQuery('¿Cuál es el precio de la electricidad para grandes consumidores industriales de España frente a Europa?');
if (!industrialElectricityEurope.has('industrial_electricity_price_europe') || industrialElectricityEurope.has('industrial_electricity_price') || industrialElectricityEurope.has('household_electricity_price_europe')) throw new Error('An industrial electricity comparison did not keep its population and geography specific');
const householdElectricityOnly = preferredMetricIdsForQuery('¿Cuánto cuesta la luz para los hogares españoles?');
if (!householdElectricityOnly.has('household_electricity_price') || householdElectricityOnly.has('industrial_electricity_price')) throw new Error('A household electricity question crossed into the non-household price measure');
const energyPassThroughQuery = 'Las bajadas del precio mayorista tardan en trasladarse a muchos contratos de consumidores';
if (preferredMetricIdsForQuery(energyPassThroughQuery).has('household_electricity_price')) throw new Error('A wholesale-to-consumer contract lag claim was routed to household electricity prices, which do not measure pass-through timing');
if (preferredMetricIdsForQuery('El precio mayorista influye en los contratos de consumidores').has('household_electricity_price')) throw new Error('Generic wholesale and consumer-contract wording must not imply household electricity price evidence without a scoped interpretation');
if (preferredMetricIdsForQuery('El sistema fiscal castiga empezar una actividad antes de que el negocio tenga ingresos estables').size) throw new Error('A self-employment startup-cost claim must not be answered by an unrelated aggregate tax metric');
if (!preferredMetricIdsForQuery('cuánto gasta sanidad por habitante en España').has('health_expenditure_per_capita')) throw new Error('Metric hints did not prefer health expenditure for conversational wording');
if (!preferredMetricIdsForQuery('cuánto dinero se dedica por persona a la sanidad').has('health_expenditure_per_capita')) throw new Error('Metric hints did not prefer health expenditure for colloquial spending wording');
if (!preferredMetricIdsForQuery('cuánto debe España').has('government_debt_ratio')) throw new Error('Metric hints did not prefer public debt for colloquial debt wording');
if (!preferredMetricIdsForQuery('porcentaje de residentes AROPE en España').has('arope_rate')) throw new Error('Metric hints did not prefer AROPE for resident percentage wording');
if (!preferredMetricIdsForQuery('¿España tiene más riesgo de pobreza o exclusión que la Unión Europea?').has('arope_rate_europe')) throw new Error('Metric hints did not prefer the Spain/EU AROPE comparison');
if (preferredMetricIdsForQuery('¿España tiene más riesgo de pobreza o exclusión que la Unión Europea?').has('arope_rate')) throw new Error('Metric hints kept Spain-only AROPE alongside the Spain/EU comparison');
if (!excludedMetricIdsForQuery('¿Qué porcentaje de personas está en riesgo de pobreza o exclusión en España?').has('arope_rate_europe')) throw new Error('Metric hints did not keep Spain/EU AROPE separate from the Spain-only question');
if (!excludedMetricIdsForQuery('La sanidad pública está completamente colapsada').has('health_expenditure_per_capita')) throw new Error('Metric hints allowed per-capita spending to answer a broad health-system outcome claim');
if (!preferredMetricIdsForQuery('desigualdad de ingresos en España').has('gini_coefficient')) throw new Error('Metric hints did not prefer Gini for inequality wording');
if (!preferredMetricIdsForQuery('déficit público sobre PIB').has('government_deficit_ratio')) throw new Error('Metric hints did not prefer public deficit for deficit wording');
if (!preferredMetricIdsForQuery('renta mediana de los hogares').has('median_equivalised_income')) throw new Error('Metric hints did not prefer median income for household-income wording');
if (!preferredMetricIdsForQuery('cuánto ingresan de media los hogares').has('median_equivalised_income')) throw new Error('Metric hints did not prefer median income for colloquial household wording');
if (!preferredMetricIdsForQuery('Porcentaje de la población activa que encuentra trabajo').has('employment_rate')) throw new Error('Metric hints did not prefer employment for everyday wording');
if (!preferredMetricIdsForQuery('Evolución del desempleo en España').has('unemployment_rate')) throw new Error('Metric hints did not prefer unemployment for trend wording');
if (!preferredMetricIdsForQuery('¿Qué parte del empleo en España es a tiempo parcial?').has('part_time_employment_rate')) throw new Error('Metric hints did not prefer part-time employment for Spain-only wording');
if (preferredMetricIdsForQuery('¿Qué parte del empleo en España es a tiempo parcial?').has('employment_rate')) throw new Error('Metric hints kept generic employment alongside Spain-only part-time wording');
if (!preferredMetricIdsForQuery('¿España tiene más empleo parcial que la Unión Europea?').has('part_time_employment_rate_europe')) throw new Error('Metric hints did not prefer European part-time employment for comparison wording');
if (preferredMetricIdsForQuery('¿España tiene más empleo parcial que la Unión Europea?').has('part_time_employment_rate')) throw new Error('Metric hints kept Spain-only part-time employment alongside the European comparison');
if (!preferredMetricIdsForQuery('¿Qué parte del empleo en España es temporal?').has('temporary_employment_rate')) throw new Error('Metric hints did not prefer temporary employment for Spain-only wording');
if (preferredMetricIdsForQuery('¿Qué parte del empleo en España es temporal?').has('employment_rate')) throw new Error('Metric hints kept generic employment alongside Spain-only temporary-employment wording');
if (!preferredMetricIdsForQuery('¿España tiene más temporalidad que Europa?').has('temporary_employment_rate_europe')) throw new Error('Metric hints did not prefer European temporary employment for comparison wording');
if (preferredMetricIdsForQuery('¿España tiene más temporalidad que Europa?').has('temporary_employment_rate')) throw new Error('Metric hints kept Spain-only temporary employment alongside the European comparison');
if (!preferredMetricIdsForQuery('¿Cuál es el salario mediano por hora en España?').has('median_hourly_earnings')) throw new Error('Metric hints did not prefer hourly earnings for Spain-only wording');
if (!preferredMetricIdsForQuery('¿España cobra menos por hora que Europa?').has('median_hourly_earnings_europe')) throw new Error('Metric hints did not prefer European hourly earnings for comparison wording');
if (preferredMetricIdsForQuery('¿España cobra menos por hora que Europa?').has('median_hourly_earnings')) throw new Error('Metric hints kept Spain-only hourly earnings alongside the European comparison');
if (preferredMetricIdsForQuery('Comparación europea del salario bruto por hora').has('unemployment_rate_europe')) throw new Error('Metric hints confused hourly earnings with generic European unemployment wording');
if (!preferredMetricIdsForQuery('¿España tiene más sobrecarga de vivienda que Europa?').has('housing_cost_overburden_rate_europe')) throw new Error('Metric hints did not prefer European housing-cost overburden for comparison wording');
if (preferredMetricIdsForQuery('¿España tiene más sobrecarga de vivienda que Europa?').has('housing_cost_overburden_rate')) throw new Error('Metric hints kept Spain-only housing-cost overburden alongside the European comparison');
if (!preferredMetricIdsForQuery('Comparación europea del esfuerzo de vivienda').has('housing_cost_overburden_rate_europe')) throw new Error('Metric hints did not prefer European housing effort for comparison wording');
if (!preferredMetricIdsForQuery('España tiene el paro más alto de Europa').has('unemployment_rate_europe')) throw new Error('Metric hints did not prefer European unemployment for comparison wording');
if (preferredMetricIdsForQuery('España tiene el paro más alto de Europa').has('unemployment_rate')) throw new Error('Metric hints kept generic unemployment alongside European comparison wording');
if (!preferredMetricIdsForQuery('España tiene una tasa de empleo mayor que la Unión Europea').has('employment_rate_europe')) throw new Error('Metric hints did not prefer European employment for comparison wording');
if (preferredMetricIdsForQuery('España tiene una tasa de empleo mayor que la Unión Europea').has('employment_rate')) throw new Error('Metric hints kept Spain-only employment alongside European comparison wording');
if (!preferredMetricIdsForQuery('Qué porcentaje de jóvenes activos no encuentra trabajo').has('youth_unemployment_rate') || preferredMetricIdsForQuery('Qué porcentaje de jóvenes activos no encuentra trabajo').has('employment_rate')) throw new Error('Metric hints did not keep youth unemployment distinct from employment');
if (!preferredMetricIdsForQuery('Cuántos habitantes viven normalmente en España').has('resident_population')) throw new Error('Metric hints did not prefer resident population');
if (!preferredMetricIdsForQuery('Cuántos residentes nacieron fuera de España').has('foreign_born_population')) throw new Error('Metric hints did not prefer foreign-born population');
if (!preferredMetricIdsForQuery('Población inmigrante según su país de nacimiento').has('foreign_born_population')) throw new Error('Metric hints did not prefer foreign-born population for origin wording');
if (!preferredMetricIdsForQuery('Cuántas personas inmigraron a España durante el último año').has('immigration_flows')) throw new Error('Metric hints did not prefer immigration flows');
if (!preferredMetricIdsForQuery('Cada vez llegan más inmigrantes a España').has('immigration_flows')) throw new Error('Metric hints did not prefer immigration flows for conversational trend wording');
if (!preferredMetricIdsForQuery('Cuántos residentes tienen ciudadanía extranjera en España').has('foreign_citizenship_population')) throw new Error('Metric hints did not prefer foreign citizenship population');
if (preferredMetricIdsForQuery('Cuántos residentes tienen ciudadanía extranjera en España').has('foreign_born_population')) throw new Error('Foreign citizenship wording fell through to country-of-birth population');
if (!preferredMetricIdsForQuery('Qué comunidad tiene mayor densidad de población').has('regional_population_density')) throw new Error('Metric hints did not prefer regional density for community wording');
if (!preferredMetricIdsForQuery('Hay más personas por kilómetro cuadrado en Madrid que en Andalucía').has('regional_population_density')) throw new Error('Metric hints did not prefer regional density for everyday wording');
if (!preferredMetricIdsForQuery('Mi cuñado insiste: España tiene más empleo que nunca').has('employment_rate')) throw new Error('Metric hints did not prefer employment for compressed everyday wording');
if (!preferredMetricIdsForQuery('España tasa de paro alta en Europa').has('unemployment_rate_europe')) throw new Error('Metric hints did not prefer European unemployment for compressed comparison wording');
if (!preferredMetricIdsForQuery('España millones habitantes').has('resident_population')) throw new Error('Metric hints did not prefer resident population for compressed population wording');
if (!preferredMetricIdsForQuery('Evolucionado esperanza vida España').has('life_expectancy_at_birth')) throw new Error('Metric hints did not prefer life expectancy for compressed wording');
if (!preferredMetricIdsForQuery('¿Cuántas personas mayores hay por cada cien en edad laboral?').has('old_age_dependency_ratio')) throw new Error('Metric hints did not prefer old-age dependency for per-working-age wording');
if (preferredMetricIdsForQuery('¿Cuántas personas mayores hay por cada cien en edad laboral?').has('older_population_share')) throw new Error('Metric hints confused old-age dependency with the 65+ population share');
if (!preferredMetricIdsForQuery('¿España vive más que Europa?').has('life_expectancy_at_birth_europe')) throw new Error('Metric hints did not prefer the Spain/EU life-expectancy comparison');
if (!excludedMetricIdsForQuery('¿Cómo ha evolucionado la esperanza de vida en España?').has('life_expectancy_at_birth_europe')) throw new Error('Metric hints did not keep Spain/EU life expectancy separate from the Spain-only question');
if (!preferredMetricIdsForQuery('¿España tiene más espera sanitaria que Europa?').has('unmet_healthcare_waiting_list_rate_europe')) throw new Error('Metric hints did not prefer the Spain/EU healthcare-access comparison');
if (preferredMetricIdsForQuery('¿España tiene más espera sanitaria que Europa?').has('unmet_healthcare_waiting_list_rate')) throw new Error('Metric hints kept Spain-only healthcare access alongside the Spain/EU comparison');
if (!excludedMetricIdsForQuery('¿Qué proporción no recibe atención por una lista de espera en España?').has('unmet_healthcare_waiting_list_rate_europe')) throw new Error('Metric hints did not keep Spain/EU healthcare access separate from the Spain-only question');
if (!preferredMetricIdsForQuery('Cuál es el tamaño de la economía española').has('gdp_current_prices')) throw new Error('Metric hints did not prefer nominal GDP for economy-size wording');
if (!preferredMetricIdsForQuery('¿Cómo cambió el PIB real total anual de España?').has('gdp_real_annual')) throw new Error('Metric hints did not prefer the annual real-GDP total series');
if (preferredMetricIdsForQuery('¿Cómo cambió el PIB real total anual de España?').has('gdp_real_growth_quarterly')) throw new Error('Annual real-GDP levels must not be mixed with quarterly year-on-year growth');
if (!preferredMetricIdsForQuery('¿Cómo cambió el PIB real por habitante de España?').has('gdp_real_per_capita_annual')) throw new Error('Metric hints did not prefer real GDP per capita');
if (preferredMetricIdsForQuery('¿Cómo cambió el PIB real por habitante de España?').has('gdp_per_capita_current_prices')) throw new Error('Metric hints kept nominal GDP per capita alongside the real series');
if (!preferredMetricIdsForQuery('¿Cómo cambió la productividad real por persona ocupada en España?').has('real_labour_productivity_per_person')) throw new Error('Metric hints did not prefer real productivity per employed person');
if (!preferredMetricIdsForQuery('¿Qué evolución tuvo el PIB real por hora trabajada?').has('real_labour_productivity_per_hour')) throw new Error('Metric hints did not prefer real productivity per hour worked');
if (preferredMetricIdsForQuery('¿Qué evolución tuvo el PIB real por hora trabajada?').has('real_labour_productivity_per_person')) throw new Error('Hourly productivity wording resolved to the per-person denominator');
if (!preferredMetricIdsForQuery('¿Qué evolución tuvo el empleo total por habitante en las cuentas nacionales?').has('employment_persons_per_capita_national_accounts')) throw new Error('Metric hints did not prefer national-accounts employment per capita');
if (preferredMetricIdsForQuery('¿Qué evolución tuvo el empleo total por habitante en las cuentas nacionales?').has('employment_rate')) throw new Error('National-accounts employment per capita was confused with the labour-force employment rate');
if (!preferredMetricIdsForQuery('¿Crece España más que la Unión Europea?').has('gdp_real_growth_europe')) throw new Error('Metric hints did not prefer the Spain/EU real-GDP comparison family');
if (preferredMetricIdsForQuery('¿Crece España más que la Unión Europea?').has('gdp_real_growth_quarterly')) throw new Error('Metric hints kept the Spain-only GDP family alongside the Spain/EU comparison');
if (!preferredMetricIdsForQuery('¿Tiene España más PIB por habitante que la Unión Europea?').has('gdp_per_capita_europe')) throw new Error('Metric hints did not prefer the Spain/EU GDP-per-capita comparison family');
if (preferredMetricIdsForQuery('¿Tiene España más PIB por habitante que la Unión Europea?').has('gdp_per_capita_current_prices')) throw new Error('Metric hints kept nominal Spain-only GDP per capita alongside the Spain/EU comparison');
if (!preferredMetricIdsForQuery('¿España tiene menos PIB por persona que Europa?').has('gdp_per_capita_europe')) throw new Error('Metric hints did not prefer the Spain/EU GDP-per-person family for compressed wording');
if (preferredMetricIdsForQuery('¿España tiene menos PIB por persona que Europa?').has('gdp_per_capita_current_prices')) throw new Error('Metric hints kept nominal GDP per person alongside the Spain/EU comparison');
if (!preferredMetricIdsForQuery('¿Ha subido el salario mínimo en España?').has('minimum_wage_monthly')) throw new Error('Metric hints did not prefer the minimum-wage family');
if (preferredMetricIdsForQuery('¿Ha subido el salario mínimo en España?').has('median_equivalised_income')) throw new Error('Metric hints confused minimum wage with household income');
if (!preferredMetricIdsForQuery('¿Los hogares españoles tienen menos ingresos medianos que Europa?').has('median_equivalised_income_europe')) throw new Error('Metric hints did not prefer the Spain/EU median-income family for compressed wording');
if (preferredMetricIdsForQuery('¿Los hogares españoles tienen menos ingresos medianos que Europa?').has('median_equivalised_income')) throw new Error('Metric hints kept Spain-only median income alongside the Spain/EU comparison');
if (!preferredMetricIdsForQuery('¿Cuánto gasta España en prestaciones de protección social por habitante?').has('social_protection_benefits_per_capita')) throw new Error('Metric hints did not prefer social protection benefits');
if (!preferredMetricIdsForQuery('¿España gasta menos por habitante en protección social que la Unión Europea?').has('social_protection_benefits_per_capita_europe')) throw new Error('Metric hints did not prefer Spain/EU social-protection spending');
if (!preferredMetricIdsForQuery('¿Tiene España menos déficit público que la Unión Europea?').has('government_deficit_ratio_europe')) throw new Error('Metric hints did not prefer Spain/EU public deficit');
if (!preferredMetricIdsForQuery('¿Es España más desigual que la Unión Europea?').has('gini_coefficient_europe')) throw new Error('Metric hints did not prefer Spain/EU Gini');
if (!preferredMetricIdsForQuery('¿Tiene España más deuda pública que la Unión Europea?').has('government_debt_ratio_europe')) throw new Error('Metric hints did not prefer Spain/EU public debt');
if (!preferredMetricIdsForQuery('¿Tiene España menos hijos por mujer que la Unión Europea?').has('fertility_rate_europe')) throw new Error('Metric hints did not prefer Spain/EU fertility');
if (preferredMetricIdsForQuery('¿Tiene España menos hijos por mujer que la Unión Europea?').has('fertility_rate')) throw new Error('Metric hints kept Spain-only fertility alongside the European comparison');
if (preferredMetricIdsForQuery('¿Cuánto gasta España en prestaciones de protección social por habitante?').has('government_expenditure_ratio')) throw new Error('Metric hints confused social protection benefits with total government spending');
if (!preferredMetricIdsForQuery('¿Cuánto gasta España en pensiones y prestaciones de supervivencia por habitante?').has('old_age_survivors_benefits_per_capita')) throw new Error('Metric hints did not prefer old-age and survivors benefits');
if (preferredMetricIdsForQuery('¿Cuánto gasta España en pensiones y prestaciones de supervivencia por habitante?').has('social_protection_benefits_per_capita')) throw new Error('Metric hints confused old-age benefits with total social protection spending');
const compoundPension = preferredMetricIdsForQuery('Árbol demográfico completamente invertido: el sistema de pensiones es completamente insostenible y arruina las arcas públicas');
for (const metricId of ['government_deficit_ratio', 'government_debt_ratio']) {
  if (!compoundPension.has(metricId)) throw new Error(`Compound pension wording did not preserve ${metricId}`);
}
if (compoundPension.has('old_age_survivors_benefits_per_capita') || compoundPension.has('old_age_dependency_ratio')) {
  throw new Error('A broad pension-sustainability claim must not be treated as a spending-per-capita or old-age-dependency measurement');
}
if (!preferredMetricIdsForQuery('¿España gasta más por habitante en pensiones que la Unión Europea?').has('old_age_survivors_benefits_per_capita_europe')) throw new Error('Metric hints did not prefer Spain/EU pension spending');
if (preferredMetricIdsForQuery('¿España gasta más por habitante en pensiones que la Unión Europea?').has('old_age_survivors_benefits_per_capita')) throw new Error('Metric hints kept Spain-only pension spending alongside the Spain/EU comparison');
if (!preferredMetricIdsForQuery('¿Está la inflación de España por encima de la Unión Europea?').has('inflation_rate_europe')) throw new Error('Metric hints did not prefer the Spain/EU inflation comparison family');
if (preferredMetricIdsForQuery('¿Está la inflación de España por encima de la Unión Europea?').has('inflation_rate')) throw new Error('Metric hints kept the Spain-only inflation family alongside the Spain/EU comparison');
if (!preferredMetricIdsForQuery('Porcentaje población menos años').has('young_population_share')) throw new Error('Metric hints did not prefer young population for compressed wording');
if (!preferredMetricIdsForQuery('Cómo ha evolucionado la criminalidad registrada en España').has('recorded_offences')) throw new Error('Metric hints did not prefer recorded offences for explicit crime wording');
if (!preferredMetricIdsForQuery('Cómo ha evolucionado el abandono escolar temprano en España').has('early_school_leaving_rate')) throw new Error('Metric hints did not prefer early school leaving for education wording');
if (!preferredMetricIdsForQuery('¿España tiene más abandono escolar que la Unión Europea?').has('early_school_leaving_rate_europe')) throw new Error('Metric hints did not prefer the Spain/EU early-school-leaving comparison');
if (preferredMetricIdsForQuery('¿España tiene más abandono escolar que la Unión Europea?').has('early_school_leaving_rate')) throw new Error('Metric hints kept Spain-only early school leaving alongside the Spain/EU comparison');
if (!preferredMetricIdsForQuery('¿España tiene más titulados superiores que la Unión Europea?').has('tertiary_education_attainment_rate_europe')) throw new Error('Metric hints did not prefer the Spain/EU tertiary-attainment comparison');
if (preferredMetricIdsForQuery('¿España tiene más titulados superiores que la Unión Europea?').has('tertiary_education_attainment_rate')) throw new Error('Metric hints kept Spain-only tertiary attainment alongside the Spain/EU comparison');
if (!preferredMetricIdsForQuery('¿España gasta menos en educación que la Unión Europea?').has('government_education_expenditure_ratio_europe')) throw new Error('Metric hints did not prefer the Spain/EU education-spending comparison');
if (preferredMetricIdsForQuery('¿España gasta menos en educación que la Unión Europea?').has('government_education_expenditure_ratio')) throw new Error('Metric hints kept Spain-only education spending alongside the Spain/EU comparison');
if (!preferredMetricIdsForQuery('¿Cómo ha evolucionado el gasto público en educación?').has('government_education_expenditure_ratio')) throw new Error('Metric hints did not prefer Spain-only education spending for the education budget trend');
if (preferredMetricIdsForQuery('¿Cómo ha evolucionado el gasto público en educación?').has('government_expenditure_ratio')) throw new Error('Metric hints confused education spending with total government spending');
if (!excludedMetricIdsForQuery('¿Cómo ha evolucionado la titulación superior en España?').has('government_education_expenditure_ratio')) throw new Error('Metric hints allowed education spending to answer an education-outcome query');
if (!preferredMetricIdsForQuery('¿España tiene menos empleo a tiempo parcial que la Unión Europea?').has('part_time_employment_rate_europe')) throw new Error('Metric hints did not prefer the Spain/EU part-time employment comparison');
if (preferredMetricIdsForQuery('¿España tiene menos empleo a tiempo parcial que la Unión Europea?').has('part_time_employment_rate')) throw new Error('Metric hints kept Spain-only part-time employment alongside the Spain/EU comparison');
if (!preferredMetricIdsForQuery('¿España tiene más empleo temporal que la Unión Europea?').has('temporary_employment_rate_europe')) throw new Error('Metric hints did not prefer the Spain/EU temporary employment comparison');
if (preferredMetricIdsForQuery('¿España tiene más empleo temporal que la Unión Europea?').has('temporary_employment_rate')) throw new Error('Metric hints kept Spain-only temporary employment alongside the Spain/EU comparison');
if (!preferredMetricIdsForQuery('¿España tiene más ninis que la Unión Europea?').has('neet_rate_europe')) throw new Error('Metric hints did not prefer the Spain/EU NEET comparison');
if (preferredMetricIdsForQuery('¿España tiene más ninis que la Unión Europea?').has('neet_rate')) throw new Error('Metric hints kept Spain-only NEET alongside the Spain/EU comparison');
for (const [query, expected, base] of [
  ['Comparación europea del empleo a tiempo parcial', 'part_time_employment_rate_europe', 'part_time_employment_rate'],
  ['Comparación europea del empleo temporal', 'temporary_employment_rate_europe', 'temporary_employment_rate'],
  ['¿Tiene España más paro juvenil que la Unión Europea?', 'youth_unemployment_rate_europe', 'youth_unemployment_rate'],
  ['Comparación europea del desempleo juvenil español', 'youth_unemployment_rate_europe', 'unemployment_rate_europe'],
  ['El abandono educativo español supera al europeo', 'early_school_leaving_rate_europe', 'early_school_leaving_rate'],
  ['La tasa AROPE española supera a la europea', 'arope_rate_europe', 'arope_rate'],
]) {
  const preferred = preferredMetricIdsForQuery(query);
  if (!preferred.has(expected) || preferred.has(base)) throw new Error(`Metric hints did not protect reordered Spain/EU comparison wording for ${query}`);
}
if (!excludedMetricIdsForQuery('¿Qué porcentaje de jóvenes ni estudia ni trabaja en España?').has('neet_rate_europe')) throw new Error('Metric hints did not keep Spain/EU NEET separate from the Spain-only question');
if (!excludedMetricIdsForQuery('Qué porcentaje de jóvenes de 25 a 34 años tiene estudios superiores').has('early_school_leaving_rate_europe')) throw new Error('Metric hints did not keep Spain/EU early school leaving separate from tertiary attainment');
if (!preferredMetricIdsForQuery('Qué porcentaje de jóvenes de 25 a 34 años tiene estudios superiores').has('tertiary_education_attainment_rate')) throw new Error('Metric hints did not prefer tertiary attainment for higher-education wording');
if (!excludedMetricIdsForQuery('Qué porcentaje de jóvenes de 25 a 34 años tiene estudios superiores en España').has('tertiary_education_attainment_rate_europe')) throw new Error('Metric hints did not keep Spain/EU tertiary attainment separate from the Spain-only question');
if (preferredMetricIdsForQuery('Qué porcentaje de jóvenes de 25 a 34 años tiene estudios superiores').has('youth_unemployment_rate')) throw new Error('Metric hints confused tertiary attainment with youth unemployment');
if (!excludedMetricIdsForQuery('Qué porcentaje de jóvenes de 25 a 34 años tiene estudios superiores').has('early_school_leaving_rate')) throw new Error('Metric hints did not keep early school leaving separate from tertiary attainment');
for (const query of ['Cómo han evolucionado los robos registrados en España', 'Cómo han evolucionado las estafas registradas en España', 'Cómo han evolucionado las agresiones sexuales registradas en España']) {
  if (!preferredMetricIdsForQuery(query).has('recorded_offences')) throw new Error(`Metric hints did not prefer recorded offences for ${query}`);
}
if (!excludedMetricIdsForQuery('Los inmigrantes crean inseguridad').has('recorded_offences')) throw new Error('Metric hints allowed recorded offences to answer an immigration-causality claim');
if (excludedMetricIdsForQuery('En mi barrio ha subido la inseguridad').has('recorded_offences') !== true) throw new Error('Metric hints allowed recorded offences to answer a local insecurity claim');
if (!excludedMetricIdsForQuery('Pedro Sánchez está destruyendo España').has('population_change_rate')) throw new Error('Metric hints allowed a broad subjective political claim to route to population change');
if (recordedOffenceCategoryForQuery('Cómo han evolucionado los homicidios registrados').labels[0] !== 'intentional homicide') throw new Error('Recorded-offence category resolver did not identify homicide wording');
if (recordedOffenceCategoryForQuery('Cómo han evolucionado las agresiones sexuales registradas').labels[0] !== 'sexual assault') throw new Error('Recorded-offence category resolver did not identify sexual-assault wording');

const crimeRecords = [
  { id: 'crime-homicide-2015', datasetId: 'Police-recorded offences by offence category', metricId: 'recorded_offences', value: 302, unit: 'Number', period: '2015', dimensions: { geo: 'ES', iccs: 'ICCS0101' }, dimensionLabels: { geo: 'Spain', iccs: 'Intentional homicide' }, source: { id: 'source-eurostat-crime', title: 'Delitos registrados en España · Eurostat', aliases: ['delincuencia', 'delitos'], url: 'https://ec.europa.eu/eurostat/' } },
  { id: 'crime-homicide-2024', datasetId: 'Police-recorded offences by offence category', metricId: 'recorded_offences', value: 349, unit: 'Number', period: '2024', dimensions: { geo: 'ES', iccs: 'ICCS0101' }, dimensionLabels: { geo: 'Spain', iccs: 'Intentional homicide' }, source: { id: 'source-eurostat-crime', title: 'Delitos registrados en España · Eurostat', aliases: ['delincuencia', 'delitos'], url: 'https://ec.europa.eu/eurostat/' } },
  { id: 'crime-fraud-2024', datasetId: 'Police-recorded offences by offence category', metricId: 'recorded_offences', value: 1000, unit: 'Number', period: '2024', dimensions: { geo: 'ES', iccs: 'FRAUD' }, dimensionLabels: { geo: 'Spain', iccs: 'Fraud' }, source: { id: 'source-eurostat-crime', title: 'Delitos registrados en España · Eurostat', aliases: ['delincuencia', 'delitos'], url: 'https://ec.europa.eu/eurostat/' } },
];
const homicideResults = rankWarehouseObservations('homicidios registrados en España', crimeRecords);
if (homicideResults.length !== 2 || homicideResults.some((item) => item.dimensionLabels?.iccs !== 'Intentional homicide')) throw new Error('Warehouse query did not keep the requested offence category');
if (rankWarehouseObservations('delincuencia registrada en España', crimeRecords).length !== 0) throw new Error('Warehouse query exposed an arbitrary offence category for a broad crime query');

const birthRecords = [
  { id: 'birth-total-2015', datasetId: 'Population by country of birth', metricId: 'foreign_born_population', value: 5883891, unit: 'Number', period: '2015', dimensions: { geo: 'ES', c_birth: 'TOTAL' }, dimensionLabels: { geo: 'Spain', c_birth: 'Foreign country' }, source: { id: 'source-eurostat-birth', title: 'Población por país de nacimiento en España · Eurostat', aliases: ['nacidos en el extranjero', 'inmigrantes'], url: 'https://ec.europa.eu/eurostat/' } },
  { id: 'birth-belgium-2015', datasetId: 'Population by country of birth', metricId: 'foreign_born_population', value: 41952, unit: 'Number', period: '2015', dimensions: { geo: 'ES', c_birth: 'BE' }, dimensionLabels: { geo: 'Spain', c_birth: 'Belgium' }, source: { id: 'source-eurostat-birth', title: 'Población por país de nacimiento en España · Eurostat', aliases: ['nacidos en el extranjero', 'inmigrantes'], url: 'https://ec.europa.eu/eurostat/' } },
];
const birthResults = rankWarehouseObservations('residentes nacieron fuera de España', birthRecords);
if (birthResults.length !== 1 || birthResults[0].id !== 'birth-total-2015') throw new Error('Warehouse query exposed a country category instead of the foreign-born total');

const overqualificationSource = { id: 'source-overqualification', title: 'Over-qualification rates by citizenship · Eurostat', publisher: 'Eurostat', url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lfsa_eoqgan', retrievedAt: '2026-11-16' };
const overqualificationRows = ['TOTAL', 'FOR', 'NAT', 'EU27_2020_FOR', 'NEU27_2020_FOR'].flatMap((citizen) => [2015, 2018, 2021, 2023, 2024, 2025].map((year) => ({
  id: `overqualification-${citizen}-${year}`, metricId: 'tertiary_overqualification_rate', metric: 'over-qualification rate',
  value: year - 1980, unit: 'Percentage', period: String(year), geography: 'Spain',
  population: 'employed people aged 20 to 64 with tertiary education',
  dimensions: { geo: 'ES', age: 'Y20-64', isced11: 'ED5-8', citizen, sex: 'T', unit: 'PC', time: String(year) },
  dimensionLabels: { geo: 'Spain', citizen: { TOTAL: 'All citizenships', FOR: 'Foreign citizenship', NAT: 'Spanish citizenship', EU27_2020_FOR: 'EU citizenship', NEU27_2020_FOR: 'Non-EU citizenship' }[citizen] },
  source: overqualificationSource,
})));
const overqualificationMetricIds = new Set(['tertiary_overqualification_rate']);
const generalOverqualification = rankWarehouseObservations('sobrecualificación de titulados universitarios en España', overqualificationRows, 12, { metricIds: overqualificationMetricIds });
if (generalOverqualification.length !== 6 || generalOverqualification.some((item) => item.dimensions.citizen !== 'TOTAL')) throw new Error('A general over-qualification query mixed citizenship subgroups into the all-citizen rate');
const overqualificationTimeComparison = rankWarehouseObservations('Compara la tasa de sobrecualificación de titulados universitarios en 2023 y 2025', overqualificationRows, 12, { metricIds: overqualificationMetricIds });
if (overqualificationTimeComparison.length !== 2 || overqualificationTimeComparison.some((item) => item.dimensions.citizen !== 'TOTAL') || overqualificationTimeComparison.map((item) => item.period).sort().join(',') !== '2023,2025') throw new Error('A period comparison of all graduates was confused with a citizenship breakdown');
const citizenshipBreakdown = rankWarehouseObservations('Sobrecualificación por ciudadanía en España', overqualificationRows, 12, { metricIds: overqualificationMetricIds });
for (const citizen of ['NAT', 'EU27_2020_FOR', 'NEU27_2020_FOR']) {
  if (!citizenshipBreakdown.some((item) => item.dimensions.citizen === citizen && item.period === '2025')) throw new Error(`An explicit citizenship breakdown lost the latest ${citizen} series`);
}
if (citizenshipBreakdown.some((item) => ['TOTAL', 'FOR'].includes(item.dimensions.citizen))) throw new Error('A citizenship breakdown mixed aggregate rows with mutually exclusive groups');
const foreignOverqualification = rankWarehouseObservations('sobrecualificación de inmigrantes con estudios superiores en España', overqualificationRows, 12, { metricIds: overqualificationMetricIds });
if (foreignOverqualification.length !== 6 || foreignOverqualification.some((item) => item.dimensions.citizen !== 'FOR')) throw new Error('A migrant over-qualification query did not stay within the foreign-citizenship series');
const euCitizenOverqualification = rankWarehouseObservations('tasa de sobrecualificación de ciudadanos de otros países de la Unión Europea', overqualificationRows, 12, { metricIds: overqualificationMetricIds });
if (euCitizenOverqualification.length !== 6 || euCitizenOverqualification.some((item) => item.dimensions.citizen !== 'EU27_2020_FOR')) throw new Error('An EU-citizenship query did not stay within the requested subgroup');
const birthplaceOverqualification = rankWarehouseObservations('sobrecualificación de titulados nacidos fuera de España', overqualificationRows, 12, { metricIds: overqualificationMetricIds });
if (birthplaceOverqualification.length) throw new Error('A citizenship rate answered a claim about country of birth');
const citizenshipComparison = rankWarehouseObservations('sobrecualificación de extranjeros mayor que españoles en España', overqualificationRows, 12, { metricIds: overqualificationMetricIds });
for (const citizen of ['FOR', 'NAT']) {
  const latest = citizenshipComparison.find((item) => item.dimensions.citizen === citizen && item.period === '2025');
  if (!latest) throw new Error(`A capped citizenship comparison lost the latest ${citizen} observation`);
}
if (citizenshipComparison.some((item) => !['FOR', 'NAT'].includes(item.dimensions.citizen))) throw new Error('A foreign-versus-Spanish comparison included an unrelated citizenship group');

const publication = rankWarehouseObservations('Banco de España tipos hipotecarios', [
  { id: 'doc-1', kind: 'official_publication', metric: 'Resolución del Banco de España sobre tipos de interés hipotecarios', value: null, period: '20260718', url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-1', dimensions: { department: 'BANCO DE ESPAÑA' }, source: { id: 'source-boe', title: 'BOE', url: 'https://www.boe.es/' } },
]);
if (publication.length !== 1 || publication[0].kind !== 'official_publication' || publication[0].url?.includes('BOE-A-1') !== true) throw new Error('Warehouse query did not preserve official publication records');

const legalDocument = rankWarehouseObservations('ley vivienda alquiler estatal', [
  { id: 'law-1', kind: 'legal_document', metric: 'Ley estatal sobre vivienda y alquiler', value: null, period: '20260718', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2', dimensions: { jurisdiction: 'Estatal', effectiveFrom: '20260101' }, source: { id: 'source-boe-law', title: 'Legislación consolidada BOE', url: 'https://www.boe.es/' } },
]);
if (legalDocument.length !== 1 || legalDocument[0].kind !== 'legal_document' || legalDocument[0].dimensions.jurisdiction !== 'Estatal') throw new Error('Warehouse query did not preserve legal-document metadata');

const legalRule = rankWarehouseObservations('documentos publicos reutilizacion condiciones', [
  { id: 'rule-1', kind: 'legal_rule', datasetId: 'Ley sobre reutilización', metric: 'Artículo 3', excerpt: 'La reutilización de documentos públicos se realizará con las condiciones previstas en esta ley.', value: null, period: '2026-01-01', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-3', dimensions: { currentVersion: true }, source: { id: 'source-boe-rule', title: 'Legislación consolidada BOE', url: 'https://www.boe.es/' } },
]);
if (legalRule.length !== 1 || legalRule[0].kind !== 'legal_rule' || !legalRule[0].excerpt.includes('condiciones')) throw new Error('Warehouse query did not index or preserve legal-rule text');

const naturalLanguageTrend = rankWarehouseObservations('España tiene menos paro que hace diez años', [
  { id: 'obs-4', datasetId: 'Unemployment by sex and age', metric: undefined, value: 10.8, unit: '%', period: '2026', dimensions: { geo: 'ES' }, source: { id: 'source-eurostat', title: 'Tasa de desempleo de España · Eurostat', aliases: ['paro', 'desempleo'], url: 'https://ec.europa.eu/eurostat/' } },
]);
if (naturalLanguageTrend.length !== 1 || naturalLanguageTrend[0].id !== 'obs-4') throw new Error('Warehouse query did not handle natural trend phrasing');
const benefitGroups = [
  { id: 'foreign-benefit-count', metricId: 'unemployment_beneficiaries_by_nationality', dimensions: { group: 'Extranjera' } },
  { id: 'spanish-benefit-count', metricId: 'unemployment_beneficiaries_by_nationality', dimensions: { group: 'Española' } },
  { id: 'all-benefit-count', metricId: 'unemployment_beneficiaries_by_nationality', dimensions: { group: 'Total' } },
];
const foreignBenefitRows = filterObservationsForRequestedGroup('¿Cuántas personas extranjeras cobran prestaciones por desempleo?', benefitGroups);
if (foreignBenefitRows.length !== 1 || foreignBenefitRows[0].id !== 'foreign-benefit-count') throw new Error('A single-group benefit count mixed foreign and total recipients');
const spanishBenefitRows = filterObservationsForRequestedGroup('¿Cuántas personas españolas cobran prestaciones por desempleo?', benefitGroups);
if (spanishBenefitRows.length !== 1 || spanishBenefitRows[0].id !== 'spanish-benefit-count') throw new Error('A nearby Spanish-recipient question crossed into foreign-recipient counts');
const unstratifiedBenefitSource = filterObservationsForRequestedGroup('¿Cuántas personas españolas cobran prestaciones por desempleo?', [
  { id: 'generic-official-source', kind: 'official_publication', dimensions: { department: 'Consejo de Ministros' }, matchedTerms: ['prestaciones', 'desempleo'] },
]);
if (unstratifiedBenefitSource.length) throw new Error('A general official source without the requested nationality breakdown was attached to a group count');
const benefitComparisonRows = filterObservationsForRequestedGroup('Compara beneficiarios extranjeros y españoles', benefitGroups);
if (benefitComparisonRows.length !== benefitGroups.length) throw new Error('A multi-group comparison prematurely discarded comparison groups');
if (!preferredMetricIdsForQuery('En España cuesta cada vez más encontrar trabajo que en Europa').has('unemployment_rate_europe')) throw new Error('Metric hints did not resolve conversational job-finding difficulty to European unemployment');
if (handlerForInput('Número de beneficiarios extranjeros de prestaciones del paro') !== 'quantity') throw new Error('A count phrased as a noun phrase was misclassified as a group comparison');
if (handlerForInput('¿Reciben más prestaciones los extranjeros que los españoles?') !== 'group_comparison') throw new Error('An explicit between-group claim was downgraded to a simple count');
if (preferredMetricIdsForQuery('En España cuesta cada vez más encontrar trabajo que en Europa').has('employment_rate_europe')) throw new Error('Conversational job-finding difficulty incorrectly retained European employment as the primary metric');
if (!preferredMetricIdsForQuery('La luz para las familias sube más que el coste de vida').has('household_electricity_price')) throw new Error('Metric hints did not resolve family electricity wording to household electricity');
if (preferredMetricIdsForQuery('La luz para las familias sube más que el coste de vida').has('cpi_index')) throw new Error('Family electricity wording incorrectly fell through to generic CPI');
if (!preferredMetricIdsForQuery('Índice armonizado anual de alimentos y bebidas no alcohólicas').has('annual_hicp_food_index')) throw new Error('Annual HICP food wording did not resolve to the food sub-index');
if (preferredMetricIdsForQuery('Índice armonizado anual de alimentos y bebidas no alcohólicas').has('harmonised_price_index')) throw new Error('Annual food wording retained the undifferentiated harmonised-price metric');
if (!preferredMetricIdsForQuery('Índice armonizado anual de alquileres efectivamente pagados').has('annual_hicp_actual_rent_index')) throw new Error('Annual actual-rent wording did not resolve to the annual rent sub-index');
if (preferredMetricIdsForQuery('Índice armonizado anual de alquileres efectivamente pagados').has('rental_price_index')) throw new Error('Annual actual-rent wording retained the monthly actual-rent metric');
if (!preferredMetricIdsForQuery('La población española se está haciendo mayor').has('older_population_share')) throw new Error('Natural ageing wording did not resolve to the older-population metric');
if (!preferredMetricIdsForQuery('El país recauda una parte mayor de su economía en impuestos').has('government_revenue_ratio')) throw new Error('Natural revenue wording did not resolve to the public-revenue metric');
if (!preferredMetricIdsForQuery('Las familias destinan demasiado dinero a la vivienda').has('housing_cost_overburden_rate')) throw new Error('Natural housing-cost wording did not resolve to the housing-burden metric');
if (!preferredMetricIdsForQuery('La sanidad dedica más recursos por persona').has('health_expenditure_per_capita')) throw new Error('Natural health-resource wording did not resolve to the health-expenditure metric');
if (!preferredMetricIdsForQuery('La economía crece más despacio que la Unión Europea').has('gdp_real_growth_europe')) throw new Error('Natural GDP-comparison wording did not resolve to the European GDP-growth metric');
if (!preferredMetricIdsForQuery('El salario por hora es inferior al europeo').has('median_hourly_earnings_europe')) throw new Error('Natural hourly-pay wording did not resolve to the European hourly-earnings metric');

const rentalTemporalityParaphrases = [
  'La regulación del alquiler ha empujado a algunos propietarios hacia contratos temporales',
  'Las normas del alquiler trasladan viviendas a contratos de temporada',
  'Algunos caseros ofrecen arrendamientos temporales por los cambios en las reglas del alquiler',
];
for (const query of rentalTemporalityParaphrases) {
  const preferred = preferredMetricIdsForQuery(query);
  const excluded = excludedMetricIdsForQuery(query);
  const candidates = metricCandidatesForQuery(query);
  if (preferred.has('temporary_employment_rate') || preferred.has('temporary_employment_rate_europe')) {
    throw new Error(`Housing lease wording routed to employment temporality: ${query}`);
  }
  if (!excluded.has('temporary_employment_rate') || !excluded.has('temporary_employment_rate_europe')) {
    throw new Error(`Housing lease wording did not suppress employment temporality during retrieval: ${query}`);
  }
  if (candidates.has('temporary_employment_rate') || candidates.has('temporary_employment_rate_europe')) {
    throw new Error(`Housing lease wording retained employment temporality as a metric candidate: ${query}`);
  }
  if (!preferred.has('rental_price_index')) throw new Error(`Housing lease paraphrase lost its rental context route: ${query}`);
}
if (!preferredMetricIdsForQuery('¿Qué porcentaje de los contratos de trabajo temporales hay?').has('temporary_employment_rate')) {
  throw new Error('Explicit temporary-employment wording did not retain the employment metric');
}
if (excludedMetricIdsForQuery('¿Qué porcentaje de los contratos de trabajo temporales hay?').has('temporary_employment_rate')) {
  throw new Error('Explicit temporary-employment wording was incorrectly excluded');
}
if (!preferredMetricIdsForQuery('El empleo temporal dificulta alquilar una vivienda').has('temporary_employment_rate')) {
  throw new Error('An explicitly employment-related housing claim lost its employment context route');
}

const manifestFiles = [
  { file: 'employment.json', metricIds: new Set(['employment_rate']), sourceTokens: new Set(['employment', 'rate', 'spain']), manifested: true },
  { file: 'housing-context.json', metricIds: new Set(), sourceTokens: new Set(['housing', 'rental', 'price']), manifested: true },
  { file: 'debt.json', metricIds: new Set(['government_debt_ratio']), sourceTokens: new Set(['government', 'debt']), manifested: true },
  ...Array.from({ length: 6 }, (_, index) => ({ file: `other-${index}.json`, metricIds: new Set(), sourceTokens: new Set(['other', 'source']), manifested: true })),
  { file: 'legacy-domain.json', metricIds: new Set(), sourceTokens: new Set(), manifested: false },
];
const manifestNames = manifestFiles.map((item) => item.file);
const sourceRevisionIndex = indexWarehouseRecordFiles(['employment-old.json', 'employment-current.json', 'unemployment-current.json'], [
  { recordPath: '/records/employment-old.json', metricId: 'employment_rate', url: 'https://source.test/rates?geo=ES', retrievedAt: '2025-01-01T00:00:00.000Z', title: 'Employment rate Spain' },
  { recordPath: '/records/employment-current.json', metricId: 'employment_rate', url: 'https://source.test/rates?geo=ES', retrievedAt: '2026-01-01T00:00:00.000Z', title: 'Employment rate Spain' },
  { recordPath: '/records/unemployment-current.json', metricId: 'unemployment_rate', url: 'https://source.test/rates?geo=ES', retrievedAt: '2025-06-01T00:00:00.000Z', title: 'Unemployment rate Spain' },
]);
const employmentFilesFromSameSeries = selectWarehouseRecordFiles(
  ['employment-old.json', 'employment-current.json', 'unemployment-current.json'],
  sourceRevisionIndex,
  { query: 'employment rate Spain', metricIds: new Set(['employment_rate']) },
);
if (!employmentFilesFromSameSeries.includes('employment-old.json') || !employmentFilesFromSameSeries.includes('employment-current.json') || employmentFilesFromSameSeries.includes('unemployment-current.json')) throw new Error('Warehouse file pruning dropped historical records or crossed into a nearby metric');
const unemploymentFiles = selectWarehouseRecordFiles(
  ['employment-old.json', 'employment-current.json', 'unemployment-current.json'],
  sourceRevisionIndex,
  { query: 'unemployment rate Spain', metricIds: new Set(['unemployment_rate']) },
);
if (unemploymentFiles.length !== 1 || unemploymentFiles[0] !== 'unemployment-current.json') throw new Error('Independent metrics from the same source URL were incorrectly crossed');
const lexicalRevisionFiles = selectWarehouseRecordFiles(
  ['employment-old.json', 'employment-current.json', 'unemployment-current.json'],
  sourceRevisionIndex,
  { query: 'employment rate Spain' },
);
if (!lexicalRevisionFiles.includes('employment-current.json') || !lexicalRevisionFiles.includes('employment-old.json')) throw new Error('Lexical warehouse lookup dropped a possibly distinct historical observation');
const legacyHousingFile = indexLegacyWarehouseRecordPayload('legacy-housing.json', {
  source: { id: 'legacy-housing', title: 'Protected-housing actions by province and month', publisher: 'Housing ministry', url: 'https://source.test/protected-housing.csv', domain: 'public_housing_allocation' },
  records: [
    { metricId: 'public_housing_actions', datasetId: 'Housing actions', metric: 'public allocation' },
    { metricId: 'public_housing_actions', datasetId: 'Protected-housing actions', metric: 'protected housing actions', dimensions: { province: 'Madrid' } },
  ],
});
const legacyHousingSelection = selectWarehouseRecordFiles(
  ['employment-current.json', 'legacy-housing.json'],
  [sourceRevisionIndex[1], legacyHousingFile],
  { query: 'employment rate Spain', metricIds: new Set(['employment_rate']) },
);
if (legacyHousingSelection.includes('legacy-housing.json')) throw new Error('An unrelated large legacy source was loaded for a different metric');
const targetedLegacySelection = selectWarehouseRecordFiles(
  ['employment-current.json', 'legacy-housing.json'],
  [sourceRevisionIndex[1], legacyHousingFile],
  { query: 'protected housing actions', metricIds: new Set(['public_housing_actions']) },
);
if (!targetedLegacySelection.includes('legacy-housing.json')) throw new Error('A matching unmanifested legacy metric was dropped from targeted retrieval');
const deepLegacyTextSelection = selectWarehouseRecordFiles(
  ['employment-current.json', 'legacy-housing.json'],
  [sourceRevisionIndex[1], legacyHousingFile],
  { query: 'protected housing actions Madrid' },
);
if (!deepLegacyTextSelection.includes('legacy-housing.json')) throw new Error('Legacy lexical index ignored searchable text that appeared after the first record');
const employmentFiles = selectWarehouseRecordFiles(manifestNames, manifestFiles, { query: 'employment rate Spain', metricIds: new Set(['employment_rate']) });
if (!employmentFiles.includes('employment.json') || employmentFiles.includes('debt.json')) throw new Error('Manifest lookup did not keep explicit metric retrieval scoped');
if (!employmentFiles.includes('legacy-domain.json')) throw new Error('Manifest lookup dropped a legacy domain record without a manifest');
const housingFiles = selectWarehouseRecordFiles(manifestNames, manifestFiles, { query: 'housing rental price affordability', metricIds: new Set(['housing_cost_overburden_rate']) });
if (!housingFiles.includes('housing-context.json')) throw new Error('Manifest lookup did not retain an untyped source whose title matches the metric query');
const noMatchFiles = selectWarehouseRecordFiles(['employment.json', 'debt.json'], manifestFiles.slice(0, 1).concat(manifestFiles[2]), { query: 'a claim with no source alias match' });
if (noMatchFiles.length) throw new Error('A complete manifest index fell back to every source file on a no-match query');
const legacyFiles = ['employment.json', 'debt.json', 'unindexed.json'];
const legacyIndex = manifestFiles.slice(0, 1).concat(manifestFiles[2], [{ file: 'unindexed.json', metricIds: new Set(), sourceTokens: new Set(), manifested: false }]);
if (selectWarehouseRecordFiles(legacyFiles, legacyIndex, { query: 'a claim with no source alias match' }).length !== legacyFiles.length) throw new Error('An incomplete manifest index did not preserve its compatibility fallback');
console.log('Warehouse query validation passed.');
