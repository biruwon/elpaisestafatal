const normalise = (value) => String(value || '')
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ñ/g, 'n')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const metricHints = [
  { ids: ['household_electricity_price'], terms: ['precio de la luz', 'factura de la luz', 'precio de la electricidad', 'coste de la electricidad', 'tarifa electrica', 'electricidad', 'electricidad para las familias', 'luz mas cara'] },
  { ids: ['rental_price_index'], terms: ['precio del alquiler', 'precios del alquiler', 'alquiler', 'alquileres', 'rentas de alquiler', 'alquiler mas caro', 'sube el alquiler'] },
  { ids: ['harmonised_price_index'], terms: ['comparable con europa', 'metodologia europea', 'indice armonizado', 'hicp', 'inflacion comparable'] },
  { ids: ['inflation_rate'], terms: ['inflacion', 'tasa de inflacion', 'inflacion anual', 'subida de precios', 'ritmo de los precios', 'precios aumentan'] },
  { ids: ['gdp_real_growth_quarterly'], terms: ['actividad economica', 'actividad economica cae', 'actividad economica esta cayendo', 'economia cae', 'crecimiento negativo', 'recesion', 'pib real', 'crecimiento del pib', 'crecimiento interanual pib', 'crece el pib'] },
  { ids: ['employment_rate'], terms: ['tasa de empleo', 'tasa de ocupacion', 'personas ocupadas', 'personas que tienen empleo', 'encuentra trabajo', 'tiene empleo', 'ocupacion en espana', 'empleo en espana'] },
  { ids: ['unemployment_rate'], terms: ['tasa de paro', 'tasa de desempleo', 'desempleo en espana', 'paro en espana', 'evolucion del desempleo', 'evolucion del paro', 'no encuentra trabajo', 'no encuentran trabajo', 'personas activas no encuentran trabajo'] },
  { ids: ['unemployment_rate_europe'], terms: ['paro en europa', 'desempleo en europa', 'tasa de paro europea', 'comparacion europea', 'comparar paro europa', 'frente a europa en desempleo', 'paro mas alto de europa', 'paro mas bajo de europa', 'puesto de espana por desempleo'] },
  { ids: ['youth_unemployment_rate'], terms: ['joven', 'juvenil', 'jovenes', 'youth', '15-24'] },
  { ids: ['government_debt_ratio'], terms: ['deuda', 'endeudamiento', 'debt'] },
  { ids: ['government_revenue_ratio'], terms: ['recaudacion', 'recaudación', 'ingresos publicos', 'ingresos públicos', 'ingresos del estado'] },
  { ids: ['government_expenditure_ratio'], terms: ['gasto publico', 'gasto público', 'gasto del estado', 'presupuesto publico', 'presupuesto público'] },
  { ids: ['housing_cost_overburden_rate'], terms: ['sobrecarga', 'coste de la vivienda', 'gastos de vivienda', 'esfuerzo de vivienda', 'sobrecarga coste vivienda', 'hogares soportan el coste de la vivienda', 'porcentaje de hogares soporta'] },
  { ids: ['health_expenditure_per_capita'], terms: ['gasto sanitario', 'gasto en sanidad', 'gasto en salud', 'recursos sanitarios', 'gasto sanitario por habitante', 'gasto por habitante en sanidad', 'gasta en sanidad por habitante', 'gasta sanidad por habitante', 'gasta sanidad habitante', 'cuanto gasta sanidad habitante', 'sanidad por habitante', 'gasto por persona en sanidad', 'cuanto se gasta en sanidad'] },
  { ids: ['life_expectancy_at_birth'], terms: ['esperanza de vida', 'esperanza de vida al nacer', 'años de vida', 'vida media', 'cuantos años vive', 'cuanto vive', 'longevidad'] },
  { ids: ['fertility_rate'], terms: ['fecundidad', 'tasa de fecundidad', 'natalidad', 'tasa de natalidad', 'hijos por mujer', 'nacimientos por mujer'] },
  { ids: ['old_age_dependency_ratio'], terms: ['envejecimiento', 'envejecida', 'personas mayores', 'dependencia de mayores', 'mayores de 65', 'sociedad envejecida'] },
  { ids: ['older_population_share'], terms: ['poblacion de 65 anos o mas', 'porcentaje de personas mayores', 'personas de mas de 65', 'proporcion de mayores', 'poblacion mayor'] },
  { ids: ['young_population_share'], terms: ['poblacion de 0 a 14 anos', 'menores de 15', 'poblacion infantil', 'porcentaje de ninos', 'proporcion de menores'] },
  { ids: ['population_change_rate'], terms: ['crecimiento demografico', 'crecimiento poblacional', 'variacion de poblacion', 'variacion demografica', 'crecimiento de la poblacion', 'crece la poblacion', 'esta creciendo', 'la poblacion esta creciendo', 'poblacion creciendo', 'pierde poblacion', 'perdiendo poblacion', 'espana esta perdiendo poblacion', 'despoblacion', 'cambio demografico', 'cambio poblacional'] },
  { ids: ['resident_population'], terms: ['poblacion residente', 'residentes en espana', 'habitantes de espana', 'habitantes viven en espana', 'habitantes viven normalmente en espana', 'millones de habitantes', 'cuantos habitantes hay', 'numero de habitantes'] },
  { ids: ['foreign_born_population'], terms: ['nacidos fuera de espana', 'nacidos en el extranjero', 'poblacion nacida fuera', 'personas nacidas fuera', 'residentes nacieron fuera', 'poblacion inmigrante por pais de nacimiento'] },
  { ids: ['immigration_flows'], terms: ['llegadas de inmigrantes', 'personas inmigraron', 'flujos migratorios', 'entradas de inmigrantes', 'inmigracion anual'] },
  // This source is category-level. Keep the route explicit: generic
  // “inseguridad” and immigration-causality wording must not silently attach
  // one arbitrary offence category to the user's claim.
  { ids: ['recorded_offences'], terms: ['criminalidad registrada', 'delincuencia registrada', 'delitos registrados', 'delitos registra', 'infracciones penales conocidas', 'evolucion de la criminalidad', 'evolucion de la delincuencia', 'criminalidad aumenta', 'criminalidad sube', 'criminalidad baja', 'criminalidad disminuye', 'homicidios registrados', 'asesinatos registrados', 'robos registrados', 'fraudes registrados', 'corrupcion registrada'] },
  { ids: ['gini_coefficient'], terms: ['gini', 'desigualdad de ingresos', 'desigualdad', 'distribucion de la renta'] },
  { ids: ['government_deficit_ratio'], terms: ['deficit publico', 'deficit del estado', 'superavit publico', 'deficit sobre pib'] },
  { ids: ['median_equivalised_income'], terms: ['renta mediana', 'ingresos medianos', 'renta disponible', 'ingresos de los hogares'] },
  { ids: ['arope_rate'], terms: ['arope', 'riesgo de pobreza o exclusion', 'riesgo de pobreza y exclusion', 'pobreza o exclusion social', 'porcentaje en riesgo de pobreza', 'personas en riesgo de pobreza', 'porcentaje residentes arope', 'residentes arope'] },
  { ids: ['cpi_index'], terms: ['coste de vida', 'cesta de la compra', 'precios de consumo'] },
  { ids: ['house_price_index'], terms: ['casas mas caras', 'casas son mas caras', 'casas mucho mas caras', 'casas son mucho mas caras', 'precio de las casas', 'precios de las casas', 'precio vivienda', 'precios vivienda', 'vivienda precio', 'vivienda precios', 'precio vivienda espana', 'comprar una casa', 'precio de comprar una casa', 'comprar vivienda'] },
];

export const preferredMetricIdsForQuery = (query) => {
  const normalized = normalise(query);
  const preferred = new Set(metricHints
    .filter((hint) => hint.terms.some((term) => normalized.includes(normalise(term))))
    .flatMap((hint) => hint.ids));
  // “Inflation” can mean either the annual rate or the harmonised index.
  // When the user explicitly asks for European comparability, the index is
  // the intended family and must win over the generic inflation hint.
  if (preferred.has('harmonised_price_index')) {
    preferred.delete('inflation_rate');
    preferred.delete('cpi_index');
  }
  if (preferred.has('unemployment_rate_europe')) preferred.delete('unemployment_rate');
  if (preferred.has('youth_unemployment_rate')) preferred.delete('unemployment_rate');
  if (preferred.has('youth_unemployment_rate')) preferred.delete('employment_rate');
  return preferred;
};

export const excludedMetricIdsForQuery = (query) => {
  const normalized = normalise(query);
  const youthRequested = metricHints.find((hint) => hint.ids.includes('youth_unemployment_rate'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const genericUnemployment = ['paro', 'desemple', 'unemployment', 'encuentra trabajo', 'sin trabajo', 'no trabaja'].some((term) => normalized.includes(term));
  const healthSpendRequested = metricHints.find((hint) => hint.ids.includes('health_expenditure_per_capita'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
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
  // Per-capita spending is useful context, but it cannot answer a broad claim
  // that the health system has collapsed or that access has deteriorated.
  if (vagueHealthOutcome && !healthSpendRequested) excluded.add('health_expenditure_per_capita');
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
