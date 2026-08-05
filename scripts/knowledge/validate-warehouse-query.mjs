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
if (!preferredMetricIdsForQuery('España tiene demasiados impuestos').has('government_current_taxes_income_wealth_europe')) throw new Error('Metric hints did not provide a measurable tax context for the broad tax complaint');
if (!preferredMetricIdsForQuery('España gasta más o menos que la media de la Unión Europea').has('government_expenditure_ratio_europe')) throw new Error('Metric hints did not prefer European public expenditure for comparison wording');
if (preferredMetricIdsForQuery('España gasta más o menos que la media de la Unión Europea').has('government_expenditure_ratio')) throw new Error('Metric hints kept Spain-only public expenditure alongside European comparison wording');
if (!preferredMetricIdsForQuery('España gasta más por habitante en sanidad que la Unión Europea').has('health_expenditure_per_capita_europe')) throw new Error('Metric hints did not prefer European health spending for comparison wording');
if (preferredMetricIdsForQuery('España gasta más por habitante en sanidad que la Unión Europea').has('health_expenditure_per_capita')) throw new Error('Metric hints kept Spain-only health spending alongside European comparison wording');
if (!preferredMetricIdsForQuery('España tiene más renta mediana que la Unión Europea').has('median_equivalised_income_europe')) throw new Error('Metric hints did not prefer European median income for comparison wording');
if (preferredMetricIdsForQuery('España tiene más renta mediana que la Unión Europea').has('median_equivalised_income')) throw new Error('Metric hints kept Spain-only median income alongside European comparison wording');
if (!preferredMetricIdsForQuery('sobrecarga del coste de la vivienda').has('housing_cost_overburden_rate')) throw new Error('Metric hints did not prefer housing cost overburden for affordability wording');
if (!preferredMetricIdsForQuery('gasto sanitario por habitante').has('health_expenditure_per_capita')) throw new Error('Metric hints did not prefer health expenditure for resource wording');
if (!preferredMetricIdsForQuery('¿España paga más por la electricidad que Europa?').has('household_electricity_price_europe')) throw new Error('Metric hints did not prefer the Spain/EU household electricity comparison');
if (preferredMetricIdsForQuery('¿España paga más por la electricidad que Europa?').has('household_electricity_price')) throw new Error('Metric hints kept Spain-only household electricity alongside European comparison wording');
if (!excludedMetricIdsForQuery('¿Cómo ha cambiado el precio de la electricidad para los hogares en España?').has('household_electricity_price_europe')) throw new Error('Metric hints did not suppress the European electricity series for Spain-only wording');
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
if (!preferredMetricIdsForQuery('En España cuesta cada vez más encontrar trabajo que en Europa').has('unemployment_rate_europe')) throw new Error('Metric hints did not resolve conversational job-finding difficulty to European unemployment');
if (preferredMetricIdsForQuery('En España cuesta cada vez más encontrar trabajo que en Europa').has('employment_rate_europe')) throw new Error('Conversational job-finding difficulty incorrectly retained European employment as the primary metric');
if (!preferredMetricIdsForQuery('La luz para las familias sube más que el coste de vida').has('household_electricity_price')) throw new Error('Metric hints did not resolve family electricity wording to household electricity');
if (preferredMetricIdsForQuery('La luz para las familias sube más que el coste de vida').has('cpi_index')) throw new Error('Family electricity wording incorrectly fell through to generic CPI');
if (!preferredMetricIdsForQuery('La población española se está haciendo mayor').has('older_population_share')) throw new Error('Natural ageing wording did not resolve to the older-population metric');
if (!preferredMetricIdsForQuery('El país recauda una parte mayor de su economía en impuestos').has('government_revenue_ratio')) throw new Error('Natural revenue wording did not resolve to the public-revenue metric');
if (!preferredMetricIdsForQuery('Las familias destinan demasiado dinero a la vivienda').has('housing_cost_overburden_rate')) throw new Error('Natural housing-cost wording did not resolve to the housing-burden metric');
if (!preferredMetricIdsForQuery('La sanidad dedica más recursos por persona').has('health_expenditure_per_capita')) throw new Error('Natural health-resource wording did not resolve to the health-expenditure metric');
if (!preferredMetricIdsForQuery('La economía crece más despacio que la Unión Europea').has('gdp_real_growth_europe')) throw new Error('Natural GDP-comparison wording did not resolve to the European GDP-growth metric');
if (!preferredMetricIdsForQuery('El salario por hora es inferior al europeo').has('median_hourly_earnings_europe')) throw new Error('Natural hourly-pay wording did not resolve to the European hourly-earnings metric');
console.log('Warehouse query validation passed.');
