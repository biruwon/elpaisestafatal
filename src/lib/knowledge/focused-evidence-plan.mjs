import { claimFocusFor, focusedMetricIdsFor, privateHealthcareAccessClaimType, tertiaryOverqualificationCitizenshipFitsClaim } from './claim-focus.mjs';
import { metricVocabulary } from './measurement-definitions.generated.mjs';
import { RUNTIME_VERSIONS } from './runtime-versions.mjs';
import { realWagePlan } from './real-wage-comparison.mjs';
import { comparisonQuality, observationFlagNotes } from './observation-quality.mjs';
import { ageScopeMatcherFor } from './age-scope.mjs';
import { periodScopeMatcherFor } from './period-scope.mjs';
import { geographyScopeMatcherFor, requestedGeographyScopes } from './geography-scope.mjs';
import { sexScopeMatcherFor } from './sex-scope.mjs';

const vocabulary = new Map(metricVocabulary.map((metric) => [metric.id, metric]));
const normalize = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const observationFitsClaim = (claim) => {
  const matchesAge = ageScopeMatcherFor(claim);
  const matchesPeriod = periodScopeMatcherFor(claim);
  const matchesGeography = geographyScopeMatcherFor(claim);
  const matchesSex = sexScopeMatcherFor(claim);
  const text = normalize(claim);
  const requestedTerritories = requestedGeographyScopes(claim);
  return (item) => {
    if (!matchesAge(item) || !matchesPeriod(item) || !matchesGeography(item) || !matchesSex(item)) return false;
    if (!tertiaryOverqualificationCitizenshipFitsClaim(claim, item)) return false;
    if (/^tourist_housing_(?:count|share)$/.test(item.metricId || '')
      && requestedTerritories.length === 0 && item.dimensions?.geographyLevel !== 'country') return false;
    if (/^tourist_housing_(?:count|share)$/.test(item.metricId || '')
      && /\b(?:barri\w*|distrit\w*|municipi\w*|ciudad\w*|centro|casco urbano)\b/.test(text)
      && item.dimensions?.geographyLevel !== 'municipality') return false;
    const population = normalize([item.population, JSON.stringify(item.dimensions || {}), JSON.stringify(item.dimensionLabels || {})].join(' '));
    const youthOverqualification = item.metricId === 'tertiary_overqualification_rate_age_20_34' && item.dimensions?.age === 'Y20-34';
    if (/\b(jovenes|juvenil|menores de 30)\b/.test(text) && !youthOverqualification
      && !/\b(youth|juvenil|jovenes|15 24|16 29|y15 24|y16 29)\b/.test(population)) return false;
    return true;
  };
};
const labels = {
  unemployment_rate: 'Tasa de paro entre personas activas de 15 a 74 años',
  unemployment_rate_europe: 'Tasa de paro entre personas activas de 15 a 74 años',
  median_hourly_earnings: 'Salario mediano bruto por hora',
  median_hourly_earnings_europe: 'Salario mediano bruto por hora en Europa',
  mean_hourly_earnings_by_activity: 'Salario bruto medio por hora según actividad',
  cpi_index: 'IPC general', harmonised_price_index: 'Índice armonizado de precios',
  rental_price_index: 'Índice de alquileres pagados',
  housing_cost_overburden_rate: 'Sobrecarga de gastos de vivienda',
  median_equivalised_income: 'Renta disponible equivalente mediana',
  house_price_index: 'Índice de precios de compraventa',
  gender_pay_gap: 'Brecha salarial sin ajustar',
  household_electricity_price: 'Precio doméstico de electricidad',
  household_electricity_price_europe: 'Precio doméstico de electricidad',
  industrial_electricity_price: 'Precio eléctrico para grandes consumidores no domésticos · banda ID',
  industrial_electricity_price_europe: 'Precio eléctrico para grandes consumidores no domésticos · banda ID',
  education_personnel: 'Personal docente',
  employment_rate_tertiary_education: 'Tasa de empleo de personas con estudios terciarios',
  unemployment_rate_tertiary_education: 'Tasa de paro de personas con estudios terciarios',
  tertiary_overqualification_rate: 'Tasa de sobrecualificación entre personas con estudios terciarios ocupadas',
  tertiary_overqualification_rate_age_20_34: 'Tasa de sobrecualificación entre personas ocupadas de 20 a 34 años con educación terciaria',
  in_work_poverty_rate: 'Personas ocupadas de 18 años o más en riesgo de pobreza',
  in_work_poverty_full_time_rate: 'Personas ocupadas de 18 años o más a jornada completa en riesgo de pobreza',
  primary_care_wait_days: 'Demora entre quienes esperaron más de un día',
  primary_care_wait_over_one_day_rate: 'Pacientes de medicina de familia pública que esperaron más de un día por falta de cita',
  tourist_housing_count: 'Viviendas turísticas estimadas',
  tourist_housing_share: 'Viviendas turísticas como parte del parque total de viviendas',
};
const unitFor = (item) => /^(?:household|industrial)_electricity_price/.test(item.metricId || '') && item.dimensions?.currency && (item.dimensions?.unit === 'KWH' || /^(?:kilowatt-hour|kwh)$/i.test(item.unit || ''))
  ? `${item.dimensions.currency === 'EUR' ? '€' : item.dimensions.currency}/kWh`
  : /^(?:household|industrial)_electricity_price/.test(item.metricId || '') && /eur|euro/i.test(item.unit || '') ? '€/kWh'
  : /percent|percentage|^pc$|%/i.test(item.unit || '') ? '%' : /days|d[ií]as/i.test(item.unit || '') ? 'días'
  : item.metricId === 'rental_price_index' && /index|índice/i.test(item.unit || '')
    ? `índice${String(item.unit).match(/\b(?:19|20)\d{2}\s*=\s*100\b/) ? ` (${String(item.unit).match(/\b(?:19|20)\d{2}\s*=\s*100\b/)[0].replace(/\s/g, '')})` : ''}`
  : item.metricId === 'cpi_index' || /index/i.test(item.unit || '') ? 'índice'
    : /(?:median|mean)_hourly_earnings/.test(item.metricId || '') && /eur/i.test(item.unit || '') ? '€/hora' : item.displayUnit || item.unit || '';
const number = (value, metricId) => new Intl.NumberFormat('es-ES', { maximumFractionDigits:
  metricId === 'primary_care_wait_over_one_day_rate' ? 1 : /^(?:household|industrial)_electricity_price/.test(metricId || '') ? 4 : 2 }).format(value);
const placeLabel = (item) => {
  const place = item.geography || item.dimensionLabels?.geo || item.dimensions?.geo || '';
  return /^(spain|es)$/i.test(place) ? 'España' : /european union|^eu27/i.test(place) ? 'Unión Europea (27 países)' : place;
};
const periodLabel = (period) => {
  const value = String(period);
  const month = value.match(/^(\d{4})M(0[1-9]|1[0-2])$/);
  if (month) return `${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][Number(month[2]) - 1]} de ${month[1]}`;
  return value.replace(/^(\d{4})-O([123])$/, '$1 · oleada $2');
};
const validNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isRentalIndexObservation = (item) => {
  const unit = normalize(item.unit || '');
  return /\bindex\b|\bindice\b/.test(unit) && !/\b(?:rate|tasa|change)\b/.test(unit);
};
const scopeKey = (item) => JSON.stringify({
  geography: item.geography || item.dimensions?.geo || '',
  population: item.population || '', denominator: item.denominator || '', unit: item.unit || '',
  dimensions: Object.fromEntries(Object.entries(item.dimensions || {}).filter(([key]) => !['time', 'period', 'year'].includes(key)).sort(([a], [b]) => a.localeCompare(b))),
  dataKind: item.dataKind || 'observed',
});
const citizenshipGroupLabel = (item) => ({
  NAT: 'ciudadanía española',
  FOR: 'ciudadanía extranjera',
  EU27_2020_FOR: 'ciudadanía de otro país de la UE',
  NEU27_2020_FOR: 'ciudadanía de fuera de la UE',
}[String(item.dimensions?.citizen || '').toUpperCase()]);
const sourceValid = (source) => {
  try { return Boolean(source?.id && source?.title && new URL(source.url).protocol === 'https:'); } catch { return false; }
};
const factsForMetric = (id, observations, fitsClaim) => {
  const series = new Map();
  const metricRows = observations.filter((row) => row.metricId === id);
  const validYouthOverqualificationScope = (item) => id !== 'tertiary_overqualification_rate_age_20_34'
    || item.dimensions?.age === 'Y20-34' && item.dimensions?.geo === 'ES'
      && item.dimensions?.citizen === 'TOTAL' && item.dimensions?.sex === 'T' && item.dimensions?.unit === 'PC';
  const hasActiveRentalIndex = id === 'rental_price_index' && metricRows.some((item) => isRentalIndexObservation(item)
    && String(item.source?.url || '').includes('/prc_hicp_minr'));
  for (const item of metricRows.filter((row) => validNumber(row.value) && row.period && row.freshness !== 'invalid'
    && !['projected', 'budget'].includes(row.dataKind) && sourceValid(row.source) && fitsClaim(row)
    && validYouthOverqualificationScope(row)
    && (id !== 'rental_price_index' || isRentalIndexObservation(row)
      && (!hasActiveRentalIndex || String(row.source?.url || '').includes('/prc_hicp_minr')))
    && (!/^(?:household|industrial)_electricity_price/.test(id) || !/^(?:kilowatt-hour|kwh)$/i.test(row.unit || '') || Boolean(row.dimensions?.currency)))) {
    const key = scopeKey(item);
    const rows = series.get(key) || [];
    rows.push(item);
    series.set(key, rows);
  }
  // Do not join two populations, territories, units, stages, or survey bases.
  return [...series.values()].slice(0, 3).map((items) => {
    const periods = new Map();
    for (const item of items) {
      const candidates = periods.get(item.period) || [];
      candidates.push(item);
      periods.set(item.period, candidates);
    }
    const rows = [];
    for (const candidates of periods.values()) {
      candidates.sort((a, b) => (Date.parse(b.source?.retrievedAt || '') || 0) - (Date.parse(a.source?.retrievedAt || '') || 0) || String(a.id || '').localeCompare(String(b.id || '')));
      const newestTime = Date.parse(candidates[0].source?.retrievedAt || '') || 0;
      const newest = candidates.filter((item) => (Date.parse(item.source?.retrievedAt || '') || 0) === newestTime);
      // Equal-time conflicting values or flags have no defensible winner.
      if (newest.some((item) => item.value !== newest[0].value || String(item.status || '') !== String(newest[0].status || ''))) return null;
      rows.push(newest[0]);
    }
    rows.sort((a, b) => String(a.period).localeCompare(String(b.period)));
    const latest = rows.at(-1);
    const value = `${number(latest.value, id)} ${unitFor(latest)}`.trim();
    const metric = vocabulary.get(id);
    const citizenship = citizenshipGroupLabel(latest);
    const scope = [latest.geography || latest.dimensionLabels?.geo, citizenship, latest.population || metric?.population].filter(Boolean).join(' · ');
    const place = placeLabel(latest);
    const finding = `${labels[id] || metric?.name || latest.metric}${place ? ` · ${place}` : ''}${citizenship ? ` · ${citizenship}` : ''}: ${value} (${periodLabel(latest.period)}).`;
    return { id, items: rows, latest, finding, scope, sourceIds: [...new Set(rows.map((item) => item.source.id))] };
  }).filter(Boolean);
};

const sectorEarningsActivity = [
  { code: 'I', label: 'alojamiento y servicios de comida', match: /\b(turis\w*|hosteler\w*|hotel\w*|alojam\w*|restaur\w*)\b/ },
  { code: 'C', label: 'manufactura', match: /\b(manufactur\w*|fabric\w*)\b/ },
  { code: 'B-E', label: 'industria (sin construcción)', match: /\bindustr\w*\b/ },
  { code: 'F', label: 'construcción', match: /\bconstrucci\w*\b/ },
  { code: 'G', label: 'comercio mayorista, minorista y reparación de vehículos', match: /\bcomerci\w*\b/ },
  { code: 'H', label: 'transporte y almacenamiento', match: /\b(transporte|logistic\w*|almacenamiento)\b/ },
  { code: 'J', label: 'información y comunicaciones', match: /\b(tecnolog\w*|informatica|telecomunicaci\w*|comunicaci\w*)\b/ },
  { code: 'K', label: 'finanzas y seguros', match: /\b(financier\w*|finanzas?|banc\w*|seguros?)\b/ },
  { code: 'L', label: 'actividades inmobiliarias', match: /\b(inmobiliari\w*|inmuebl\w*)\b/ },
  { code: 'M', label: 'actividades profesionales, científicas y técnicas', match: /\b(profesional\w*|cientific\w*|tecnic\w*)\b/ },
  { code: 'N', label: 'servicios administrativos y de apoyo', match: /\b(administrativ\w*|servicios? de apoyo)\b/ },
  { code: 'P', label: 'educación', match: /\b(educaci\w*|enseñan\w*|docent\w*)\b/ },
  { code: 'Q', label: 'sanidad y servicios sociales', match: /\b(sanidad|sanitari\w*|salud|servicios? sociales?)\b/ },
  { code: 'R', label: 'artes, espectáculos y ocio', match: /\b(artes?|espectaculos?|ocio|entretenimiento)\b/ },
  { code: 'S', label: 'otros servicios', match: /\botros? servicios?\b/ },
];

// Eurostat publishes overlapping NACE aggregates alongside the one-letter
// activities. Select only the activity named in the claim so a broad label
// such as tourism cannot inherit a hand-picked comparison sector.
const sectorEarningsFactsForClaim = (claim, observations, fitsClaim) => {
  const text = normalize(claim);
  const requested = sectorEarningsActivity.filter((activity) => activity.match.test(text))
    .filter((activity) => activity.code !== 'B-E' || !/\b(manufactur\w*|fabric\w*)\b/.test(text));
  if (!requested.length) return [];
  const eligibleRows = observations.filter((item) => item.metricId === 'mean_hourly_earnings_by_activity'
    && validNumber(item.value) && item.period === '2022' && item.freshness !== 'invalid'
    && sourceValid(item.source) && String(item.source?.url || '').includes('/earn_ses22_17?')
    && fitsClaim(item)
    && item.dimensions?.geo === 'ES' && item.dimensions?.freq === 'A'
    && item.dimensions?.sex === 'T' && item.dimensions?.indic_se === 'ERN'
    && item.dimensions?.l_serv === 'TOTAL' && item.dimensions?.sizeclas === 'GE10'
    && item.dimensions?.unit === 'EUR' && item.dimensions?.time === '2022');
  const selected = [];
  for (const activity of requested) {
    const candidates = eligibleRows.filter((item) => item.dimensions?.nace_r2 === activity.code)
      .sort((a, b) => (Date.parse(b.source?.retrievedAt || '') || 0) - (Date.parse(a.source?.retrievedAt || '') || 0)
        || String(a.id || '').localeCompare(String(b.id || '')));
    if (!candidates.length) continue;
    const newestTime = Date.parse(candidates[0].source?.retrievedAt || '') || 0;
    const newest = candidates.filter((item) => (Date.parse(item.source?.retrievedAt || '') || 0) === newestTime);
    if (newest.some((item) => item.value !== newest[0].value || String(item.status || '') !== String(newest[0].status || ''))) continue;
    selected.push({ ...newest[0], activityLabel: activity.label });
  }
  if (!selected.length) return [];
  const values = selected.map((item) => `${item.activityLabel} (NACE ${item.dimensions.nace_r2}): ${number(item.value, 'mean_hourly_earnings_by_activity')} €/hora`);
  const limitations = [];
  if (/\b(tecnolog\w*|informatica)\b/.test(text)) limitations.push('NACE J mide información y comunicaciones, no todo el sector tecnológico.');
  const latest = { ...selected[0], status: [...new Set(selected.map((item) => String(item.status || '')).filter(Boolean))].join('') };
  const finding = `Eurostat, España, 2022; media de remuneración bruta por hora: ${values.join('; ')}.${limitations.length ? ` ${limitations.join(' ')}` : ''}`;
  return [{
    id: 'mean_hourly_earnings_by_activity', items: selected, latest, finding,
    scope: 'España · empleados de empresas con 10 o más personas · NACE Rev. 2 · salarios brutos por hora',
    sourceIds: [...new Set(selected.map((item) => item.source.id))],
  }];
};

const educationOutcomeFinding = (fact) => {
  const item = fact.latest;
  const value = `${number(item.value, fact.id)} %`;
  const period = periodLabel(item.period);
  const place = placeLabel(item) || 'el territorio consultado';
  const source = item.source?.publisher || 'Eurostat';
  if (fact.id === 'employment_rate_tertiary_education') return `${source}: en ${place}, el ${value} de las personas residentes de 20 a 64 años con educación terciaria (ISCED 5–8) estaba ocupada en ${period}.`;
  if (fact.id === 'unemployment_rate_tertiary_education') return `${source}: en ${place}, el ${value} de la población activa de 20 a 64 años con educación terciaria (ISCED 5–8) estaba en paro en ${period}.`;
  if (fact.id === 'tertiary_overqualification_rate') return `${source}: en ${place}, el ${value} de las personas ocupadas de 20 a 64 años con educación terciaria (ISCED 5–8) trabajaba en ocupaciones ISCO 4–9 que no requieren ese nivel en ${period}.`;
  if (fact.id === 'tertiary_overqualification_rate_age_20_34') return `${source}: en ${place}, el ${value} de las personas ocupadas de 20 a 34 años con educación terciaria (ISCED 5–8) trabajaba en ocupaciones ISCO 4–9, que no requieren ese nivel, en ${period}.`;
  return fact.finding;
};
const educationOutcomeLimitation = (ids, fallback) => {
  const employment = ids.includes('employment_rate_tertiary_education');
  const unemployment = ids.includes('unemployment_rate_tertiary_education');
  const overqualification = ids.includes('tertiary_overqualification_rate');
  const youthOverqualification = ids.includes('tertiary_overqualification_rate_age_20_34');
  if (youthOverqualification) return 'Aquí, «jóvenes» se interpreta con el grupo estadístico de Eurostat de 20 a 34 años. El denominador son solo las personas ocupadas de ese grupo con educación terciaria: no equivale a recién graduados, no cuenta a quienes siguen desempleados y no mide si el puesto coincide con el campo de estudios ni qué titulación piden los anuncios.';
  if (employment && overqualification) return 'Estas tasas describen grupos, no garantizan el resultado de cada persona. La tasa de empleo abarca a residentes de 20 a 64 años, no solo a recién graduados; la de sobrecualificación solo cuenta a quienes ya trabajan y no mide si el puesto coincide con el campo de estudios.';
  if (unemployment) return 'La tasa de paro usa como denominador a la población activa de 20 a 64 años con educación terciaria, no a todas las personas tituladas. No se limita a recién graduados ni predice el resultado de una persona.';
  if (overqualification) return 'La tasa de sobrecualificación solo cuenta a personas ocupadas de 20 a 64 años con educación terciaria. No mide a quienes siguen desempleados, el ajuste del campo de estudios ni las titulaciones exigidas en anuncios de empleo.';
  if (employment) return 'La tasa de empleo usa como denominador a todas las personas residentes de 20 a 64 años con educación terciaria. No se limita a recién graduados ni mide si el puesto coincide con sus estudios.';
  return fallback;
};
const educationOutcomeNeedsForClaim = (claim, fallback) => {
  const text = normalize(claim);
  const recentGraduates = /\b(recien titulad\w*|recien graduad\w*|primer empleo)\b/.test(text);
  const asksQualificationFit = /\b(sobrecualific\w*|desajust\w*|desencaj\w*|no requier\w*|no exig\w*|acorde\w*|adecuad\w*|relacionad\w*|por debajo)\b/.test(text);
  if (recentGraduates) return ['medición de sobrecualificación o ajuste laboral entre recién graduados, con el tiempo transcurrido desde que terminaron los estudios y un denominador definido'];
  const age = String(claim).match(/\b(\d{2})\s*(?:[-–—]|a|hasta|to|y)\s*(\d{2})\b/);
  if (age && !(age[1] === '20' && (age[2] === '34' || age[2] === '64'))) {
    const measure = asksQualificationFit ? 'tasa de sobrecualificación' : /\b(paro|desemple\w*)\b/.test(text) ? 'tasa de paro' : 'tasa de empleo';
    return [`${measure} para personas de ${age[1]} a ${age[2]} años con la titulación solicitada, y el denominador de esa población`];
  }
  if (/\b(joven\w*|juvenil)\b/.test(text)) {
    const measure = asksQualificationFit ? 'sobrecualificación' : /\b(paro|desemple\w*)\b/.test(text) ? 'desempleo' : 'empleo';
    return [`medición directa de ${measure} para la franja de edad a la que se refiere «jóvenes», con titulación, periodo y denominador explícitos`];
  }
  return fallback;
};

// This composer reports only the supplied observations. It cannot turn a
// contextual proxy into a verdict on a different measurement or silently
// infer a real-wage change from unmatched wage and price periods.
export const focusedEvidencePlan = (claim, { observations = [], propositions = [], now = Date.now() } = {}) => {
  const focus = claimFocusFor(claim);
  if (!focus) return undefined;
  const normalizedClaim = normalize(claim);
  const sectorNames = [/\bturis\w*\b/, /\bhosteler\w*\b/, /\bhotel\w*\b/, /\bagricultur\w*\b/, /\bsector primario\b/, /\bconstrucci\w*\b/, /\bindustri\w*\b/, /\bmanufactur\w*\b/, /\bcomerci\w*\b/, /\btransporte\b/, /\bfinancier\w*\b/, /\btecnolog\w*\b/];
  const continuesSameSubject = (item) => {
    const clauseFocus = claimFocusFor(item.text);
    if (clauseFocus?.id === focus.id) return true;
    const clauseText = normalize(item.text);
    const sameSectorOutput = focus.id === 'sector-wage-comparison'
      && /\b(pib|producto interior bruto|valor anadido|produccion|aport\w*)\b/.test(clauseText)
      && sectorNames.some((pattern) => pattern.test(normalizedClaim) && pattern.test(clauseText));
    const sameLandlordMotive = focus.id === 'rental-landlord-motives'
      && (/^(?:les|le|esa modalidad|esa forma)\b/.test(clauseText)
        && /\b(flexibil\w*|seguridad|riesg\w*|rentabil\w*)\b/.test(clauseText)
        && /\b(alquil\w*|arrendam\w*|temporad\w*|contrat\w*)\b/.test(clauseText)
        || /\b(propietari\w*|arrendador\w*|caser\w*|due[nñ]os?)\b/.test(clauseText)
          && /\b(prefier\w*|prefer\w*)\b/.test(clauseText)
          && /\b(alquil\w*|arrendam\w*|temporad\w*|contrat\w*)\b/.test(clauseText));
    const housingInvestmentReason = focus.id === 'housing-investment-return-comparison'
      && propositions.length === 2 && /\b(porque|ya que|debido a que)\b/.test(normalizedClaim)
      && (/\b(inversor\w*|compr\w*|invert\w*)\b/.test(clauseText)
        && /\b(viviend\w*|inmobiliari\w*|inmuebl\w*|ladrillo)\b/.test(clauseText)
        || /\b(rentabil\w*|rendimient\w*|retorno\w*|benefici\w*)\b/.test(clauseText)
          && /\b(negocio\w*|empres\w*|productiv\w*|economia real)\b/.test(clauseText));
    const firmWageMechanism = focus.id === 'firm-wage-capacity'
      && propositions.length === 2 && /\b(pero|aunque|mientras)\b/.test(normalizedClaim)
      && (/(?:\b(empres\w*|compa[nñ]i\w*|firmas?|multinacional\w*)\b[\s\w]{0,50}\b(productiv\w*|benefici\w*)\b|\b(productiv\w*|benefici\w*)\b[\s\w]{0,50}\b(empres\w*|compa[nñ]i\w*|firmas?|multinacional\w*)\b)/.test(clauseText)
        || /\b(salari\w*|sueld\w*|remuner\w*|nomina\w*)\b/.test(clauseText));
    const pensionWageMechanism = focus.id === 'pension-wage-contribution-base'
      && propositions.length === 2 && /\b(pero|aunque|mientras)\b/.test(normalizedClaim)
      && (/(?:\b(pension\w*|jubilaci[oó]n)\b[\s\w]{0,60}\b(salari\w*|sueld\w*|cotiz\w*)\b|\b(salari\w*|sueld\w*|cotiz\w*)\b[\s\w]{0,60}\b(pension\w*|jubilaci[oó]n)\b)/.test(clauseText)
        || /\b(emple\w*|ocupaci[oó]n|cotiz\w*)\b/.test(clauseText));
    if (sameSectorOutput) return true;
    if (sameLandlordMotive) return true;
    if (housingInvestmentReason || firmWageMechanism || pensionWageMechanism) return true;
    if (clauseFocus) return false;
    // A clause such as “una parte se produce más barata” can refer back to
    // the preceding subject. A new named subject must remain a separate
    // proposition rather than silently inheriting this measurement contract.
    return /^(?:una|otra|esa|esta)\s+(?:parte|porcion)\s+(?:se|es|sea|son|puede|podria)\b/.test(normalize(item.text));
  };
  if (propositions.length > 1 && propositions.some((item) => !continuesSameSubject(item))) return undefined;
  if (focus.id === 'real-wages') {
    const matched = realWagePlan(claim, { observations, now });
    if (matched) return matched;
  }
  const fullTime = /\b(?:jornada completa|tiempo completo)\b/i.test(claim);
  const asksAboutTeachers = /\b(?:por (?:profesor\w*|docent\w*)|alumn\w* (?:por|entre) (?:profesor\w*|docent\w*))\b/.test(normalize(claim));
  const educationOutcome = focus.id === 'education-employment-outcomes';
  const educationTrendRequested = educationOutcome
    && /\b(ya no|antes|ahora|cada vez|subid\w*|aument\w*|crec\w*|bajad\w*|descend\w*|disminu\w*|mejor\w*|peor\w*|empeor\w*|desde|entre \d{4} y \d{4})\b/.test(normalizedClaim);
  const comparesSectorOutput = focus.id === 'sector-wage-comparison'
    && /\b(pib|producto interior bruto|valor anadido|produccion|aport\w*)\b/.test(normalizedClaim);
  const comparesSectorEmployment = focus.id === 'sector-wage-comparison'
    && /\b(emple\w*|ocupaci\w*|contrataci\w*)\b/.test(normalizedClaim)
    && /\b(crec\w*|aument\w*|sub\w*|baj\w*|disminu\w*|menos|mas|mayor\w*|menor\w*|desplaz\w*)\b/.test(normalizedClaim);
  const employmentTrendAfterNoun = /\b(emple\w*|ocupaci\w*|contrataci\w*)\b[\s\w]{0,20}\b(crec\w*|aument\w*|sub\w*|baj\w*|disminu\w*|desplaz\w*|evoluc\w*|variaci\w*|increment\w*|descend\w*|caid\w*|reduc\w*)\b/.test(normalizedClaim);
  const employmentTrendBeforeNoun = /\b(crec\w*|aument\w*|sub\w*|baj\w*|disminu\w*|desplaz\w*|evoluc\w*|variaci\w*|increment\w*|descend\w*|caid\w*|reduc\w*)\b[\s\w]{0,20}\b(emple\w*|ocupaci\w*|contrataci\w*)\b/.test(normalizedClaim);
  const comparesSectorEmploymentTrend = comparesSectorEmployment && (employmentTrendAfterNoun || employmentTrendBeforeNoun);
  const comparesSectorAverageWageImpact = focus.id === 'sector-wage-comparison'
    && /\b(salari\w*|sueld\w*|remuneraci\w*)\b.{0,30}\b(medi\w*|promedi\w*)\b|\b(medi\w*|promedi\w*)\b.{0,30}\b(salari\w*|sueld\w*|remuneraci\w*)\b/.test(normalizedClaim)
    && /\b(tir\w*\s+hacia abajo|arrastr\w*|deprim\w*|lastr\w*|reduc\w*|baj\w*|disminu\w*)\b/.test(normalizedClaim);
  const comparesLifetimePensionContributions = focus.id === 'future-pension-outlook'
    && /\b(pag\w*\s+(?:las?\s+)?pension\w*|cotiz\w*|contribu\w*|financ\w*)\b/.test(normalizedClaim)
    && /\b(decad\w*|durante|jubil\w*|retir\w*)\b/.test(normalizedClaim);
  const ids = [...focusedMetricIdsFor(claim)];
  const allowedDirect = educationOutcome ? ids : focus.id === 'working-poverty' && fullTime ? ['in_work_poverty_full_time_rate'] : focus.direct;
  const asksAboutMakingEndsMeet = focus.id === 'working-poverty' && /\b(fin de mes|alcanza para vivir|llega para vivir|cubrir (?:los )?gastos)\b/.test(normalize(claim));
  const educationNeedForMetric = (id) => id === 'employment_rate_tertiary_education'
    ? 'tasa de empleo entre residentes de 20 a 64 años con educación terciaria; denominador: toda la población residente de ese grupo'
    : id === 'unemployment_rate_tertiary_education'
      ? 'tasa de paro entre personas activas de 20 a 64 años con educación terciaria; denominador: ocupados más desempleados de ese grupo'
      : id === 'tertiary_overqualification_rate'
        ? 'sobrecualificación entre personas ocupadas de 20 a 64 años con educación terciaria; denominador: todas las personas ocupadas de ese grupo'
        : id === 'tertiary_overqualification_rate_age_20_34'
          ? 'sobrecualificación entre personas ocupadas de 20 a 34 años con educación terciaria; denominador: todas las personas ocupadas de ese grupo'
        : '';
  const needs = asksAboutMakingEndsMeet ? ['dificultad declarada para llegar a fin de mes', 'situación laboral y jornada de las personas consultadas', 'periodo y población']
    : focus.id === 'class-size' ? [asksAboutTeachers ? 'alumnado por docente' : 'alumnado por grupo o aula', 'etapa educativa y titularidad', 'territorio y curso']
      : educationOutcome ? ids.length ? ids.map(educationNeedForMetric).filter(Boolean) : educationOutcomeNeedsForClaim(claim, focus.needs)
        : focus.id === 'sector-wage-comparison' ? [
          ...focus.needs,
          ...(comparesSectorEmployment ? [comparesSectorEmploymentTrend
            ? 'variación del empleo por actividad entre los mismos periodos'
            : 'empleo por actividad, población y periodo'] : []),
          ...(comparesSectorAverageWageImpact ? ['salario medio por actividad y proporción del empleo de cada actividad, en el mismo periodo'] : []),
          ...(comparesSectorOutput ? ['valor añadido o aportación al PIB por el mismo sector y periodo'] : []),
        ] : focus.id === 'future-pension-outlook' ? [
          ...focus.needs,
          ...(comparesLifetimePensionContributions ? ['cotizaciones y prestaciones futuras para la misma cohorte y ciclo laboral'] : []),
        ] : focus.needs;
  const directIds = asksAboutMakingEndsMeet ? [] : ids.filter((id) => allowedDirect.includes(id) || allowedDirect.includes(id.replace(/_europe$/, '')));
  const fitsClaim = observationFitsClaim(claim);
  const facts = ids.flatMap((id) => id === 'mean_hourly_earnings_by_activity'
    ? sectorEarningsFactsForClaim(claim, observations, fitsClaim)
    : factsForMetric(id, observations, fitsClaim));
  if (ids.includes('industrial_electricity_price_europe')) facts.sort((left, right) => {
    const order = (fact) => fact.latest.dimensions?.geo === 'ES' ? 0 : /^EU/.test(String(fact.latest.dimensions?.geo || '')) ? 1 : 2;
    return order(left) - order(right);
  });
  const limitation = educationOutcome ? educationOutcomeLimitation(ids, focus.limitation)
    : focus.id === 'sector-wage-comparison' ? [
      comparesSectorEmployment
        ? comparesSectorEmploymentTrend
          ? 'La encuesta describe salarios; no mide el crecimiento del empleo ni la productividad.'
          : 'La encuesta describe salarios; no mide el empleo por actividad ni la productividad.'
        : comparesSectorAverageWageImpact
          ? 'La encuesta describe salarios brutos, pero no establece la contribución de cada actividad al promedio nacional ni mide productividad.'
          : focus.limitation,
    ].filter(Boolean).join(' ') : focus.limitation;
  const territories = requestedGeographyScopes(claim);
  const explanation = focus.explanationEvidence && now < Date.parse(focus.explanationEvidence.expiresAt)
    && territories.every(({ id }) => focus.explanationEvidence.territories?.includes(id))
    && (!focus.explanationEvidence.when || focus.explanationEvidence.when(normalize(claim))) ? focus.explanationEvidence : undefined;
  const workHousingTrendRequested = focus.id === 'work-housing-independence'
    && /\b(ya no|cada vez|se ha vuelto|antes|ahora|desde (?:19|20)\d{2}|en (?:19|20)\d{2}|entre (?:19|20)\d{2} y (?:19|20)\d{2}|ultimos a[nñ]os)\b/.test(normalizedClaim);
  const claimType = focus.id === 'private-healthcare-access'
    ? privateHealthcareAccessClaimType(claim)
    : focus.id === 'work-housing-independence' ? (workHousingTrendRequested ? 'trend' : 'descriptive')
    : focus.claimType || (explanation ? 'definition' : 'descriptive');
  const sources = [...new Map([...facts.flatMap((fact) => fact.items.map((item) => item.source)), ...(explanation?.sources || [])].map((source) => [source.id, source])).values()];
  const direct = facts.filter((fact) => directIds.includes(fact.id));
  const context = facts.filter((fact) => !directIds.includes(fact.id));
  const evidenceIds = [...new Set([...facts.flatMap((fact) => fact.items.map((item) => item.id)), ...(explanation?.sources || []).map((source) => source.id)].filter(Boolean))];
  const explanationSourceIds = (explanation?.sources || []).map((source) => source.id);
  const explanationSupportsClaim = Boolean(explanation?.directClaimEvidence);
  const directEvidenceIds = [...new Set([...direct.flatMap((fact) => fact.items.map((item) => item.id)), ...(explanationSupportsClaim ? explanationSourceIds : [])].filter(Boolean))];
  const directSourceIds = [...new Set([...direct.flatMap((fact) => fact.sourceIds), ...(explanationSupportsClaim ? explanationSourceIds : [])])];
  const contextualExplanationSourceIds = explanationSupportsClaim ? [] : explanationSourceIds;
  const explanationMeasuresClaim = Boolean(explanationSupportsClaim && explanation.facts?.length && explanation.sources?.length);
  const missing = educationOutcome
    ? ids.length ? ids.filter((id) => !facts.some((fact) => fact.id === id)).map(educationNeedForMetric) : needs
    : direct.length || explanationMeasuresClaim ? [] : needs;
  const primaryFacts = (direct.length ? direct : context).slice(0, educationOutcome ? 4 : 2);
  const trendNotes = educationTrendRequested ? primaryFacts.flatMap((fact) => {
    const quality = comparisonQuality(fact.items, { temporal: true, firstPeriod: fact.items[0]?.period || '' });
    return [`La respuesta muestra el dato más reciente (${periodLabel(fact.latest.period)}); no compara dos periodos y no demuestra por sí sola que la tasa haya subido o bajado.${quality.blocked ? ` ${quality.reason}` : ''}`];
  }) : [];
  const scopeNotes = [...new Set(primaryFacts.flatMap((fact) => [
    fact.latest.freshness === 'stale' ? 'La fuente no se ha actualizado en el plazo previsto y puede no incluir revisiones recientes.' : '',
    fact.latest.freshness === 'unknown' ? 'No se ha podido comprobar cuándo se consultó esta fuente.' : '',
    ...observationFlagNotes(fact.latest.status),
    ...trendNotes,
    fact.latest.dimensions?.provisional === true ? 'Resultados provisionales de una oleada; no equivalen al año completo.' : '',
    /^primary_care_wait_/.test(fact.id) ? 'La encuesta se refiere a la última consulta de adultos en medicina de familia pública durante los 12 meses anteriores; excluye mutualidades con asistencia privada.' : '',
    /^household_electricity_price/.test(fact.id) && fact.latest.dimensions?.nrg_cons === 'TOT_KWH' && fact.latest.dimensions?.tax === 'I_TAX'
      ? 'Es un precio medio de los hogares para todos los tramos de consumo, con impuestos y tasas incluidos.' : '',
    /^industrial_electricity_price/.test(fact.id) && fact.latest.dimensions?.nrg_cons === 'MWH2000-19999' && fact.latest.dimensions?.tax === 'X_VAT'
      ? 'Eurostat agrupa a consumidores no domésticos que usan entre 2.000 y menos de 20.000 MWh al año (banda ID). El precio excluye el IVA y otros impuestos y gravámenes recuperables; no identifica un sector concreto ni el contrato de cada empresa.' : '',
  ]).filter(Boolean))];
  const industrialComparison = (() => {
    if (!directIds.includes('industrial_electricity_price_europe')) return '';
    const spain = primaryFacts.find((fact) => fact.latest.dimensions?.geo === 'ES');
    const union = primaryFacts.find((fact) => /^EU/.test(String(fact.latest.dimensions?.geo || '')));
    if (!spain || !union || spain.latest.period !== union.latest.period || spain.latest.unit !== union.latest.unit
      || spain.latest.source?.id !== union.latest.source?.id) return '';
    const compatibleDimensions = (item) => JSON.stringify(Object.fromEntries(Object.entries(item.dimensions || {})
      .filter(([key]) => !['geo', 'time', 'period', 'year'].includes(key)).sort(([left], [right]) => left.localeCompare(right))));
    if (compatibleDimensions(spain.latest) !== compatibleDimensions(union.latest)) return '';
    const difference = Math.abs(spain.latest.value - union.latest.value);
    const relation = spain.latest.value < union.latest.value ? 'menos' : spain.latest.value > union.latest.value ? 'más' : 'el mismo precio medio';
    const differenceText = relation === 'el mismo precio medio' ? '' : `: ${number(difference, 'industrial_electricity_price_europe')} €/kWh ${relation} en España`;
    return `En ${periodLabel(spain.latest.period)}, el precio medio fue ${number(spain.latest.value, 'industrial_electricity_price_europe')} €/kWh en España y ${number(union.latest.value, 'industrial_electricity_price_europe')} €/kWh en la Unión Europea${differenceText}.`;
  })();
  const findingText = industrialComparison || primaryFacts.map((fact) => educationOutcome ? educationOutcomeFinding(fact) : fact.finding).join(' ');
  const gap = missing.length ? `Falta una medición directa de ${missing.join('; ')}.` : '';
  const sectorEmploymentExplanation = focus.id === 'sector-wage-comparison' && comparesSectorEmployment
    ? comparesSectorEmploymentTrend
      ? 'El crecimiento del empleo debe compararse con series por actividad y periodos iguales. Salarios y productividad requieren medidas aparte.'
      : 'El empleo debe compararse por actividad, población y periodo. Salarios y productividad requieren medidas aparte.'
    : focus.explanation;
  const explanationReply = explanation
    ? explanationSupportsClaim ? explanation.facts.join('\n\n') : [sectorEmploymentExplanation, `Como contexto: ${explanation.facts.join('\n\n')}`].filter(Boolean).join('\n\n')
    : sectorEmploymentExplanation;
  const findingLead = direct.length ? 'Datos de la fuente: ' : focus.id === 'sector-wage-comparison' ? '' : 'Como contexto: ';
  const reply = [explanationReply, findingText ? `${findingLead}${findingText}` : explanationMeasuresClaim ? '' : gap,
    direct.length || explanationMeasuresClaim ? scopeNotes.join(' ') : [gap && findingText ? gap : '', scopeNotes.join(' ')].filter(Boolean).join(' '), limitation].filter(Boolean).join('\n\n');
  const evidenceLevel = directEvidenceIds.length || contextualExplanationSourceIds.length ? 'limited' : 'insufficient';
  const families = ids.map((id) => {
    const matching = facts.filter((fact) => fact.id === id);
    return {
      familyId: id, label: labels[id] || vocabulary.get(id)?.name || id, direction: 'qualifies',
      status: matching.length ? directIds.includes(id) ? 'available' : 'partial' : 'missing',
      dataKind: directIds.includes(id) ? 'observed' : 'context',
      finding: matching.map((fact) => fact.finding).join(' ') || 'No se ha localizado una medición compatible.',
      data: matching.map((fact) => fact.finding),
      evidenceIds: matching.flatMap((fact) => fact.items.map((item) => item.id)).filter(Boolean),
      sourceIds: [...new Set(matching.flatMap((fact) => fact.sourceIds))],
      dimensions: matching.length === 1 ? { subject: focus.label, period: matching[0].latest.period, geography: matching[0].latest.geography || matching[0].latest.dimensionLabels?.geo,
        population: matching[0].latest.population || vocabulary.get(id)?.population, denominator: matching[0].latest.denominator, unit: unitFor(matching[0].latest) } : undefined,
      ...(directIds.includes(id) ? {} : { missingDimensions: needs }),
    };
  });
  if (explanationMeasuresClaim) families.push({
    familyId: focus.id,
    familyLabel: focus.label,
    label: focus.label,
    direction: 'qualifies',
    status: 'available',
    dataKind: 'snapshot',
    finding: explanation.facts.join(' '),
    data: explanation.facts,
    evidenceIds: explanation.sources.map((source) => source.id),
    sourceIds: explanation.sources.map((source) => source.id),
    dimensions: explanation.dimensions,
  });
  else if (explanation && ids.length === 0) families.push({
    familyId: focus.id,
    familyLabel: focus.label,
    label: explanation.evidenceLabel || `Contexto: ${focus.label}`,
    direction: 'qualifies',
    status: 'partial',
    dataKind: 'context',
    finding: explanation.facts.join(' '),
    data: explanation.facts,
    evidenceIds: explanation.sources.map((source) => source.id),
    sourceIds: explanation.sources.map((source) => source.id),
    dimensions: explanation.dimensions,
    missingDimensions: needs,
  });
  return {
    id: `measurement-${focus.id}`, schemaVersion: '1', evidenceLevel, coverage: facts.length || explanation ? 'qualified' : 'insufficient',
    claimType, headline: explanationMeasuresClaim ? focus.explanationHeadline || `Datos sobre ${focus.label}` : explanation ? focus.explanationHeadline || `Contexto relacionado con ${focus.label}` : direct.length ? `Datos sobre ${focus.label}` : facts.length ? `Hay contexto, pero falta medir ${focus.label}` : `Faltan datos compatibles sobre ${focus.label}`,
    summary: focus.explanation, shareableReply: reply, shareableSourceIds: sources.map((source) => source.id),
    interpretation: { kind: claimType === 'causal' ? 'causal' : claimType === 'comparative' ? 'comparative' : 'quantitative', subject: focus.label, predicate: claimType === 'causal' ? 'requires_causal_design' : 'requires_compatible_measurement', normalizedClaim: claim, evidenceNeeds: needs },
    blocks: [
      { type: 'claim_breakdown', items: [{ text: claim, type: claimType, explicit: true, evidenceIds: directEvidenceIds, sourceIds: directSourceIds,
        verdict: explanationMeasuresClaim ? 'mixed' : 'insufficient', evidenceLevel: directEvidenceIds.length ? 'limited' : 'none',
        finding: explanationMeasuresClaim ? explanation.facts.join(' ') : direct.length ? direct.slice(0, 2).map((fact) => educationOutcome ? educationOutcomeFinding(fact) : fact.finding).join(' ') : undefined }], propositionIds: ['submitted-claim'] },
      ...(explanation ? [explanationSupportsClaim
        ? { type: 'confirmed', evidenceIds: explanation.sources.map((source) => source.id), points: explanation.facts }
        : { type: 'data_finding', dataKind: 'context', evidenceIds: explanation.sources.map((source) => source.id), points: explanation.facts }] : []),
      ...facts.map((fact) => ({ type: 'data_finding', evidenceIds: fact.items.map((item) => item.id).filter(Boolean), points: [educationOutcome ? educationOutcomeFinding(fact) : fact.finding] })),
      ...(missing.length ? [{ type: 'evidence_gap', missing, needed: missing, nextAction: `Buscar una fuente primaria que mida ${focus.label} con ese ámbito.` }] : []),
      { type: 'cannot_conclude', evidenceIds: [], points: [limitation] },
      { type: 'conversation_reply', evidenceIds, text: reply },
    ],
    limitation, evidenceIds, sourceIds: sources.map((source) => source.id), sourceLinks: sources,
    evidenceSummary: { mode: facts.length ? 'dynamic' : explanation ? 'snapshot' : 'none', families, ...(missing.length ? { missingDimensions: missing } : {}) },
    answerScope: { kind: 'measurement', family: focus.id, directMetrics: directIds, contextMetrics: ids.filter((id) => !directIds.includes(id)) },
    knowledgeVersion: RUNTIME_VERSIONS.warehouseKnowledge,
  };
};
