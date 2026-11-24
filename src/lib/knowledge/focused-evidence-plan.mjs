import { claimFocusFor, focusedMetricIdsFor, privateHealthcareAccessClaimType, tertiaryOverqualificationCitizenshipFitsClaim } from './claim-focus.mjs';
import measurementDefinitions, { metricVocabulary } from './measurement-definitions.generated.mjs';
import { RUNTIME_VERSIONS } from './runtime-versions.mjs';
import { realWagePlan } from './real-wage-comparison.mjs';
import { REAL_WAGE_SNAPSHOT } from './real-wage-snapshot.mjs';
import { hicpBasketComparisonPlan, hicpBasketEvidenceGapPlan } from './hicp-basket-comparison.mjs';
import { HICP_BASKET_SNAPSHOT } from './hicp-basket-snapshot.mjs';
import { collectiveAgreementWagePlan } from './collective-agreement-wage-comparison.mjs';
import { COLLECTIVE_AGREEMENT_WAGE_SNAPSHOT } from './collective-agreement-wage-snapshot.mjs';
import { gdpPerCapitaComparisonPlan, gdpPerCapitaEvidenceGapPlan } from './gdp-per-capita-comparison.mjs';
import { GDP_REAL_PER_CAPITA_SNAPSHOT } from './gdp-real-per-capita-snapshot.mjs';
import { labourProductivityAnalysisPlan, labourProductivityEvidenceGapPlan } from './labour-productivity-analysis.mjs';
import { LABOUR_PRODUCTIVITY_SNAPSHOT } from './labour-productivity-snapshot.mjs';
import { snapshotLifecycle } from './snapshot-lifecycle.mjs';
import { comparisonQuality, observationFlagNotes } from './observation-quality.mjs';
import { ageScopeMatcherFor } from './age-scope.mjs';
import { periodScopeMatcherFor } from './period-scope.mjs';
import { geographyScopeMatcherFor, requestedGeographyScopes } from './geography-scope.mjs';
import { sexScopeMatcherFor } from './sex-scope.mjs';
import { metricDimensionContractFits } from './metric-contract.mjs';

const vocabulary = new Map(metricVocabulary.map((metric) => [metric.id, metric]));
const normalize = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const observationFitsClaim = (claim) => {
  const matchesAge = ageScopeMatcherFor(claim);
  const matchesPeriod = periodScopeMatcherFor(claim);
  const matchesGeography = geographyScopeMatcherFor(claim);
  const matchesSex = sexScopeMatcherFor(claim);
  const text = normalize(claim);
  const requestedPrimaryCareWave = /\b(?:primera|1(?:a|era)?)\s+(?:oleada|ola)\b|\b(?:oleada|ola)\s+1\b/.test(text) ? '1'
    : /\b(?:segunda|2(?:a|da)?)\s+(?:oleada|ola)\b|\b(?:oleada|ola)\s+2\b/.test(text) ? '2'
      : /\b(?:tercera|3(?:a|era)?)\s+(?:oleada|ola)\b|\b(?:oleada|ola)\s+3\b/.test(text) ? '3' : undefined;
  const requestedTerritories = requestedGeographyScopes(claim);
  return (item) => {
    if (!matchesAge(item) || !matchesPeriod(item) || !matchesGeography(item) || !matchesSex(item)) return false;
    if (/^primary_care_wait_/.test(item.metricId || '') && requestedPrimaryCareWave
      && String(item.dimensions?.surveyWave || '') !== requestedPrimaryCareWave) return false;
    if (!tertiaryOverqualificationCitizenshipFitsClaim(claim, item)) return false;
    if (['subjective_poverty_rate', 'subjective_poverty_difficulty_rate', 'subjective_poverty_great_difficulty_rate'].includes(item.metricId)
      && /\b(?:hogares? (?:unipersonales?|monoparentales?|con (?:hijos?|menores|dependientes)|sin hijos?)|familias? monoparentales?|personas que viven solas|madres? solas|padres? solos)\b/.test(text)
      && item.dimensions?.hhcomp === 'TOTAL') return false;
    if (['subjective_poverty_rate', 'subjective_poverty_difficulty_rate', 'subjective_poverty_great_difficulty_rate'].includes(item.metricId)
      && /\b(?:yo|mi hogar|mi familia|mis gastos|no puedo|no llego|me cuesta|me resulta dificil)\b/.test(text)) return false;
    if (/^tourist_housing_(?:count|share)$/.test(item.metricId || '')
      && requestedTerritories.length === 0 && item.dimensions?.geographyLevel !== 'country') return false;
    if (/^tourist_housing_(?:count|share)$/.test(item.metricId || '')
      && /\b(?:barri\w*|distrit\w*|municipi\w*|ciudad\w*|zonas?|centro|casco urbano)\b/.test(text)
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
  mean_hourly_earnings_by_education: 'Salario bruto medio por hora según estudios alcanzados',
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
  in_work_poverty_full_time_rate: 'Personas ocupadas a jornada completa en riesgo de pobreza',
  in_work_poverty_part_time_rate: 'Personas ocupadas a jornada parcial en riesgo de pobreza',
  subjective_poverty_rate: 'Población en hogares que declaran dificultad para llegar a fin de mes',
  primary_care_wait_days: 'Demora entre quienes esperaron más de un día',
  primary_care_wait_over_one_day_rate: 'Pacientes de medicina de familia pública que esperaron más de un día por falta de cita',
  tourist_housing_count: 'Viviendas turísticas estimadas',
  tourist_housing_share: 'Viviendas turísticas como parte del parque total de viviendas',
  tourism_characteristic_employment_share: 'Empleo en ramas características del turismo como parte del empleo total',
  tourism_characteristic_employment_jobs: 'Puestos de trabajo en ramas características del turismo',
};
const unitFor = (item) => /^(?:household|industrial)_electricity_price/.test(item.metricId || '') && item.dimensions?.currency && (item.dimensions?.unit === 'KWH' || /^(?:kilowatt-hour|kwh)$/i.test(item.unit || ''))
  ? `${item.dimensions.currency === 'EUR' ? '€' : item.dimensions.currency}/kWh`
  : /^(?:household|industrial)_electricity_price/.test(item.metricId || '') && /eur|euro/i.test(item.unit || '') ? '€/kWh'
  : /percent|percentage|^pc$|%/i.test(item.unit || '') ? '%' : /days|d[ií]as/i.test(item.unit || '') ? 'días'
  : item.metricId === 'tourism_characteristic_employment_jobs' ? 'miles de puestos de trabajo'
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
  dimensions: Object.fromEntries(Object.entries(item.dimensions || {}).filter(([key]) => !['time', 'period', 'year'].includes(key)
    && (!/^primary_care_wait_/.test(item.metricId || '')
      || !['surveyYear', 'surveyWave', 'sampleSize', 'eligibleSampleSize', 'validResponseSampleSize', 'question'].includes(key)))
    .sort(([a], [b]) => a.localeCompare(b))),
  dataKind: /^primary_care_wait_/.test(item.metricId || '') ? 'observed' : item.dataKind || 'observed',
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
  const metricRows = observations.filter((row) => row.metricId === id && metricDimensionContractFits(row));
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
    // Primary-care answers cite the latest matching wave. Its source
    // attribution must not imply that older waves were also cited.
    const answerItems = /^primary_care_wait_/.test(id) ? [latest] : rows;
    return { id, items: answerItems, latest, finding, scope, sourceIds: [...new Set(answerItems.map((item) => item.source.id))] };
  }).filter(Boolean);
};

const SUBJECTIVE_POVERTY_COMPONENT_METRICS = Object.freeze({
  DIF: 'subjective_poverty_difficulty_rate',
  GRT: 'subjective_poverty_great_difficulty_rate',
});
const subjectivePovertyFactsFromComponents = (observations, fitsClaim) => {
  const groups = new Map();
  for (const item of observations) {
    const level = Object.entries(SUBJECTIVE_POVERTY_COMPONENT_METRICS).find(([, metricId]) => metricId === item.metricId)?.[0];
    const dimensions = item.dimensions || {};
    if (!level || !validNumber(item.value) || !item.period || item.freshness === 'invalid'
      || ['projected', 'budget'].includes(item.dataKind) || !sourceValid(item.source) || !fitsClaim(item)
      || !String(item.source.url || '').includes('/ilc_mdes09')
      || dimensions.freq !== 'A' || dimensions.unit !== 'PC' || dimensions.geo !== 'ES'
      || dimensions.hhcomp !== 'TOTAL' || dimensions.rskpovth !== 'TOTAL' || dimensions.lev_diff !== level) continue;
    const key = JSON.stringify({
      geography: item.geography || dimensions.geo,
      population: item.population || '', denominator: item.denominator || '', unit: item.unit || '',
      dimensions: Object.fromEntries(Object.entries(dimensions)
        .filter(([name]) => !['lev_diff', 'time'].includes(name)).sort(([left], [right]) => left.localeCompare(right))),
    });
    const periods = groups.get(key) || new Map();
    const components = periods.get(item.period) || { DIF: [], GRT: [] };
    components[level].push(item);
    periods.set(item.period, components);
    groups.set(key, periods);
  }
  return [...groups.values()].flatMap((periods) => {
    const pairs = [];
    for (const [period, components] of periods) {
      const selected = {};
      let invalidPair = false;
      for (const level of ['DIF', 'GRT']) {
        const candidates = components[level].sort((left, right) => (Date.parse(right.source?.retrievedAt || '') || 0) - (Date.parse(left.source?.retrievedAt || '') || 0)
          || String(left.id || '').localeCompare(String(right.id || '')));
        if (!candidates.length) { invalidPair = true; break; }
        const newestAt = Date.parse(candidates[0].source?.retrievedAt || '') || 0;
        const newest = candidates.filter((item) => (Date.parse(item.source?.retrievedAt || '') || 0) === newestAt);
        if (newest.some((item) => item.value !== newest[0].value || String(item.status || '') !== String(newest[0].status || ''))) { invalidPair = true; break; }
        selected[level] = newest[0];
      }
      if (invalidPair || selected.DIF.unit !== selected.GRT.unit
        || Math.abs((Date.parse(selected.DIF.source?.retrievedAt || '') || 0) - (Date.parse(selected.GRT.source?.retrievedAt || '') || 0)) > 86_400_000) continue;
      let difficultyUrl; let greatDifficultyUrl;
      try {
        difficultyUrl = new URL(selected.DIF.source.url);
        greatDifficultyUrl = new URL(selected.GRT.source.url);
      } catch { continue; }
      if (difficultyUrl.hostname !== greatDifficultyUrl.hostname || difficultyUrl.pathname !== greatDifficultyUrl.pathname) continue;
      const difficultyValue = selected.DIF.value;
      const greatDifficultyValue = selected.GRT.value;
      const base = selected.DIF;
      const aggregate = {
        ...base,
        id: `subjective-poverty-${period}-${selected.DIF.id}-${selected.GRT.id}`,
        metricId: 'subjective_poverty_rate',
        metric: 'Población en hogares que declaran dificultad o gran dificultad para llegar a fin de mes',
        value: Number((difficultyValue + greatDifficultyValue).toFixed(2)),
        population: base.population || 'Personas residentes en hogares privados, clasificadas según la respuesta del hogar sobre cubrir gastos habituales',
        denominator: base.denominator || 'Población residente en hogares privados',
        dimensions: {
          ...base.dimensions,
          lev_diff: ['DIF', 'GRT'],
          lev_diff_values: { DIF: difficultyValue, GRT: greatDifficultyValue },
          calculation: `${difficultyValue} + ${greatDifficultyValue} puntos porcentuales`,
        },
        dimensionLabels: { ...base.dimensionLabels, lev_diff: 'Difficulty or great difficulty' },
        sourceLinks: [selected.DIF.source, selected.GRT.source],
        freshness: [selected.DIF.freshness, selected.GRT.freshness].includes('stale') ? 'stale'
          : [selected.DIF.freshness, selected.GRT.freshness].includes('unknown') ? 'unknown' : 'fresh',
        status: [...new Set([selected.DIF.status, selected.GRT.status].filter(Boolean).join('').split(''))].sort().join(''),
      };
      pairs.push({ aggregate, components: [selected.DIF, selected.GRT] });
    }
    pairs.sort((left, right) => String(left.aggregate.period).localeCompare(String(right.aggregate.period)));
    if (!pairs.length) return [];
    const latest = pairs.at(-1).aggregate;
    const items = pairs.flatMap((pair) => pair.components);
    return [{
      id: 'subjective_poverty_rate',
      items,
      latest,
      finding: subjectivePovertyFinding({ latest }),
      scope: 'España · población residente en hogares privados · respuestas de EU-SILC «con dificultad» o «con gran dificultad»',
      sourceIds: [...new Set(items.map((item) => item.source?.id).filter(Boolean))],
    }];
  });
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

const earningsEducation = [
  { code: 'ED0-2', label: 'educación hasta secundaria inferior' },
  { code: 'ED3_4', label: 'secundaria superior y postsecundaria no terciaria' },
  { code: 'ED5-8', label: 'educación terciaria' },
];
const educationEarningsFactsForClaim = (observations, fitsClaim) => {
  const eligibleRows = observations.filter((item) => item.metricId === 'mean_hourly_earnings_by_education'
    && validNumber(item.value) && item.period === '2022' && item.freshness !== 'invalid'
    && sourceValid(item.source) && String(item.source?.url || '').includes('/earn_ses22_16?')
    && fitsClaim(item)
    && item.dimensions?.freq === 'A' && item.dimensions?.sex === 'T'
    && item.dimensions?.indic_se === 'ERN' && item.dimensions?.sizeclas === 'GE10'
    && item.dimensions?.nace_r2 === 'B-S_X_O' && item.dimensions?.unit === 'EUR'
    && item.dimensions?.geo === 'ES' && item.dimensions?.time === '2022'
    && earningsEducation.some(({ code }) => item.dimensions?.isced11 === code));
  const selected = [];
  for (const education of earningsEducation) {
    const candidates = eligibleRows.filter((item) => item.dimensions?.isced11 === education.code)
      .sort((a, b) => (Date.parse(b.source?.retrievedAt || '') || 0) - (Date.parse(a.source?.retrievedAt || '') || 0)
        || String(a.id || '').localeCompare(String(b.id || '')));
    if (!candidates.length) return [];
    const newestTime = Date.parse(candidates[0].source?.retrievedAt || '') || 0;
    const newest = candidates.filter((item) => (Date.parse(item.source?.retrievedAt || '') || 0) === newestTime);
    if (newest.some((item) => item.value !== newest[0].value || String(item.status || '') !== String(newest[0].status || ''))) return [];
    selected.push({ ...newest[0], educationLabel: education.label });
  }
  if (selected.some((item) => item.source.id !== selected[0].source.id || item.source.url !== selected[0].source.url
    || item.source.retrievedAt !== selected[0].source.retrievedAt)) return [];
  const values = selected.map((item) => `${item.educationLabel} (ISCED ${String(item.dimensions.isced11).replace(/^ED/, '').replace(/[-_]/g, '–')}): ${number(item.value, 'mean_hourly_earnings_by_education')} €/hora`);
  const latest = { ...selected[0], status: [...new Set(selected.map((item) => String(item.status || '')).filter(Boolean))].join('') };
  return [{
    id: 'mean_hourly_earnings_by_education', items: selected, latest,
    finding: `Eurostat, España, 2022: remuneración bruta media por hora según estudios alcanzados (no los exigidos por el puesto): ${values.join('; ')}. La serie cubre a empleados de empresas con al menos 10 empleados, ambos sexos, en industria, construcción y servicios; excluye administración pública, defensa y Seguridad Social obligatoria.`,
    scope: 'España · empleados de empresas con 10 o más personas · todos los sexos · industria, construcción y servicios excepto administración pública, defensa y Seguridad Social obligatoria · estudios alcanzados',
    sourceIds: [...new Set(selected.map((item) => item.source.id))],
  }];
};

const educationOutcomeFinding = (fact) => {
  const item = fact.latest;
  const value = `${number(item.value, fact.id)} %`;
  const period = periodLabel(item.period);
  const place = placeLabel(item) || 'el territorio consultado';
  const source = item.source?.publisher || 'Eurostat';
  if (fact.id === 'employment_rate_tertiary_education') return `${source}: en ${place}, el ${value} de las personas residentes de 20 a 64 años con educación terciaria estaba ocupada en ${period}.`;
  if (fact.id === 'unemployment_rate_tertiary_education') return `${source}: en ${place}, el ${value} de la población activa de 20 a 64 años con educación terciaria (ISCED 5–8) estaba en paro en ${period}.`;
  if (fact.id === 'tertiary_overqualification_rate') return `${source} (${place}, ${period}), sobrecualificación: el ${value} de las personas ocupadas de 20 a 64 años con educación terciaria trabajaba en ocupaciones ISCO 4–9, que no requieren ese nivel.`;
  if (fact.id === 'tertiary_overqualification_rate_age_20_34') return `${source}: tasa de sobrecualificación en ${place}, ${period}: el ${value} de las personas ocupadas de 20 a 34 años con educación terciaria trabajaba en ocupaciones ISCO 4–9, que no requieren ese nivel.`;
  return fact.finding;
};
const specialistOutpatientMagnitudeNotAssessed = (claim) => {
  const text = normalize(claim);
  const nonPeriodNumbers = [...text.matchAll(/\b\d+(?:[.,]\d+)?\b/g)]
    .some(([value]) => value !== '2025');
  return nonPeriodNumbers
    || /\b(much\w*|bastant\w*|considerable\w*|sustancial\w*|notable\w*|significativ\w*|dramatic\w*|liger\w*|lev\w*|demasiad\w*|dobl\w*|tripl\w*|mitad|veces?)\b/.test(text);
};
const namedEvidenceComparison = (claim, rows = []) => {
  const text = normalize(claim);
  const aliases = rows.flatMap((row) => [row.geography, ...(row.aliases || [])]
    .map((alias) => ({ row, alias: normalize(alias) })))
    .sort((left, right) => right.alias.length - left.alias.length);
  const rowByAlias = new Map(aliases.map((item) => [item.alias, item.row]));
  const pattern = aliases.map(({ alias }) => alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const mentions = [...text.matchAll(new RegExp(`\\b(${pattern})\\b`, 'g'))].map((match) => ({
    row: rowByAlias.get(match[1]), name: match[1], index: match.index, end: match.index + match[0].length,
  })).sort((left, right) => left.index - right.index);
  if (mentions.length !== 2 || mentions[0].name === mentions[1].name) return undefined;
  if (specialistOutpatientMagnitudeNotAssessed(claim)) return undefined;
  const [first, second] = mentions;
  const context = text.slice(Math.max(0, first.index - 45), second.end);
  const negatedComparisons = [...context.matchAll(/\bno\b.{0,40}\b(mas|mayor|superior|larg\w*|menos|menor|inferior|cort\w*)\b/g)];
  if (negatedComparisons.length > 1 || /\bno (?:solo|solamente)\b/.test(context)) return undefined;
  const claimsFirstHigher = /\b(mas|mayor|superior|larg\w*)\b/.test(context);
  const claimsFirstLower = /\b(menos|menor|inferior|cort\w*)\b/.test(context);
  const linkedEntities = /\b(que|frente|contra|versus|vs)\b/.test(text.slice(first.end, second.index));
  if (claimsFirstHigher === claimsFirstLower || !linkedEntities
    || !Number.isFinite(first.row.value) || !Number.isFinite(second.row.value)) return undefined;
  const firstIsClaimedHigher = negatedComparisons.length ? claimsFirstLower : claimsFirstHigher;
  const claimedHigher = firstIsClaimedHigher ? first.row : second.row;
  const actualHigher = first.row.value > second.row.value ? first.row
    : second.row.value > first.row.value ? second.row : undefined;
  if (!actualHigher) return undefined;
  return {
    first: first.row,
    second: second.row,
    actualHigher,
    actualLower: actualHigher === first.row ? second.row : first.row,
    claimedHigher: claimedHigher.geography,
    verdict: claimedHigher.geography === actualHigher.geography ? 'supported' : 'contradicted',
  };
};
const directMeasurementThresholdAssessment = (claim, direct) => {
  if (!direct.length || /\b(caus\w*|provoc\w*|porque|debido|por culpa|oblig\w*|empuj\w*)\b/.test(normalize(claim))) return undefined;
  const thresholdText = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9.,%]+/g, ' ').trim()
    .replace(/\b(?:un|uno|una)\s+(?=dias?\b)/g, '1 ');
  const comparisons = [
    { relation: 'at-most', phrase: 'no supera|no supero|no sobrepasa|no excede' },
    { relation: 'below', phrase: 'no alcanza|no lleg\\w*|por debajo de|por debajo del|menos de|menos del|inferior a|inferior al|menor de|menor del' },
    { relation: 'above', phrase: 'supera|supero|superaba|sobrepasa|excede|superior a|superior al|mayor de|mayor del|mas de|mas del|por encima de' },
    { relation: 'at-least', phrase: 'al menos|no baja de|no baja del|no desciende de|no desciende del|no cae por debajo de|no cae por debajo del' },
  ];
  const units = [
    { id: 'percentage', expression: '(?:%|por\\s+ciento)', factUnit: /(?:%|percent|percentage)/i, suffix: '%' },
    { id: 'days', expression: 'dias?', factUnit: /\b(?:days?|d[ií]as?)\b/i, suffix: 'días' },
  ];
  const comparisonsIn = (value) => {
    const text = thresholdText(value);
    const matches = [];
    for (const comparison of comparisons) for (const unit of units) {
      const expression = new RegExp(`\\b(?:${comparison.phrase})\\s+(?:(?:a|al|de|del)\\s+)?(?:(?:el|la|los|las)\\s+)?(\\d+(?:[.,]\\d+)?)\\s*${unit.expression}(?=$|[^a-z])`, 'g');
      for (const match of text.matchAll(expression)) {
        const startsWithNegation = /\bno\s*$/.test(text.slice(0, match.index));
        if (comparison.relation === 'above' && startsWithNegation) continue;
        matches.push({ relation: comparison.relation, threshold: Number(match[1].replace(',', '.')), unit, start: match.index, end: match.index + match[0].length });
      }
    }
    matches.sort((left, right) => left.start - right.start || right.end - left.end);
    return matches.filter((match, index) => !matches.slice(0, index).some((earlier) => earlier.end > match.start));
  };
  const distinctMatches = comparisonsIn(claim);
  if (!distinctMatches.length) return undefined;
  const measurementComparisons = [];
  const primaryCareMeanRequested = /\b(demora media|tiempo medio|duracion media|media de (?:la )?(?:espera|demora)|promedio(?: de (?:la )?(?:espera|demora|tiempo))?|en promedio|average wait|mean wait|average delay)\b/.test(normalize(claim));
  for (const comparison of distinctMatches) {
    const matchingFacts = direct.filter((fact) => comparison.unit.factUnit.test(String(fact.latest.unit || '')));
    if (matchingFacts.length > 1) return undefined;
    if (matchingFacts.length === 1) {
      if (matchingFacts[0].items.some((item) => item.freshness === 'stale')) return undefined;
      if (matchingFacts[0].id === 'primary_care_wait_days' && !primaryCareMeanRequested) return undefined;
      measurementComparisons.push({ comparison, fact: matchingFacts[0] });
      continue;
    }
    const definitionFacts = direct.filter((fact) => {
      const profile = vocabulary.get(fact.id);
      const description = [profile?.name, ...(profile?.aliases || []), fact.latest.metric, fact.latest.population].filter(Boolean).join(' ');
      return comparisonsIn(description).some((defined) => defined.relation === comparison.relation
        && defined.unit.id === comparison.unit.id && defined.threshold === comparison.threshold);
    });
    // A second unit can define the measured population (for example, the share
    // waiting more than one day); ignore it only when the selected metric says
    // the same thing. A different threshold, such as ten days, remains unverified.
    if (definitionFacts.length !== 1) return undefined;
  }
  if (measurementComparisons.length !== 1) return undefined;
  const { comparison, fact } = measurementComparisons[0];
  const actual = fact.latest.value;
  if (!Number.isFinite(comparison.threshold) || !Number.isFinite(actual)) return undefined;
  const claimMatchesMeasurement = comparison.relation === 'at-most' ? actual <= comparison.threshold
    : comparison.relation === 'below' ? actual < comparison.threshold
      : comparison.relation === 'above' ? actual > comparison.threshold
        : actual >= comparison.threshold;
  return {
    verdict: claimMatchesMeasurement ? 'supported' : 'contradicted',
    actual,
    threshold: comparison.threshold,
    metricId: fact.id,
    suffix: comparison.unit.suffix,
  };
};
const workingPovertyFinding = (fact) => {
  const item = fact.latest;
  const population = fact.id === 'in_work_poverty_full_time_rate'
    ? 'las personas ocupadas a jornada completa'
    : fact.id === 'in_work_poverty_part_time_rate'
      ? 'las personas ocupadas a jornada parcial'
      : 'las personas ocupadas de 18 años o más, empleadas más de la mitad del año de referencia';
  const place = placeLabel(item) || 'el territorio consultado';
  return `En ${place}, el ${number(item.value, fact.id)} % de ${population} se encontraba en riesgo de pobreza en ${periodLabel(item.period)}.`;
};
const subjectivePovertyFinding = (fact) => {
  const item = fact.latest;
  const place = placeLabel(item) || 'el territorio consultado';
  const levels = item.dimensions?.lev_diff_values;
  const breakdown = Number.isFinite(levels?.DIF) && Number.isFinite(levels?.GRT)
    ? ` (${number(levels.DIF, fact.id)} % respondió «con dificultad» y ${number(levels.GRT, fact.id)} % «con gran dificultad»).` : '.';
  return `En ${place}, en ${periodLabel(item.period)}, el ${number(item.value, fact.id)} % de la población vivía en un hogar cuya persona encuestada declaró dificultad o gran dificultad para cubrir los gastos habituales${breakdown}`;
};
const workingPovertyTrend = (fact) => {
  const points = fact.items.filter((item) => /^\d{4}$/.test(String(item.period)) && validNumber(item.value))
    .sort((a, b) => Number(a.period) - Number(b.period));
  if (points.length < 2 || new Set(points.map((item) => item.source?.url)).size !== 1) return undefined;
  const first = points[0];
  const last = points.at(-1);
  const change = Number((last.value - first.value).toFixed(2));
  const subject = fact.id === 'in_work_poverty_full_time_rate'
    ? 'el riesgo de pobreza entre personas ocupadas a jornada completa'
    : fact.id === 'in_work_poverty_part_time_rate'
      ? 'el riesgo de pobreza entre personas ocupadas a jornada parcial'
      : 'el riesgo de pobreza entre personas ocupadas';
  const periodText = `${first.period} (${number(first.value, fact.id)} %) y ${last.period} (${number(last.value, fact.id)} %)`;
  const direction = change < 0 ? 'bajó' : change > 0 ? 'subió' : 'se mantuvo';
  const amount = change === 0 ? '' : ` ${number(Math.abs(change), fact.id)} puntos porcentuales`;
  const changes = points.slice(1).map((item, index) => Math.sign(item.value - points[index].value)).filter(Boolean);
  const hasBothDirections = changes.includes(-1) && changes.includes(1);
  const finding = `Entre ${periodText}, ${subject} ${direction}${amount}.${hasBothDirections ? ' La serie tuvo subidas y bajadas; la comparación de extremos no implica un cambio continuo.' : ''}`;
  return {
    finding,
    headline: `${subject[0].toLocaleUpperCase('es')}${subject.slice(1)} ${direction}${amount} entre ${first.period} y ${last.period}`,
    change,
    hasBothDirections,
  };
};
const workingPovertyWorktimeComparison = (facts) => {
  const fullTime = facts.find((fact) => fact.id === 'in_work_poverty_full_time_rate');
  const partTime = facts.find((fact) => fact.id === 'in_work_poverty_part_time_rate');
  if (!fullTime || !partTime || fullTime.latest.period !== partTime.latest.period || fullTime.latest.unit !== partTime.latest.unit
    || (fullTime.latest.geography || fullTime.latest.dimensions?.geo) !== (partTime.latest.geography || partTime.latest.dimensions?.geo)) return undefined;
  const datasetId = (fact) => {
    try { return new URL(fact.latest.source.url).pathname.match(/(?:^|\/)(ilc_iw07)(?:\/|$)/)?.[1]; } catch { return undefined; }
  };
  if (datasetId(fullTime) !== 'ilc_iw07' || datasetId(partTime) !== 'ilc_iw07') return undefined;
  const difference = Number((partTime.latest.value - fullTime.latest.value).toFixed(2));
  if (!Number.isFinite(difference)) return undefined;
  const partRate = `${number(partTime.latest.value, partTime.id)} %`;
  const fullRate = `${number(fullTime.latest.value, fullTime.id)} %`;
  const place = placeLabel(partTime.latest) || 'el territorio consultado';
  const period = periodLabel(partTime.latest.period);
  const direction = difference > 0 ? 'más en jornada parcial' : difference < 0 ? 'más en jornada completa' : 'igual en ambos tipos de jornada';
  const amount = difference === 0 ? '' : `${number(Math.abs(difference), partTime.id)} puntos porcentuales `;
  return {
    difference,
    finding: `En ${place}, en ${period}, la tasa fue ${partRate} entre las personas ocupadas a jornada parcial y ${fullRate} entre quienes trabajaban a jornada completa; ${amount}${direction}.`,
    headline: `En ${period}, el riesgo fue ${partRate} en jornada parcial y ${fullRate} en jornada completa`,
  };
};
const educationOutcomeQuestion = (claim) => {
  const text = normalize(claim);
  return {
    text,
    recentGraduates: /\b(recien titulad\w*|recien graduad\w*|primer empleo|cohorte universitaria)\b/.test(text),
    asksDegreeDemand: /\b(demanda laboral|demanda de titulaciones|salidas? laborales|empleabilidad)\b/.test(text),
    asksQualificationFit: /\b(sobrecualific\w*|desajust\w*|desencaj\w*|no requier\w*|no exig\w*|acorde\w*|adecuad\w*|relacionad\w*|correspond\w*|encaj\w*|ajust\w*|por debajo|nivel de estudios|campo de estudios)\b/.test(text),
    asksCredentialRequirements: /\b(master|maestria|doctorad\w*)\b/.test(text)
      && /\b(exig\w*|requier\w*|pid\w*|ped\w*|anunci\w*|ofert\w*)\b/.test(text),
    asksFirstJobTiming: /\b(entr\w* antes|antes al mercado laboral|primer empleo|tiempo.{0,24}empleo|tard\w*.{0,24}empleo|mas rapido|rapidamente)\b/.test(text),
    asksEmploymentProspects: /\b(salida laboral|salidas laborales|empleabilidad|perspectivas laborales)\b/.test(text),
    asksTrend: /\b(ya no|antes|ahora|cada vez|ha aumentado|ha subido|ha bajado|desde \d{4}|evoluci\w*)\b/.test(text),
    comparesEducationPaths: /\b(formacion profesional|fp)\b/.test(text)
      && /\b(universidad\w*|universitari\w*|carrer\w*|titul\w*|estudios superiores)\b/.test(text)
      && /\b(mas|menos|mejor|peor|mayor|menor|frente|compar\w*|diferenc\w*|que|y)\b/.test(text),
  };
};
const educationOutcomeLimitForQuestion = (question) => {
  if (question.asksDegreeDemand && !question.comparesEducationPaths) return 'La afiliación de una cohorte describe algunos resultados laborales, pero no mide cuántas vacantes existen por titulación ni si hay «demasiadas» carreras. Para comprobar demanda hacen falta egresados, vacantes y contrataciones por campo, territorio y periodo comparables.';
  if (question.asksCredentialRequirements) return 'Las tasas de empleo y sobrecualificación no muestran qué titulación piden las ofertas. Para saber si ahora se exige más formación hay que comparar anuncios de las mismas ocupaciones, territorios y periodos.';
  if (question.asksFirstJobTiming) return 'Una tasa de empleo no indica cuánto tardan las personas tituladas en encontrar su primer trabajo. Hace falta medir el tiempo desde la graduación y comparar cohortes de FP y universidad en el mismo territorio y periodo.';
  if (question.comparesEducationPaths) return 'La tasa de empleo disponible describe solo a residentes de 20 a 64 años con educación terciaria; no compara por sí sola los grupos que menciona la afirmación. Hace falta medirlos con el mismo resultado, territorio, periodo y criterios de graduación.';
  if (question.asksEmploymentProspects) return 'La tasa de empleo terciaria no mide las salidas laborales de FP ni garantiza la contratación de una persona. Para valorar la empleabilidad hace falta una tasa de empleo de titulados con edad, tiempo desde la graduación y denominador definidos.';
  return '';
};
const educationOutcomeLimitation = (ids, fallback, question, causalClaim = false) => {
  const employment = ids.includes('employment_rate_tertiary_education');
  const unemployment = ids.includes('unemployment_rate_tertiary_education');
  const overqualification = ids.includes('tertiary_overqualification_rate');
  const youthOverqualification = ids.includes('tertiary_overqualification_rate_age_20_34');
  const scope = youthOverqualification ? 'Aquí, «jóvenes» se interpreta con el grupo estadístico de Eurostat de 20 a 34 años. El denominador son solo las personas ocupadas de ese grupo con educación terciaria: no equivale a recién graduados, no cuenta a quienes siguen desempleados y no mide si el puesto coincide con el campo de estudios ni qué titulación piden los anuncios.'
    : employment && overqualification ? 'Estas tasas describen grupos, no garantizan el resultado de cada persona. La tasa de empleo abarca a residentes de 20 a 64 años, no solo a recién graduados; la de sobrecualificación solo cuenta a quienes ya trabajan y no mide si el puesto coincide con el campo de estudios.'
      : unemployment ? 'La tasa de paro usa como denominador a la población activa de 20 a 64 años con educación terciaria, no a todas las personas tituladas. No se limita a recién graduados ni predice el resultado de una persona.'
        : overqualification ? 'La tasa de sobrecualificación solo cuenta a personas ocupadas de 20 a 64 años con educación terciaria. No mide a quienes siguen desempleados, el ajuste del campo de estudios ni las titulaciones exigidas en anuncios de empleo.'
          : employment ? 'La tasa de empleo usa como denominador a todas las personas residentes de 20 a 64 años con educación terciaria. No se limita a recién graduados ni mide si el puesto coincide con sus estudios.'
            : educationOutcomeLimitForQuestion(question) || fallback;
  const causalLimit = 'Este dato no mide si la falta de oportunidades acordes llevó a aceptar esos puestos. Para establecer esa causa harían falta datos sobre las oportunidades disponibles, los empleos y las razones de las decisiones en la misma población y periodo.';
  return [scope, causalClaim ? causalLimit : ''].filter(Boolean).join(' ');
};
const educationOutcomeNeedsForClaim = (claim, fallback) => {
  const question = educationOutcomeQuestion(claim);
  const { text, recentGraduates, asksQualificationFit } = question;
  if (question.asksDegreeDemand && !question.comparesEducationPaths) return ['egresados, vacantes y contrataciones por titulación o campo de estudio en el mismo territorio y periodo para medir demanda laboral'];
  if (question.asksCredentialRequirements) return ['anuncios de las mismas ocupaciones en periodos comparables, contando qué proporción exige un máster'];
  if (question.asksFirstJobTiming) return ['tiempo desde terminar FP o universidad hasta el primer empleo, por cohorte, territorio y periodo comparables'];
  if (recentGraduates) return ['medición de sobrecualificación o ajuste laboral entre recién graduados, con el tiempo transcurrido desde que terminaron los estudios y un denominador definido'];
  if (question.comparesEducationPaths) return ['tasas de empleo de los grupos de titulaciones comparados, con edad, tiempo desde la titulación, territorio y periodo compatibles'];
  if (question.asksEmploymentProspects) return ['tasa de empleo de titulados de la formación indicada, con edad, tiempo desde la graduación, territorio y denominador definidos'];
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
const educationOutcomeNextAction = (question, causalClaim = false) => {
  if (causalClaim) return 'Relacionar oportunidades laborales, puestos aceptados y motivos de la decisión para la misma población y periodo.';
  if (question.asksTrend) return 'Comparar la misma medida y población en varios periodos, con territorio y nivel educativo constantes.';
  if (question.asksDegreeDemand && !question.comparesEducationPaths) return 'Buscar datos oficiales comparables de egresados, vacantes y contrataciones por campo de estudio, territorio y periodo.';
  if (question.asksCredentialRequirements) return 'Comparar anuncios de las mismas ocupaciones en varios periodos y contar los requisitos formativos.';
  if (question.asksFirstJobTiming) return 'Medir el tiempo desde la graduación hasta el primer empleo por cohorte y tipo de estudios.';
  if (question.comparesEducationPaths) return 'Comparar ambos itinerarios con la misma población, territorio, periodo y resultado laboral.';
  if (question.recentGraduates) return 'Medir ajuste y empleo desde la graduación, con cohorte y denominador definidos.';
  if (question.asksQualificationFit) return 'Vincular los estudios de las personas con el nivel, tareas o requisitos de sus puestos.';
  return 'Buscar datos de empleo o paro para la población y el nivel educativo solicitados.';
};

// This composer reports only the supplied observations. It cannot turn a
// contextual proxy into a verdict on a different measurement or silently
// infer a real-wage change from unmatched wage and price periods.
export const focusedEvidencePlan = (claim, { observations = [], propositions = [], now = Date.now(), allowReviewedSnapshotFallback = false } = {}) => {
  const focus = claimFocusFor(claim);
  if (!focus) return undefined;
  const normalizedClaim = normalize(claim);
  const educationOutcome = focus.id === 'education-employment-outcomes';
  const educationOutcomeCausalClaim = educationOutcome
    && /\b(?:caus\w*|provoc\w*|porque|ya que|debido a|por culpa|empuj\w*|oblig\w* a|conduc\w* a|llev\w* a|por falta de|ante la falta de|por no (?:encontr\w*|hall\w*|consegu\w*))\b/.test(normalizedClaim);
  const tourismRegionalSectorComparison = focus.id === 'tourism-employment-contribution'
    && requestedGeographyScopes(claim).some((scope) => scope.type === 'region')
    && /\b(mas|menos|mayor|menor|super\w*|inferior\w*)\b/.test(normalizedClaim)
    && /\b(que|a|al|frente a|respecto a)\b/.test(normalizedClaim);
  const tourismRegionalScopeClaim = focus.id === 'tourism-employment-contribution'
    && /\b(region\w*|regional\w*|comunidades? autonom\w*|provinci\w*|municipi\w*|territori\w*)\b/.test(normalizedClaim);
  const tourismRegionalImpactClaim = tourismRegionalScopeClaim
    && /\b(reduc\w*|recort\w*|disminu\w*|destrui\w*|perd\w*|desaparec\w*|caus\w*|provoc\w*|oblig\w*|fren\w*|afect\w*)\b/.test(normalizedClaim);
  const tourismExcessiveDependenceClaim = focus.id === 'tourism-employment-contribution'
    && !tourismRegionalSectorComparison
    && /\b(demasiad\w*|excesiv\w*|sobredepend\w*|desproporcionad\w*)\b/.test(normalizedClaim);
  const sectorNames = [/\bturis\w*\b/, /\bhosteler\w*\b/, /\bhotel\w*\b/, /\bagricultur\w*\b/, /\bsector primario\b/, /\bconstrucci\w*\b/, /\bindustri\w*\b/, /\bmanufactur\w*\b/, /\bcomerci\w*\b/, /\btransporte\b/, /\bfinancier\w*\b/, /\btecnolog\w*\b/];
  const samePensionPrivateSavingsCompound = focus.id === 'pension-private-savings-requirement'
    && propositions.length >= 2 && propositions.length <= 3
    && propositions.some((proposition) => /\b(ahorr\w*|plan(?:es)? privad\w*|pension\w* privad\w*)\b/.test(normalize(proposition.text)))
    && propositions.some((proposition) => /\b(pension\w*|jubilaci\w*|cotiz\w*|seguridad social|sistema p[uú]blic\w*)\b/.test(normalize(proposition.text)))
    && propositions.every((proposition) => /\b(ahorr\w*|plan(?:es)? privad\w*|pension\w* privad\w*|pension\w*|jubilaci\w*|cotiz\w*|seguridad social|sistema p[uú]blic\w*)\b/.test(normalize(proposition.text)));
  const continuesSameSubject = (item) => {
    const clauseFocus = claimFocusFor(item.text);
    if (clauseFocus?.id === focus.id) return true;
    const clauseText = normalize(item.text);
    const educationOutcomeCauseClause = educationOutcomeCausalClaim
      && propositions.length === 2
      && propositions.some((proposition) => claimFocusFor(proposition.text)?.id === focus.id)
      && /\b(?:oportunidad\w*|vacante\w*|estudi\w*|formaci\w*|titulaci\w*|cualific\w*|acord\w*)\b/.test(clauseText);
    const sameSectorOutput = focus.id === 'sector-wage-comparison'
      && /\b(pib|producto interior bruto|valor anadido|produccion|aport\w*)\b/.test(clauseText)
      && sectorNames.some((pattern) => pattern.test(normalizedClaim) && pattern.test(clauseText));
    const gdpAggregateClause = /\b(pib(?: real)? total|pib agregado|crecimiento del pib|economia en su conjunto|total gdp|gdp growth)\b/.test(clauseText);
    const gdpPerPersonClause = /\b(pib(?: real)? (?:por habitante|por persona|per capita)|nivel de vida|condiciones de vida|bienestar por persona|prosperidad por persona)\b/.test(clauseText);
    const sameGdpComparison = focus.id === 'gdp-total-per-capita-comparison'
      && propositions.length <= 3 && propositions.length >= 2
      && propositions.every((proposition) => {
        const text = normalize(proposition.text);
        return /\b(pib(?: real)?|producto interior bruto|economia|gdp|nivel de vida|condiciones de vida|bienestar|prosperidad)\b/.test(text)
          && !/\b(productividad|por trabajador|poblacion|inmigracion|migracion|empleo|horas trabajadas|renta mediana|ingresos del hogar)\b/.test(text);
      });
    const sameProductivityComparison = focus.id === 'labour-productivity-and-growth'
      && propositions.length <= 3 && propositions.length >= 2
      && propositions.every((proposition) => {
        const text = normalize(proposition.text);
        return /\b(productividad|pib|producto interior bruto|crecimiento|economia|poblacion|empleo)\b/.test(text)
          && !/\b(empres\w*|negocio\w*|sector\w*|productividad total de los factores|salario\w*|sueldo\w*)\b/.test(text);
      });
    const sameRealWageComparison = focus.id === 'real-wages'
      && propositions.length <= 3 && propositions.length >= 2
      && propositions.some((proposition) => /\b(?:salari\w*|sueld\w*|nomina\w*|remuner\w*)\b/.test(normalize(proposition.text)))
      && propositions.some((proposition) => /\b(?:poder adquisitivo|poder de compra|nivel de vida|inflacion|precios|coste de la vida)\b/.test(normalize(proposition.text)))
      && propositions.every((proposition) => /\b(?:salari\w*|sueld\w*|nomina\w*|remuner\w*|poder adquisitivo|poder de compra|nivel de vida|inflacion|precios|coste de la vida)\b/.test(normalize(proposition.text)));
    const sameEuropeanPriceWageConvergence = focus.id === 'price-wage-european-convergence'
      && propositions.length <= 3 && propositions.length >= 2
      && propositions.some((proposition) => /\b(?:precios?|coste de la vida|nivel de precios)\b/.test(normalize(proposition.text)))
      && propositions.some((proposition) => /\b(?:salari\w*|sueld\w*|nomina\w*|remuner\w*)\b/.test(normalize(proposition.text)))
      && propositions.every((proposition) => /\b(?:precios?|coste de la vida|nivel de precios|salari\w*|sueld\w*|nomina\w*|remuner\w*)\b/.test(normalize(proposition.text)));
    const sameHicpBasketComparison = focus.id === 'household-inflation-basket'
      && propositions.length <= 3 && propositions.length >= 2
      && propositions.every((proposition) => /\b(?:ipc|hicp|inflacion\w*|precios? de consumo|aliment\w*|comid\w*|supermercad\w*|alquil\w*|arrendam\w*|viviend\w*|hogar\w*|familia\w*|cesta\w*)\b/.test(normalize(proposition.text)))
      && propositions.some((proposition) => /\b(?:aliment\w*|comid\w*|supermercad\w*|cesta de la compra)\b/.test(normalize(proposition.text)))
      && propositions.some((proposition) => /\b(?:ipc|hicp|inflacion\w*|precios? de consumo)\b/.test(normalize(proposition.text)));
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
    const unemploymentSupplyExplanation = focus.id === 'unemployment-wage-pressure'
      && propositions.length === 2 && /\b(porque|ya que|debido a que|por tener|al haber)\b/.test(normalizedClaim)
      && /\b(paro|desemple\w*|candidat\w*|demandantes? de empleo|oferta de trabajadores|mano de obra|aspirantes?|vacantes?)\b/.test(clauseText);
    const sameEmployerContributionVisibility = focus.id === 'employer-contributions-labour-cost'
      && propositions.length === 2 && /\b(porque|ya que|debido a que)\b/.test(normalizedClaim)
      && propositions.some((proposition) => {
        const text = normalize(proposition.text);
        return /\b(cotiz\w*|cuot\w*|aportaci\w*)\b/.test(text) && /\b(salari\w* bruto|sueldo\w* bruto|nomina\w*)\b/.test(text);
      })
      && propositions.some((proposition) => {
        const text = normalize(proposition.text);
        return /\b(trabajador\w*|empleado\w*)\b/.test(text) && /\b(perci\w*|conoc\w*|saben?|ven|cost\w*)\b/.test(text);
      });
    if (sameSectorOutput || sameGdpComparison && (gdpAggregateClause || gdpPerPersonClause)
      || sameRealWageComparison
      || sameEuropeanPriceWageConvergence
      || sameHicpBasketComparison
      || sameProductivityComparison && /\b(productividad|pib|producto interior bruto|crecimiento|economia|poblacion|empleo)\b/.test(clauseText)) return true;
    if (sameLandlordMotive) return true;
    if (samePensionPrivateSavingsCompound) return true;
    if (housingInvestmentReason || firmWageMechanism || pensionWageMechanism || unemploymentSupplyExplanation || sameEmployerContributionVisibility) return true;
    if (educationOutcomeCauseClause) return true;
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
    const hasLiveWagePriceRows = observations.some((item) => [...focus.direct, ...focus.context].includes(item.metricId));
    if (allowReviewedSnapshotFallback && !hasLiveWagePriceRows && snapshotLifecycle(REAL_WAGE_SNAPSHOT, now).usable) {
      const reviewed = realWagePlan(claim, { observations: REAL_WAGE_SNAPSHOT.observations, now, allowReviewedSnapshot: true });
      if (reviewed) return reviewed;
    }
  }
  if (focus.id === 'household-inflation-basket') {
    const requestedTerritories = requestedGeographyScopes(claim);
    if (requestedTerritories.some((scope) => scope.id !== 'ES')) return hicpBasketEvidenceGapPlan(claim, { reason: 'geography' });
    const matched = hicpBasketComparisonPlan(claim, { observations, now });
    if (matched) return matched;
    if (allowReviewedSnapshotFallback && snapshotLifecycle(HICP_BASKET_SNAPSHOT, now).usable) {
      // Re-run the entire comparison from one reviewed revision. This can
      // recover from a partial live refresh without combining source vintages.
      const reviewed = hicpBasketComparisonPlan(claim, { observations: HICP_BASKET_SNAPSHOT.observations, now, allowReviewedSnapshot: true });
      if (reviewed) return reviewed;
    }
    return hicpBasketEvidenceGapPlan(claim, { reason: /\b(?:19|20|21)\d{2}\b/.test(normalizedClaim) ? 'period' : 'data' });
  }
  if (focus.id === 'collective-agreement-wages') {
    const matched = collectiveAgreementWagePlan(claim, { observations, now });
    if (matched) return matched;
    const hasLiveAgreementPriceRows = observations.some((item) => ['collective_agreement_wage_settlement_rate', 'annual_hicp_index'].includes(item.metricId));
    if (allowReviewedSnapshotFallback && !hasLiveAgreementPriceRows && snapshotLifecycle(COLLECTIVE_AGREEMENT_WAGE_SNAPSHOT, now).usable) {
      const reviewed = collectiveAgreementWagePlan(claim, { observations: COLLECTIVE_AGREEMENT_WAGE_SNAPSHOT.observations, now, allowReviewedSnapshot: true });
      if (reviewed) return reviewed;
    }
  }
  if (focus.id === 'gdp-total-per-capita-comparison') {
    const requestedTerritories = requestedGeographyScopes(claim);
    if (requestedTerritories.some((scope) => scope.id !== 'ES')) return gdpPerCapitaEvidenceGapPlan(claim, { reason: 'geography' });
    const matched = gdpPerCapitaComparisonPlan(claim, { observations, now });
    if (matched) return matched;
    const hasLiveGdpRows = observations.some((item) => ['gdp_real_annual', 'gdp_real_per_capita_annual'].includes(item.metricId));
    if (allowReviewedSnapshotFallback && !hasLiveGdpRows && snapshotLifecycle(GDP_REAL_PER_CAPITA_SNAPSHOT, now).usable) {
      const reviewed = gdpPerCapitaComparisonPlan(claim, {
        observations: GDP_REAL_PER_CAPITA_SNAPSHOT.observations,
        now,
        allowReviewedSnapshot: true,
      });
      if (reviewed) return reviewed;
    }
    return gdpPerCapitaEvidenceGapPlan(claim, { reason: /\b(?:19|20|21)\d{2}\b|\b(?:ultim\w*|hace|durante)\b/.test(normalizedClaim) ? 'period' : 'missing-period' });
  }
  if (focus.id === 'labour-productivity-and-growth') {
    const requestedTerritories = requestedGeographyScopes(claim);
    if (requestedTerritories.some((scope) => scope.id !== 'ES')) return labourProductivityEvidenceGapPlan(claim, { reason: 'geography' });
    const matched = labourProductivityAnalysisPlan(claim, { observations, now });
    if (matched) return matched;
    const metricIds = ['real_labour_productivity_per_person', 'real_labour_productivity_per_hour', 'gdp_real_annual', 'gdp_real_per_capita_annual', 'employment_persons_per_capita_national_accounts'];
    const hasLiveRows = observations.some((item) => metricIds.includes(item.metricId));
    const snapshotUsable = snapshotLifecycle(LABOUR_PRODUCTIVITY_SNAPSHOT, now).usable
      && snapshotLifecycle(GDP_REAL_PER_CAPITA_SNAPSHOT, now).usable;
    if (allowReviewedSnapshotFallback && !hasLiveRows && snapshotUsable) {
      const reviewed = labourProductivityAnalysisPlan(claim, {
        observations: [...GDP_REAL_PER_CAPITA_SNAPSHOT.observations, ...LABOUR_PRODUCTIVITY_SNAPSHOT.observations],
        now,
        allowReviewedSnapshot: true,
      });
      if (reviewed) return reviewed;
    }
    return labourProductivityEvidenceGapPlan(claim, { reason: /\b(?:19|20|21)\d{2}\b|\b(?:ultim\w*|hace|durante)\b/.test(normalizedClaim) ? 'period' : 'missing-period' });
  }
  const fullTime = /\b(?:jornada completa|tiempo completo)\b/i.test(claim);
  const partTime = /\b(?:jornada parcial|tiempo parcial|media jornada|empleo parcial|trabajo parcial)\b/i.test(claim);
  const asksAboutTeachers = /\b(?:por (?:profesor\w*|docent\w*)|alumn\w* (?:por|entre) (?:profesor\w*|docent\w*))\b/.test(normalize(claim));
  const workingPovertyTrendRequested = focus.id === 'working-poverty'
    && /\b(cada vez|evoluci\w*|tendencia|desde|entre \d{4}|\d{4}\s+(?:a|hasta|y)\s+\d{4}|a lo largo|ultim\w* a[nñ]os?|cada a[nñ]o|estable|se mantiene|(?:ha|han)\s+(?:sub\w*|aument\w*|crec\w*|increment\w*|descend\w*|baj\w*|disminu\w*))\b/.test(normalizedClaim);
  const workingPovertyCountRequested = focus.id === 'working-poverty'
    && (/\b(?:m[aá]s|menos)\s+(?:personas|trabajadores|ocupados|empleados)\b/.test(normalizedClaim)
      || /\b(?:n[uú]mero|cantidad|recuento)\b.{0,30}\b(?:personas|trabajadores|ocupados|empleados)\b/.test(normalizedClaim)
      || /\bcu[aá]nt[oa]s?\s+(?:personas|trabajadores|ocupados|empleados)\b/.test(normalizedClaim));
  const subjectiveHouseholdShareRequested = focus.id === 'subjective-financial-strain'
    && /\b(hogares?|familias?)\b/.test(normalizedClaim)
    && !/\b(poblacion|personas|gente)\b/.test(normalizedClaim)
    && (/[0-9]/.test(claim) || /\b(porcentaje|proporcion|por ciento|parte|cuant\w*|much\w*|mayoria)\b/.test(normalizedClaim));
  const subjectiveIndividualClaim = focus.id === 'subjective-financial-strain'
    && /\b(?:yo|mi hogar|mi familia|mis gastos|no puedo|no llego|me cuesta|me resulta dificil)\b/.test(normalizedClaim);
  const workingPovertyWorktimeComparisonRequested = focus.id === 'working-poverty' && fullTime && partTime
    && !workingPovertyCountRequested
    && /\b(m[aá]s|mayor|superior|super\w*|exced\w*|alto|elevad\w*|menos|menor|inferior|bajo|diferenc\w*|brecha|compar\w*|frente|respecto)\b/.test(normalizedClaim)
    && !workingPovertyTrendRequested;
  const educationTrendRequested = educationOutcome
    && !/\b(garantiz\w*|asegur\w*|impid\w*)\b/.test(normalizedClaim)
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
  const ids = tourismRegionalSectorComparison ? [] : [...focusedMetricIdsFor(claim)];
  const allowedDirect = tourismRegionalScopeClaim ? []
    : educationOutcome ? ids
    : focus.id === 'subjective-financial-strain' ? ids
    : focus.id === 'working-poverty' && fullTime && partTime ? ['in_work_poverty_full_time_rate', 'in_work_poverty_part_time_rate']
      : focus.id === 'working-poverty' && fullTime ? ['in_work_poverty_full_time_rate']
      : focus.id === 'working-poverty' && partTime ? ['in_work_poverty_part_time_rate'] : focus.direct;
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
  const needs = tourismRegionalSectorComparison
    ? ['recuento de empleo por actividad económica en el territorio solicitado, con el mismo año y unidad para las ramas turísticas y la agricultura', 'definición compatible de empleo y cobertura de actividades en ambos sectores']
    : tourismRegionalImpactClaim ? [
      'empleo en ramas características del turismo desglosado por región y periodo',
      'una estimación contrafactual del empleo que cambiaría en cada región si disminuyera la actividad turística',
    ]
    : tourismRegionalScopeClaim ? ['empleo en ramas características del turismo desglosado por región y periodo, con cobertura comparable entre territorios']
    : tourismExcessiveDependenceClaim ? focus.needs
    : subjectiveHouseholdShareRequested ? ['porcentaje de hogares, no solo proporción de población residente en hogares que responden así', 'periodo, territorio y población comparables']
    : subjectiveIndividualClaim ? ['medición directa de la situación del hogar o la persona concreta; la encuesta publicada resume a la población']
    : asksAboutMakingEndsMeet ? ['cruce de la dificultad declarada con la situación laboral y la jornada de las personas consultadas', 'periodo y población comparables']
    : focus.id === 'working-poverty' && workingPovertyCountRequested ? ['recuento anual de personas ocupadas bajo el umbral de riesgo de pobreza, con población y periodos comparables']
    : focus.id === 'working-poverty' && workingPovertyWorktimeComparisonRequested ? ['tasas de riesgo de pobreza comparables para jornada completa y parcial en el mismo periodo, con definición y población compatibles']
    : focus.id === 'working-poverty' && partTime ? ['tasa de riesgo de pobreza entre personas ocupadas a tiempo parcial, con periodo y población definidos']
      : focus.id === 'working-poverty' && workingPovertyTrendRequested ? ['serie anual comparable del mismo indicador, población y umbral de pobreza para los periodos solicitados']
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
        ] : typeof focus.needsForClaim === 'function' ? focus.needsForClaim(claim) : focus.needs;
  const directIds = asksAboutMakingEndsMeet || workingPovertyCountRequested ? [] : ids.filter((id) =>
    (!subjectiveHouseholdShareRequested || !['subjective_poverty_rate', ...Object.values(SUBJECTIVE_POVERTY_COMPONENT_METRICS)].includes(id))
      && (allowedDirect.includes(id) || allowedDirect.includes(id.replace(/_europe$/, ''))));
  const fitsClaim = observationFitsClaim(claim);
  const subjectiveComponentIds = new Set(Object.values(SUBJECTIVE_POVERTY_COMPONENT_METRICS));
  const displayIds = ids.filter((id) => !subjectiveComponentIds.has(id) || !ids.includes('subjective_poverty_rate'));
  const ordinaryFacts = displayIds.filter((id) => id !== 'subjective_poverty_rate').flatMap((id) => id === 'mean_hourly_earnings_by_activity'
    ? sectorEarningsFactsForClaim(claim, observations, fitsClaim)
    : id === 'mean_hourly_earnings_by_education' ? educationEarningsFactsForClaim(observations, fitsClaim)
      : factsForMetric(id, observations, fitsClaim));
  const subjectivePovertyFacts = displayIds.includes('subjective_poverty_rate')
    ? subjectivePovertyFactsFromComponents(observations, fitsClaim)
    : [];
  const facts = [...ordinaryFacts, ...(subjectivePovertyFacts.length
    ? subjectivePovertyFacts : displayIds.includes('subjective_poverty_rate')
      ? factsForMetric('subjective_poverty_rate', observations, fitsClaim) : [])];
  if (ids.includes('industrial_electricity_price_europe')) facts.sort((left, right) => {
    const order = (fact) => fact.latest.dimensions?.geo === 'ES' ? 0 : /^EU/.test(String(fact.latest.dimensions?.geo || '')) ? 1 : 2;
    return order(left) - order(right);
  });
  const educationQuestion = educationOutcome ? educationOutcomeQuestion(claim) : undefined;
  const specialistMagnitudeNotAssessed = focus.id === 'specialist-outpatient-regional-waits'
    && specialistOutpatientMagnitudeNotAssessed(claim);
  let limitation = tourismRegionalSectorComparison
    ? 'La serie disponible describe el conjunto de España; no compara empleo turístico y agrícola en el territorio solicitado.'
    : tourismRegionalScopeClaim ? [
      focus.limitation,
      tourismRegionalImpactClaim
        ? 'La cuota incluida es nacional, no está desglosada por región y no estima cuántos puestos cambiarían si se redujera el turismo.'
        : 'La cuota incluida es nacional y no describe el empleo turístico de cada región.',
    ].join(' ')
    : educationOutcome ? educationOutcomeLimitation(ids, focus.limitation, educationQuestion, educationOutcomeCausalClaim)
    : focus.id === 'working-poverty' ? 'El umbral relativo de pobreza y la respuesta subjetiva del hogar son medidas distintas. EU-SILC no cruza la dificultad declarada con la jornada laboral; el desglose por jornada tampoco incluye la edad. El dato no demuestra que el tipo de jornada cause el riesgo. El periodo es el año de la encuesta EU-SILC y los ingresos del umbral de pobreza pueden referirse a un año anterior.'
    : focus.id === 'sector-wage-comparison' ? [
      comparesSectorEmployment
        ? comparesSectorEmploymentTrend
          ? 'La encuesta describe salarios; no mide el crecimiento del empleo ni la productividad.'
          : 'La encuesta describe salarios; no mide el empleo por actividad ni la productividad.'
        : comparesSectorAverageWageImpact
          ? 'La encuesta describe salarios brutos, pero no establece la contribución de cada actividad al promedio nacional ni mide productividad.'
          : focus.limitation,
    ].filter(Boolean).join(' ')
    : specialistMagnitudeNotAssessed
      ? `${focus.limitation} La tabla no evalúa la magnitud adicional de la afirmación, como un número de días o «mucho mayor».`
      : focus.limitation;
  const territories = requestedGeographyScopes(claim);
  const explanationAvailable = !focus.explanationEvidence?.createdAt
    || snapshotLifecycle(focus.explanationEvidence, now).usable;
  const reviewedExplanation = focus.explanationEvidence && explanationAvailable && now < Date.parse(focus.explanationEvidence.expiresAt)
    && territories.every(({ id }) => focus.explanationEvidence.territories?.includes(id))
    && (!focus.explanationEvidence.when || focus.explanationEvidence.when(normalize(claim))) ? focus.explanationEvidence : undefined;
  const explanation = reviewedExplanation?.selectForClaim?.({ claim, normalizedClaim }) || reviewedExplanation;
  if (explanation?.limitation) limitation = [limitation, explanation.limitation].filter(Boolean).join(' ');
  const explanationDimensions = explanation
    ? explanation.dimensionsForClaim?.(normalize(claim)) || explanation.dimensions
    : undefined;
  const specialistOutpatientComparison = focus.id === 'specialist-outpatient-regional-waits'
    ? namedEvidenceComparison(claim, explanation?.comparisonRows)
    : undefined;
  const specialistOutpatientComparisonFinding = specialistOutpatientComparison
    ? `A 31 de diciembre de 2025, la espera media registrada entre los pacientes de las listas estructurales de consultas externas del SNS fue de ${number(specialistOutpatientComparison.first.value, 'primary_care_wait_days')} días en ${specialistOutpatientComparison.first.geography} y ${number(specialistOutpatientComparison.second.value, 'primary_care_wait_days')} días en ${specialistOutpatientComparison.second.geography}. La afirmación de que ${specialistOutpatientComparison.claimedHigher} tuvo más días de espera media ${specialistOutpatientComparison.verdict === 'supported' ? 'coincide' : 'no coincide'} con esos valores.`
    : undefined;
  const specialistOutpatientComparisonHeadline = specialistOutpatientComparison
    ? `En 2025, la espera media fue de ${number(specialistOutpatientComparison.actualHigher.value, 'primary_care_wait_days')} días en ${specialistOutpatientComparison.actualHigher.geography} frente a ${number(specialistOutpatientComparison.actualLower.value, 'primary_care_wait_days')} días en ${specialistOutpatientComparison.actualLower.geography}`
    : undefined;
  const explanationFacts = specialistOutpatientComparisonFinding && explanation
    ? [specialistOutpatientComparisonFinding, ...explanation.facts.slice(1)]
    : explanation?.facts || [];
  const workHousingTrendRequested = focus.id === 'work-housing-independence'
    && /\b(ya no|cada vez|se ha vuelto|antes|ahora|desde (?:19|20)\d{2}|en (?:19|20)\d{2}|entre (?:19|20)\d{2} y (?:19|20)\d{2}|ultimos a[nñ]os)\b/.test(normalizedClaim);
  const claimType = tourismRegionalSectorComparison ? 'comparative'
    : typeof focus.claimTypeFor === 'function' ? focus.claimTypeFor(normalizedClaim)
    : educationOutcomeCausalClaim ? 'causal'
    : focus.id === 'working-poverty' && workingPovertyWorktimeComparisonRequested ? 'comparative'
    : focus.id === 'working-poverty' && workingPovertyTrendRequested ? 'trend'
    : focus.id === 'private-healthcare-access'
    ? privateHealthcareAccessClaimType(claim)
    : focus.id === 'work-housing-independence' ? (workHousingTrendRequested ? 'trend' : 'descriptive')
    : focus.claimType || (explanation ? 'definition' : 'descriptive');
  const subjectiveDefinitionSources = focus.id === 'subjective-financial-strain'
    || focus.id === 'working-poverty' && asksAboutMakingEndsMeet
    ? measurementDefinitions.subjective_poverty_rate?.definition?.sources || [] : [];
  const sources = [...new Map([...facts.flatMap((fact) => fact.items.map((item) => item.source)), ...subjectiveDefinitionSources, ...(explanation?.sources || [])].map((source) => [source.id, source])).values()];
  const workingPovertyTrends = new Map(facts.flatMap((fact) => {
    const trend = workingPovertyTrendRequested ? workingPovertyTrend(fact) : undefined;
    return trend ? [[fact.id, trend]] : [];
  }));
  const workingPovertyComparison = workingPovertyWorktimeComparisonRequested ? workingPovertyWorktimeComparison(facts) : undefined;
  const direct = facts.filter((fact) => directIds.includes(fact.id)
    && (!workingPovertyWorktimeComparisonRequested || Boolean(workingPovertyComparison))
    && (!workingPovertyTrendRequested || workingPovertyTrends.has(fact.id)));
  const context = facts.filter((fact) => !direct.includes(fact));
  const factFinding = (fact) => educationOutcome ? educationOutcomeFinding(fact)
    : fact.id === 'subjective_poverty_rate' ? subjectivePovertyFinding(fact)
    : workingPovertyTrends.get(fact.id)?.finding || (focus.id === 'working-poverty' ? workingPovertyFinding(fact) : fact.finding);
  const workingPovertyVerdict = (() => {
    if (focus.id !== 'working-poverty' || !direct.length || propositions.length > 1) return 'insufficient';
    if (direct.some((fact) => fact.items.some((item) => item.freshness === 'stale'))) return 'insufficient';
    if (!/\b(riesgo de pobreza|pobreza laboral)\b/.test(normalizedClaim)) return 'mixed';
    if (workingPovertyWorktimeComparisonRequested) {
      if (!workingPovertyComparison || /\b(caus\w*|provoc\w*|porque|debido|hace que|por culpa)\b/.test(normalizedClaim)) return 'mixed';
      const partTimeTerms = '(?:jornada parcial|tiempo parcial|media jornada|empleo parcial|trabajo parcial)';
      const fullTimeTerms = '(?:jornada completa|tiempo completo|completa|completo)';
      const higherTerms = '(?:mas|mayor(?:es)?|superior(?:es)?|super\\w*|exced\\w*|alto\\w*|elevad\\w*)';
      const lowerTerms = '(?:menos|menor(?:es)?|inferior(?:es)?|bajo\\w*)';
      const relation = '(?:que|a|frente a|respecto a|comparad\\w*)';
      const saysPartTimeHigher = new RegExp(`\\b${higherTerms}\\b.{0,45}\\b${partTimeTerms}\\b.{0,35}\\b${relation}\\b.{0,35}\\b${fullTimeTerms}\\b`).test(normalizedClaim)
        || new RegExp(`\\b${partTimeTerms}\\b.{0,50}\\b${higherTerms}\\b.{0,35}\\b${relation}\\b.{0,35}\\b${fullTimeTerms}\\b`).test(normalizedClaim);
      const saysFullTimeHigher = new RegExp(`\\b${higherTerms}\\b.{0,45}\\b${fullTimeTerms}\\b.{0,35}\\b${relation}\\b.{0,35}\\b${partTimeTerms}\\b`).test(normalizedClaim)
        || new RegExp(`\\b${fullTimeTerms}\\b.{0,50}\\b${higherTerms}\\b.{0,35}\\b${relation}\\b.{0,35}\\b${partTimeTerms}\\b`).test(normalizedClaim);
      const saysPartTimeLower = new RegExp(`\\b${lowerTerms}\\b.{0,45}\\b${partTimeTerms}\\b.{0,35}\\b${relation}\\b.{0,35}\\b${fullTimeTerms}\\b`).test(normalizedClaim)
        || new RegExp(`\\b${partTimeTerms}\\b.{0,50}\\b${lowerTerms}\\b.{0,35}\\b${relation}\\b.{0,35}\\b${fullTimeTerms}\\b`).test(normalizedClaim);
      const saysFullTimeLower = new RegExp(`\\b${lowerTerms}\\b.{0,45}\\b${fullTimeTerms}\\b.{0,35}\\b${relation}\\b.{0,35}\\b${partTimeTerms}\\b`).test(normalizedClaim)
        || new RegExp(`\\b${fullTimeTerms}\\b.{0,50}\\b${lowerTerms}\\b.{0,35}\\b${relation}\\b.{0,35}\\b${partTimeTerms}\\b`).test(normalizedClaim);
      const claimsPartTimeHigher = saysPartTimeHigher || saysFullTimeLower;
      const claimsFullTimeHigher = saysFullTimeHigher || saysPartTimeLower;
      if (claimsPartTimeHigher === claimsFullTimeHigher || workingPovertyComparison.difference === 0) return 'mixed';
      return (workingPovertyComparison.difference > 0) === claimsPartTimeHigher ? 'supported' : 'contradicted';
    }
    if (workingPovertyTrendRequested) {
      if (direct.length > 1 && /\b(m[aá]s|menos|mayor|menor|diferenc\w*|brecha)\b/.test(normalizedClaim)) return 'mixed';
      const changes = direct.map((fact) => workingPovertyTrends.get(fact.id)?.change).filter((value) => Number.isFinite(value));
      if (!changes.length || changes.some((value) => value === 0) || changes.some((value) => Math.sign(value) !== Math.sign(changes[0]))) return 'mixed';
      const claimsIncrease = /\b(sub\w*|aument\w*|crec\w*|increment\w*|m[aá]s personas|m[aá]s ocupad\w*)\b/.test(normalizedClaim);
      const claimsDecrease = /\b(baj\w*|descend\w*|disminu\w*|reduc\w*|menos personas|menos ocupad\w*)\b/.test(normalizedClaim);
      if (claimsIncrease === claimsDecrease) return 'mixed';
      const negated = /\bno\b.{0,24}\b(sub\w*|aument\w*|crec\w*|increment\w*|baj\w*|descend\w*|disminu\w*|reduc\w*|m[aá]s|menos)\b/.test(normalizedClaim);
      const requestedDirection = claimsIncrease ? 1 : -1;
      const expectedDirection = negated ? requestedDirection * -1 : requestedDirection;
      const strictlyEveryPeriod = /\b(cada a[nñ]o|a[nñ]o tras a[nñ]o|continuamente|sin interrupci[oó]n)\b/.test(normalizedClaim);
      const hasNonMonotonicSeries = direct.some((fact) => workingPovertyTrends.get(fact.id)?.hasBothDirections);
      if (strictlyEveryPeriod && hasNonMonotonicSeries && !negated) return 'contradicted';
      return Math.sign(changes[0]) === expectedDirection ? 'supported' : 'contradicted';
    }
    const latestRates = direct.map((fact) => fact.latest.value).filter(Number.isFinite);
    if (!latestRates.length || latestRates.every((value) => value === 0)) return 'mixed';
    if (/\b(no hay|no existe|ning[uú]n\w*|ninguna\w*|nadie)\b/.test(normalizedClaim)) return 'contradicted';
    if (/\b(todos\w*|todas\w*|cada trabajador)\b/.test(normalizedClaim)) return 'contradicted';
    if (/\b(no impide|no evita|no garantiza|afect\w*|tambi[eé]n hay|existe\w*)\b/.test(normalizedClaim)) return 'supported';
    return 'mixed';
  })();
  const directThresholdAssessment = claimType === 'descriptive' && propositions.length <= 1
    ? directMeasurementThresholdAssessment(claim, direct)
    : undefined;
  const evidenceIds = [...new Set([...facts.flatMap((fact) => fact.items.map((item) => item.id)), ...(explanation?.sources || []).map((source) => source.id)].filter(Boolean))];
  const explanationSourceIds = (explanation?.sources || []).map((source) => source.id);
  const explanationSupportsClaim = typeof explanation?.directClaimEvidence === 'function'
    ? Boolean(explanation.directClaimEvidence(claim))
    : Boolean(explanation?.directClaimEvidence);
  const explanationBlocks = !explanation ? [] : Array.isArray(explanation.factSourceIds)
    && explanation.factSourceIds.length === explanationFacts.length
    ? explanationFacts.map((point, index) => ({
      type: explanationSupportsClaim ? 'confirmed' : 'data_finding',
      ...(explanationSupportsClaim ? {} : { dataKind: 'context' }),
      evidenceIds: explanation.factSourceIds[index],
      points: [point],
    }))
    : [explanationSupportsClaim
      ? { type: 'confirmed', evidenceIds: explanationSourceIds, points: explanationFacts }
      : { type: 'data_finding', dataKind: 'context', evidenceIds: explanationSourceIds, points: explanationFacts }];
  const directEvidenceIds = [...new Set([...direct.flatMap((fact) => fact.items.map((item) => item.id)), ...(explanationSupportsClaim ? explanationSourceIds : [])].filter(Boolean))];
  const directSourceIds = [...new Set([...direct.flatMap((fact) => fact.sourceIds), ...(explanationSupportsClaim ? explanationSourceIds : [])])];
  const contextualExplanationSourceIds = explanationSupportsClaim ? [] : explanationSourceIds;
  const explanationMeasuresClaim = Boolean(explanationSupportsClaim && explanationFacts.length && explanation.sources?.length);
  const subjectivePovertyHeadline = focus.id === 'subjective-financial-strain' && direct.length === 1
    ? (() => {
      const fact = direct[0];
      const place = placeLabel(fact.latest) || fact.latest.geography || 'España';
      const measurement = fact.id === 'subjective_poverty_rate'
        ? 'vivía en hogares con dificultad o gran dificultad'
        : fact.id === 'subjective_poverty_difficulty_rate' ? 'respondió «con dificultad»' : 'respondió «con gran dificultad»';
      return `${place}, ${periodLabel(fact.latest.period)}: el ${number(fact.latest.value, fact.id)} % ${measurement}`;
    })()
    : undefined;
  const tourismDependencyClaim = focus.id === 'tourism-employment-contribution'
    && tourismExcessiveDependenceClaim;
  const missing = educationOutcome
    ? [
      ...(ids.length ? ids.filter((id) => !facts.some((fact) => fact.id === id)).map(educationNeedForMetric) : needs),
      ...(educationOutcomeCausalClaim ? ['datos que relacionen las oportunidades disponibles, los puestos aceptados y los motivos de esa decisión para la misma población y periodo'] : []),
    ]
    : tourismRegionalImpactClaim || tourismDependencyClaim ? needs
      : direct.length || explanationMeasuresClaim ? [] : needs;
  const primaryFacts = (direct.length ? direct : context).slice(0, educationOutcome ? 4 : 2);
  const trendNotes = educationTrendRequested ? primaryFacts.flatMap((fact) => {
    const quality = comparisonQuality(fact.items, { temporal: true, firstPeriod: fact.items[0]?.period || '' });
    const breakNote = quality.reason.startsWith('La fuente marca una ruptura de serie') ? quality.reason : '';
    return [
      `La respuesta muestra el dato más reciente (${periodLabel(fact.latest.period)}); no compara dos periodos y no demuestra por sí sola que la tasa haya subido o bajado.`,
      ...quality.notes,
      breakNote,
    ];
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
  const findingText = industrialComparison || workingPovertyComparison?.finding || primaryFacts.map(factFinding).join(' ');
  const gap = missing.length ? tourismRegionalSectorComparison
    ? 'La fuente nacional disponible no ofrece recuentos comparables de empleo turístico y agrícola para el territorio solicitado.'
    : tourismRegionalImpactClaim ? 'La cifra nacional de empleo turístico no muestra cómo se distribuye el empleo por región ni estima el efecto de reducir la actividad turística.'
    : focus.id === 'working-poverty' && workingPovertyCountRequested
    ? 'La serie disponible mide un porcentaje, no el número de personas. Falta un recuento comparable de personas ocupadas bajo el umbral de riesgo de pobreza.'
    : educationOutcomeCausalClaim ? 'La tasa de sobrecualificación describe qué ocupaciones tienen las personas tituladas que ya trabajan; no mide por qué aceptaron esos puestos ni las oportunidades que tenían.'
    : focus.evidenceGap || `Falta una medición directa de ${missing.join('; ')}.` : '';
  const gapForReply = educationOutcome && !ids.length && educationOutcomeLimitForQuestion(educationQuestion) ? ''
    : focus.id === 'education-pay-comparison' && facts.length
      ? 'Para comprobar la afirmación falta comparar salarios con los requisitos de cada puesto, usando ocupación, jornada, experiencia, sector, territorio y periodo comparables.'
      : gap;
  const focusedExplanation = focus.id === 'subjective-financial-strain' && !ids.includes('subjective_poverty_rate')
    ? 'EU-SILC separa las respuestas «con dificultad» y «con gran dificultad». Esta cifra corresponde solo a la categoría solicitada; Eurostat combina ambas para su indicador de pobreza subjetiva.'
    : focus.id === 'sector-wage-comparison' && comparesSectorEmployment
    ? comparesSectorEmploymentTrend
      ? 'El crecimiento del empleo debe compararse con series por actividad y periodos iguales. Salarios y productividad requieren medidas aparte.'
      : 'El empleo debe compararse por actividad, población y periodo. Salarios y productividad requieren medidas aparte.'
    : focus.explanation;
  const explanationReply = educationOutcome ? '' : specialistOutpatientComparison && explanation
    ? explanationFacts.join('\n\n')
    : explanation
      ? explanationSupportsClaim ? explanationFacts.join('\n\n') : [focusedExplanation, `Como contexto: ${explanationFacts.join('\n\n')}`].filter(Boolean).join('\n\n')
      : focusedExplanation;
  const shareableContextReply = explanation && typeof focus.shareableReplyForContext === 'function'
    ? focus.shareableReplyForContext({
      claim,
      facts: explanationFacts,
      metricFacts: educationOutcome ? primaryFacts.map((fact) => ({
        id: fact.id,
        text: factFinding(fact),
        value: fact.latest.value,
        period: fact.latest.period,
        geography: fact.latest.geography || fact.latest.dimensionLabels?.geo,
        publisher: fact.latest.source?.publisher,
      })) : [],
      scopeNotes,
      needs,
      limitation,
    })
    : undefined;
  const findingLead = direct.length ? 'Datos de la fuente: ' : focus.id === 'sector-wage-comparison' ? '' : 'Como contexto: ';
  const primaryCareCausalityReply = (() => {
    if (focus.id !== 'primary-care-wait-causes') return undefined;
    const waitDays = facts.find((fact) => fact.id === 'primary_care_wait_days')?.latest;
    const noNextDayAppointment = facts.find((fact) => fact.id === 'primary_care_wait_over_one_day_rate')?.latest;
    if (!waitDays && !noNextDayAppointment) {
      return 'El Barómetro Sanitario mide las esperas, pero no si causan visitas a urgencias. Para evaluar ese vínculo hacen falta datos de las mismas personas y una comparación que separe otros motivos.';
    }
    const sampleSize = noNextDayAppointment?.dimensions?.sampleSize;
    const validResponses = waitDays?.dimensions?.validResponseSampleSize;
    const eligibleResponses = waitDays?.dimensions?.eligibleSampleSize;
    const count = (value) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: true, minimumGroupingDigits: 1 }).format(value);
    const rateFinding = noNextDayAppointment
      ? `El ${number(noNextDayAppointment.value, noNextDayAppointment.metricId)} % de la base de la pregunta 5c indicó que pasó más de un día porque no había cita antes${sampleSize ? ` (n=${count(sampleSize)})` : ''}.`
      : '';
    const waitFinding = waitDays
      ? `Entre quienes esperaron más de un día por falta de cita, la demora media fue ${number(waitDays.value, waitDays.metricId)} días${validResponses && eligibleResponses ? ` (${count(validResponses)} respuestas válidas de ${count(eligibleResponses)} elegibles; pregunta 5c_01)` : ''}.`
      : '';
    const period = (noNextDayAppointment || waitDays)?.period;
    const waveMatch = String(period || '').match(/^(\d{4})-O([123])$/);
    const wave = waveMatch ? `${waveMatch[1]}, oleada ${waveMatch[2]}` : period ? periodLabel(period) : '';
    const provisional = [noNextDayAppointment, waitDays].some((item) => item?.dimensions?.provisional === true);
    return [
      `El Barómetro Sanitario${wave ? ` ${wave}` : ''}${provisional ? ' (provisional)' : ''} no mide si las esperas llevan a urgencias.`,
      rateFinding,
      waitFinding,
      'En España, la encuesta cubre adultos que acudieron por un problema propio a medicina de familia pública en los 12 meses previos; excluye mutualidades con asistencia privada.',
      'Para establecer un efecto causal harían falta datos de espera y urgencias enlazados para las mismas personas y el mismo periodo, y una comparación que separe otros motivos.',
    ].filter(Boolean).join(' ');
  })();
  const tourismEmploymentReply = (() => {
    if (focus.id !== 'tourism-employment-contribution') return undefined;
    if (tourismRegionalSectorComparison) return [
      gapForReply,
      'Para compararlos hacen falta recuentos de empleo en turismo y agricultura para el mismo territorio, año y definición estadística.',
    ].filter(Boolean).join('\n\n');
    const share = facts.find((fact) => fact.id === 'tourism_characteristic_employment_share');
    const jobs = facts.find((fact) => fact.id === 'tourism_characteristic_employment_jobs');
    const sharePeriod = share?.latest.period;
    const jobsPeriod = jobs?.latest.period;
    const millions = (fact) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(fact.latest.value / 1000);
    const findings = [];
    if (share) {
      findings.push(`En ${periodLabel(sharePeriod)}, las ramas características del turismo reunieron el ${number(share.latest.value, share.id)} % del empleo total en España.`);
      if (jobs && jobsPeriod === sharePeriod) findings.push(`Equivalen a unos ${millions(jobs)} millones de puestos de trabajo en esas ramas.`);
      else if (jobs) findings.push(`El recuento más reciente es de unos ${millions(jobs)} millones de puestos en ${periodLabel(jobsPeriod)}; es otro periodo y no se combina con la cuota anterior.`);
    } else if (jobs) {
      findings.push(`En ${periodLabel(jobsPeriod)}, el INE registró unos ${millions(jobs)} millones de puestos de trabajo en ramas características del turismo.`);
      findings.push('El recuento no indica qué parte representa del empleo total.');
    }
    return [
      findings.join(' '),
      ...(tourismDependencyClaim && share ? [focus.evidenceGap] : []),
      scopeNotes.join(' '),
      limitation,
      !findings.length ? gapForReply : '',
    ].filter(Boolean).join('\n\n');
  })();
  const workingPovertyEndsMeetReply = (() => {
    if (focus.id !== 'working-poverty' || !asksAboutMakingEndsMeet) return undefined;
    const povertyFact = primaryFacts.find((fact) => /^in_work_poverty_/.test(fact.id));
    const strainFact = primaryFacts.find((fact) => fact.id === 'subjective_poverty_rate');
    if (!povertyFact || !strainFact) return undefined;
    const conciseStrain = factFinding(strainFact)
      .replace('de la población vivía en un hogar cuya persona encuestada declaró dificultad o gran dificultad para cubrir los gastos habituales', 'de la población en hogares privados vivía en hogares cuyo encuestado declaró dificultades para gastos habituales')
      .replace(' % respondió «con dificultad» y ', ' % dificultad; ')
      .replace(' % respondió «con gran dificultad»', ' % gran dificultad');
    return [
      'Eurostat mide pobreza laboral con la renta disponible equivalente del hogar bajo el 60 % de la mediana nacional tras transferencias; no mide directamente llegar a fin de mes.',
      factFinding(povertyFact),
      conciseStrain,
      'La ECV no cruza esta dificultad con las horas trabajadas, así que no permite confirmar ni descartar el enunciado. La renta usada para el umbral puede ser del año previo a la encuesta.',
    ].join('\n\n');
  })();
  const touristHousingReply = (() => {
    if (focus.id !== 'tourist-housing-supply') return undefined;
    const count = primaryFacts.find((fact) => fact.id === 'tourist_housing_count');
    const share = primaryFacts.find((fact) => fact.id === 'tourist_housing_share');
    if (!count || !share || count.latest.period !== share.latest.period || count.latest.geography !== share.latest.geography) return undefined;
    return [
      `INE (${count.latest.geography}, ${periodLabel(count.latest.period)}): ${number(count.latest.value, count.id)} viviendas turísticas estimadas; ${number(share.latest.value, share.id)} % del parque total. La cuota usa el parque del Censo de 2021 como denominador, no las viviendas disponibles para alquilar.`,
      'La estimación experimental usa anuncios deduplicados de tres plataformas. No mide viviendas que dejaron el alquiler residencial ni demuestra un efecto causal, y tampoco fija qué reducción sería «demasiada». Para comprobarlo hacen falta cambios de uso y oferta residencial comparables por territorio y periodo.',
      'El dato nacional no describe barrios o municipios.',
    ].join('\n\n');
  })();
  const educationPayReply = (() => {
    if (focus.id !== 'education-pay-comparison') return undefined;
    const earnings = primaryFacts.find((fact) => fact.id === 'mean_hourly_earnings_by_education');
    if (!earnings) return undefined;
    return [
      factFinding(earnings),
      'Son medias brutas, no una distribución salarial ni una comparación entre el salario y los requisitos del puesto. Para comprobar ese ajuste hacen falta salarios y cualificaciones exigidas comparables por ocupación, jornada, experiencia, sector, territorio y periodo.',
    ].join('\n\n');
  })();
  const tourismEmploymentHeadline = focus.id === 'tourism-employment-contribution'
    ? (() => {
      const share = facts.find((fact) => fact.id === 'tourism_characteristic_employment_share');
      return share ? `Ramas características del turismo: ${number(share.latest.value, share.id)} % del empleo en ${periodLabel(share.latest.period)}`
        : 'Faltan datos compatibles sobre el empleo en ramas turísticas';
    })()
    : undefined;
  const directThresholdComparisonNote = directThresholdAssessment
    ? (() => {
      const fact = direct.find((item) => item.id === directThresholdAssessment.metricId);
      const suffix = directThresholdAssessment.suffix === '%' ? ' %' : ` ${directThresholdAssessment.suffix}`;
      const threshold = `${number(directThresholdAssessment.threshold, fact.id)}${suffix}`;
      const position = directThresholdAssessment.actual < directThresholdAssessment.threshold ? `queda por debajo del umbral de ${threshold}`
        : directThresholdAssessment.actual > directThresholdAssessment.threshold ? `supera el umbral de ${threshold}`
          : `iguala el umbral de ${threshold}`;
      return `El dato (${number(directThresholdAssessment.actual, fact.id)}${suffix}) ${position}; ${directThresholdAssessment.verdict === 'supported' ? 'respalda' : 'contradice'} esa parte.`;
    })()
    : '';
  const reply = primaryCareCausalityReply || tourismEmploymentReply || workingPovertyEndsMeetReply || touristHousingReply || educationPayReply || shareableContextReply || [explanationReply, findingText ? `${findingLead}${findingText}` : explanationMeasuresClaim ? '' : gapForReply,
    directThresholdComparisonNote,
    direct.length || explanationMeasuresClaim ? scopeNotes.join(' ') : [gapForReply && findingText ? gapForReply : '', scopeNotes.join(' ')].filter(Boolean).join(' '), limitation].filter(Boolean).join('\n\n');
  const evidenceLevel = directEvidenceIds.length || contextualExplanationSourceIds.length ? 'limited' : 'insufficient';
  const families = displayIds.map((id) => {
    const matching = facts.filter((fact) => fact.id === id);
    return {
      familyId: id, label: labels[id] || vocabulary.get(id)?.name || id, direction: 'qualifies',
      status: educationOutcomeCausalClaim ? matching.length ? 'partial' : 'missing'
        : matching.length ? matching.some((fact) => direct.includes(fact)) ? 'available' : 'partial' : 'missing',
      dataKind: educationOutcomeCausalClaim ? 'context' : matching.length && matching.every((fact) => fact.items.every((item) => item.dataKind === 'snapshot')) ? 'snapshot' : matching.some((fact) => direct.includes(fact)) ? 'observed' : 'context',
      finding: matching.map(factFinding).join(' ') || 'No se ha localizado una medición compatible.',
      data: matching.map(factFinding),
      evidenceIds: matching.flatMap((fact) => fact.items.map((item) => item.id)).filter(Boolean),
      sourceIds: [...new Set(matching.flatMap((fact) => fact.sourceIds))],
      dimensions: matching.length === 1 ? { subject: focus.label, period: matching[0].latest.period, geography: matching[0].latest.geography || matching[0].latest.dimensionLabels?.geo,
        population: matching[0].latest.population || vocabulary.get(id)?.population, denominator: matching[0].latest.denominator, unit: unitFor(matching[0].latest) } : undefined,
      ...(matching.some((fact) => direct.includes(fact)) && !educationOutcomeCausalClaim ? {} : { missingDimensions: missing }),
    };
  });
  if (explanationMeasuresClaim) {
    const hasFactSources = Array.isArray(explanation.factSourceIds)
      && explanation.factSourceIds.length === explanationFacts.length;
    const criteria = hasFactSources ? explanationFacts.map((finding, index) => {
      const sourceIds = explanation.factSourceIds[index] || [];
      const sourceTitles = explanation.sources.filter((source) => sourceIds.includes(source.id)).map((source) => source.title);
      return {
        id: `${focus.id}-${index + 1}`,
        label: sourceTitles.join(' · ') || explanation.evidenceLabel || focus.label,
        finding,
        status: 'available',
        dataKind: 'snapshot',
        data: [finding],
        evidenceIds: sourceIds,
        sourceIds,
        dimensions: explanation.factDimensions?.[index] || explanationDimensions,
      };
    }) : undefined;
    families.push({
      familyId: focus.id,
      familyLabel: focus.label,
      label: focus.label,
      direction: 'qualifies',
      status: 'available',
      dataKind: 'snapshot',
      finding: explanationFacts.join(' '),
      data: explanationFacts,
      evidenceIds: explanation.sources.map((source) => source.id),
      sourceIds: explanation.sources.map((source) => source.id),
      dimensions: explanationDimensions,
      ...(criteria ? { criteria } : {}),
    });
  }
  else if (explanation && ids.length === 0) {
    const hasFactSources = Array.isArray(explanation.factSourceIds)
      && explanation.factSourceIds.length === explanationFacts.length;
    if (hasFactSources) explanationFacts.forEach((finding, index) => {
      const sourceIds = explanation.factSourceIds[index] || [];
      const sourceTitles = explanation.sources.filter((source) => sourceIds.includes(source.id)).map((source) => source.title);
      families.push({
        familyId: focus.id,
        familyLabel: focus.label,
        label: sourceTitles.join(' · ') || explanation.evidenceLabel || `Contexto: ${focus.label}`,
        direction: 'qualifies',
        status: 'partial',
        dataKind: 'context',
        finding,
        data: [finding],
        evidenceIds: sourceIds,
        sourceIds,
        dimensions: explanation.factDimensions?.[index] || explanationDimensions,
        missingDimensions: needs,
      });
    });
    else families.push({
      familyId: focus.id,
      familyLabel: focus.label,
      label: explanation.evidenceLabel || `Contexto: ${focus.label}`,
      direction: 'qualifies',
      status: 'partial',
      dataKind: 'context',
      finding: explanationFacts.join(' '),
      data: explanationFacts,
      evidenceIds: explanation.sources.map((source) => source.id),
      sourceIds: explanation.sources.map((source) => source.id),
      dimensions: explanationDimensions,
      missingDimensions: needs,
    });
  }
  return {
    id: `measurement-${focus.id}`, schemaVersion: '1', evidenceLevel, coverage: facts.length || explanation ? 'qualified' : 'insufficient',
    claimType, headline: subjectivePovertyHeadline || specialistOutpatientComparisonHeadline || workingPovertyComparison?.headline || workingPovertyTrends.get(direct[0]?.id)?.headline || tourismEmploymentHeadline
      || (focus.id === 'working-poverty' && direct.length
        ? fullTime && partTime ? 'Datos de riesgo de pobreza por jornada'
          : fullTime ? 'El empleo a jornada completa no elimina el riesgo de pobreza'
          : partTime ? 'El empleo a jornada parcial no elimina el riesgo de pobreza'
            : 'El riesgo de pobreza también afecta a personas ocupadas'
        : explanationMeasuresClaim ? focus.explanationHeadline || `Datos sobre ${focus.label}` : explanation ? focus.explanationHeadline || `Contexto relacionado con ${focus.label}` : direct.length ? `Datos sobre ${focus.label}` : facts.length ? `Hay contexto, pero falta medir ${focus.label}` : `Faltan datos compatibles sobre ${focus.label}`),
    summary: focus.explanation, shareableReply: reply, shareableSourceIds: sources.map((source) => source.id),
    interpretation: { kind: claimType === 'causal' ? 'causal' : claimType === 'comparative' ? 'comparative' : claimType === 'legal' ? 'legal' : 'quantitative', subject: focus.label, predicate: claimType === 'causal' ? 'requires_causal_design' : claimType === 'legal' ? 'requires_legal_basis' : 'requires_compatible_measurement', normalizedClaim: claim, evidenceNeeds: needs },
    blocks: [
      { type: 'claim_breakdown', items: [{ text: claim, type: claimType, explicit: true, evidenceIds: educationOutcomeCausalClaim ? [] : directEvidenceIds, sourceIds: educationOutcomeCausalClaim ? [] : directSourceIds,
        verdict: explanationMeasuresClaim ? explanation.claimVerdictFor?.(claim) || explanation.claimVerdict || specialistOutpatientComparison?.verdict || 'mixed'
          : educationOutcome ? directThresholdAssessment?.verdict || 'insufficient'
            : directThresholdAssessment?.verdict || (focus.id === 'working-poverty' ? workingPovertyVerdict : 'insufficient'), evidenceLevel: directEvidenceIds.length && !educationOutcomeCausalClaim ? 'limited' : 'none',
        finding: educationOutcomeCausalClaim ? undefined : explanationMeasuresClaim ? explanationFacts.join(' ') : workingPovertyComparison?.finding || (direct.length ? direct.slice(0, 2).map(factFinding).join(' ') : undefined) }], propositionIds: ['submitted-claim'] },
      ...explanationBlocks,
      ...facts.map((fact) => ({ type: 'data_finding', ...(educationOutcomeCausalClaim ? { dataKind: 'context' } : {}), evidenceIds: fact.items.map((item) => item.id).filter(Boolean), points: [factFinding(fact)] })),
      ...(missing.length ? [{ type: 'evidence_gap', missing, needed: missing, nextAction: tourismRegionalSectorComparison
        ? 'Buscar una fuente regional con recuentos comparables de empleo en turismo y agricultura para el mismo año.'
        : educationOutcome ? educationOutcomeNextAction(educationQuestion, educationOutcomeCausalClaim)
          : `Buscar una fuente primaria que mida ${focus.label} con ese ámbito.` }] : []),
      { type: 'cannot_conclude', evidenceIds: [], points: [limitation] },
      { type: 'conversation_reply', evidenceIds, text: reply },
    ],
    limitation, evidenceIds, sourceIds: sources.map((source) => source.id), sourceLinks: sources,
    evidenceSummary: { mode: facts.length ? facts.every((fact) => fact.items.every((item) => item.dataKind === 'snapshot')) ? 'snapshot' : 'dynamic' : explanation ? 'snapshot' : 'none', families, ...(missing.length ? { missingDimensions: missing } : {}) },
    answerScope: { kind: 'measurement', family: focus.id,
      directMetrics: educationOutcomeCausalClaim ? [] : focus.id === 'working-poverty' ? direct.map((fact) => fact.id) : directIds,
      contextMetrics: educationOutcomeCausalClaim ? displayIds : focus.id === 'working-poverty' ? displayIds.filter((id) => !direct.some((fact) => fact.id === id)) : displayIds.filter((id) => !directIds.includes(id)) },
    knowledgeVersion: RUNTIME_VERSIONS.warehouseKnowledge,
  };
};
