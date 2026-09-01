const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');

const metricPrecision = {
  household_electricity_price: 4,
  household_electricity_price_europe: 4,
  fertility_rate: 2,
  life_expectancy_at_birth: 1,
  minimum_wage_monthly: 0,
};
const formatNumber = (value, metricId = '') => Number(value).toLocaleString('es-ES', {
  maximumFractionDigits: metricPrecision[metricId] || 2,
});
const metricLabels = {
  inflation_rate: 'Inflación anual en España',
  inflation_rate_europe: 'Inflación armonizada: España y la Unión Europea',
  gdp_current_prices: 'Tamaño nominal de la economía española',
  household_electricity_price: 'Precio de la electricidad para los hogares en España',
  household_electricity_price_europe: 'Precio de la electricidad para hogares: España y la Unión Europea',
  rental_price_index: 'Precios del alquiler en España',
  gdp_real_growth_quarterly: 'Crecimiento interanual del PIB real de España',
  gdp_real_growth_europe: 'Crecimiento interanual del PIB real: España y la Unión Europea',
  gdp_per_capita_europe: 'PIB por habitante: España y la Unión Europea',
  employment_rate: 'Tasa de empleo en España',
  employment_rate_europe: 'Tasa de empleo: España y la Unión Europea',
  part_time_employment_rate: 'Empleo a tiempo parcial en España',
  part_time_employment_rate_europe: 'Empleo a tiempo parcial: España y la Unión Europea',
  temporary_employment_rate: 'Empleo temporal en España',
  temporary_employment_rate_europe: 'Empleo temporal: España y la Unión Europea',
  median_hourly_earnings: 'Salario bruto mediano por hora en España',
  median_hourly_earnings_europe: 'Salario bruto mediano por hora: España y la Unión Europea',
  youth_unemployment_rate_europe: 'Tasa de paro juvenil: España y la Unión Europea',
  early_school_leaving_rate_europe: 'Abandono escolar temprano: España y la Unión Europea',
  tertiary_education_attainment_rate_europe: 'Titulación superior: España y la Unión Europea',
  neet_rate_europe: 'Jóvenes que ni estudian ni trabajan: España y la Unión Europea',
  life_expectancy_at_birth_europe: 'Esperanza de vida al nacer: España y la Unión Europea',
  minimum_wage_monthly: 'Salario mínimo legal mensual en España',
  social_protection_benefits_per_capita: 'Gasto en prestaciones de protección social por habitante en España',
  social_protection_benefits_per_capita_europe: 'Gasto en prestaciones de protección social por habitante: España y la Unión Europea',
  old_age_survivors_benefits_per_capita: 'Gasto en prestaciones de vejez y supervivencia por habitante en España',
  old_age_survivors_benefits_total: 'Gasto total en prestaciones de vejez y supervivencia en España',
  old_age_survivors_pension_beneficiaries: 'Personas beneficiarias de pensiones de vejez y supervivencia en España',
  social_protection_contributions_total: 'Cotizaciones recibidas por la protección social en España',
  social_protection_government_contributions_total: 'Aportaciones públicas a la protección social en España',
  projected_population_65_plus: 'Población proyectada de 65 años o más en España',
  projected_population_20_64: 'Población proyectada de 20 a 64 años en España',
  old_age_survivors_benefits_per_capita_europe: 'Gasto en prestaciones de vejez y supervivencia por habitante: España y la Unión Europea',
  government_current_taxes_income_wealth_europe: 'Impuestos corrientes sobre renta y riqueza: España y la Unión Europea',
  government_revenue_ratio_europe: 'Ingresos públicos sobre el PIB: España y la Unión Europea',
  government_expenditure_ratio_europe: 'Gasto público sobre el PIB: España y la Unión Europea',
  government_deficit_ratio_europe: 'Saldo presupuestario sobre el PIB: España y la Unión Europea',
  government_debt_ratio_europe: 'Deuda pública sobre el PIB: España y la Unión Europea',
  gini_coefficient_europe: 'Desigualdad de ingresos: España y la Unión Europea',
  government_education_expenditure_ratio: 'Gasto público en educación en España',
  government_education_expenditure_ratio_europe: 'Gasto público en educación: España y la Unión Europea',
  health_expenditure_per_capita_europe: 'Gasto sanitario por habitante: España y la Unión Europea',
  unmet_healthcare_waiting_list_rate_europe: 'Necesidades médicas no atendidas por lista de espera: España y la Unión Europea',
  median_equivalised_income_europe: 'Renta disponible mediana: España y la Unión Europea',
  unemployment_rate: 'Tasa de desempleo en España',
  unemployment_rate_europe: 'Tasa de desempleo de España frente a Europa',
  government_debt_ratio: 'Deuda pública sobre el PIB en España',
  government_revenue_ratio: 'Ingresos públicos sobre el PIB en España',
  government_expenditure_ratio: 'Gasto público sobre el PIB en España',
  house_price_index: 'Precios de la vivienda en España',
  housing_cost_overburden_rate: 'Sobrecarga del coste de la vivienda en España',
  housing_cost_overburden_rate_europe: 'Sobrecarga del coste de la vivienda: España y la Unión Europea',
  health_expenditure_per_capita: 'Gasto sanitario por habitante en España',
  life_expectancy_at_birth: 'Esperanza de vida al nacer en España',
  fertility_rate: 'Fecundidad en España',
  old_age_dependency_ratio: 'Dependencia de las personas mayores en España',
  older_population_share: 'Población de 65 años o más en España',
  young_population_share: 'Población menor de 15 años en España',
  population_change_rate: 'Cambio anual de la población en España',
  regional_population_density: 'Densidad de población por región',
  resident_population: 'Población residente en España',
  foreign_born_population: 'Población nacida en el extranjero en España',
  foreign_citizenship_population: 'Población con ciudadanía extranjera en España',
  immigration_flows: 'Inmigración anual en España',
  arope_rate: 'Riesgo de pobreza o exclusión social en España',
  arope_rate_europe: 'Riesgo de pobreza o exclusión social: España y la Unión Europea',
};
const offenceLabels = {
  'intentional homicide': 'Homicidios intencionados',
  'attempted intentional homicide': 'Homicidios intencionados en grado de tentativa',
  'serious assault': 'Agresiones graves',
  kidnapping: 'Secuestros',
  'sexual violence': 'Violencia sexual',
  rape: 'Violaciones',
  'sexual assault': 'Agresiones sexuales',
  'sexual exploitation': 'Explotación sexual',
  'child pornography': 'Pornografía infantil',
  robbery: 'Robos con violencia',
  burglary: 'Allanamientos y robos en inmuebles',
  'burglary of private residential premises': 'Robos en viviendas',
  theft: 'Hurtos',
  'theft of a motorized vehicle or parts thereof': 'Robos de vehículos',
  fraud: 'Fraudes',
  corruption: 'Corrupción',
  bribery: 'Cohecho',
  'money laundering': 'Blanqueo de capitales',
  'acts against computer systems': 'Delitos contra sistemas informáticos',
};
export const displayMetric = (item) => {
  if (item.metricId === 'recorded_offences') {
    const category = normalise(item.dimensionLabels?.iccs || item.dimensions?.iccs || '');
    return offenceLabels[category] ? `${offenceLabels[category]} registrados en España` : 'Delitos registrados en España';
  }
  return metricLabels[item.metricId] || String(item.metric || item.source?.title || item.datasetId || 'La serie localizada');
};
const displayUnit = (item) => {
  const metricId = String(item.metricId || '');
  const unit = normalise(item.unit);
  if (metricId === 'gdp_current_prices') return 'millones de euros';
  if (metricId === 'gdp_per_capita_europe') return 'PPS por habitante';
  if (metricId === 'minimum_wage_monthly') return '€ al mes';
  if (metricId === 'social_protection_benefits_per_capita') return '€ por habitante';
  if (metricId === 'social_protection_benefits_per_capita_europe') return '€ por habitante';
  if (metricId === 'old_age_survivors_benefits_per_capita') return '€ por habitante';
  if (metricId === 'old_age_survivors_benefits_total' || metricId === 'social_protection_contributions_total' || metricId === 'social_protection_government_contributions_total') return 'millones de euros';
  if (metricId === 'old_age_survivors_pension_beneficiaries' || metricId === 'projected_population_65_plus' || metricId === 'projected_population_20_64') return 'personas';
  if (metricId === 'old_age_survivors_benefits_per_capita_europe') return '€ por habitante';
  if (metricId === 'government_current_taxes_income_wealth_europe') return '% del PIB';
  if (metricId === 'government_deficit_ratio_europe') return '% del PIB';
  if (metricId === 'government_debt_ratio_europe') return '% del PIB';
  if (metricId === 'gdp_real_growth_quarterly' || metricId === 'gdp_real_growth_europe' || metricId === 'inflation_rate' || metricId === 'inflation_rate_europe') return '% interanual';
  if (metricId === 'employment_rate' || metricId === 'employment_rate_europe' || metricId === 'part_time_employment_rate' || metricId === 'part_time_employment_rate_europe' || metricId === 'temporary_employment_rate' || metricId === 'temporary_employment_rate_europe' || metricId === 'unemployment_rate' || metricId === 'unemployment_rate_europe' || metricId === 'youth_unemployment_rate' || metricId === 'youth_unemployment_rate_europe' || metricId === 'neet_rate' || metricId === 'neet_rate_europe') return '%';
  if (metricId === 'government_revenue_ratio_europe' || metricId === 'government_expenditure_ratio_europe') return '% del PIB';
  if (metricId === 'health_expenditure_per_capita_europe') return '€ por habitante';
  if (metricId === 'unmet_healthcare_waiting_list_rate_europe') return '% de la población de 16 años o más';
  if (metricId === 'median_equivalised_income_europe') return 'PPS por persona';
  if (metricId === 'median_hourly_earnings' || metricId === 'median_hourly_earnings_europe') return '€ por hora';
  if (metricId === 'house_price_index') return 'índice (2015=100)';
  if (metricId === 'rental_price_index') return 'índice (2015=100)';
  if (metricId === 'housing_cost_overburden_rate' || metricId === 'housing_cost_overburden_rate_europe' || metricId === 'older_population_share' || metricId === 'young_population_share' || metricId === 'arope_rate' || metricId === 'arope_rate_europe') return '% de la población';
  if (metricId === 'population_change_rate') return 'por cada 1.000 habitantes';
  if (metricId === 'resident_population' || metricId === 'foreign_born_population' || metricId === 'foreign_citizenship_population' || metricId === 'immigration_flows') return 'personas';
  if (metricId === 'life_expectancy_at_birth' || metricId === 'life_expectancy_at_birth_europe') return 'años';
  if (metricId === 'fertility_rate') return 'hijos por mujer';
  if (metricId === 'old_age_dependency_ratio') return 'personas mayores por cada 100 en edad de trabajar';
  if (metricId === 'household_electricity_price' || metricId === 'household_electricity_price_europe') return '€ por kWh';
  if (metricId === 'recorded_offences') return 'delitos registrados';
  if (metricId === 'regional_population_density') return 'personas por km²';
  if (unit === 'percentage' || unit === 'percentage of population' || unit === 'percentage of population in the labour force') return '%';
  if (unit.includes('percentage of gross domestic product')) return '% del PIB';
  if (unit.includes('euro per inhabitant') || unit.includes('euro per capita')) return '€ por habitante';
  if (unit.includes('euro per person') || unit === 'euro') return '€ por persona';
  if (unit.includes('gini scale')) return 'escala Gini 0–100';
  return String(item.unit || '').trim();
};
const deltaUnit = (unit) => {
  if (unit === 'índice (2015=100)') return 'puntos del índice';
  if (unit.startsWith('%')) return 'puntos porcentuales';
  return unit;
};
const metricReplyCaveats = {
  social_protection_benefits_per_capita: ' No indica quién recibe cada prestación ni cuáles son sus requisitos.',
  old_age_survivors_benefits_per_capita: ' No equivale a la pensión media de una persona ni demuestra por sí solo la sostenibilidad del sistema.',
};

export const displayPeriod = (period, metricId = '') => {
  const value = String(period || '');
  if (metricId === 'minimum_wage_monthly') {
    const match = /^(\d{4})-S([12])$/.exec(value);
    if (match) return `${match[2] === '1' ? 'primer' : 'segundo'} semestre de ${match[1]}`;
  }
  return value;
};

const comparableDimensions = (item) => Object.entries(item.dimensions || {})
  .filter(([key]) => !['time', 'period', 'year', 'anyo', 'fecha'].includes(normalise(key)))
  .sort(([left], [right]) => left.localeCompare(right));

const seriesKey = (item) => JSON.stringify({
  source: item.source?.id || item.sourceId || '',
  metric: item.metric || item.datasetId || '',
  unit: item.unit || '',
  dimensions: comparableDimensions(item),
});

export const compatibleTrendSeries = (observations) => {
  const groups = new Map();
  for (const item of observations) {
    if (typeof item.value !== 'number' || !Number.isFinite(item.value) || !item.period) continue;
    const key = seriesKey(item);
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }
  const best = [...groups.values()].sort((left, right) => right.length - left.length)[0] || [];
  return best.slice().sort((left, right) => String(left.period).localeCompare(String(right.period)));
};

export const summarizeWarehouseTrend = (text, observations) => {
  const numeric = compatibleTrendSeries(observations);
  if (numeric.length < 2) return null;
  const first = numeric[0];
  const latest = numeric[numeric.length - 1];
  const delta = latest.value - first.value;
  const unit = displayUnit(latest) || displayUnit(first);
  const suffix = unit ? ` ${unit}` : '';
  const metric = displayMetric(latest);
  const direction = Math.abs(delta) < 0.000001 ? 'se mantuvo prácticamente estable' : delta < 0 ? 'bajó' : 'subió';
  const changeUnit = deltaUnit(unit);
  const change = `${formatNumber(Math.abs(delta), latest.metricId)}${changeUnit ? ` ${changeUnit}` : ''}`;
  const firstPeriod = displayPeriod(first.period, first.metricId);
  const latestPeriod = displayPeriod(latest.period, latest.metricId);
  const directionWords = normalise(text);
  const expectedLower = directionWords.includes('menos') || directionWords.includes('baja') || directionWords.includes('disminuye') || directionWords.includes('cae');
  const expectedHigher = directionWords.includes('mas') || directionWords.includes('sube') || directionWords.includes('aumenta') || directionWords.includes('crece');
  const points = [
    `${metric} ${direction}, de ${formatNumber(first.value, first.metricId)}${suffix} (${firstPeriod}) a ${formatNumber(latest.value, latest.metricId)}${suffix} (${latestPeriod}).`,
    `El cambio entre esos dos puntos es de ${change}${delta < 0 ? ' menos' : delta > 0 ? ' más' : ''}.`,
  ];
  if ((expectedLower || expectedHigher) && Math.abs(delta) >= 0.000001) {
    const agrees = (expectedLower && delta < 0) || (expectedHigher && delta > 0);
    points.push(agrees ? 'La dirección de la serie coincide con la comparación expresada en la afirmación.' : 'La dirección de la serie no coincide con la comparación expresada en la afirmación.');
  }
  return {
    observations: numeric,
    headline: `${metric}: comparación entre ${firstPeriod} y ${latestPeriod}`,
    summary: `${metric} ${direction} entre el primer y el último periodo localizado (${firstPeriod}–${latestPeriod}).`,
    points,
    reply: `${metric} ${direction}: pasó de ${formatNumber(first.value, first.metricId)}${suffix} a ${formatNumber(latest.value, latest.metricId)}${suffix}. Es una comparación descriptiva de la serie; por sí sola no demuestra la causa del cambio.${metricReplyCaveats[latest.metricId] || ''}`,
    replyEvidenceIds: numeric.map((item) => item.id),
  };
};
