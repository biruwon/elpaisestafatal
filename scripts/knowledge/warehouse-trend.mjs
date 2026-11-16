import { priceMeasurement, priceRateRequested } from '../../src/lib/knowledge/measurement-units.mjs';
import { comparisonQuality, observationFlagNotes, observationFlags } from '../../src/lib/knowledge/observation-quality.mjs';
import { preferLatestSourceRevisions } from '../../src/lib/knowledge/source-revisions.mjs';

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
  if (['house_price_index', 'rental_price_index'].includes(item.metricId)) {
    const subject = item.metricId === 'rental_price_index' ? 'del alquiler' : 'de la vivienda';
    const measurement = priceMeasurement(item);
    return measurement.kind === 'rate' ? `Variación ${measurement.period} de los precios ${subject} en España`
      : measurement.kind === 'index' ? `Índice de precios ${subject} en España` : `Medida de precios ${subject} en España`;
  }
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
  if (metricId === 'house_price_index' || metricId === 'rental_price_index') return priceMeasurement(item).unit;
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
  if (unit.startsWith('índice')) return 'puntos del índice';
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

const trendGroup = (observations) => {
  const groups = new Map();
  for (const item of preferLatestSourceRevisions(observations)) {
    if ((!Number.isFinite(item.value) && !observationFlags(item.status).includes('b')) || !item.period) continue;
    const key = seriesKey(item);
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }
  const best = [...groups.values()].sort((left, right) => right.filter((item) => Number.isFinite(item.value)).length - left.filter((item) => Number.isFinite(item.value)).length)[0] || [];
  return best.slice().sort((left, right) => String(left.period).localeCompare(String(right.period)));
};

const latestTrendGroup = (observations) => {
  const groups = new Map();
  for (const item of preferLatestSourceRevisions(observations)) {
    if ((!Number.isFinite(item.value) && !observationFlags(item.status).includes('b')) || !item.period) continue;
    const key = seriesKey(item);
    groups.set(key, [...(groups.get(key) || []), item]);
  }
  return [...groups.values()].sort((left, right) => {
    const latestPeriod = (items) => items.filter((item) => Number.isFinite(item.value)).reduce((period, item) => String(item.period) > period ? String(item.period) : period, '');
    const periodDifference = latestPeriod(right).localeCompare(latestPeriod(left));
    if (periodDifference) return periodDifference;
    const retrieved = (items) => Math.max(0, ...items.map((item) => Date.parse(item.source?.retrievedAt || '') || 0));
    return retrieved(right) - retrieved(left) || right.filter((item) => Number.isFinite(item.value)).length - left.filter((item) => Number.isFinite(item.value)).length;
  })[0]?.slice().sort((left, right) => String(left.period).localeCompare(String(right.period))) || [];
};

const geographyKey = (item) => String(item.dimensions?.geo || item.geo || item.geography || item.dimensionLabels?.geo || '').trim();
const queryNamesGeography = (normalizedQuery, item) => {
  const code = String(item.dimensions?.geo || item.geo || '').trim().toUpperCase();
  const label = normalise(item.dimensionLabels?.geo || item.geography || '');
  const aliases = new Set([label]);
  if (code === 'EU27_2020' || code === 'EU') for (const alias of ['europa', 'europe', 'ue', 'union europea', 'european union']) aliases.add(alias);
  if (code.length === 2) {
    for (const locale of ['es', 'en']) {
      try {
        const name = new Intl.DisplayNames([locale], { type: 'region' }).of(code);
        if (name && name !== code) aliases.add(normalise(name));
      } catch { /* Unknown region codes are matched by the source label. */ }
    }
  }
  const queryWords = new Set(normalizedQuery.split(/\s+/));
  return [...aliases].some((alias) => alias && (alias.length < 3 ? queryWords.has(alias) : normalizedQuery.includes(alias)));
};

export const compatibleTrendSeries = (observations) => trendGroup(observations).filter((item) => Number.isFinite(item.value));

// A present-tense, single-value question should receive the latest measured
// observation. Historical and comparative wording stays on the trend path.
export const requestsLatestObservation = (text) => {
  const normalized = normalise(text);
  const historicalOrComparative = /\b(?:desde|entre|frente|compar\w*|evoluc\w*|cambio|cambi\w*|aument\w*|subida\w*|subieron|subio|bajada\w*|bajaron|bajo|caid\w*|cayeron|cayo|descend\w*|respecto|histor\w*|fue|eran?|estuvo|estaban|habia|registro|registraba|registraron|registrado|gasto|gastaron|recibio|recibieron|recibido|ha[n]?\s+(?:subido|aumentado|bajado|caido|descendido))\b/.test(normalized);
  if (historicalOrComparative || /\b(?:19|20)\d{2}\b/.test(normalized)) return false;
  if (/\b(?:actual\w*|ahora|hoy|ultimo(?:\s+dato)?|ultima\s+(?:observacion|cifra)|mas\s+reciente|vigente|a\s+dia\s+de\s+hoy)\b/.test(normalized)) return true;
  return /^(?:cual\s+es|que\s+(?:tasa|indice|valor|dato|nivel|cifra)\b|cuant[oa]s?\s+(?:es|vale|marca|registra|tiene|hay|gasta|cuesta|corresponde)\b)/.test(normalized);
};

export const summarizeWarehouseLatest = (text, observations, metricIds = []) => {
  const candidates = metricIds.length ? observations.filter((item) => metricIds.includes(item.metricId)) : observations;
  const normalizedQuery = normalise(text);
  const requestedGeographies = new Set(candidates.filter((item) => queryNamesGeography(normalizedQuery, item)).map(geographyKey).filter(Boolean));
  if (requestedGeographies.size > 1) return null;
  const scoped = requestedGeographies.size === 1
    ? candidates.filter((item) => geographyKey(item) === [...requestedGeographies][0])
    : candidates;
  const group = latestTrendGroup(scoped);
  const latest = group.filter((item) => Number.isFinite(item.value)).at(-1);
  if (!latest) return null;

  const trailingMissing = group.filter((item) => !Number.isFinite(item.value) && String(item.period) > String(latest.period)).at(-1);
  const isPriceMetric = ['house_price_index', 'rental_price_index'].includes(latest.metricId);
  const measurement = isPriceMetric ? priceMeasurement(latest) : null;
  const wantsRate = priceRateRequested(text);
  const amountQuery = normalise(text);
  const asksForAbsolutePrice = !/\bindice\b/.test(amountQuery) && (
    /\b(?:cuant\w*\s+(?:cuesta|vale|paga)|precio (?:actual|medio|mensual)|alquiler (?:medio|mensual))\b/.test(amountQuery)
    || /\b(?:importe\w*|cantid\w*|cuant[ií]a\w*|coste\w*|euros?|eur|mensual\w*|€)\b/.test(amountQuery) && /\b(?:alquil\w*|renta\w*)\b/.test(amountQuery)
  );
  const metric = displayMetric(latest);
  const period = displayPeriod(latest.period, latest.metricId);
  const unit = displayUnit(latest);
  const suffix = unit ? ` ${unit}` : '';
  const notes = observationFlagNotes(latest.status);
  const limitation = latest.freshness === 'stale'
    ? 'La fuente necesita una actualización y puede no incluir revisiones recientes.'
    : latest.freshness === 'unknown' ? 'No se ha podido comprobar cuándo se consultó la fuente.' : '';
  const mismatch = trailingMissing
    ? `La observación más reciente (${displayPeriod(trailingMissing.period, trailingMissing.metricId)}) no incluye un valor numérico; no podemos presentar el periodo anterior como el dato más reciente.`
    : measurement?.kind === 'unknown'
    ? 'La fuente no identifica con claridad qué mide esta unidad; no presentamos la cifra como si fuera un índice o una tasa.'
    : measurement?.kind === 'rate' && !wantsRate
      ? 'La serie recuperada mide una tasa de variación, no el nivel del precio solicitado. Hace falta localizar una serie de índices o precios para responder.'
      : measurement?.kind === 'index' && asksForAbsolutePrice
        ? 'La serie recuperada mide un índice de precios, no el importe del alquiler en euros solicitado. Hace falta localizar una fuente de precios monetarios para responder.'
      : measurement?.kind === 'index' && wantsRate
        ? 'La serie recuperada mide un índice de precios, no la tasa de variación solicitada. Hace falta localizar una serie de tasas para responder.'
        : '';
  const value = `${formatNumber(latest.value, latest.metricId)}${suffix}`;
  const meaning = measurement?.kind === 'rate'
    ? `Es una tasa ${measurement.period}; describe cuánto variaron los precios frente al periodo de comparación, no su nivel.`
    : ['inflation_rate', 'inflation_rate_europe'].includes(latest.metricId)
      ? 'Es la variación frente al mismo periodo del año anterior, no el nivel del índice ni el coste exacto de cada hogar.'
      : '';
  const source = latest.source?.publisher || latest.source?.title;
  const periodCaveat = 'Corresponde al último periodo que aparece en la serie consultada; no significa que el dato sea de hoy.';
  const quality = [...notes, limitation].filter(Boolean);
  const reply = mismatch || `${metric}: ${value} (${period}). ${[meaning, periodCaveat, source ? `Fuente: ${source}.` : '', ...quality].filter(Boolean).join(' ')}`;
  return {
    observations: [latest],
    comparisonBlocked: Boolean(mismatch),
    measurementMismatch: Boolean(mismatch),
    headline: mismatch ? `${metric}: medida no compatible` : `${metric}: ${value} (${period})`,
    summary: mismatch || `El último dato recuperado para ${metric} corresponde a ${period}.`,
    points: mismatch ? [mismatch] : [`${metric}: ${value} (${period}).`, meaning, periodCaveat, ...quality].filter(Boolean),
    reply,
    limitation: mismatch || [...quality, periodCaveat].filter(Boolean).join(' '),
    replyEvidenceIds: [latest.id].filter(Boolean),
  };
};

export const summarizeWarehouseTrend = (text, observations) => {
  const group = trendGroup(observations);
  let numeric = group.filter((item) => Number.isFinite(item.value));
  if (numeric.length < 2) return null;
  const normalized = normalise(text);
  const years = [...normalized.matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => match[0]);
  const wantsRange = /\b(?:desde|entre)\b/.test(normalized) || (years.length >= 2 && /\b(?:de|del)\b/.test(normalized));
  const requestedYears = wantsRange ? [...new Set(years)].slice(0, 2) : [];
  const missing = requestedYears.find((year) => !numeric.some((item) => String(item.period).startsWith(year)));
  const invalidRange = requestedYears.length > 1 && requestedYears[0] > requestedYears[1];
  if (requestedYears.length && !missing && !invalidRange) {
    const start = requestedYears[0];
    const end = requestedYears[1];
    numeric = numeric.filter((item) => String(item.period).slice(0, 4) >= start && (!end || String(item.period).slice(0, 4) <= end));
  }
  const first = numeric[0];
  const latest = numeric[numeric.length - 1];
  const metric = displayMetric(latest);
  const measurement = ['house_price_index', 'rental_price_index'].includes(latest.metricId) ? priceMeasurement(latest) : null;
  const relevant = group.filter((item) => String(item.period) >= String(first.period) && String(item.period) <= String(latest.period));
  const quality = comparisonQuality(relevant, { temporal: true, firstPeriod: first.period });
  const reason = missing ? `La serie recuperada no incluye ${missing}, el año solicitado; no podemos calcular el cambio pedido.`
    : invalidRange ? 'El periodo solicitado está invertido; aclara qué año debe ser el inicio y cuál el final.'
    : numeric.length < 2 ? 'No hay dos observaciones compatibles en el periodo solicitado.'
    : measurement?.kind === 'unknown' ? 'La fuente no identifica con claridad si la unidad es un índice o una tasa; hay que revisar sus metadatos.'
    : measurement?.kind === 'rate' && !priceRateRequested(text) ? 'La serie recuperada mide tasas de variación, no el nivel del índice de precios solicitado. Hace falta localizar el índice para responder.'
    : quality.reason;
  if (reason) return {
    observations: numeric,
    comparisonBlocked: true,
    headline: `${metric}: comparación pendiente`,
    summary: reason,
    points: [reason, ...quality.notes],
    reply: reason,
    replyEvidenceIds: relevant.map((item) => item.id),
  };
  const delta = latest.value - first.value;
  const unit = displayUnit(latest) || displayUnit(first);
  const suffix = unit ? ` ${unit}` : '';
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
  if (expectedLower !== expectedHigher && Math.abs(delta) >= 0.000001) {
    const agrees = (expectedLower && delta < 0) || (expectedHigher && delta > 0);
    points.push(agrees ? 'La dirección de la serie coincide con la comparación expresada en la afirmación.' : 'La dirección de la serie no coincide con la comparación expresada en la afirmación.');
  }
  points.push(...quality.notes);
  const rateCaveat = measurement?.kind === 'rate' ? ' Una tasa positiva más baja indica que los precios siguen subiendo, pero más despacio; no implica que hayan bajado.' : '';
  return {
    observations: numeric,
    headline: `${metric}: comparación entre ${firstPeriod} y ${latestPeriod}`,
    summary: `${metric} ${direction} entre el primer y el último periodo localizado (${firstPeriod}–${latestPeriod}).`,
    points,
    reply: `${metric} ${direction}: pasó de ${formatNumber(first.value, first.metricId)}${suffix} (${firstPeriod}) a ${formatNumber(latest.value, latest.metricId)}${suffix} (${latestPeriod}). Es una comparación descriptiva de la serie; por sí sola no demuestra la causa del cambio.${rateCaveat}${metricReplyCaveats[latest.metricId] || ''}${quality.notes.length ? ` ${quality.notes.join(' ')}` : ''}`,
    replyEvidenceIds: relevant.map((item) => item.id),
  };
};
