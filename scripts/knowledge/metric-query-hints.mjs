import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { metricPolicyFor } from './metric-evidence-policy.mjs';

const normalise = (value) => String(value || '')
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ñ/g, 'n')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

// The hand-tuned hints below protect high-risk ambiguities (for example
// employment versus unemployment). The registry is the scalable fallback:
// every metric can contribute its reviewed aliases without requiring a new
// if/else branch here. Only distinctive aliases are promoted, so generic
// words such as “economía” cannot silently route a claim to a metric.
const registry = JSON.parse(readFileSync(fileURLToPath(new URL('../../config/metric-registry.json', import.meta.url)), 'utf8'));
const registryAliases = Object.entries(registry).flatMap(([id, definition]) =>
  [...new Set([definition.name, ...(definition.aliases || [])])]
    .map((alias) => ({ id, alias, normalized: normalise(alias), tokens: normalise(alias).split(' ').filter(Boolean) }))
    .filter(({ tokens, normalized }) => normalized && (tokens.length >= 2 || normalized.length >= 14)),
);

const registryMetricIdsForQuery = (normalized) => {
  const candidates = registryAliases
    .filter(({ normalized: alias }) => normalized.includes(alias))
    .sort((left, right) => right.tokens.length - left.tokens.length || right.normalized.length - left.normalized.length);
  if (!candidates.length) return new Set();
  const strongest = candidates[0].tokens.length;
  return new Set(candidates
    .filter((candidate) => candidate.tokens.length === strongest)
    .map((candidate) => candidate.id));
};

// Broad claims need a small, reviewed bridge from the semantic ontology to
// metric families. This is deliberately many-to-many: “healthcare is
// collapsing” may require access, waiting-list, capacity and spending data.
// It is not a claim catalogue and contains no wording-specific answer.
const conceptMetricFamilies = {
  pension_finance: ['pension_contributory_income_projected', 'pension_public_transfers_projected', 'pension_contributory_expenditure_projected', 'pension_noncontributory_expenditure_projected', 'pension_system_income_projected', 'pension_system_expenditure_projected', 'pension_system_balance_projected', 'pension_implicit_transfers_projected', 'social_security_contributory_pension_budget', 'social_security_pension_complements_minimum_budget', 'social_security_noncontributory_pension_budget', 'social_security_pension_budget_total'],
  healthcare: ['unmet_healthcare_waiting_list_rate', 'unmet_healthcare_availability_rate', 'unmet_healthcare_cost_rate', 'health_expenditure_per_capita', 'hospital_beds', 'hospital_beds_per_100k', 'physicians_density', 'emergency_wait_declared'],
  health_access: ['unmet_healthcare_waiting_list_rate', 'unmet_healthcare_distance_rate', 'unmet_healthcare_availability_rate', 'unmet_healthcare_cost_rate'],
  healthcare_collapse: ['unmet_healthcare_waiting_list_rate', 'emergency_wait_declared', 'hospital_beds', 'hospital_beds_per_100k', 'physicians_density', 'health_expenditure_per_capita'],
  health_spending: ['health_expenditure_per_capita', 'health_expenditure_per_capita_europe'],
  education: ['government_education_expenditure_ratio', 'education_personnel', 'early_school_leaving_rate', 'tertiary_education_attainment_rate', 'neet_rate'],
  education_outcomes: ['early_school_leaving_rate', 'tertiary_education_attainment_rate', 'neet_rate', 'education_personnel'],
  housing: ['house_price_index', 'rental_price_index', 'housing_cost_overburden_rate', 'housing_overcrowding_rate', 'housing_payment_arrears_rate', 'public_housing_actions', 'public_housing_applications', 'public_housing_applications_by_nationality', 'public_housing_allocations_by_programme', 'public_housing_allocation_rate_by_programme', 'public_housing_allocations_by_nationality', 'public_housing_allocations_by_documentation', 'housing_tenure_by_household_nationality', 'housing_tenure_by_reference_nationality'],
  rental_housing: ['rental_price_index', 'housing_cost_overburden_rate', 'housing_payment_arrears_rate', 'housing_overcrowding_rate'],
  immigration: ['foreign_born_population', 'foreign_citizenship_population', 'immigration_flows', 'asylum_applications', 'imv_title_holders_by_nationality', 'imv_title_holder_share_by_nationality', 'unemployment_beneficiaries_by_nationality', 'unemployment_benefit_share_by_nationality'],
  benefits: ['benefit_recipients_by_group', 'imv_title_holders_by_nationality', 'imv_title_holder_share_by_nationality', 'unemployment_beneficiaries_by_nationality', 'unemployment_benefit_share_by_nationality', 'unemployment_benefit_coverage_by_nationality'],
  crime: ['recorded_offences', 'standardised_homicide_rate', 'crime_detentions_investigations_by_nationality', 'crime_convictions_by_nationality', 'crime_conviction_rate_by_nationality'],
  crime_reporting: ['recorded_offences'],
  employment: ['employment_rate', 'unemployment_rate', 'job_vacancy_rate', 'temporary_employment_rate', 'part_time_employment_rate', 'median_hourly_earnings'],
  unemployment: ['unemployment_rate', 'unemployment_rate_europe', 'urban_unemployment_rate'],
  employment_record: ['employment_rate', 'employment_rate_europe'],
  prices: ['inflation_rate', 'cpi_index', 'household_electricity_price'],
  cost_of_living: ['inflation_rate', 'cpi_index', 'median_equivalised_income', 'housing_cost_overburden_rate'],
  income: ['median_equivalised_income', 'median_hourly_earnings', 'gini_coefficient', 'arope_rate'],
  taxes: ['government_revenue_ratio', 'government_expenditure_ratio', 'government_current_taxes_income_wealth_europe'],
  public_finance: ['government_revenue_ratio', 'government_expenditure_ratio', 'government_deficit_ratio', 'government_debt_ratio'],
  public_debt_stock: ['government_debt_current_prices', 'government_debt_ratio'],
  public_debt_ratio: ['government_debt_ratio', 'government_debt_ratio_europe'],
  demography: ['resident_population', 'foreign_born_population', 'foreign_citizenship_population', 'population_change_rate', 'older_population_share', 'young_population_share'],
  pensions: ['old_age_survivors_benefits_per_capita', 'old_age_survivors_benefits_per_capita_europe', 'old_age_dependency_ratio', 'older_population_share', 'government_deficit_ratio', 'government_debt_ratio', 'old_age_survivors_benefits_total', 'old_age_survivors_pension_beneficiaries', 'social_protection_contributions_total', 'social_protection_government_contributions_total', 'social_security_contributory_pension_expenditure', 'social_security_current_revenue', 'social_security_current_expenditure', 'social_security_current_balance', 'social_security_contributions', 'social_security_current_transfers', 'social_security_budget_total_balance', 'projected_population_65_plus', 'projected_population_20_64', 'pension_contributory_income_projected', 'pension_public_transfers_projected', 'pension_contributory_expenditure_projected', 'pension_noncontributory_expenditure_projected', 'pension_system_income_projected', 'pension_system_expenditure_projected', 'pension_system_balance_projected', 'pension_implicit_transfers_projected', 'social_security_contributory_pension_budget', 'social_security_pension_complements_minimum_budget', 'social_security_noncontributory_pension_budget', 'social_security_pension_budget_total'],
  environment: ['net_greenhouse_gas_emissions', 'renewable_energy_share', 'water_body_quality', 'water_resources', 'wildfire_incidents', 'wildfire_surface_affected'],
};

export const metricCandidatesForQuery = (query, concepts = [], limit = 8) => {
  const normalized = normalise(query);
const domain = /(?:ayud|prestacion|benefici|subsid|imv|cobrar el paro)/.test(normalized) ? 'benefits'
    : /(?:delincu|delito|conden|criminal|insegur|seguridad)/.test(normalized) ? 'crime'
      : /(?:viviend|alquiler|piso|adjudic|casa)/.test(normalized) ? 'housing'
        : /(?:pension|jubilacion|jubilado|vejez|cotizacion|retiro|dependencia demografica|envejec)/.test(normalized) ? 'pensions' : null;
  const excluded = domain === 'benefits'
    ? new Set(['crime_convictions_by_nationality', 'crime_conviction_rate_by_nationality', 'crime_conviction_rate_minor_by_nationality', 'crime_rate_by_group', 'recorded_offences', 'standardised_homicide_rate', 'public_housing_actions', 'public_housing_allocations_by_group'])
    : domain === 'crime'
      ? new Set(['benefit_recipients_by_group', 'imv_title_holders_by_nationality', 'imv_title_holder_share_by_nationality', 'unemployment_beneficiaries_by_nationality', 'unemployment_beneficiaries_by_programme_nationality', 'unemployment_benefit_share_by_nationality', 'public_housing_actions', 'public_housing_allocations_by_group'])
      : domain === 'housing'
        ? new Set(['benefit_recipients_by_group', 'imv_title_holders_by_nationality', 'imv_title_holder_share_by_nationality', 'unemployment_beneficiaries_by_nationality', 'unemployment_benefit_share_by_nationality', 'crime_convictions_by_nationality', 'crime_conviction_rate_by_nationality', 'crime_conviction_rate_minor_by_nationality', 'crime_rate_by_group', 'recorded_offences'])
        : domain === 'pensions'
          ? new Set(['benefit_recipients_by_group', 'imv_title_holders_by_nationality', 'imv_title_holder_share_by_nationality', 'unemployment_beneficiaries_by_nationality', 'unemployment_benefit_share_by_nationality', 'crime_convictions_by_nationality', 'crime_conviction_rate_by_nationality', 'recorded_offences'])
          : new Set();
  const conceptIds = [...new Set([...concepts.map((item) => normalise(item)), ...(domain ? [domain] : [])].filter((item) => conceptMetricFamilies[item]))];
  // Interleave families so a multi-topic sentence keeps at least one route
  // for each concept instead of exhausting the limit on the first concept.
  const conceptLists = conceptIds.map((concept) => conceptMetricFamilies[concept] || []);
  const conceptCandidates = [];
  for (let index = 0; conceptCandidates.length < limit && conceptLists.some((list) => list[index]); index += 1) {
    for (const list of conceptLists) {
      if (list[index]) conceptCandidates.push(list[index]);
      if (conceptCandidates.length >= limit) break;
    }
  }
  const lexicalCandidates = registryMetricIdsForQuery(normalized);
  const ordered = [...new Set([...conceptCandidates, ...lexicalCandidates])].filter((id) => registry[id] && !excluded.has(id));
  return new Set(ordered.slice(0, limit));
};

const metricFamilyForId = (metricId) => String(metricId || '').replace(/_(?:europe|quarterly|monthly|annual)$/, '');

// Structured candidates are the public boundary between interpretation and
// retrieval. Keep the legacy Set helper above for callers that only need an
// allow-list, while new callers can preserve why each metric was proposed.
export const metricCandidatesDetailedForQuery = (query, concepts = [], limit = 8) => {
  const normalized = normalise(query);
  const conceptIds = [...new Set(concepts.map((item) => normalise(item)).filter((item) => conceptMetricFamilies[item]))];
  const conceptIdsForMetric = new Map();
  for (const concept of conceptIds) for (const metricId of conceptMetricFamilies[concept] || []) {
    if (!conceptIdsForMetric.has(metricId)) conceptIdsForMetric.set(metricId, []);
    conceptIdsForMetric.get(metricId).push(concept);
  }
  const lexicalIds = registryMetricIdsForQuery(normalized);
  const ids = [...new Set([...metricCandidatesForQuery(query, concepts, limit), ...lexicalIds])]
    .filter((metricId) => registry[metricId]).slice(0, limit);
  return ids.map((metricId, index) => {
    const definition = registry[metricId] || {};
    const policy = metricPolicyFor(metricId) || {};
    const conceptsForMetric = conceptIdsForMetric.get(metricId) || [];
    const lexical = lexicalIds.has(metricId);
    return {
      metricId,
      family: policy.family || definition.family || metricFamilyForId(metricId),
      reason: conceptsForMetric.length ? 'ontology' : lexical ? 'alias' : 'proposition',
      confidence: Number(Math.max(0.35, 0.92 - index * 0.06).toFixed(2)),
      requiredDimensions: policy.requiredDimensions || (Array.isArray(definition.dimensions) ? definition.dimensions : ['period', 'geography']),
      concepts: conceptsForMetric,
      unit: definition.unit,
      population: definition.population,
      limitations: policy.limitations || [],
      supports: policy.supports || ['descriptive', 'trend'],
    };
  });
};

export const metricCandidatesForIds = (ids = []) => [...new Set(ids)].filter((metricId) => registry[metricId]).map((metricId) => {
  const definition = registry[metricId] || {};
  const policy = metricPolicyFor(metricId) || {};
  return {
    metricId,
    family: policy.family || definition.family || metricFamilyForId(metricId),
    reason: 'proposition',
    confidence: 0.8,
    requiredDimensions: policy.requiredDimensions || (Array.isArray(definition.dimensions) ? definition.dimensions : ['period', 'geography']),
    unit: definition.unit,
    population: definition.population,
    limitations: policy.limitations || [],
    supports: policy.supports || ['descriptive', 'trend'],
  };
});

const comparisonStopwords = new Set([
  'espana', 'espanol', 'espanola', 'pais', 'paises', 'frente', 'comparado',
  'comparada', 'comparacion', 'tiene', 'mas', 'menos', 'mayor', 'menor', 'que', 'la', 'el',
  'de', 'del', 'en', 'por', 'con', 'como', 'esta', 'es', 'hay',
]);

const comparisonToken = (token) => {
  if (/^europ/.test(token) || token === 'ue') return 'europe';
  if (/^famil/.test(token)) return 'hogar';
  if (/^hogar/.test(token)) return 'hogar';
  if (/^person/.test(token)) return 'habitante';
  if (/^habit/.test(token)) return 'habitante';
  return token.replace(/es$/, '').replace(/s$/, '');
};

// When a user describes a comparison without using the catalogue wording
// (“la renta de las familias es menor que la europea”), recover the reviewed
// Europe metric from shared subject tokens. This is deliberately limited to
// registry metrics whose ID declares the comparison dimension and requires a
// clear winner, so it cannot turn one generic topic word into a metric.
const comparisonMetricIdsForQuery = (normalized) => {
  const queryTokens = new Set(normalized.split(' ').filter((token) => token.length >= 4 && !comparisonStopwords.has(token)).map(comparisonToken));
  const candidates = Object.entries(registry)
    .filter(([id]) => id.endsWith('_europe'))
    .map(([id, definition]) => {
      const aliases = [...new Set([definition.name, ...(definition.aliases || [])])];
      const scores = aliases.map((alias) => {
        const tokens = normalise(alias).split(' ').filter((token) => token.length >= 4 && !comparisonStopwords.has(token)).map(comparisonToken);
        const overlap = tokens.filter((token) => queryTokens.has(token));
        const missingDistinctive = tokens.filter((token) => !queryTokens.has(token) && token.length >= 6);
        return overlap.reduce((score, token) => score + (token.length >= 8 ? 1.4 : 1), 0)
          - missingDistinctive.length * 0.35;
      });
      return { id, score: Math.max(0, ...scores) };
    })
    .filter((candidate) => candidate.score >= 2)
    .sort((left, right) => right.score - left.score);
  if (!candidates.length) return new Set();
  const [winner, runnerUp] = candidates;
  if (runnerUp && winner.score - runnerUp.score < 0.75) return new Set();
  return new Set([winner.id]);
};

// Retrieval indexes contain human-language aliases, not internal registry
// IDs. Keep the fallback query coupled to the registry so a newly added
// metric is searchable without a second claim-specific mapping.
export const metricQueryTextForIds = (ids) => [...new Set([...ids].flatMap((id) => {
  const definition = registry[id];
  return definition ? [definition.name, ...(definition.aliases || []).slice(0, 2)] : [id];
}))].join(' ');

const metricHints = [
  { ids: ['research_development_expenditure'], terms: ['gasto en i+d', 'inversion en investigacion', 'investigacion y desarrollo', 'esfuerzo investigador'] },
  { ids: ['employment_rate_by_sex'], terms: ['empleo por sexo', 'tasa de empleo de hombres y mujeres', 'brecha de empleo', 'empleo femenino y masculino'] },
  { ids: ['net_greenhouse_gas_emissions'], terms: ['emisiones netas de gases de efecto invernadero', 'emisiones netas gei', 'emisiones climaticas netas', 'emisiones netas'] },
  { ids: ['standardised_homicide_rate'], terms: ['tasa de homicidios', 'homicidios por poblacion', 'muertes por homicidio', 'tasa estandarizada de homicidios'] },
  { ids: ['renewable_energy_share'], terms: ['energias renovables', 'cuota de renovables', 'energia renovable', 'porcentaje de renovables'] },
  { ids: ['hospital_beds', 'hospital_beds_per_100k'], terms: ['camas hospitalarias', 'camas de hospital', 'numero de camas sanitarias', 'plazas hospitalarias'] },
  { ids: ['hospital_beds_per_100k'], terms: ['camas hospitalarias por 100.000 habitantes', 'camas por 100.000 habitantes', 'densidad de camas hospitalarias'] },
  { ids: ['physicians_density'], terms: ['medicos por habitante', 'densidad de medicos', 'numero de medicos', 'facultativos por poblacion'] },
  { ids: ['asylum_applications'], terms: ['solicitudes de asilo', 'peticiones de asilo', 'solicitantes de proteccion internacional', 'asilo en espana'] },
  { ids: ['road_fatality_rate'], terms: ['muertes en carretera', 'mortalidad vial', 'accidentes de trafico mortales', 'victimas mortales de trafico'] },
  { ids: ['municipal_waste_recycling_rate'], terms: ['reciclaje de residuos', 'tasa de reciclaje', 'residuos reciclados', 'reciclaje municipal', 'recicla residuos', 'recicla pocos residuos'] },
  { ids: ['energy_import_dependency'], terms: ['dependencia energetica', 'dependencia de importaciones de energia', 'energia importada', 'dependencia energetica exterior'] },
  { ids: ['patent_applications'], terms: ['solicitudes de patentes', 'patentes', 'innovacion patentada', 'registro de patentes'] },
  { ids: ['adult_learning_rate'], terms: ['aprendizaje de adultos', 'formacion de adultos', 'participacion en formacion', 'educacion permanente', 'hacen formacion', 'poca formacion'] },
  { ids: ['gender_pay_gap'], terms: ['brecha salarial de genero', 'diferencia salarial entre hombres y mujeres', 'brecha salarial', 'salarios de hombres y mujeres'] },
  { ids: ['women_in_management_rate'], terms: ['mujeres directivas', 'mujeres en puestos de direccion', 'mujeres en cargos de gestion', 'liderazgo femenino'] },
  { ids: ['individuals_basic_digital_skills'], terms: ['competencias digitales', 'habilidades digitales', 'alfabetizacion digital', 'capacidades digitales basicas'] },
  { ids: ['passenger_transport_by_mode'], terms: ['transporte de pasajeros', 'uso del transporte publico', 'viajes en transporte publico', 'movilidad por modo', 'transporte publico'] },
  { ids: ['internet_use_rate'], terms: ['uso de internet', 'personas que usan internet', 'acceso a internet', 'conectividad digital', 'usan internet'] },
  { ids: ['bathing_water_quality'], terms: ['calidad de las aguas de baño', 'calidad de playas', 'aguas de baño', 'playas contaminadas', 'calidad de agua'] },
  { ids: ['housing_overcrowding_rate'], terms: ['hacinamiento', 'viviendas hacinadas', 'tasa de hacinamiento', 'viviendas sobreocupadas'] },
  { ids: ['housing_tenure'], terms: ['regimen de tenencia de vivienda', 'vivienda en propiedad o alquiler', 'hogares de alquiler', 'hogares propietarios', 'vive de alquiler', 'viven de alquiler'] },
  { ids: ['unmet_healthcare_distance_rate'], terms: ['atencion medica por distancia', 'no puede acceder al medico por distancia', 'barrera geografica sanitaria', 'distancia al centro de salud', 'medico por la distancia'] },
  { ids: ['unmet_healthcare_availability_rate'], terms: ['atencion medica no disponible', 'no encuentra medico', 'falta de disponibilidad sanitaria', 'barrera de acceso sanitario', 'medicos disponibles'] },
  { ids: ['suicide_death_rate'], terms: ['tasa de suicidio', 'muertes por suicidio', 'suicidios por poblacion', 'mortalidad por suicidio'] },
  { ids: ['preventable_treatable_mortality'], terms: ['mortalidad evitable', 'muertes evitables', 'mortalidad tratable', 'muertes prematuras evitables'] },
  { ids: ['fatal_work_accident_rate'], terms: ['accidentes laborales mortales', 'muertes en el trabajo', 'siniestralidad laboral mortal', 'accidentes de trabajo'] },
  { ids: ['electoral_turnout'], terms: ['participacion electoral', 'participacion en elecciones', 'abstencion', 'votantes en elecciones'] },
  { ids: ['adult_obesity_rate'], terms: ['obesidad adulta', 'tasa de obesidad', 'personas con obesidad', 'sobrepeso y obesidad', 'obesidad entre adultos'] },
  { ids: ['organic_farming_share'], terms: ['agricultura ecologica', 'superficie ecologica', 'cultivo organico', 'agricultura organica'] },
  { ids: ['water_body_quality'], terms: ['calidad de rios y lagos', 'estado de las masas de agua', 'calidad del agua continental', 'rios contaminados', 'rios estan contaminados', 'estan mas contaminados'] },
  { ids: ['adult_obesity_rate_europe'], terms: ['obesidad de espana frente a europa', 'obesidad adulta frente a europa', 'comparacion europea de obesidad'] },
  { ids: ['gender_pay_gap_europe'], terms: ['brecha salarial de espana frente a europa', 'brecha salarial de genero frente a europa', 'comparacion europea de brecha salarial'] },
  { ids: ['renewable_energy_share_europe'], terms: ['renovables de espana frente a europa', 'cuota de renovables frente a europa', 'comparacion europea de energias renovables'] },
  { ids: ['education_personnel'], terms: ['personal educativo', 'profesores', 'docentes', 'numero de profesores'] },
  { ids: ['gross_value_added_by_activity'], terms: ['valor añadido por actividad', 'valor anadido por actividad', 'vab por sector', 'produccion sectorial'] },
  { ids: ['retail_turnover_index'], terms: ['ventas minoristas', 'comercio minorista', 'facturacion del comercio', 'ventas de tiendas', 'ventas de las tiendas'] },
  { ids: ['construction_output_index'], terms: ['produccion de la construccion', 'actividad constructora', 'obra nueva', 'construccion esta cayendo', 'construccion cae'] },
  { ids: ['material_consumption'], terms: ['consumo de materiales', 'materiales usados', 'extraccion de materiales', 'consume demasiados materiales'] },
  { ids: ['water_resources'], terms: ['recursos de agua dulce', 'agua disponible', 'recursos hidricos', 'agua renovable'] },
  { ids: ['water_consumption'], terms: ['consumo de agua', 'uso del agua', 'extraccion de agua', 'agua utilizada'] },
  { ids: ['job_vacancy_rate'], terms: ['vacantes de empleo', 'puestos de trabajo sin cubrir', 'puestos sin cubrir', 'ofertas de trabajo sin cubrir', 'tasa de vacantes'] },
  { ids: ['housing_payment_arrears_rate'], terms: ['atrasos en pagos de vivienda', 'impagos de vivienda', 'retrasos en alquiler', 'retrasos en hipoteca', 'se retrasan con el alquiler', 'se retrasan con la hipoteca', 'pagos atrasados de vivienda'] },
  { ids: ['unmet_healthcare_cost_rate'], terms: ['no puede pagar atencion medica', 'no puede pagar atención médica', 'no va al medico porque no puede pagarlo', 'atencion sanitaria por dinero', 'barrera economica sanitaria', 'necesidades medicas no atendidas por coste'] },
  { ids: ['industrial_production_index'], terms: ['produccion industrial', 'índice de producción industrial', 'actividad industrial', 'industria española'] },
  { ids: ['wildfire_incidents'], terms: ['siniestros forestales', 'incendios forestales', 'numero de incendios forestales'] },
  { ids: ['wildfire_surface_affected'], terms: ['superficie forestal afectada', 'superficie forestal', 'superficie quemada', 'hectareas quemadas'] },
  { ids: ['emergency_wait_declared'], terms: ['espera en urgencias', 'tiempo de espera en urgencias', 'espera media en urgencias', 'espera urgencias', 'urgencias'] },
  { ids: ['household_electricity_price'], terms: ['precio de la luz', 'factura de la luz', 'precio de la electricidad', 'coste de la electricidad', 'tarifa electrica', 'electricidad', 'electricidad para las familias', 'luz para las familias', 'luz mas cara'] },
  { ids: ['rental_price_index'], terms: ['precio del alquiler', 'precios del alquiler', 'alquiler', 'alquileres', 'rentas de alquiler', 'alquiler mas caro', 'sube el alquiler'] },
  { ids: ['harmonised_price_index'], terms: ['comparable con europa', 'metodologia europea', 'indice armonizado', 'hicp', 'inflacion comparable'] },
  { ids: ['inflation_rate'], terms: ['inflacion', 'tasa de inflacion', 'inflacion anual', 'subida de precios', 'ritmo de los precios', 'ritmo suben precios', 'ritmo suben los precios', 'tasa anual de los precios', 'precios aumentan'] },
  { ids: ['inflation_rate_europe'], terms: ['inflacion de espana frente a europa', 'inflacion de espana por encima de europa', 'inflacion de espana por encima de la union europea', 'tasa de inflacion espanola es menor que la europea', 'tasa de inflacion espanola menor que la europea', 'inflacion frente a europa', 'inflacion frente a la union europea', 'inflacion espanola mas alta que europa', 'inflacion espanola mas alta que la union europea', 'inflacion espanola menor que europea', 'inflacion mas alta que europa', 'inflacion mas baja que europa', 'precios suben mas que europa', 'comparacion de la inflacion espanola', 'comparacion inflacion espanola union europea', 'inflacion comparable con europa', 'inflacion comparable europa'] },
  { ids: ['gdp_current_prices'], terms: ['pib nominal', 'pib a precios corrientes', 'tamano de la economia', 'valor del pib', 'producto interior bruto en euros', 'produccion economica nacional'] },
  { ids: ['gdp_per_capita_current_prices'], terms: ['pib por habitante', 'pib per capita', 'producto interior bruto por persona', 'economia por habitante', 'pib por persona'] },
  { ids: ['gdp_per_capita_europe'], terms: ['pib por habitante frente a europa', 'pib por habitante frente a la union europea', 'pib per capita frente a europa', 'pib per capita frente a la union europea', 'como queda el pib por habitante', 'pib por habitante espanol comparado', 'comparacion del pib per capita', 'espana tiene mas pib por habitante que europa', 'espana tiene menos pib por habitante que europa', 'espana tiene mas pib por habitante que la union europea', 'espana tiene menos pib por habitante que la union europea', 'tiene espana mas pib por habitante que europa', 'tiene espana menos pib por habitante que europa', 'tiene espana mas pib por habitante que la union europea', 'tiene espana menos pib por habitante que la union europea', 'pib por habitante que la union europea', 'pib por persona frente a europa', 'pib por persona frente a la union europea', 'pib por persona que europa', 'pib por persona que la union europea', 'pib europa por habitante', 'pib europa por persona'] },
  { ids: ['gdp_real_growth_quarterly'], terms: ['actividad economica', 'actividad economica cae', 'actividad economica esta cayendo', 'economia cae', 'crecimiento negativo', 'recesion', 'pib real', 'crecimiento del pib', 'crecimiento interanual pib', 'crece el pib'] },
  { ids: ['gdp_real_growth_europe'], terms: ['pib real frente a europa', 'crecimiento del pib frente a europa', 'pib real espanol crece mas', 'comparacion del crecimiento economico', 'crece espana mas que europa', 'crece espana mas que la union europea', 'espana crece mas que europa', 'espana crece mas que la union europea', 'crece espana menos que europa', 'crece espana menos que la union europea', 'espana crece menos que europa', 'espana crece menos que la union europea', 'crecimiento de espana frente a la union europea', 'crecimiento economico europeo', 'pib espana union europea', 'pib frente a europa', 'crecimiento frente a europa'] },
  { ids: ['employment_rate'], terms: ['tasa de empleo', 'tasa de ocupacion', 'personas ocupadas', 'personas que tienen empleo', 'personas en edad laboral trabajan', 'encuentra trabajo', 'tiene empleo', 'ocupacion en espana', 'empleo en espana', 'mas empleo', 'empleo nunca', 'empleo record'] },
  { ids: ['employment_rate_europe'], terms: ['tasa de empleo frente a europa', 'tasa de empleo frente a la union europea', 'tasa de empleo mayor que europa', 'tasa de empleo mayor que la union europea', 'tasa de empleo menor que europa', 'tasa de empleo menor que la union europea', 'tasa de empleo de espana es inferior a la de europa', 'tasa de empleo de espana inferior a europa', 'como queda el empleo espanol frente al europeo', 'tasa de ocupacion de espana frente a la union europea', 'empleo de espana frente a europa', 'empleo de espana frente a la union europea', 'espana tiene mas empleo que europa', 'espana tiene menos empleo que europa', 'espana tiene una tasa de empleo mayor que la union europea', 'espana tiene una tasa de empleo menor que la union europea', 'comparacion europea del empleo', 'comparacion europea de la ocupacion', 'empleo mas alto que europa', 'empleo mas bajo que europa', 'empleo europa'] },
  { ids: ['part_time_employment_rate'], terms: ['empleo a tiempo parcial', 'trabajo a tiempo parcial', 'tiempo parcial', 'empleo parcial', 'jornada parcial', 'contratos parciales', 'trabajos a tiempo parcial', 'empleos a tiempo parcial', 'cuanto empleo es parcial', 'cuanto trabajo es parcial'] },
  { ids: ['part_time_employment_rate_europe'], terms: ['empleo a tiempo parcial frente a europa', 'empleo a tiempo parcial frente a la union europea', 'trabajo a tiempo parcial frente a europa', 'tiempo parcial frente a europa', 'empleo parcial que europa', 'empleo parcial que la union europea', 'espana tiene mas empleo parcial que europa', 'espana tiene menos empleo parcial que europa', 'comparacion europea del empleo parcial', 'empleo parcial europa'] },
  { ids: ['temporary_employment_rate'], terms: ['empleo temporal', 'trabajo temporal', 'contratos temporales', 'contrato temporal', 'temporalidad laboral', 'empleo de duracion determinada', 'trabajo de duracion determinada', 'cuanto empleo es temporal', 'parte del empleo temporal', 'es temporal', 'temporalidad'] },
  { ids: ['temporary_employment_rate_europe'], terms: ['empleo temporal frente a europa', 'empleo temporal frente a la union europea', 'trabajo temporal frente a europa', 'temporalidad frente a europa', 'temporalidad que europa', 'espana tiene mas temporalidad que europa', 'espana tiene menos temporalidad que europa', 'comparacion europea de la temporalidad', 'temporalidad europa'] },
  { ids: ['median_hourly_earnings'], terms: ['salario mediano por hora', 'salario bruto por hora', 'ganancia mediana por hora', 'sueldo por hora', 'lo que se cobra por hora', 'cuanto se cobra por hora', 'salario por hora'] },
  { ids: ['median_hourly_earnings_europe'], terms: ['salario por hora frente a europa', 'salario por hora frente a la union europea', 'sueldo por hora frente a europa', 'sueldo por hora frente a la ue', 'espana cobra mas por hora que europa', 'espana cobra menos por hora que europa', 'comparacion europea del salario por hora', 'comparacion europea del salario bruto por hora', 'salario por hora europa'] },
  { ids: ['minimum_wage_monthly'], terms: ['salario minimo', 'salario minimo interprofesional', 'smi', 'sueldo minimo', 'minimo salarial', 'cuanto es el salario minimo', 'ha subido el salario minimo', 'sube el salario minimo', 'salario minimo en espana'] },
  { ids: ['social_protection_benefits_per_capita'], terms: ['gasto en proteccion social', 'prestaciones de proteccion social', 'proteccion social por habitante', 'prestaciones por habitante', 'gasto en prestaciones sociales', 'prestaciones sociales', 'ayudas sociales', 'gasto en ayudas', 'gasto social', 'prestaciones publicas', 'cuanto se gasta en ayudas', 'cuanto gasta espana en proteccion social'] },
  { ids: ['imv_title_holders_by_nationality', 'imv_beneficiary_average_age'], terms: ['ingreso minimo vital', 'ingreso minimo', 'imv', 'titulares del imv', 'beneficiarios del imv', 'edad media beneficiarios imv', 'ayudas del imv', 'renta minima vital'] },
  { ids: ['social_protection_benefits_per_capita_europe'], terms: ['gasto en proteccion social frente a europa', 'gasto en proteccion social frente a la union europea', 'prestaciones sociales frente a europa', 'prestaciones sociales frente a la union europea', 'ayudas sociales frente a europa', 'espana gasta mas en proteccion social que europa', 'espana gasta menos en proteccion social que europa', 'comparacion europea del gasto social', 'proteccion social europa'] },
  { ids: ['old_age_survivors_benefits_per_capita'], terms: ['gasto en pensiones', 'prestaciones de vejez', 'pensiones por habitante', 'gasto en jubilacion', 'pensiones y supervivencia', 'cuanto gasta espana en pensiones', 'cuanto se gasta en pensiones', 'gasto de las pensiones', 'gasto pensionistas'] },
  { ids: ['old_age_survivors_benefits_per_capita_europe'], terms: ['gasto en pensiones frente a europa', 'gasto en pensiones por habitante frente a europa', 'como queda el gasto en pensiones espanol frente a europa', 'gasto espanol en pensiones por persona comparado con europa', 'pensiones de espana frente a europa', 'pensiones por habitante frente a europa', 'espana gasta mas en pensiones que europa', 'espana gasta menos en pensiones que europa', 'espana gasta mas por habitante en pensiones que la union europea', 'espana gasta menos por habitante en pensiones que la union europea', 'pensiones por habitante que europa', 'pensiones frente a la union europea', 'pensiones y supervivencia frente a la union europea', 'comparacion europea del gasto en pensiones'] },
  { ids: ['unemployment_rate'], terms: ['tasa de paro', 'tasa de desempleo', 'desempleo en espana', 'paro en espana', 'evolucion del desempleo', 'evolucion del paro', 'no encuentra trabajo', 'no encuentran trabajo', 'personas activas no encuentran trabajo'] },
  { ids: ['unemployment_rate_europe'], terms: ['paro en europa', 'desempleo en europa', 'desempleo espanol frente al europeo', 'tasa de paro de espana frente a los paises europeos', 'tasa de paro espana frente a los paises europeos', 'ranking europeo de la tasa de desempleo', 'tasa de paro europea', 'comparacion europea', 'comparar paro europa', 'frente a europa en desempleo', 'supera a europa en desempleo', 'supera europa en desempleo', 'supera a europa en paro', 'supera europa en paro', 'europa tiene mas paro que espana', 'europa tiene mas desempleo que espana', 'paro mas alto de europa', 'paro mas bajo de europa', 'puesto de espana por desempleo', 'tasa paro europa', 'espana tasa paro alta europa', 'espana tasa paro baja europa', 'espana tasa de paro alta en europa', 'espana tasa de paro baja en europa', 'paro alta europa', 'paro baja europa'] },
  { ids: ['youth_unemployment_rate_europe'], terms: ['paro juvenil frente a europa', 'desempleo juvenil frente a europa', 'paro juvenil de espana frente a europa', 'paro juvenil de espana frente a la union europea', 'tasa de paro juvenil frente a europa', 'tasa de paro juvenil frente a la union europea', 'espana tiene mas paro juvenil que europa', 'espana tiene mas paro juvenil que la union europea', 'espana tiene menos paro juvenil que europa', 'espana tiene menos paro juvenil que la union europea', 'desempleo juvenil europeo', 'comparacion europea del paro juvenil', 'paro juvenil europa'] },
  { ids: ['early_school_leaving_rate_europe'], terms: ['abandono escolar frente a europa', 'abandono escolar frente a la union europea', 'abandono escolar temprano frente a europa', 'abandono escolar temprano frente a la union europea', 'abandono educativo frente a europa', 'abandono educativo frente a la union europea', 'espana tiene mas abandono escolar que europa', 'espana tiene mas abandono escolar que la union europea', 'espana tiene menos abandono escolar que europa', 'espana tiene menos abandono escolar que la union europea', 'comparacion europea del abandono escolar', 'abandono escolar europa'] },
  { ids: ['early_school_leaving_rate'], terms: ['abandono escolar temprano', 'abandono escolar', 'abandono educativo', 'proporcion de jovenes que dejan la educacion temprano', 'proporcion de jovenes dejan la educacion temprano', 'jovenes dejan educacion temprano', 'dejan los estudios', 'dejan los estudios antes de tiempo', 'jovenes que abandonan los estudios', 'fracaso escolar temprano'] },
  { ids: ['tertiary_education_attainment_rate'], terms: ['estudios superiores', 'educacion superior', 'titulacion superior', 'universitarios', 'graduados', 'titulados', 'universitarios de 25 a 34', 'jovenes con estudios universitarios', 'personas con estudios superiores'] },
  { ids: ['neet_rate_europe'], terms: ['ninis frente a europa', 'ninis frente a la union europea', 'ni estudian ni trabajan frente a europa', 'ni estudian ni trabajan frente a la union europea', 'espana tiene mas ninis que europa', 'espana tiene mas ninis que la union europea', 'espana tiene menos ninis que europa', 'espana tiene menos ninis que la union europea', 'tiene espana mas ninis que europa', 'tiene espana mas ninis que la union europea', 'comparacion europea de ninis', 'ninis europa'] },
  { ids: ['neet_rate'], terms: ['ni estudian ni trabajan', 'ni estudia ni trabaja', 'ninis', 'jovenes ninis', 'fuera del empleo y de la educacion', 'fuera de estudio y empleo', 'no estudian ni trabajan'] },
  // Age alone is not an unemployment request: “los jóvenes no pueden
  // comprar vivienda” must not retrieve a youth-unemployment series. The
  // explicit guard below adds this metric only when worklessness language is
  // present as well.
  { ids: ['youth_unemployment_rate'], terms: ['paro juvenil', 'desempleo juvenil', 'tasa de paro juvenil', 'tasa de desempleo juvenil', 'youth unemployment', '15-24 paro'] },
  { ids: ['government_debt_ratio'], terms: ['deuda', 'endeudamiento', 'debt', 'cuanto debe españa', 'deuda del pais', 'nivel de deuda española'] },
  { ids: ['government_debt_ratio_europe'], terms: ['deuda publica frente a europa', 'deuda publica frente a la union europea', 'deuda de espana frente a europa', 'espana tiene mas deuda que europa', 'espana esta mas endeudada que europa', 'comparacion europea de la deuda publica'] },
  { ids: ['government_debt_current_prices'], terms: ['deuda publica en euros', 'deuda publica total', 'importe total de la deuda publica', 'importe de la deuda publica', 'importe en millones de euros de la deuda publica', 'deuda publica española expresada en euros', 'deuda publica expresada en euros', 'cuanto dinero debe el sector publico', 'cuanto dinero debe españa', 'cuanto debe españa en euros', 'cuanto debe españa en dinero', 'deuda de españa en euros', 'deuda publica en millones', 'deuda nominal', 'billones de deuda'] },
  { ids: ['government_revenue_ratio'], terms: ['recaudacion', 'recaudación', 'ingresos publicos', 'ingresos públicos', 'ingresos del estado'] },
  { ids: ['government_expenditure_ratio'], terms: ['gasto publico', 'gasto público', 'gasto del estado', 'presupuesto publico', 'presupuesto público'] },
  { ids: ['government_education_expenditure_ratio'], terms: ['gasto en educacion', 'gasto en educación', 'gasto educativo', 'presupuesto de educacion', 'presupuesto de educación', 'inversion publica en educacion', 'inversión pública en educación', 'educacion sobre pib', 'educación sobre PIB'] },
  { ids: ['government_revenue_ratio_europe'], terms: ['ingresos publicos frente a europa', 'ingresos publicos frente a la union europea', 'como quedan los ingresos publicos espanoles frente a europa', 'ingresos publicos de espana comparados con europa', 'comparacion europea de los ingresos publicos', 'recaudacion publica frente a europa', 'recaudacion publica frente a la union europea', 'espana recauda mas que europa', 'espana recauda menos que europa', 'espana recauda mas que la union europea', 'espana recauda menos que la union europea', 'recauda mas o menos que la media europea', 'recauda mas o menos que la media de la union europea', 'ingresos publicos europa', 'recaudacion europa'] },
  { ids: ['government_current_taxes_income_wealth_europe'], terms: ['presion fiscal', 'presion tributaria', 'impuestos sobre la renta y la riqueza frente a europa', 'impuestos sobre la renta frente a europa', 'impuestos de espana frente a europa', 'impuestos frente a europa', 'impuestos sobre renta y riqueza que la union europea', 'espana cobra mas impuestos sobre renta y riqueza que la union europea', 'espana cobra menos impuestos sobre renta y riqueza que la union europea', 'presion fiscal frente a europa', 'presion fiscal frente a la union europea', 'espana cobra mas impuestos que europa', 'espana cobra menos impuestos que europa', 'espana cobra mas impuestos que la union europea', 'espana cobra menos impuestos que la union europea', 'espana es el pais que mas impuestos cobra de europa', 'impuestos mas altos de europa', 'impuestos mas bajos de europa', 'cuantos impuestos cobra espana frente a europa', 'espana tiene demasiados impuestos', 'espana cobra demasiados impuestos', 'presion fiscal alta en espana', 'impuestos altos en espana', 'infierno fiscal'] },
  { ids: ['government_expenditure_ratio_europe'], terms: ['gasto publico frente a europa', 'gasto publico frente a la union europea', 'como queda el gasto publico espanol frente a europa', 'comparacion europea del gasto publico', 'gasto publico espanol frente al de la union europea', 'gasto del estado frente a europa', 'gasto del estado frente a la union europea', 'espana gasta mas que europa', 'espana gasta menos que europa', 'espana gasta mas que la union europea', 'espana gasta menos que la union europea', 'gasta mas o menos que la media europea', 'gasta mas o menos que la media de la union europea', 'gasto publico europa', 'gasto europa'] },
  { ids: ['government_education_expenditure_ratio_europe'], terms: ['gasto en educacion frente a europa', 'gasto en educacion frente a la union europea', 'gasto educativo frente a europa', 'gasto educativo frente a la union europea', 'espana gasta mas en educacion que europa', 'espana gasta menos en educacion que europa', 'espana gasta mas en educacion que la union europea', 'espana gasta menos en educacion que la union europea', 'comparacion europea del gasto educativo', 'gasto educacion europa'] },
  { ids: ['housing_cost_overburden_rate'], terms: ['sobrecarga', 'coste de la vivienda', 'gastos de vivienda', 'esfuerzo de vivienda', 'sobrecarga coste vivienda', 'hogares soportan el coste de la vivienda', 'porcentaje de hogares soporta'] },
  { ids: ['housing_cost_overburden_rate_europe'], terms: ['sobrecarga de vivienda frente a europa', 'sobrecarga de vivienda frente a la union europea', 'esfuerzo de vivienda frente a europa', 'esfuerzo de vivienda frente a la union europea', 'espana tiene mas sobrecarga de vivienda que europa', 'espana tiene menos sobrecarga de vivienda que europa', 'comparacion europea del esfuerzo de vivienda', 'sobrecarga vivienda europa'] },
  { ids: ['health_expenditure_per_capita'], terms: ['gasto sanitario', 'gasto en sanidad', 'gasto en salud', 'recursos sanitarios', 'gasto sanitario por habitante', 'gasto sanitario por persona', 'gasto por habitante en sanidad', 'gasta en sanidad por habitante', 'gasta sanidad por habitante', 'gasta sanidad habitante', 'cuanto gasta sanidad habitante', 'sanidad por habitante', 'gasto por persona en sanidad', 'dinero por persona en sanidad', 'cuanto dinero se dedica a sanidad', 'cuanto dinero se dedica por persona a la sanidad', 'cuanto se gasta en sanidad', 'cuanto se gasta en salud'] },
  { ids: ['health_expenditure_per_capita_europe'], terms: ['gasto sanitario frente a europa', 'gasto sanitario frente a la union europea', 'como se compara el gasto sanitario de espana con europa', 'comparacion europea del gasto de salud por habitante', 'gasto en sanidad frente a europa', 'gasto en sanidad frente a la union europea', 'espana gasta mas en sanidad que europa', 'espana gasta menos en sanidad que europa', 'espana gasta mas en sanidad que la union europea', 'espana gasta menos en sanidad que la union europea', 'espana gasta mas por habitante en sanidad', 'espana gasta menos por habitante en sanidad', 'gasto sanitario europa', 'sanidad europa'] },
  { ids: ['household_electricity_price_europe'], terms: ['precio de la luz frente a europa', 'electricidad frente a europa', 'precio de la electricidad frente a europa', 'espana paga mas por la electricidad que europa', 'espana paga menos por la luz que europa', 'comparacion europea del precio de la electricidad', 'electricidad europa'] },
  { ids: ['unmet_healthcare_waiting_list_rate_europe'], terms: ['lista de espera frente a europa', 'lista de espera frente a la union europea', 'espera sanitaria frente a europa', 'necesidades medicas no atendidas frente a europa', 'espana tiene mas espera sanitaria que europa', 'espana tiene menos espera sanitaria que europa', 'espana tiene mas lista de espera que europa', 'comparacion europea de listas de espera', 'comparacion europea de la espera sanitaria', 'lista de espera europa'] },
  { ids: ['unmet_healthcare_waiting_list_rate'], terms: ['lista de espera medica', 'lista de espera sanitaria', 'listas de espera sanitarias', 'listas de espera medicas', 'no recibe atencion por lista de espera', 'personas sin atencion por lista de espera', 'espera medica impide atencion', 'necesidad medica no atendida por espera'] },
  { ids: ['life_expectancy_at_birth'], terms: ['esperanza de vida', 'esperanza vida', 'esperanza de vida al nacer', 'años de vida', 'vida media', 'cuantos años vive', 'cuanto vive', 'longevidad', 'evolucionado esperanza vida'] },
  { ids: ['life_expectancy_at_birth_europe'], terms: ['esperanza de vida frente a europa', 'esperanza de vida frente a la union europea', 'años de vida frente a europa', 'espana vive mas que europa', 'espana vive mas que la union europea', 'comparacion europea de esperanza de vida', 'esperanza de vida europa'] },
  { ids: ['fertility_rate'], terms: ['fecundidad', 'tasa de fecundidad', 'natalidad', 'tasa de natalidad', 'hijos por mujer', 'nacimientos', 'nacimientos por mujer'] },
  { ids: ['fertility_rate_europe'], terms: ['fecundidad frente a europa', 'fecundidad frente a la union europea', 'tasa de fecundidad frente a europa', 'espana tiene menos hijos que europa', 'espana tiene mas hijos que europa', 'comparacion europea de fecundidad', 'hijos por mujer europa'] },
  { ids: ['old_age_dependency_ratio'], terms: ['envejecimiento', 'envejecida', 'personas mayores', 'dependencia de mayores', 'mayores de 65', 'sociedad envejecida', 'personas mayores por cada 100', 'personas mayores por cada cien', 'edad laboral', 'edad de trabajar', 'dependencia demografica', 'ratio de dependencia'] },
  { ids: ['old_age_survivors_benefits_per_capita'], terms: ['pensiones', 'pension', 'jubilacion', 'jubilados', 'prestaciones de vejez', 'gasto en pensiones', 'gasto de jubilacion'] },
  { ids: ['temporary_employment_rate'], terms: ['temporalidad', 'contratos temporales', 'empleo temporal', 'precariedad laboral'] },
  { ids: ['median_equivalised_income'], terms: ['nivel de vida', 'capacidad de ahorro', 'ahorro de las familias', 'renta disponible'] },
  { ids: ['cpi_index'], terms: ['cesta de la compra', 'precio de servicios basicos', 'coste de vida'] },
  { ids: ['household_electricity_price'], terms: ['precio mayorista', 'contratos de consumidores', 'precio de la luz'] },
  { ids: ['older_population_share'], terms: ['poblacion de 65 anos o mas', 'porcentaje de personas mayores', 'personas de mas de 65', 'proporcion de mayores', 'poblacion mayor'] },
  { ids: ['young_population_share'], terms: ['poblacion de 0 a 14 anos', 'menores de 15', 'poblacion infantil', 'porcentaje de ninos', 'proporcion de menores', 'poblacion menos anos', 'porcentaje poblacion menos anos', 'menos de quince anos'] },
  { ids: ['population_change_rate'], terms: ['crecimiento demografico', 'crecimiento poblacional', 'esta creciendo o bajando la poblacion', 'cambio anual de habitantes', 'tasa de variacion demografica', 'variacion de poblacion', 'variacion demografica', 'crecimiento de la poblacion', 'crece la poblacion', 'esta creciendo', 'la poblacion esta creciendo', 'poblacion creciendo', 'pierde poblacion', 'perdiendo poblacion', 'espana esta perdiendo poblacion', 'despoblacion', 'cambio demografico', 'cambio poblacional'] },
  { ids: ['resident_population'], terms: ['poblacion residente', 'residentes en espana', 'habitantes de espana', 'habitantes viven en espana', 'habitantes viven normalmente en espana', 'habitantes viven normalmente espana', 'cuantos habitantes viven normalmente espana', 'millones de habitantes', 'millones habitantes', 'espana millones habitantes', 'cuantos habitantes hay', 'numero de habitantes'] },
  { ids: ['regional_population_density'], terms: ['densidad de poblacion', 'densidad poblacion', 'densidad demografica', 'habitantes por kilometro cuadrado', 'personas por kilometro cuadrado', 'personas por km2', 'personas por km²', 'densidad de las comunidades', 'densidad regional', 'comunidades mas densas', 'region mas densa'] },
  { ids: ['foreign_born_population'], terms: ['nacidos fuera de espana', 'nacidos en el extranjero', 'ha aumentado el numero de residentes nacidos fuera', 'residentes españoles clasificados por pais de nacimiento', 'residentes por pais de nacimiento', 'poblacion nacida fuera', 'personas nacidas fuera', 'residentes nacieron fuera', 'poblacion inmigrante por pais de nacimiento', 'poblacion inmigrante segun su pais de nacimiento', 'inmigrantes segun pais de nacimiento'] },
  { ids: ['foreign_citizenship_population'], terms: ['poblacion extranjera', 'poblacion con nacionalidad extranjera', 'personas con nacionalidad extranjera', 'ciudadania extranjera', 'nacionalidad extranjera', 'extranjeros por nacionalidad', 'residentes extranjeros por nacionalidad', 'cuantos extranjeros viven en espana'] },
  { ids: ['immigration_flows'], terms: ['llegadas de inmigrantes', 'llegan mas inmigrantes', 'cada vez llegan mas inmigrantes', 'aumentan las llegadas de inmigrantes', 'personas inmigraron', 'flujos migratorios', 'entradas de inmigrantes', 'inmigracion anual'] },
  // This source is category-level. Keep the route explicit: generic
  // “inseguridad” and immigration-causality wording must not silently attach
  // one arbitrary offence category to the user's claim.
  { ids: ['recorded_offences'], terms: ['criminalidad', 'criminalidad registrada', 'delincuencia registrada', 'delitos registrados', 'delitos registra', 'infracciones penales conocidas', 'evolucion de la criminalidad', 'evolucion de la delincuencia', 'criminalidad aumenta', 'criminalidad sube', 'criminalidad baja', 'criminalidad disminuye', 'homicidios registrados', 'asesinatos registrados', 'robos registrados', 'hurtos registrados', 'fraudes registrados', 'estafas registradas', 'agresiones sexuales registradas', 'violencia sexual registrada', 'corrupcion registrada'] },
  { ids: ['gini_coefficient'], terms: ['gini', 'desigualdad de ingresos', 'como se reparte la renta entre los hogares', 'medida de desigualdad de ingresos', 'desigualdad', 'distribucion de la renta'] },
  { ids: ['gini_coefficient_europe'], terms: ['gini frente a europa', 'gini frente a la union europea', 'desigualdad de ingresos frente a europa', 'desigualdad de ingresos frente a la union europea', 'espana es mas desigual que europa', 'espana es menos desigual que europa', 'comparacion europea de la desigualdad', 'desigualdad europa'] },
  { ids: ['government_deficit_ratio'], terms: ['deficit publico', 'deficit del estado', 'superavit publico', 'deficit sobre pib'] },
  { ids: ['government_deficit_ratio_europe'], terms: ['deficit publico frente a europa', 'deficit publico frente a la union europea', 'deficit de espana frente a europa', 'espana tiene menos deficit que europa', 'espana tiene mas deficit que europa', 'saldo presupuestario frente a europa', 'comparacion europea del deficit'] },
  { ids: ['median_equivalised_income'], terms: ['renta mediana', 'ingresos medianos', 'renta disponible', 'ingresos de los hogares', 'renta de las familias', 'ingresos medianos de las familias', 'cuanto ingresan los hogares', 'cuanto ingresan de media los hogares'] },
  { ids: ['median_equivalised_income_europe'], terms: ['renta mediana frente a europa', 'renta mediana frente a la union europea', 'como queda la renta mediana de espana frente a europa', 'hogares españoles tienen menos renta mediana que la ue', 'comparacion europea de los ingresos medianos', 'ingresos de los hogares frente a europa', 'ingresos de los hogares frente a la union europea', 'espana tiene mas renta que europa', 'espana tiene menos renta que europa', 'espana tiene mas renta mediana que europa', 'espana tiene menos renta mediana que europa', 'espana tiene mas renta que la union europea', 'espana tiene menos renta que la union europea', 'espana tiene mas renta mediana que la union europea', 'espana tiene menos renta mediana que la union europea', 'ingresos medianos frente a europa', 'ingresos medianos frente a la union europea', 'ingresos medianos que europa', 'ingresos medianos que la union europea', 'renta de espana frente a europa', 'renta europa'] },
  { ids: ['arope_rate_europe'], terms: ['arope frente a europa', 'arope frente a la union europea', 'riesgo de pobreza frente a europa', 'riesgo de pobreza frente a la union europea', 'riesgo de pobreza o exclusion que la union europea', 'pobreza o exclusion frente a europa', 'pobreza o exclusion frente a la union europea', 'espana tiene mas riesgo de pobreza que europa', 'espana tiene mas riesgo de pobreza que la union europea', 'espana tiene menos riesgo de pobreza que europa', 'espana tiene menos riesgo de pobreza que la union europea', 'comparacion europea de arope', 'arope europa'] },
  { ids: ['arope_rate'], terms: ['arope', 'riesgo de pobreza o exclusion', 'riesgo de pobreza y exclusion', 'pobreza o exclusion social', 'porcentaje en riesgo de pobreza', 'personas en riesgo de pobreza', 'porcentaje residentes arope', 'residentes arope'] },
  { ids: ['cpi_index'], terms: ['coste de vida', 'cesta', 'cesta de la compra', 'precios de consumo'] },
  { ids: ['house_price_index'], terms: ['casas mas caras', 'casas son mas caras', 'casas mucho mas caras', 'casas son mucho mas caras', 'precio de las casas', 'precios de las casas', 'precio vivienda', 'precios vivienda', 'vivienda precio', 'vivienda precios', 'precio vivienda espana', 'comprar una casa', 'precio de comprar una casa', 'comprar vivienda', 'vivienda que compre', 'vivienda cuesta', 'precio en los ultimos anos', 'precio en los ultimos cinco anos'] },
];

export const preferredMetricIdsForQuery = (query) => {
  const normalized = normalise(query);
  const preferred = new Set(metricHints
    .filter((hint) => hint.terms.some((term) => normalized.includes(normalise(term))))
    .flatMap((hint) => hint.ids));
  // Registry aliases are deliberately a fallback. Explicit conversational
  // rules above win whenever they recognise the query; otherwise a newly
  // registered metric can answer paraphrases immediately.
  if (!preferred.size) {
    for (const id of registryMetricIdsForQuery(normalized)) preferred.add(id);
  }
  const hasEuropeReference = /\b(?:europa|europeo|europea|europeos|europeas|ue|union europea)\b/.test(normalized);
  const hasAny = (...terms) => terms.some((term) => normalized.includes(normalise(term)));
  if (hasEuropeReference) {
    const comparisonMetric = comparisonMetricIdsForQuery(normalized);
    for (const id of comparisonMetric) preferred.add(id);
  }
  // Comparative adjectives frequently replace the explicit “frente a
  // Europa” wording: “el PIB por persona es menor que el europeo”. Keep the
  // subject requirement strict so a bare “europeo” cannot route arbitrary
  // claims to a GDP series.
  if (hasEuropeReference && hasAny('pib', 'producto interior bruto') && hasAny('habitante', 'persona', 'per capita')) preferred.add('gdp_per_capita_europe');
  // Phrase aliases are deliberately conservative, but users often reorder
  // Spanish comparison wording (“comparación europea del empleo parcial”,
  // “el abandono educativo supera al europeo”). Recover the comparison family
  // from its subject plus the Europe marker before semantic retrieval can
  // promote a Spain-only neighbour.
  if (hasEuropeReference && hasAny('parcial', 'jornada parcial', 'tiempo parcial') && hasAny('empleo', 'trabajo', 'jornada')) preferred.add('part_time_employment_rate_europe');
  if (hasEuropeReference && hasAny('temporal', 'temporalidad', 'duracion determinada') && hasAny('empleo', 'trabajo', 'contrato')) preferred.add('temporary_employment_rate_europe');
  if (hasAny('juvenil', 'joven', 'jovenes') && hasAny('paro', 'desempleo', 'no encuentra trabajo', 'no encuentran trabajo', 'sin trabajo')) {
    preferred.add('youth_unemployment_rate');
    preferred.delete('employment_rate');
    preferred.delete('unemployment_rate');
  }
  // Bare conversational forms such as “el paro baja” still identify the
  // unemployment family even when they omit the catalogue phrase “tasa de
  // desempleo”. Youth-specific wording above narrows this afterwards.
  if (hasAny('paro', 'desempleo') && !hasAny('juvenil', 'joven', 'jovenes')) preferred.add('unemployment_rate');
  if (hasEuropeReference && hasAny('juvenil', 'joven', 'jovenes') && hasAny('paro', 'desempleo')) preferred.add('youth_unemployment_rate_europe');
  if (hasEuropeReference && !hasAny('juvenil', 'joven', 'jovenes') && hasAny('paro', 'desempleo')) preferred.add('unemployment_rate_europe');
  // Conversational Spanish often describes unemployment without naming it:
  // “cuesta encontrar trabajo” / “hay menos gente trabajando”. Resolve the
  // shared metric family from the concept plus the comparison dimension.
  if (hasEuropeReference && hasAny('encontrar trabajo', 'encontrar empleo', 'sin trabajo', 'personas trabajando', 'tener trabajo', 'tiene trabajo')) {
    preferred.add('unemployment_rate_europe');
    preferred.delete('employment_rate_europe');
    preferred.delete('employment_rate');
  }
  // Resolve ordinary descriptions of the same registered concepts even when
  // the user does not use the catalogue vocabulary.
  if (hasAny('poblacion', 'personas', 'sociedad') && hasAny('mayor', 'mayores', 'envejec', 'ancian', 'edad')) preferred.add('older_population_share');
  if (hasAny('recauda', 'recaudacion', 'ingresos') && hasAny('economia', 'pib', 'parte', 'proporcion', 'porcentaje')) preferred.add('government_revenue_ratio');
  if (hasAny('familias', 'hogares', 'personas') && hasAny('vivienda', 'alquiler', 'casa') && hasAny('dinero', 'gasto', 'coste', 'esfuerzo', 'destinan')) preferred.add('housing_cost_overburden_rate');
  if (hasAny('sanidad', 'salud') && hasAny('recursos', 'dinero', 'persona', 'habitante', 'dedica', 'gasta')) preferred.add('health_expenditure_per_capita');
  if (hasAny('urgencias', 'urgencia') && hasAny('espera', 'esperar', 'tarda', 'tiempo')) {
    preferred.add('emergency_wait_declared');
    preferred.delete('unmet_healthcare_waiting_list_rate');
    preferred.delete('unmet_healthcare_waiting_list_rate_europe');
  }
  if (hasEuropeReference && hasAny('economia', 'crece', 'crecimiento', 'pib') && hasAny('despacio', 'rapido', 'ritmo', 'crecimiento')) preferred.add('gdp_real_growth_europe');
  if (hasEuropeReference && hasAny('salario', 'sueldo', 'cobra', 'paga') && hasAny('hora', 'horas', 'inferior', 'superior', 'menos', 'mas')) {
    preferred.add('median_hourly_earnings_europe');
    preferred.delete('median_hourly_earnings');
  }
  // “La luz para las familias” is a household electricity request even when
  // the sentence compares it with the general cost of living. Keep the
  // dedicated series ahead of the generic CPI family.
  if (hasAny('luz para las familias', 'factura de la luz', 'electricidad para las familias') && hasAny('sube', 'subida', 'cara', 'coste', 'precio')) {
    preferred.add('household_electricity_price');
    preferred.delete('cpi_index');
  }
  // Word order varies substantially in short Spanish questions (“ha
  // cambiado precio luz hogares”). Require the same subject and price
  // signals, but do not require the catalogue phrase to appear contiguously.
  if (hasAny('luz', 'electricidad') && hasAny('hogar', 'hogares', 'familia', 'familias')
    && hasAny('precio', 'cambiado', 'cambio', 'subido', 'sube', 'coste', 'factura', 'tarifa')) {
    preferred.add('household_electricity_price');
    preferred.delete('cpi_index');
  }
  if (hasEuropeReference && hasAny('abandono', 'escolar', 'educativo', 'estudios')) preferred.add('early_school_leaving_rate_europe');
  if (hasEuropeReference && hasAny('universitari', 'graduad', 'titulad', 'titulacion', 'estudios superiores', 'educacion superior')) preferred.add('tertiary_education_attainment_rate_europe');
  if (hasAny('educacion', 'educativo', 'educativa') && hasAny('gasto', 'gasta', 'presupuesto', 'inversion', 'invierte', 'porcentaje del pib')) {
    preferred.add(hasEuropeReference ? 'government_education_expenditure_ratio_europe' : 'government_education_expenditure_ratio');
  }
  if (hasEuropeReference && hasAny('arope', 'pobreza', 'exclusion')) preferred.add('arope_rate_europe');
  if (hasEuropeReference && hasAny('lista de espera', 'espera sanitaria', 'necesidades medicas')) preferred.add('unmet_healthcare_waiting_list_rate_europe');
  if (hasEuropeReference && hasAny('electricidad', 'luz', 'kwh', 'kilovatio') && hasAny('precio', 'paga', 'coste', 'factura', 'tarifa')) preferred.add('household_electricity_price_europe');
  if (hasEuropeReference && hasAny('proteccion social', 'prestaciones sociales', 'ayudas sociales', 'gasto social', 'prestaciones publicas') && hasAny('gasto', 'gasta', 'ayudas', 'prestaciones')) preferred.add('social_protection_benefits_per_capita_europe');
  if (hasEuropeReference && hasAny('deficit', 'superavit', 'saldo presupuestario') && hasAny('publico', 'estado', 'pib', 'espana')) preferred.add('government_deficit_ratio_europe');
  if (hasEuropeReference && hasAny('deuda', 'endeudamiento', 'endeudada') && hasAny('publico', 'estado', 'pib', 'espana')) preferred.add('government_debt_ratio_europe');
  if (hasEuropeReference && hasAny('gini', 'desigual', 'desigualdad', 'distribucion de la renta')) preferred.add('gini_coefficient_europe');
  if (hasEuropeReference && hasAny('fecundidad', 'natalidad', 'hijos', 'nacimientos') && hasAny('espana', 'europa', 'union europea')) {
    preferred.add('fertility_rate_europe');
    preferred.delete('fertility_rate');
  }
  // “Ayudas” is too broad to route on its own. Combined with immigration or
  // nationality wording, however, the IMV-by-nationality feed is the only
  // existing direct comparison we can use. The result must still state that
  // the IMV is one benefit and cannot stand in for every public aid.
  if (hasAny('inmigrante', 'inmigrantes', 'extranjero', 'extranjeros', 'nacionalidad') && hasAny('ayuda', 'ayudas', 'prestacion', 'prestaciones', 'imv', 'ingreso minimo vital')) {
    preferred.add('imv_title_holders_by_nationality');
  }
  // “Inflation” can mean either the annual rate or the harmonised index.
  // When the user explicitly asks for European comparability, the index is
  // the intended family and must win over the generic inflation hint.
  if (preferred.has('harmonised_price_index')) {
    preferred.delete('inflation_rate');
    preferred.delete('cpi_index');
  }
  if (preferred.has('unemployment_rate_europe')) preferred.delete('unemployment_rate');
  if (preferred.has('unemployment_rate') && /\b(?:paro|desempleo|no encuentra|no encuentran)\b/.test(normalized)) preferred.delete('employment_rate');
  if (preferred.has('inflation_rate_europe')) {
    preferred.delete('inflation_rate');
    preferred.delete('harmonised_price_index');
  }
  if (preferred.has('employment_rate_europe')) {
    preferred.delete('employment_rate');
    preferred.delete('unemployment_rate_europe');
  }
  if (preferred.has('part_time_employment_rate_europe')) {
    preferred.delete('part_time_employment_rate');
    preferred.delete('employment_rate');
    preferred.delete('employment_rate_europe');
    preferred.delete('unemployment_rate');
    preferred.delete('unemployment_rate_europe');
  }
  if (preferred.has('part_time_employment_rate')) {
    preferred.delete('employment_rate');
    preferred.delete('employment_rate_europe');
    preferred.delete('unemployment_rate');
    preferred.delete('unemployment_rate_europe');
  }
  if (preferred.has('temporary_employment_rate_europe')) {
    preferred.delete('temporary_employment_rate');
    preferred.delete('employment_rate');
    preferred.delete('employment_rate_europe');
    preferred.delete('unemployment_rate');
    preferred.delete('unemployment_rate_europe');
  }
  if (preferred.has('temporary_employment_rate')) {
    preferred.delete('employment_rate');
    preferred.delete('employment_rate_europe');
    preferred.delete('unemployment_rate');
    preferred.delete('unemployment_rate_europe');
  }
  if (preferred.has('median_hourly_earnings_europe')) {
    preferred.delete('median_hourly_earnings');
    preferred.delete('employment_rate_europe');
    preferred.delete('unemployment_rate_europe');
  }
  if (preferred.has('median_hourly_earnings')) {
    preferred.delete('employment_rate');
    preferred.delete('unemployment_rate');
  }
  if (preferred.has('housing_cost_overburden_rate_europe')) {
    preferred.delete('housing_cost_overburden_rate');
  }
  if (preferred.has('youth_unemployment_rate_europe')) {
    preferred.delete('youth_unemployment_rate');
    preferred.delete('unemployment_rate_europe');
    preferred.delete('unemployment_rate');
    preferred.delete('employment_rate_europe');
    preferred.delete('employment_rate');
  }
  if (preferred.has('early_school_leaving_rate_europe')) {
    preferred.delete('early_school_leaving_rate');
    preferred.delete('youth_unemployment_rate');
    preferred.delete('tertiary_education_attainment_rate');
    preferred.delete('neet_rate');
    preferred.delete('neet_rate_europe');
  }
  if (preferred.has('tertiary_education_attainment_rate_europe')) {
    preferred.delete('tertiary_education_attainment_rate');
    preferred.delete('early_school_leaving_rate');
    preferred.delete('early_school_leaving_rate_europe');
    preferred.delete('neet_rate');
    preferred.delete('neet_rate_europe');
    preferred.delete('youth_unemployment_rate');
    preferred.delete('youth_unemployment_rate_europe');
  }
  if (preferred.has('neet_rate_europe')) {
    preferred.delete('neet_rate');
    preferred.delete('early_school_leaving_rate');
    preferred.delete('early_school_leaving_rate_europe');
    preferred.delete('youth_unemployment_rate');
    preferred.delete('youth_unemployment_rate_europe');
  }
  if (preferred.has('arope_rate_europe')) preferred.delete('arope_rate');
  if (preferred.has('life_expectancy_at_birth_europe')) preferred.delete('life_expectancy_at_birth');
  if (preferred.has('government_revenue_ratio_europe')) preferred.delete('government_revenue_ratio');
  if (preferred.has('government_deficit_ratio_europe')) preferred.delete('government_deficit_ratio');
  if (preferred.has('government_debt_ratio_europe')) {
    preferred.delete('government_debt_ratio');
    preferred.delete('government_debt_current_prices');
    preferred.delete('government_deficit_ratio_europe');
  }
  if (preferred.has('gini_coefficient_europe')) preferred.delete('gini_coefficient');
  if (preferred.has('government_education_expenditure_ratio_europe')) {
    preferred.delete('government_education_expenditure_ratio');
    preferred.delete('government_expenditure_ratio');
    preferred.delete('government_expenditure_ratio_europe');
    preferred.delete('government_revenue_ratio');
    preferred.delete('government_revenue_ratio_europe');
  }
  if (preferred.has('government_education_expenditure_ratio')) {
    preferred.delete('government_expenditure_ratio');
    preferred.delete('government_expenditure_ratio_europe');
    preferred.delete('government_revenue_ratio');
    preferred.delete('government_revenue_ratio_europe');
  }
  if (preferred.has('government_current_taxes_income_wealth_europe')) {
    preferred.delete('government_revenue_ratio');
    preferred.delete('government_revenue_ratio_europe');
    preferred.delete('government_expenditure_ratio');
    preferred.delete('government_expenditure_ratio_europe');
    preferred.delete('median_equivalised_income_europe');
  }
  if (preferred.has('government_expenditure_ratio_europe')) preferred.delete('government_expenditure_ratio');
  if (preferred.has('health_expenditure_per_capita_europe')) preferred.delete('health_expenditure_per_capita');
  if (preferred.has('household_electricity_price_europe')) preferred.delete('household_electricity_price');
  if (preferred.has('government_debt_current_prices')) preferred.delete('government_debt_ratio');
  if (preferred.has('median_equivalised_income_europe')) preferred.delete('median_equivalised_income');
  if (preferred.has('youth_unemployment_rate')) preferred.delete('unemployment_rate');
  if (preferred.has('youth_unemployment_rate')) preferred.delete('employment_rate');
  if (preferred.has('older_population_share') && /\b(?:porcentaje|proporcion|65 anos|65 o mas)\b/.test(normalized)) preferred.delete('old_age_dependency_ratio');
  const dependencyWording = /(?:por cada (?:100|cien)|edad laboral|edad de trabajar|dependencia demografica|ratio de dependencia)/.test(normalized);
  if (dependencyWording && preferred.has('old_age_dependency_ratio')) preferred.delete('older_population_share');
  if (preferred.has('early_school_leaving_rate') || preferred.has('tertiary_education_attainment_rate')) preferred.delete('youth_unemployment_rate');
  if (preferred.has('unmet_healthcare_waiting_list_rate') || preferred.has('unmet_healthcare_waiting_list_rate_europe')) preferred.delete('health_expenditure_per_capita');
  if (preferred.has('unmet_healthcare_waiting_list_rate_europe')) preferred.delete('unmet_healthcare_waiting_list_rate');
  if (preferred.has('gdp_per_capita_current_prices')) preferred.delete('gdp_current_prices');
  if (preferred.has('gdp_per_capita_europe')) {
    preferred.delete('gdp_per_capita_current_prices');
    preferred.delete('gdp_current_prices');
  }
  if (preferred.has('minimum_wage_monthly')) {
    preferred.delete('median_equivalised_income');
    preferred.delete('employment_rate');
    preferred.delete('unemployment_rate');
  }
  if (preferred.has('foreign_citizenship_population')) {
    preferred.delete('foreign_born_population');
    preferred.delete('immigration_flows');
    preferred.delete('resident_population');
  }
  if (preferred.has('foreign_born_population')) {
    preferred.delete('resident_population');
    preferred.delete('immigration_flows');
  }
  if (preferred.has('social_protection_benefits_per_capita')) {
    preferred.delete('government_expenditure_ratio');
    preferred.delete('health_expenditure_per_capita');
    preferred.delete('median_equivalised_income');
  }
  if (preferred.has('social_protection_benefits_per_capita_europe')) {
    preferred.delete('social_protection_benefits_per_capita');
    preferred.delete('government_expenditure_ratio');
    preferred.delete('health_expenditure_per_capita');
    preferred.delete('median_equivalised_income');
  }
  if (preferred.has('old_age_survivors_benefits_per_capita')) {
    preferred.delete('social_protection_benefits_per_capita');
    preferred.delete('government_expenditure_ratio');
    preferred.delete('health_expenditure_per_capita');
    preferred.delete('median_equivalised_income');
  }
  // A compound pension claim must retain the independent demographic and
  // public-finance dimensions. The pension-spending family alone cannot
  // answer whether ageing is increasing dependency or whether the public
  // accounts are deteriorating.
  const hasDemographicPensionContext = hasAny('arbol demografico', 'estructura demografica', 'demografia', 'envejecimiento', 'cotizantes', 'edad de trabajar')
    && hasAny('pension', 'jubilacion', 'cotizacion', 'arcas publicas', 'sostenible', 'insostenible', 'deficit');
  if (hasDemographicPensionContext) {
    preferred.add('old_age_dependency_ratio');
    if (hasAny('arcas publicas', 'deficit', 'deuda', 'presupuesto')) {
      preferred.add('government_deficit_ratio');
      preferred.add('government_debt_ratio');
    }
  }
  if (preferred.has('old_age_survivors_benefits_per_capita_europe')) {
    preferred.delete('old_age_survivors_benefits_per_capita');
    preferred.delete('social_protection_benefits_per_capita');
    preferred.delete('government_expenditure_ratio');
    preferred.delete('health_expenditure_per_capita');
    preferred.delete('median_equivalised_income');
  }
  if (preferred.has('government_debt_current_prices')) preferred.delete('government_debt_ratio');
  if (preferred.has('gdp_real_growth_europe')) preferred.delete('gdp_real_growth_quarterly');
  if (preferred.has('inflation_rate_europe')) {
    preferred.delete('inflation_rate');
    preferred.delete('cpi_index');
    preferred.delete('harmonised_price_index');
  }
  // A qualitative judgement is not automatically a request for the nearest
  // numeric series. “Spain charges too many taxes” needs a definition or a
  // comparison before a tax metric can answer it; otherwise the warehouse
  // would produce a precise-looking answer to an underspecified claim. This
  // rule is structural and applies to equivalent wording, not to one claim
  // alias. Concrete comparison, denominator, period, or amount language keeps
  // the metric route enabled.
  const vagueJudgement = /\b(?:demasiad[oa]s?|excesiv[oa]s?|insostenible|infierno fiscal|se come todo el sueldo|asfixia(?:nte)?|por las nubes)\b/.test(normalized);
  const concreteMetricQualifier = /\b(?:europa|europe|ue|porcentaje|proporcion|pib|habitante|persona|hogar|familia|periodo|ano|anos|desde|entre|frente|comparad|comparar|cuant[oa]s?|millones?|euros?|%|\d)\b/.test(normalized);
  if (vagueJudgement && !concreteMetricQualifier) {
    for (const id of ['government_current_taxes_income_wealth_europe', 'government_revenue_ratio', 'government_revenue_ratio_europe', 'government_expenditure_ratio', 'government_expenditure_ratio_europe']) preferred.delete(id);
  }
  return preferred;
};

export const excludedMetricIdsForQuery = (query) => {
  const normalized = normalise(query);
  const preferred = preferredMetricIdsForQuery(query);
  const youthRequested = ['paro juvenil', 'desempleo juvenil', 'jovenes sin trabajo', 'jovenes activos', '15-24'].some((term) => normalized.includes(normalise(term)));
  const earlyEducationRequested = metricHints.find((hint) => hint.ids.includes('early_school_leaving_rate'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const earlyEducationEuropeRequested = preferred.has('early_school_leaving_rate_europe');
  const tertiaryEducationRequested = metricHints.find((hint) => hint.ids.includes('tertiary_education_attainment_rate'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const tertiaryEducationEuropeRequested = preferred.has('tertiary_education_attainment_rate_europe');
  const neetRequested = metricHints.find((hint) => hint.ids.includes('neet_rate'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const neetEuropeRequested = preferred.has('neet_rate_europe');
  const aropeRequested = metricHints.find((hint) => hint.ids.includes('arope_rate'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const aropeEuropeRequested = preferred.has('arope_rate_europe');
  const lifeExpectancyRequested = metricHints.find((hint) => hint.ids.includes('life_expectancy_at_birth'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const lifeExpectancyEuropeRequested = preferred.has('life_expectancy_at_birth_europe');
  const educationContext = ['educacion', 'educativo', 'estudios', 'escolar', 'universitari', 'titulacion', 'formacion'].some((term) => normalized.includes(term));
  const educationSpendRequested = preferred.has('government_education_expenditure_ratio') || preferred.has('government_education_expenditure_ratio_europe');
  const genericUnemployment = ['paro', 'desemple', 'unemployment', 'encuentra trabajo', 'sin trabajo', 'no trabaja'].some((term) => normalized.includes(term));
  const employmentEuropeRequested = preferred.has('employment_rate_europe');
  const healthSpendRequested = metricHints.find((hint) => hint.ids.includes('health_expenditure_per_capita'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const healthSpendEuropeRequested = preferred.has('health_expenditure_per_capita_europe');
  const unmetWaitingListRequested = metricHints.find((hint) => hint.ids.includes('unmet_healthcare_waiting_list_rate'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const unmetWaitingListEuropeRequested = preferred.has('unmet_healthcare_waiting_list_rate_europe');
  const householdElectricityRequested = metricHints.find((hint) => hint.ids.includes('household_electricity_price'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const householdElectricityEuropeRequested = preferred.has('household_electricity_price_europe');
  const vagueHealthOutcome = ['colaps', 'lista de espera', 'espera sanitaria', 'acceso a la sanidad', 'calidad de la sanidad', 'personal sanitario'].some((term) => normalized.includes(term));
  const populationChangeRequested = metricHints.find((hint) => hint.ids.includes('population_change_rate'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const inflationRequested = metricHints.find((hint) => hint.ids.includes('inflation_rate'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const recordedOffencesRequested = metricHints.find((hint) => hint.ids.includes('recorded_offences'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const crimeContext = ['insegur', 'delinc', 'criminal', 'crimen', 'delito', 'seguridad', 'homicid', 'asesinat', 'robo', 'fraude', 'corrup'].some((term) => normalized.includes(term));
  const localOrCausalCrime = ['inseguridad', 'inseguro', 'insegura', 'barrio', 'municipio', 'zona', 'inmigr', 'nacionalidad', 'caus', 'crea', 'provoc', 'culpa'].some((term) => normalized.includes(term));
  const demographicContext = ['poblacion', 'demograf', 'inmigr', 'migracion', 'despobl', 'habitantes', 'natalidad', 'fecundidad', 'envejec'].some((term) => normalized.includes(term));
  const broadSubjectivePoliticalClaim = ['destruy', 'hundiendo', 'arruinando', 'fatal'].some((term) => normalized.includes(term))
    && ['espana', 'pais', 'gobierno', 'sanchez', 'politic'].some((term) => normalized.includes(term));
  const priceContext = ['precio', 'precios', 'coste', 'cesta', 'ipc', 'electricidad', 'luz', 'alquiler'].some((term) => normalized.includes(term));
  const excluded = new Set();
  if (genericUnemployment && !youthRequested) excluded.add('youth_unemployment_rate');
  if (employmentEuropeRequested) excluded.add('employment_rate');
  if (educationContext && !youthRequested) excluded.add('youth_unemployment_rate');
  if (educationContext && !tertiaryEducationRequested) excluded.add('tertiary_education_attainment_rate');
  if (educationContext && !tertiaryEducationEuropeRequested) excluded.add('tertiary_education_attainment_rate_europe');
  if (educationContext && !earlyEducationRequested) excluded.add('early_school_leaving_rate');
  if (educationContext && !earlyEducationEuropeRequested) excluded.add('early_school_leaving_rate_europe');
  if (educationContext && !neetRequested) excluded.add('neet_rate');
  if (educationContext && !neetEuropeRequested) excluded.add('neet_rate_europe');
  if (educationContext && !educationSpendRequested) {
    excluded.add('government_education_expenditure_ratio');
    excluded.add('government_education_expenditure_ratio_europe');
  }
  if (neetRequested && !neetEuropeRequested) excluded.add('neet_rate_europe');
  if (tertiaryEducationEuropeRequested) excluded.add('tertiary_education_attainment_rate');
  if (aropeEuropeRequested) excluded.add('arope_rate');
  if (aropeRequested && !aropeEuropeRequested) excluded.add('arope_rate_europe');
  if (lifeExpectancyEuropeRequested) excluded.add('life_expectancy_at_birth');
  if (lifeExpectancyRequested && !lifeExpectancyEuropeRequested) excluded.add('life_expectancy_at_birth_europe');
  if (preferred.has('fertility_rate_europe')) excluded.add('fertility_rate');
  if (preferred.has('fertility_rate') && !preferred.has('fertility_rate_europe')) excluded.add('fertility_rate_europe');
  // Per-capita spending is useful context, but it cannot answer a broad claim
  // that the health system has collapsed or that access has deteriorated.
  if (vagueHealthOutcome && !healthSpendRequested) excluded.add('health_expenditure_per_capita');
  if (vagueHealthOutcome && !healthSpendEuropeRequested) excluded.add('health_expenditure_per_capita_europe');
  if (vagueHealthOutcome && !unmetWaitingListRequested) excluded.add('unmet_healthcare_waiting_list_rate');
  if (vagueHealthOutcome && !unmetWaitingListEuropeRequested) excluded.add('unmet_healthcare_waiting_list_rate_europe');
  if (unmetWaitingListRequested && !unmetWaitingListEuropeRequested) excluded.add('unmet_healthcare_waiting_list_rate_europe');
  if (householdElectricityEuropeRequested) excluded.add('household_electricity_price');
  if (householdElectricityRequested && !householdElectricityEuropeRequested) excluded.add('household_electricity_price_europe');
  // Total population and population-change rate are different questions. Keep
  // the change series out of generic population, migration, fertility, and
  // out-of-domain matches unless the wording explicitly asks about change.
  if (demographicContext && !populationChangeRequested) excluded.add('population_change_rate');
  // A broad subjective political complaint must not fall through to a nearby
  // demographic series just because it contains “España” or “población”.
  if (broadSubjectivePoliticalClaim) excluded.add('population_change_rate');
  if (priceContext && !inflationRequested) excluded.add('inflation_rate');
  // Recorded offences are useful for an explicit category/trend question,
  // never as a proxy for perceived insecurity, a local anecdote, or a causal
  // claim about immigration.
  if (crimeContext && (!recordedOffencesRequested || localOrCausalCrime)) excluded.add('recorded_offences');
  return excluded;
};
