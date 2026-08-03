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
  { ids: ['inflation_rate_europe'], terms: ['inflacion de espana frente a europa', 'inflacion de espana por encima de europa', 'inflacion de espana por encima de la union europea', 'inflacion frente a europa', 'inflacion frente a la union europea', 'inflacion espanola mas alta que europa', 'inflacion espanola mas alta que la union europea', 'inflacion mas alta que europa', 'inflacion mas baja que europa', 'precios suben mas que europa', 'inflacion comparable con europa', 'inflacion comparable europa'] },
  { ids: ['gdp_current_prices'], terms: ['pib nominal', 'pib a precios corrientes', 'tamano de la economia', 'valor del pib', 'producto interior bruto en euros', 'produccion economica nacional'] },
  { ids: ['gdp_per_capita_current_prices'], terms: ['pib por habitante', 'pib per capita', 'producto interior bruto por persona', 'economia por habitante', 'pib por persona'] },
  { ids: ['gdp_per_capita_europe'], terms: ['pib por habitante frente a europa', 'pib por habitante frente a la union europea', 'pib per capita frente a europa', 'pib per capita frente a la union europea', 'espana tiene mas pib por habitante que europa', 'espana tiene menos pib por habitante que europa', 'espana tiene mas pib por habitante que la union europea', 'espana tiene menos pib por habitante que la union europea', 'tiene espana mas pib por habitante que europa', 'tiene espana menos pib por habitante que europa', 'tiene espana mas pib por habitante que la union europea', 'tiene espana menos pib por habitante que la union europea', 'pib por habitante que la union europea', 'pib por persona frente a europa', 'pib por persona frente a la union europea', 'pib europa por habitante', 'pib europa por persona'] },
  { ids: ['gdp_real_growth_quarterly'], terms: ['actividad economica', 'actividad economica cae', 'actividad economica esta cayendo', 'economia cae', 'crecimiento negativo', 'recesion', 'pib real', 'crecimiento del pib', 'crecimiento interanual pib', 'crece el pib'] },
  { ids: ['gdp_real_growth_europe'], terms: ['pib real frente a europa', 'crecimiento del pib frente a europa', 'crece espana mas que europa', 'crece espana mas que la union europea', 'espana crece mas que europa', 'espana crece mas que la union europea', 'crece espana menos que europa', 'crece espana menos que la union europea', 'espana crece menos que europa', 'espana crece menos que la union europea', 'crecimiento de espana frente a la union europea', 'crecimiento economico europeo', 'pib espana union europea', 'pib frente a europa', 'crecimiento frente a europa'] },
  { ids: ['employment_rate'], terms: ['tasa de empleo', 'tasa de ocupacion', 'personas ocupadas', 'personas que tienen empleo', 'encuentra trabajo', 'tiene empleo', 'ocupacion en espana', 'empleo en espana', 'mas empleo', 'empleo nunca', 'empleo record'] },
  { ids: ['employment_rate_europe'], terms: ['tasa de empleo frente a europa', 'tasa de empleo frente a la union europea', 'tasa de empleo mayor que europa', 'tasa de empleo mayor que la union europea', 'tasa de empleo menor que europa', 'tasa de empleo menor que la union europea', 'empleo de espana frente a europa', 'empleo de espana frente a la union europea', 'espana tiene mas empleo que europa', 'espana tiene menos empleo que europa', 'espana tiene una tasa de empleo mayor que la union europea', 'espana tiene una tasa de empleo menor que la union europea', 'comparacion europea del empleo', 'empleo mas alto que europa', 'empleo mas bajo que europa', 'empleo europa'] },
  { ids: ['unemployment_rate'], terms: ['tasa de paro', 'tasa de desempleo', 'desempleo en espana', 'paro en espana', 'evolucion del desempleo', 'evolucion del paro', 'no encuentra trabajo', 'no encuentran trabajo', 'personas activas no encuentran trabajo'] },
  { ids: ['unemployment_rate_europe'], terms: ['paro en europa', 'desempleo en europa', 'tasa de paro europea', 'comparacion europea', 'comparar paro europa', 'frente a europa en desempleo', 'paro mas alto de europa', 'paro mas bajo de europa', 'puesto de espana por desempleo', 'tasa paro europa', 'espana tasa paro alta europa', 'espana tasa paro baja europa', 'espana tasa de paro alta en europa', 'espana tasa de paro baja en europa', 'paro alta europa', 'paro baja europa'] },
  { ids: ['early_school_leaving_rate'], terms: ['abandono escolar temprano', 'abandono escolar', 'abandono educativo', 'dejan los estudios', 'dejan los estudios antes de tiempo', 'jovenes que abandonan los estudios', 'fracaso escolar temprano'] },
  { ids: ['tertiary_education_attainment_rate'], terms: ['estudios superiores', 'educacion superior', 'titulacion superior', 'universitarios', 'graduados', 'titulados', 'universitarios de 25 a 34', 'jovenes con estudios universitarios', 'personas con estudios superiores'] },
  { ids: ['neet_rate'], terms: ['ni estudian ni trabajan', 'ni estudia ni trabaja', 'ninis', 'jovenes ninis', 'fuera de estudio y empleo', 'no estudian ni trabajan'] },
  { ids: ['youth_unemployment_rate'], terms: ['joven', 'juvenil', 'jovenes', 'youth', '15-24'] },
  { ids: ['government_debt_ratio'], terms: ['deuda', 'endeudamiento', 'debt', 'cuanto debe españa', 'deuda del pais', 'nivel de deuda española'] },
  { ids: ['government_debt_current_prices'], terms: ['deuda publica en euros', 'deuda publica total', 'importe de la deuda publica', 'cuanto dinero debe españa', 'cuanto debe españa en euros', 'cuanto debe españa en dinero', 'deuda de españa en euros', 'deuda publica en millones', 'deuda nominal', 'billones de deuda'] },
  { ids: ['government_revenue_ratio'], terms: ['recaudacion', 'recaudación', 'ingresos publicos', 'ingresos públicos', 'ingresos del estado'] },
  { ids: ['government_expenditure_ratio'], terms: ['gasto publico', 'gasto público', 'gasto del estado', 'presupuesto publico', 'presupuesto público'] },
  { ids: ['government_revenue_ratio_europe'], terms: ['ingresos publicos frente a europa', 'ingresos publicos frente a la union europea', 'recaudacion publica frente a europa', 'recaudacion publica frente a la union europea', 'espana recauda mas que europa', 'espana recauda menos que europa', 'espana recauda mas que la union europea', 'espana recauda menos que la union europea', 'recauda mas o menos que la media europea', 'recauda mas o menos que la media de la union europea', 'ingresos publicos europa', 'recaudacion europa'] },
  { ids: ['government_expenditure_ratio_europe'], terms: ['gasto publico frente a europa', 'gasto publico frente a la union europea', 'gasto del estado frente a europa', 'gasto del estado frente a la union europea', 'espana gasta mas que europa', 'espana gasta menos que europa', 'espana gasta mas que la union europea', 'espana gasta menos que la union europea', 'gasta mas o menos que la media europea', 'gasta mas o menos que la media de la union europea', 'gasto publico europa', 'gasto europa'] },
  { ids: ['housing_cost_overburden_rate'], terms: ['sobrecarga', 'coste de la vivienda', 'gastos de vivienda', 'esfuerzo de vivienda', 'sobrecarga coste vivienda', 'hogares soportan el coste de la vivienda', 'porcentaje de hogares soporta'] },
  { ids: ['health_expenditure_per_capita'], terms: ['gasto sanitario', 'gasto en sanidad', 'gasto en salud', 'recursos sanitarios', 'gasto sanitario por habitante', 'gasto sanitario por persona', 'gasto por habitante en sanidad', 'gasta en sanidad por habitante', 'gasta sanidad por habitante', 'gasta sanidad habitante', 'cuanto gasta sanidad habitante', 'sanidad por habitante', 'gasto por persona en sanidad', 'dinero por persona en sanidad', 'cuanto dinero se dedica a sanidad', 'cuanto dinero se dedica por persona a la sanidad', 'cuanto se gasta en sanidad', 'cuanto se gasta en salud'] },
  { ids: ['health_expenditure_per_capita_europe'], terms: ['gasto sanitario frente a europa', 'gasto sanitario frente a la union europea', 'gasto en sanidad frente a europa', 'gasto en sanidad frente a la union europea', 'espana gasta mas en sanidad que europa', 'espana gasta menos en sanidad que europa', 'espana gasta mas en sanidad que la union europea', 'espana gasta menos en sanidad que la union europea', 'espana gasta mas por habitante en sanidad', 'espana gasta menos por habitante en sanidad', 'gasto sanitario europa', 'sanidad europa'] },
  { ids: ['unmet_healthcare_waiting_list_rate'], terms: ['lista de espera medica', 'lista de espera sanitaria', 'no recibe atencion por lista de espera', 'personas sin atencion por lista de espera', 'espera medica impide atencion', 'necesidad medica no atendida por espera'] },
  { ids: ['life_expectancy_at_birth'], terms: ['esperanza de vida', 'esperanza vida', 'esperanza de vida al nacer', 'años de vida', 'vida media', 'cuantos años vive', 'cuanto vive', 'longevidad', 'evolucionado esperanza vida'] },
  { ids: ['fertility_rate'], terms: ['fecundidad', 'tasa de fecundidad', 'natalidad', 'tasa de natalidad', 'hijos por mujer', 'nacimientos por mujer'] },
  { ids: ['old_age_dependency_ratio'], terms: ['envejecimiento', 'envejecida', 'personas mayores', 'dependencia de mayores', 'mayores de 65', 'sociedad envejecida'] },
  { ids: ['older_population_share'], terms: ['poblacion de 65 anos o mas', 'porcentaje de personas mayores', 'personas de mas de 65', 'proporcion de mayores', 'poblacion mayor'] },
  { ids: ['young_population_share'], terms: ['poblacion de 0 a 14 anos', 'menores de 15', 'poblacion infantil', 'porcentaje de ninos', 'proporcion de menores', 'poblacion menos anos', 'porcentaje poblacion menos anos', 'menos de quince anos'] },
  { ids: ['population_change_rate'], terms: ['crecimiento demografico', 'crecimiento poblacional', 'variacion de poblacion', 'variacion demografica', 'crecimiento de la poblacion', 'crece la poblacion', 'esta creciendo', 'la poblacion esta creciendo', 'poblacion creciendo', 'pierde poblacion', 'perdiendo poblacion', 'espana esta perdiendo poblacion', 'despoblacion', 'cambio demografico', 'cambio poblacional'] },
  { ids: ['resident_population'], terms: ['poblacion residente', 'residentes en espana', 'habitantes de espana', 'habitantes viven en espana', 'habitantes viven normalmente en espana', 'habitantes viven normalmente espana', 'cuantos habitantes viven normalmente espana', 'millones de habitantes', 'millones habitantes', 'espana millones habitantes', 'cuantos habitantes hay', 'numero de habitantes'] },
  { ids: ['regional_population_density'], terms: ['densidad de poblacion', 'densidad poblacion', 'densidad demografica', 'habitantes por kilometro cuadrado', 'personas por kilometro cuadrado', 'personas por km2', 'personas por km²', 'densidad de las comunidades', 'densidad regional', 'comunidades mas densas', 'region mas densa'] },
  { ids: ['foreign_born_population'], terms: ['nacidos fuera de espana', 'nacidos en el extranjero', 'poblacion nacida fuera', 'personas nacidas fuera', 'residentes nacieron fuera', 'poblacion inmigrante por pais de nacimiento'] },
  { ids: ['immigration_flows'], terms: ['llegadas de inmigrantes', 'personas inmigraron', 'flujos migratorios', 'entradas de inmigrantes', 'inmigracion anual'] },
  // This source is category-level. Keep the route explicit: generic
  // “inseguridad” and immigration-causality wording must not silently attach
  // one arbitrary offence category to the user's claim.
  { ids: ['recorded_offences'], terms: ['criminalidad registrada', 'delincuencia registrada', 'delitos registrados', 'delitos registra', 'infracciones penales conocidas', 'evolucion de la criminalidad', 'evolucion de la delincuencia', 'criminalidad aumenta', 'criminalidad sube', 'criminalidad baja', 'criminalidad disminuye', 'homicidios registrados', 'asesinatos registrados', 'robos registrados', 'hurtos registrados', 'fraudes registrados', 'estafas registradas', 'agresiones sexuales registradas', 'violencia sexual registrada', 'corrupcion registrada'] },
  { ids: ['gini_coefficient'], terms: ['gini', 'desigualdad de ingresos', 'desigualdad', 'distribucion de la renta'] },
  { ids: ['government_deficit_ratio'], terms: ['deficit publico', 'deficit del estado', 'superavit publico', 'deficit sobre pib'] },
  { ids: ['median_equivalised_income'], terms: ['renta mediana', 'ingresos medianos', 'renta disponible', 'ingresos de los hogares', 'renta de las familias', 'ingresos medianos de las familias', 'cuanto ingresan los hogares', 'cuanto ingresan de media los hogares'] },
  { ids: ['median_equivalised_income_europe'], terms: ['renta mediana frente a europa', 'renta mediana frente a la union europea', 'ingresos de los hogares frente a europa', 'ingresos de los hogares frente a la union europea', 'espana tiene mas renta que europa', 'espana tiene menos renta que europa', 'espana tiene mas renta mediana que europa', 'espana tiene menos renta mediana que europa', 'espana tiene mas renta que la union europea', 'espana tiene menos renta que la union europea', 'espana tiene mas renta mediana que la union europea', 'espana tiene menos renta mediana que la union europea', 'ingresos medianos frente a europa', 'ingresos medianos frente a la union europea', 'renta de espana frente a europa', 'renta europa'] },
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
  if (preferred.has('employment_rate_europe')) {
    preferred.delete('employment_rate');
    preferred.delete('unemployment_rate_europe');
  }
  if (preferred.has('government_revenue_ratio_europe')) preferred.delete('government_revenue_ratio');
  if (preferred.has('government_expenditure_ratio_europe')) preferred.delete('government_expenditure_ratio');
  if (preferred.has('health_expenditure_per_capita_europe')) preferred.delete('health_expenditure_per_capita');
  if (preferred.has('median_equivalised_income_europe')) preferred.delete('median_equivalised_income');
  if (preferred.has('youth_unemployment_rate')) preferred.delete('unemployment_rate');
  if (preferred.has('youth_unemployment_rate')) preferred.delete('employment_rate');
  if (preferred.has('early_school_leaving_rate') || preferred.has('tertiary_education_attainment_rate')) preferred.delete('youth_unemployment_rate');
  if (preferred.has('unmet_healthcare_waiting_list_rate')) preferred.delete('health_expenditure_per_capita');
  if (preferred.has('gdp_per_capita_current_prices')) preferred.delete('gdp_current_prices');
  if (preferred.has('gdp_per_capita_europe')) {
    preferred.delete('gdp_per_capita_current_prices');
    preferred.delete('gdp_current_prices');
  }
  if (preferred.has('government_debt_current_prices')) preferred.delete('government_debt_ratio');
  if (preferred.has('gdp_real_growth_europe')) preferred.delete('gdp_real_growth_quarterly');
  if (preferred.has('inflation_rate_europe')) {
    preferred.delete('inflation_rate');
    preferred.delete('cpi_index');
    preferred.delete('harmonised_price_index');
  }
  return preferred;
};

export const excludedMetricIdsForQuery = (query) => {
  const normalized = normalise(query);
  const youthRequested = ['paro juvenil', 'desempleo juvenil', 'jovenes sin trabajo', 'jovenes activos', '15-24'].some((term) => normalized.includes(normalise(term)));
  const earlyEducationRequested = metricHints.find((hint) => hint.ids.includes('early_school_leaving_rate'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const tertiaryEducationRequested = metricHints.find((hint) => hint.ids.includes('tertiary_education_attainment_rate'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const neetRequested = metricHints.find((hint) => hint.ids.includes('neet_rate'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const educationContext = ['educacion', 'educativo', 'estudios', 'escolar', 'universitari', 'titulacion', 'formacion'].some((term) => normalized.includes(term));
  const genericUnemployment = ['paro', 'desemple', 'unemployment', 'encuentra trabajo', 'sin trabajo', 'no trabaja'].some((term) => normalized.includes(term));
  const employmentEuropeRequested = metricHints.find((hint) => hint.ids.includes('employment_rate_europe'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const healthSpendRequested = metricHints.find((hint) => hint.ids.includes('health_expenditure_per_capita'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const healthSpendEuropeRequested = metricHints.find((hint) => hint.ids.includes('health_expenditure_per_capita_europe'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const unmetWaitingListRequested = metricHints.find((hint) => hint.ids.includes('unmet_healthcare_waiting_list_rate'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
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
  if (educationContext && !earlyEducationRequested) excluded.add('early_school_leaving_rate');
  if (educationContext && !neetRequested) excluded.add('neet_rate');
  // Per-capita spending is useful context, but it cannot answer a broad claim
  // that the health system has collapsed or that access has deteriorated.
  if (vagueHealthOutcome && !healthSpendRequested) excluded.add('health_expenditure_per_capita');
  if (vagueHealthOutcome && !healthSpendEuropeRequested) excluded.add('health_expenditure_per_capita_europe');
  if (vagueHealthOutcome && !unmetWaitingListRequested) excluded.add('unmet_healthcare_waiting_list_rate');
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
