// Search vocabulary broader than public metric names. It is copied into every
// derived warehouse index so local and PostgreSQL retrieval share behaviour.
export const metricSearchAliases = Object.freeze({
  youth_unemployment_rate: ['joven', 'jovenes', 'juvenil', 'activos', 'trabajo'],
  employment_rate: ['porcentaje', 'poblacion', 'activa', 'personas', 'encuentra', 'trabajo', 'ocupacion'],
  employment_rate_europe: ['empleo', 'ocupacion', 'europa', 'union europea', 'comparacion europea'],
  government_revenue_ratio_europe: ['ingresos', 'recaudacion', 'publicos', 'europa', 'union europea', 'comparacion europea'],
  government_expenditure_ratio_europe: ['gasto', 'presupuesto', 'publico', 'europa', 'union europea', 'comparacion europea'],
  unemployment_rate: ['paro', 'desempleo', 'personas', 'sin trabajo', 'encuentra trabajo'],
  unemployment_rate_europe: ['paro', 'desempleo', 'europa', 'comparacion europea'],
  inflation_rate_europe: ['inflacion', 'precios', 'europa', 'union europea', 'comparacion europea'],
  resident_population: ['poblacion', 'habitantes', 'residentes', 'viven', 'normalmente'],
  foreign_born_population: ['inmigracion', 'inmigrantes', 'extranjeros', 'nacidos', 'nacieron', 'fuera', 'residentes'],
  immigration_flows: ['inmigracion', 'inmigrantes', 'inmigraron', 'llegadas', 'personas', 'entradas'],
  gdp_current_prices: ['pib nominal', 'pib a precios corrientes', 'tamano de la economia', 'valor del pib', 'produccion economica nacional'],
  gdp_real_growth_europe: ['pib real frente a europa', 'crecimiento del pib frente a europa', 'espana crece mas que europa', 'espana crece menos que europa', 'crecimiento economico europeo', 'pib espana union europea'],
  life_expectancy_at_birth: ['esperanza de vida', 'años de vida', 'vida media', 'longevidad'],
  fertility_rate: ['fecundidad', 'natalidad', 'hijos por mujer', 'nacimientos por mujer'],
  old_age_dependency_ratio: ['envejecimiento', 'personas mayores', 'dependencia de mayores', 'mayores de 65'],
  older_population_share: ['mayores de 65', 'personas mayores', 'poblacion mayor'],
  young_population_share: ['menores de 15', 'poblacion infantil', 'porcentaje de ninos', 'poblacion menos anos'],
  population_change_rate: ['crecimiento demografico', 'variacion de poblacion', 'despoblacion', 'cambio demografico'],
  recorded_offences: ['criminalidad registrada', 'delincuencia registrada', 'delitos registrados', 'homicidios registrados', 'robos registrados', 'hurtos registrados', 'fraudes registrados', 'estafas registradas', 'agresiones sexuales registradas', 'violencia sexual registrada'],
  government_debt_ratio: ['deuda pública', 'deuda del Estado', 'deuda sobre PIB', 'deuda española', 'endeudamiento público', 'cuánto debe España', 'deuda del país', 'nivel de deuda española'],
  health_expenditure_per_capita: ['gasto sanitario por habitante', 'gasto en sanidad', 'gasto en salud', 'recursos sanitarios', 'gasto sanitario por persona', 'dinero por persona en sanidad', 'cuánto dinero se dedica a sanidad', 'cuánto se gasta en salud'],
  median_equivalised_income: ['renta mediana', 'ingresos medianos', 'renta disponible', 'ingresos de los hogares', 'renta de las familias', 'ingresos medianos de las familias', 'cuánto ingresan los hogares'],
});

export const searchAliasesForMetric = (metricId) => metricSearchAliases[metricId] || [];
