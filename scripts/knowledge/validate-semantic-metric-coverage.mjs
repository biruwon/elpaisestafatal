import { excludedMetricIdsForQuery, metricQueryTextForIds, preferredMetricIdsForQuery } from './metric-query-hints.mjs';

// These are deliberately new conversational formulations rather than
// published claim titles or aliases. Each should resolve to a reusable metric
// family, proving that coverage grows through the ontology rather than by
// adding one claim page per sentence.
const cases = [
  ['La gente encuentra trabajo con más facilidad en España que en la UE', 'employment_rate'],
  ['La electricidad doméstica cuesta más que antes', 'household_electricity_price'],
  ['Cada vez viven más personas nacidas fuera del país', 'foreign_born_population'],
  ['La población española se está haciendo mayor', 'older_population_share'],
  ['Cada mujer tiene menos hijos que en Europa', 'fertility_rate_europe'],
  ['El país recauda una parte mayor de su economía en impuestos', 'government_revenue_ratio'],
  ['Las familias destinan demasiado dinero a la vivienda', 'housing_cost_overburden_rate'],
  ['La sanidad dedica más recursos por persona', 'health_expenditure_per_capita'],
  ['La economía crece más despacio que la Unión Europea', 'gdp_real_growth_europe'],
  ['El salario por hora es inferior al europeo', 'median_hourly_earnings_europe'],
  ['Hay más personas en riesgo de pobreza que antes', 'arope_rate'],
  ['La deuda del Estado pesa más sobre la economía', 'government_debt_ratio'],
  ['La renta de las familias es menor que en Europa', 'median_equivalised_income_europe'],
  ['El PIB por persona es menor que el europeo', 'gdp_per_capita_europe'],
  ['Cada vez hay menos nacimientos', 'fertility_rate'],
  ['La criminalidad está subiendo', 'recorded_offences'],
  // These are intentionally covered by the registry aliases rather than a
  // hand-written conversational rule. Registering a new metric therefore
  // expands the reusable language surface automatically.
  ['¿Cómo se reparten los beneficiarios por grupo?', 'benefit_recipients_by_group'],
  ['¿Quién recibe vivienda protegida?', 'public_housing_actions'],
  ['¿Hay diferencias en los delitos por grupo?', 'crime_rate_by_group'],
  ['¿Cuántas adjudicaciones de vivienda pública hay?', 'public_housing_allocations_by_group'],
  ['Los sueldos españoles son de los peores de Europa', 'median_hourly_earnings_europe'],
  ['La industria española está produciendo menos', 'industrial_production_index'],
  ['Hay muchos puestos de trabajo sin cubrir', 'job_vacancy_rate'],
  ['Cada vez más hogares se retrasan con el alquiler o la hipoteca', 'housing_payment_arrears_rate'],
  ['La gente no va al médico porque no puede pagarlo', 'unmet_healthcare_cost_rate'],
  ['Hay menos profesores por alumno', 'education_personnel'],
  ['La construcción está cayendo', 'construction_output_index'],
  ['Las ventas de las tiendas bajan', 'retail_turnover_index'],
  ['España consume demasiados materiales', 'material_consumption'],
  ['Hay menos agua disponible', 'water_resources'],
  ['España invierte poco en investigación y desarrollo', 'research_development_expenditure'],
  ['La brecha de empleo entre hombres y mujeres baja', 'employment_rate_by_sex'],
  ['Las emisiones netas siguen siendo altas', 'net_greenhouse_gas_emissions'],
  ['La tasa de homicidios ha bajado', 'standardised_homicide_rate'],
  ['España genera más energía renovable', 'renewable_energy_share'],
  ['Hay pocas camas hospitalarias', 'hospital_beds'],
  ['Faltan médicos por habitante', 'physicians_density'],
  ['Han aumentado las solicitudes de asilo', 'asylum_applications'],
  ['Hay más muertes en carretera', 'road_fatality_rate'],
  ['España recicla pocos residuos', 'municipal_waste_recycling_rate'],
  ['España depende demasiado de la energía importada', 'energy_import_dependency'],
  ['España registra pocas patentes', 'patent_applications'],
  ['Los adultos hacen poca formación', 'adult_learning_rate'],
  ['La brecha salarial entre hombres y mujeres baja', 'gender_pay_gap'],
  ['Hay pocas mujeres directivas', 'women_in_management_rate'],
  ['La población tiene pocas competencias digitales', 'individuals_basic_digital_skills'],
  ['Se usa poco el transporte público', 'passenger_transport_by_mode'],
  ['Cada vez más personas usan internet', 'internet_use_rate'],
  ['Las playas tienen peor calidad de agua', 'bathing_water_quality'],
  ['Hay más hacinamiento en las viviendas', 'housing_overcrowding_rate'],
  ['Cada vez más hogares viven de alquiler', 'housing_tenure'],
  ['No se llega al médico por la distancia', 'unmet_healthcare_distance_rate'],
  ['No hay médicos disponibles', 'unmet_healthcare_availability_rate'],
  ['La tasa de suicidio ha aumentado', 'suicide_death_rate'],
  ['Hay demasiadas muertes evitables', 'preventable_treatable_mortality'],
  ['Aumentan los accidentes laborales mortales', 'fatal_work_accident_rate'],
  ['La participación electoral baja', 'electoral_turnout'],
  ['Hay más obesidad entre adultos', 'adult_obesity_rate'],
  ['Crece la agricultura ecológica', 'organic_farming_share'],
  ['Los ríos están más contaminados', 'water_body_quality'],
  ['¿Qué parte de quienes tienen estudios superiores trabaja en puestos que no exigen ese nivel?', 'tertiary_overqualification_rate'],
  ['¿Qué residentes adultos forman el denominador de la cobertura del ingreso mínimo vital?', 'imv_comparable_population_by_nationality'],
  ['¿Cuál es la edad media de las personas beneficiarias del IMV?', 'imv_beneficiary_average_age'],
  ['¿Qué tasa de desempleo tienen las personas de nacionalidad extranjera?', 'unemployment_rate_by_nationality'],
  ['¿Qué parte de todas las personas que reciben prestaciones por desempleo es extranjera?', 'unemployment_benefit_share_by_nationality'],
  ['¿Cuántos adultos reciben una condena firme según su nacionalidad?', 'crime_convictions_by_nationality'],
  ['¿Cuál es la tasa de condenados por cada mil residentes adultos según nacionalidad?', 'crime_conviction_rate_by_nationality'],
  ['¿Cómo se reparten las adjudicaciones de vivienda protegida según la nacionalidad?', 'public_housing_allocations_by_nationality'],
  ['¿Qué viviendas protegidas se adjudican según DNI, NIE o pasaporte?', 'public_housing_allocations_by_documentation'],
  ['¿Cuántas hectáreas quedan quemadas por incendios forestales?', 'wildfire_surface_affected'],
  ['¿Cómo varía el paro según el grado de urbanización?', 'urban_unemployment_rate'],
  ['¿Qué proporción de hombres y mujeres en edad laboral tiene empleo?', 'employment_rate_by_sex'],
  ['¿Cuántas camas hospitalarias hay por cada cien mil habitantes?', 'hospital_beds_per_100k'],
  ['¿Cuál es el gasto total en prestaciones de vejez y supervivencia?', 'old_age_survivors_benefits_total'],
  ['¿Qué proporción de hogares destina a vivienda una parte mediana de su renta?', 'housing_cost_burden_median'],
  ['El gasto sanitario por habitante en España es menor que en la UE', 'health_expenditure_per_capita_europe'],
  ['España dedica a pensiones de vejez menos por residente que la UE', 'old_age_survivors_benefits_per_capita_europe'],
  ['La recaudación pública española representa menos PIB que la de la UE', 'government_revenue_ratio_europe'],
  ['El gasto público español supera al de la UE como porcentaje del PIB', 'government_expenditure_ratio_europe'],
  ['En España hay más jóvenes que ni estudian ni trabajan que en la UE', 'neet_rate_europe'],
  ['La obesidad adulta española supera a la europea', 'adult_obesity_rate_europe'],
  ['La brecha salarial de género en España supera a la de Europa', 'gender_pay_gap_europe'],
  ['¿Cuál es la tasa de condena estandarizada por delito y nacionalidad?', 'crime_standardised_conviction_offence_rate_by_nationality'],
  ['¿Cuántos hombres y mujeres de cada nacionalidad tienen una condena firme?', 'crime_convictions_by_sex_nationality'],
  ['¿Qué tasa de condenas firmes tienen los menores según nacionalidad?', 'crime_conviction_rate_minor_by_nationality'],
  ['¿Qué nacionalidades presentan más solicitudes de vivienda protegida?', 'public_housing_applications_by_nationality'],
  ['¿Qué gasto de pensiones prevé el sistema para los próximos años?', 'pension_system_expenditure_projected'],
  ['¿Cuánto gasto contributivo en pensiones proyectan las previsiones?', 'pension_contributory_expenditure_projected'],
  ['¿Qué gasto proyectado corresponde a pensiones no contributivas?', 'pension_noncontributory_expenditure_projected'],
  ['¿Cuánto se presupuesta en total para las pensiones de la Seguridad Social?', 'social_security_pension_budget_total'],
];

const intentionallyUnderspecified = [
  'España cobra demasiados impuestos',
  'Los impuestos son un infierno',
];
for (const query of intentionallyUnderspecified) {
  const ids = preferredMetricIdsForQuery(query);
  if (ids.size) throw new Error(`${query}: vague judgement was incorrectly promoted to a metric family: ${[...ids].join(', ')}`);
}
const concreteComparison = preferredMetricIdsForQuery('España cobra más impuestos que Europa');
if (!concreteComparison.has('government_current_taxes_income_wealth_europe')) {
  throw new Error('Concrete tax comparison lost its reusable metric family');
}
const revenue = preferredMetricIdsForQuery('España recauda una parte mayor de su economía que Europa');
if (!revenue.has('government_revenue_ratio_europe')) {
  throw new Error('Revenue comparison was not separated from deficit/debt families');
}
if (revenue.has('government_deficit_ratio_europe') || revenue.has('government_debt_ratio_europe')) {
  throw new Error(`Revenue comparison inherited an adjacent fiscal family: ${[...revenue].join(', ')}`);
}
const unsupportedPoliticalGroupClaim = 'Los magistrados son todos políticamente conservadores';
if (preferredMetricIdsForQuery(unsupportedPoliticalGroupClaim).size || !excludedMetricIdsForQuery(unsupportedPoliticalGroupClaim).size) {
  throw new Error('An unsupported universal political claim about a group must not fall through to unrelated metrics');
}
const perCapitaEnergyClaim = '¿Cuánta energía final se consume por habitante en España frente a la Unión Europea?';
if (preferredMetricIdsForQuery(perCapitaEnergyClaim).has('final_energy_consumption_europe')
  || preferredMetricIdsForQuery(perCapitaEnergyClaim).size
  || !excludedMetricIdsForQuery(perCapitaEnergyClaim).has('final_energy_consumption_europe')
  || !excludedMetricIdsForQuery(perCapitaEnergyClaim).has('gdp_per_capita_europe')) {
  throw new Error('Aggregate energy totals must not answer a per-capita comparison without a matching measure');
}
const sexSpecificUnemployment = '¿Cuál es la tasa de paro según sexo?';
if (preferredMetricIdsForQuery(sexSpecificUnemployment).size
  || !excludedMetricIdsForQuery(sexSpecificUnemployment).has('employment_rate_by_sex')) {
  throw new Error('An employment-by-sex rate must not answer an unemployment-by-sex request');
}

const failures = [];
for (const [query, expected] of cases) {
  const ids = preferredMetricIdsForQuery(query);
  if (!ids.has(expected)) failures.push(`${query}: missing ${expected}`);
  if (ids.size > 2) failures.push(`${query}: ambiguous metric set ${[...ids].join(', ')}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

const fallbackText = metricQueryTextForIds(new Set(['household_electricity_price', 'public_housing_actions']));
if (!fallbackText.includes('precio de la luz') || !fallbackText.includes('vivienda protegida')) {
  throw new Error(`Registry metric fallback omitted human-language aliases: ${fallbackText}`);
}

console.log(`Semantic metric coverage passed: ${cases.length} unseen formulations resolve to reusable metric families.`);
