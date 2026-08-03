// Search vocabulary broader than public metric names. It is copied into every
// derived warehouse index so local and PostgreSQL retrieval share behaviour.
export const metricSearchAliases = Object.freeze({
  youth_unemployment_rate: ['joven', 'jovenes', 'juvenil', 'activos', 'trabajo'],
  employment_rate: ['porcentaje', 'poblacion', 'activa', 'personas', 'encuentra', 'trabajo', 'ocupacion'],
  unemployment_rate: ['paro', 'desempleo', 'personas', 'sin trabajo', 'encuentra trabajo'],
  unemployment_rate_europe: ['paro', 'desempleo', 'europa', 'comparacion europea'],
  resident_population: ['poblacion', 'habitantes', 'residentes', 'viven', 'normalmente'],
  foreign_born_population: ['inmigracion', 'inmigrantes', 'extranjeros', 'nacidos', 'nacieron', 'fuera', 'residentes'],
  immigration_flows: ['inmigracion', 'inmigrantes', 'inmigraron', 'llegadas', 'personas', 'entradas'],
  life_expectancy_at_birth: ['esperanza de vida', 'años de vida', 'vida media', 'longevidad'],
  fertility_rate: ['fecundidad', 'natalidad', 'hijos por mujer', 'nacimientos por mujer'],
  old_age_dependency_ratio: ['envejecimiento', 'personas mayores', 'dependencia de mayores', 'mayores de 65'],
  older_population_share: ['mayores de 65', 'personas mayores', 'poblacion mayor'],
  young_population_share: ['menores de 15', 'poblacion infantil', 'porcentaje de ninos', 'poblacion menos anos'],
  population_change_rate: ['crecimiento demografico', 'variacion de poblacion', 'despoblacion', 'cambio demografico'],
  recorded_offences: ['criminalidad registrada', 'delincuencia registrada', 'delitos registrados'],
});

export const searchAliasesForMetric = (metricId) => metricSearchAliases[metricId] || [];
