import { populationEvidenceFit, rankWarehouseObservations, recordedOffenceCategoryForQuery, warehouseEvidenceFit } from './warehouse-query.mjs';
import { excludedMetricIdsForQuery, preferredMetricIdsForQuery } from './metric-query-hints.mjs';

const records = [
  { id: 'obs-1', datasetId: 'Tasa de empleo', metric: 'employment rate', value: 68.2, unit: '%', period: '2026-Q1', dimensions: { geography: 'Spain' }, source: { id: 'source-ine', publisher: 'INE', url: 'https://www.ine.es/' } },
  { id: 'obs-2', datasetId: 'Tasa de empleo', metric: 'employment rate', value: 67.4, unit: '%', period: '2025-Q1', dimensions: { geography: 'Spain' }, source: { id: 'source-ine', publisher: 'INE', url: 'https://www.ine.es/' } },
  { id: 'obs-3', datasetId: 'Foreign trade', metric: 'exports', value: 1, unit: 'EUR', period: '2026', dimensions: { geography: 'Spain' }, source: { id: 'source-ine', publisher: 'INE', url: 'https://www.ine.es/' } },
];
const result = rankWarehouseObservations('employment rate Spain', records);
if (result.length !== 2 || result[0].id !== 'obs-1') throw new Error('Warehouse query did not rank matching observations');
if (result.some((item) => item.evidenceFit !== 'direct' || !item.matchedTerms?.length)) throw new Error('Warehouse query did not preserve evidence-fit metadata');
if (rankWarehouseObservations('unknown metric', records).length) throw new Error('Warehouse query returned unrelated observations');
if (warehouseEvidenceFit(0.34) !== 'weak' || warehouseEvidenceFit(0.5) !== 'qualified' || warehouseEvidenceFit(0.8) !== 'direct') throw new Error('Warehouse evidence-fit thresholds are invalid');

const immigrantObservation = { population: 'Foreign-born residents', dimensions: { geo: 'ES' }, dimensionLabels: { group: 'Foreign nationals' } };
const residentObservation = { population: 'Resident population', dimensions: { geo: 'ES' }, dimensionLabels: { group: 'Total' } };
if (populationEvidenceFit('personas inmigrantes o extranjeras', immigrantObservation) !== 'direct') throw new Error('Warehouse population fit did not recognize the requested group');
if (populationEvidenceFit('personas inmigrantes o extranjeras', residentObservation) !== 'context') throw new Error('Warehouse population fit did not protect total-population context');
if (populationEvidenceFit('personas beneficiarias', { population: 'households receiving rent assistance' }) !== 'mismatch') throw new Error('Warehouse population fit did not reject a mismatched population');
if (!preferredMetricIdsForQuery('paro juvenil en España').has('youth_unemployment_rate')) throw new Error('Metric hints did not prefer youth unemployment for youth wording');
if (!excludedMetricIdsForQuery('evolución del desempleo en España').has('youth_unemployment_rate')) throw new Error('Metric hints did not suppress youth unemployment for generic wording');
if (excludedMetricIdsForQuery('desempleo juvenil en España').size) throw new Error('Metric hints incorrectly suppressed youth unemployment when youth wording was explicit');
if (!preferredMetricIdsForQuery('evolución de la recaudación pública').has('government_revenue_ratio')) throw new Error('Metric hints did not prefer public revenue for revenue wording');
if (!preferredMetricIdsForQuery('gasto público sobre PIB').has('government_expenditure_ratio')) throw new Error('Metric hints did not prefer public expenditure for spending wording');
if (!preferredMetricIdsForQuery('España recauda más o menos que la media de la Unión Europea').has('government_revenue_ratio_europe')) throw new Error('Metric hints did not prefer European public revenue for comparison wording');
if (preferredMetricIdsForQuery('España recauda más o menos que la media de la Unión Europea').has('government_revenue_ratio')) throw new Error('Metric hints kept Spain-only public revenue alongside European comparison wording');
if (!preferredMetricIdsForQuery('España gasta más o menos que la media de la Unión Europea').has('government_expenditure_ratio_europe')) throw new Error('Metric hints did not prefer European public expenditure for comparison wording');
if (preferredMetricIdsForQuery('España gasta más o menos que la media de la Unión Europea').has('government_expenditure_ratio')) throw new Error('Metric hints kept Spain-only public expenditure alongside European comparison wording');
if (!preferredMetricIdsForQuery('España gasta más por habitante en sanidad que la Unión Europea').has('health_expenditure_per_capita_europe')) throw new Error('Metric hints did not prefer European health spending for comparison wording');
if (preferredMetricIdsForQuery('España gasta más por habitante en sanidad que la Unión Europea').has('health_expenditure_per_capita')) throw new Error('Metric hints kept Spain-only health spending alongside European comparison wording');
if (!preferredMetricIdsForQuery('España tiene más renta mediana que la Unión Europea').has('median_equivalised_income_europe')) throw new Error('Metric hints did not prefer European median income for comparison wording');
if (preferredMetricIdsForQuery('España tiene más renta mediana que la Unión Europea').has('median_equivalised_income')) throw new Error('Metric hints kept Spain-only median income alongside European comparison wording');
if (!preferredMetricIdsForQuery('sobrecarga del coste de la vivienda').has('housing_cost_overburden_rate')) throw new Error('Metric hints did not prefer housing cost overburden for affordability wording');
if (!preferredMetricIdsForQuery('gasto sanitario por habitante').has('health_expenditure_per_capita')) throw new Error('Metric hints did not prefer health expenditure for resource wording');
if (!preferredMetricIdsForQuery('cuánto gasta sanidad por habitante en España').has('health_expenditure_per_capita')) throw new Error('Metric hints did not prefer health expenditure for conversational wording');
if (!preferredMetricIdsForQuery('cuánto dinero se dedica por persona a la sanidad').has('health_expenditure_per_capita')) throw new Error('Metric hints did not prefer health expenditure for colloquial spending wording');
if (!preferredMetricIdsForQuery('cuánto debe España').has('government_debt_ratio')) throw new Error('Metric hints did not prefer public debt for colloquial debt wording');
if (!preferredMetricIdsForQuery('porcentaje de residentes AROPE en España').has('arope_rate')) throw new Error('Metric hints did not prefer AROPE for resident percentage wording');
if (!excludedMetricIdsForQuery('La sanidad pública está completamente colapsada').has('health_expenditure_per_capita')) throw new Error('Metric hints allowed per-capita spending to answer a broad health-system outcome claim');
if (!preferredMetricIdsForQuery('desigualdad de ingresos en España').has('gini_coefficient')) throw new Error('Metric hints did not prefer Gini for inequality wording');
if (!preferredMetricIdsForQuery('déficit público sobre PIB').has('government_deficit_ratio')) throw new Error('Metric hints did not prefer public deficit for deficit wording');
if (!preferredMetricIdsForQuery('renta mediana de los hogares').has('median_equivalised_income')) throw new Error('Metric hints did not prefer median income for household-income wording');
if (!preferredMetricIdsForQuery('cuánto ingresan de media los hogares').has('median_equivalised_income')) throw new Error('Metric hints did not prefer median income for colloquial household wording');
if (!preferredMetricIdsForQuery('Porcentaje de la población activa que encuentra trabajo').has('employment_rate')) throw new Error('Metric hints did not prefer employment for everyday wording');
if (!preferredMetricIdsForQuery('Evolución del desempleo en España').has('unemployment_rate')) throw new Error('Metric hints did not prefer unemployment for trend wording');
if (!preferredMetricIdsForQuery('España tiene el paro más alto de Europa').has('unemployment_rate_europe')) throw new Error('Metric hints did not prefer European unemployment for comparison wording');
if (preferredMetricIdsForQuery('España tiene el paro más alto de Europa').has('unemployment_rate')) throw new Error('Metric hints kept generic unemployment alongside European comparison wording');
if (!preferredMetricIdsForQuery('España tiene una tasa de empleo mayor que la Unión Europea').has('employment_rate_europe')) throw new Error('Metric hints did not prefer European employment for comparison wording');
if (preferredMetricIdsForQuery('España tiene una tasa de empleo mayor que la Unión Europea').has('employment_rate')) throw new Error('Metric hints kept Spain-only employment alongside European comparison wording');
if (!preferredMetricIdsForQuery('Qué porcentaje de jóvenes activos no encuentra trabajo').has('youth_unemployment_rate') || preferredMetricIdsForQuery('Qué porcentaje de jóvenes activos no encuentra trabajo').has('employment_rate')) throw new Error('Metric hints did not keep youth unemployment distinct from employment');
if (!preferredMetricIdsForQuery('Cuántos habitantes viven normalmente en España').has('resident_population')) throw new Error('Metric hints did not prefer resident population');
if (!preferredMetricIdsForQuery('Cuántos residentes nacieron fuera de España').has('foreign_born_population')) throw new Error('Metric hints did not prefer foreign-born population');
if (!preferredMetricIdsForQuery('Cuántas personas inmigraron a España durante el último año').has('immigration_flows')) throw new Error('Metric hints did not prefer immigration flows');
if (!preferredMetricIdsForQuery('Qué comunidad tiene mayor densidad de población').has('regional_population_density')) throw new Error('Metric hints did not prefer regional density for community wording');
if (!preferredMetricIdsForQuery('Hay más personas por kilómetro cuadrado en Madrid que en Andalucía').has('regional_population_density')) throw new Error('Metric hints did not prefer regional density for everyday wording');
if (!preferredMetricIdsForQuery('Mi cuñado insiste: España tiene más empleo que nunca').has('employment_rate')) throw new Error('Metric hints did not prefer employment for compressed everyday wording');
if (!preferredMetricIdsForQuery('España tasa de paro alta en Europa').has('unemployment_rate_europe')) throw new Error('Metric hints did not prefer European unemployment for compressed comparison wording');
if (!preferredMetricIdsForQuery('España millones habitantes').has('resident_population')) throw new Error('Metric hints did not prefer resident population for compressed population wording');
if (!preferredMetricIdsForQuery('Evolucionado esperanza vida España').has('life_expectancy_at_birth')) throw new Error('Metric hints did not prefer life expectancy for compressed wording');
if (!preferredMetricIdsForQuery('Cuál es el tamaño de la economía española').has('gdp_current_prices')) throw new Error('Metric hints did not prefer nominal GDP for economy-size wording');
if (!preferredMetricIdsForQuery('¿Crece España más que la Unión Europea?').has('gdp_real_growth_europe')) throw new Error('Metric hints did not prefer the Spain/EU real-GDP comparison family');
if (preferredMetricIdsForQuery('¿Crece España más que la Unión Europea?').has('gdp_real_growth_quarterly')) throw new Error('Metric hints kept the Spain-only GDP family alongside the Spain/EU comparison');
if (!preferredMetricIdsForQuery('¿Está la inflación de España por encima de la Unión Europea?').has('inflation_rate_europe')) throw new Error('Metric hints did not prefer the Spain/EU inflation comparison family');
if (preferredMetricIdsForQuery('¿Está la inflación de España por encima de la Unión Europea?').has('inflation_rate')) throw new Error('Metric hints kept the Spain-only inflation family alongside the Spain/EU comparison');
if (!preferredMetricIdsForQuery('Porcentaje población menos años').has('young_population_share')) throw new Error('Metric hints did not prefer young population for compressed wording');
if (!preferredMetricIdsForQuery('Cómo ha evolucionado la criminalidad registrada en España').has('recorded_offences')) throw new Error('Metric hints did not prefer recorded offences for explicit crime wording');
if (!preferredMetricIdsForQuery('Cómo ha evolucionado el abandono escolar temprano en España').has('early_school_leaving_rate')) throw new Error('Metric hints did not prefer early school leaving for education wording');
if (!preferredMetricIdsForQuery('Qué porcentaje de jóvenes de 25 a 34 años tiene estudios superiores').has('tertiary_education_attainment_rate')) throw new Error('Metric hints did not prefer tertiary attainment for higher-education wording');
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
console.log('Warehouse query validation passed.');
