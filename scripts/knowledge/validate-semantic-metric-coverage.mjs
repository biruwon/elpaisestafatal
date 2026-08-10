import { metricQueryTextForIds, preferredMetricIdsForQuery } from './metric-query-hints.mjs';

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
