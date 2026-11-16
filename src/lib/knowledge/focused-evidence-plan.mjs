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
  return (item) => {
    if (!matchesAge(item) || !matchesPeriod(item) || !matchesGeography(item) || !matchesSex(item)) return false;
    if (!tertiaryOverqualificationCitizenshipFitsClaim(claim, item)) return false;
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
  cpi_index: 'IPC general', harmonised_price_index: 'Índice armonizado de precios',
  rental_price_index: 'Índice de alquileres pagados',
  housing_cost_overburden_rate: 'Sobrecarga de gastos de vivienda',
  median_equivalised_income: 'Renta disponible equivalente mediana',
  house_price_index: 'Índice de precios de compraventa',
  gender_pay_gap: 'Brecha salarial sin ajustar',
  household_electricity_price: 'Precio doméstico de electricidad',
  household_electricity_price_europe: 'Precio doméstico de electricidad',
  education_personnel: 'Personal docente',
  employment_rate_tertiary_education: 'Tasa de empleo de personas con estudios terciarios',
  unemployment_rate_tertiary_education: 'Tasa de paro de personas con estudios terciarios',
  tertiary_overqualification_rate: 'Tasa de sobrecualificación entre personas con estudios terciarios ocupadas',
  tertiary_overqualification_rate_age_20_34: 'Tasa de sobrecualificación entre personas ocupadas de 20 a 34 años con educación terciaria',
  in_work_poverty_rate: 'Personas ocupadas de 18 años o más en riesgo de pobreza',
  in_work_poverty_full_time_rate: 'Personas ocupadas de 18 años o más a jornada completa en riesgo de pobreza',
  primary_care_wait_days: 'Demora entre quienes esperaron más de un día',
  primary_care_wait_over_one_day_rate: 'Pacientes de medicina de familia pública que esperaron más de un día por falta de cita',
};
const unitFor = (item) => /^household_electricity_price/.test(item.metricId || '') && item.dimensions?.currency && (item.dimensions?.unit === 'KWH' || /^(?:kilowatt-hour|kwh)$/i.test(item.unit || ''))
  ? `${item.dimensions.currency === 'EUR' ? '€' : item.dimensions.currency}/kWh`
  : /^household_electricity_price/.test(item.metricId || '') && /eur|euro/i.test(item.unit || '') ? '€/kWh'
  : /percent|percentage|^pc$|%/i.test(item.unit || '') ? '%' : /days|d[ií]as/i.test(item.unit || '') ? 'días'
  : item.metricId === 'rental_price_index' && /index|índice/i.test(item.unit || '')
    ? `índice${String(item.unit).match(/\b(?:19|20)\d{2}\s*=\s*100\b/) ? ` (${String(item.unit).match(/\b(?:19|20)\d{2}\s*=\s*100\b/)[0].replace(/\s/g, '')})` : ''}`
  : item.metricId === 'cpi_index' || /index/i.test(item.unit || '') ? 'índice'
    : /median_hourly_earnings/.test(item.metricId || '') && /eur/i.test(item.unit || '') ? '€/hora' : item.displayUnit || item.unit || '';
const number = (value, metricId) => new Intl.NumberFormat('es-ES', { maximumFractionDigits:
  metricId === 'primary_care_wait_over_one_day_rate' ? 1 : /^household_electricity_price/.test(metricId || '') ? 4 : 2 }).format(value);
const placeLabel = (item) => {
  const place = item.geography || item.dimensionLabels?.geo || item.dimensions?.geo || '';
  return /^(spain|es)$/i.test(place) ? 'España' : /european union|^eu27/i.test(place) ? 'Unión Europea (27 países)' : place;
};
const periodLabel = (period) => String(period).replace(/^(\d{4})-O([123])$/, '$1 · oleada $2');
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
    && (!/^household_electricity_price/.test(id) || !/^(?:kilowatt-hour|kwh)$/i.test(row.unit || '') || Boolean(row.dimensions?.currency)))) {
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
    if (clauseFocus) return clauseFocus.id === focus.id;
    const clauseText = normalize(item.text);
    const sameSectorOutput = focus.id === 'sector-wage-comparison'
      && /\b(pib|producto interior bruto|valor anadido|produccion|aport\w*)\b/.test(clauseText)
      && sectorNames.some((pattern) => pattern.test(normalizedClaim) && pattern.test(clauseText));
    if (sameSectorOutput) return true;
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
        : comparesSectorOutput ? [...focus.needs, 'valor añadido o aportación del mismo sector al PIB, con la misma clasificación y periodo'] : focus.needs;
  const directIds = asksAboutMakingEndsMeet ? [] : ids.filter((id) => allowedDirect.includes(id) || allowedDirect.includes(id.replace(/_europe$/, '')));
  const fitsClaim = observationFitsClaim(claim);
  const facts = ids.flatMap((id) => factsForMetric(id, observations, fitsClaim));
  const limitation = educationOutcome ? educationOutcomeLimitation(ids, focus.limitation) : focus.limitation;
  const territories = requestedGeographyScopes(claim);
  const explanation = focus.explanationEvidence && now < Date.parse(focus.explanationEvidence.expiresAt)
    && territories.every(({ id }) => focus.explanationEvidence.territories?.includes(id))
    && (!focus.explanationEvidence.when || focus.explanationEvidence.when(normalize(claim))) ? focus.explanationEvidence : undefined;
  const claimType = focus.id === 'private-healthcare-access'
    ? privateHealthcareAccessClaimType(claim)
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
  ]).filter(Boolean))];
  const findingText = primaryFacts.map((fact) => educationOutcome ? educationOutcomeFinding(fact) : fact.finding).join(' ');
  const gap = missing.length ? `Falta una medición directa de ${missing.join('; ')}.` : '';
  const explanationReply = explanation
    ? explanationSupportsClaim ? explanation.facts.join('\n\n') : [focus.explanation, `Como contexto: ${explanation.facts.join('\n\n')}`].filter(Boolean).join('\n\n')
    : focus.explanation;
  const reply = [explanationReply, findingText ? `${direct.length ? 'Datos de la fuente' : 'Como contexto'}: ${findingText}` : explanationMeasuresClaim ? '' : gap,
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
        verdict: 'insufficient', evidenceLevel: directEvidenceIds.length ? 'limited' : 'none',
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
