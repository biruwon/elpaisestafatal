import { claimFocusFor, focusedMetricIdsFor } from './claim-focus.mjs';
import { metricVocabulary } from './measurement-definitions.generated.mjs';
import { RUNTIME_VERSIONS } from './runtime-versions.mjs';
import { realWagePlan } from './real-wage-comparison.mjs';

const vocabulary = new Map(metricVocabulary.map((metric) => [metric.id, metric]));
const normalize = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const territoryAliases = [
  ['ES', ['espana', 'espanol', 'espanola', 'spain']], ['FR', ['francia', 'frances', 'francesa', 'france']],
  ['DE', ['alemania', 'aleman', 'alemana', 'germany']], ['IT', ['italia', 'italiano', 'italiana', 'italy']],
  ['PT', ['portugal', 'portugues', 'portuguesa']], ['UK', ['reino unido', 'britanico', 'britanica', 'united kingdom']],
  ...['andalucia', 'aragon', 'asturias', 'baleares', 'canarias', 'cantabria', 'castilla y leon', 'castilla la mancha', 'cataluna', 'comunidad valenciana', 'extremadura', 'galicia', 'madrid', 'murcia', 'navarra', 'pais vasco', 'la rioja', 'ceuta', 'melilla', 'barcelona', 'valencia', 'sevilla'].map((place) => [place, [place]]),
];
const requestedTerritories = (claim) => {
  const text = ` ${normalize(claim)} `;
  const found = territoryAliases.filter(([, aliases]) => aliases.some((alias) => [alias, `${alias}s`, `${alias}es`].some((term) => text.includes(` ${term} `))));
  return found.some(([id]) => id.length > 2) ? found.filter(([id]) => id !== 'ES') : found;
};
const observationFitsClaim = (claim, item) => {
  const territories = requestedTerritories(claim);
  const actual = ` ${normalize([item.geography, item.dimensions?.geo, item.dimensionLabels?.geo].filter(Boolean).join(' '))} `;
  const europeanComparator = /\b(europa|europe[oa]s?|ue|union europea)\b/.test(normalize(claim)) && /\b(eu27 2020|european union|union europea)\b/.test(actual);
  if (territories.length && !europeanComparator && !territories.some(([id, aliases]) => actual.includes(` ${normalize(id)} `) || aliases.some((alias) => actual.includes(` ${alias} `)))) return false;
  const years = String(claim).match(/\b(?:19|20|21)\d{2}\b/g) || [];
  if (years.length) {
    const year = Number(String(item.period).slice(0, 4));
    const since = /\bdesde\s+(?:el\s+)?(?:ano\s+)?(?:19|20|21)\d{2}\b/.test(normalize(claim));
    if (!(since ? year >= Math.min(...years.map(Number)) : years.includes(String(year)))) return false;
  }
  const text = normalize(claim);
  const population = normalize([item.population, JSON.stringify(item.dimensions || {}), JSON.stringify(item.dimensionLabels || {})].join(' '));
  if (/\bmujeres\b/.test(text) && !/\bfemale\b|\bmujeres\b|"sex"\s*:\s*"F"/i.test(population) && item.dimensions?.sex !== 'F') return false;
  if (/\b(jovenes|juvenil|menores de 30)\b/.test(text) && !/\b(youth|juvenil|jovenes|15 24|16 29|y15 24|y16 29)\b/.test(population)) return false;
  return true;
};
const labels = {
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
  in_work_poverty_rate: 'Personas ocupadas de 18 años o más en riesgo de pobreza',
  in_work_poverty_full_time_rate: 'Personas ocupadas de 18 años o más a jornada completa en riesgo de pobreza',
  primary_care_wait_days: 'Demora entre quienes esperaron más de un día',
  primary_care_wait_over_one_day_rate: 'Pacientes de medicina de familia pública que esperaron más de un día por falta de cita',
};
const unitFor = (item) => /^household_electricity_price/.test(item.metricId || '') && item.dimensions?.currency && (item.dimensions?.unit === 'KWH' || /^(?:kilowatt-hour|kwh)$/i.test(item.unit || ''))
  ? `${item.dimensions.currency === 'EUR' ? '€' : item.dimensions.currency}/kWh`
  : /^household_electricity_price/.test(item.metricId || '') && /eur|euro/i.test(item.unit || '') ? '€/kWh'
  : /percent|percentage|^pc$|%/i.test(item.unit || '') ? '%' : /days|d[ií]as/i.test(item.unit || '') ? 'días'
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
const scopeKey = (item) => JSON.stringify({
  geography: item.geography || item.dimensions?.geo || '',
  population: item.population || '', denominator: item.denominator || '', unit: item.unit || '',
  dimensions: Object.fromEntries(Object.entries(item.dimensions || {}).filter(([key]) => !['time', 'period', 'year'].includes(key)).sort(([a], [b]) => a.localeCompare(b))),
  dataKind: item.dataKind || 'observed',
});
const sourceValid = (source) => {
  try { return Boolean(source?.id && source?.title && new URL(source.url).protocol === 'https:'); } catch { return false; }
};
const factsForMetric = (id, observations, claim) => {
  const series = new Map();
  for (const item of observations.filter((row) => row.metricId === id && validNumber(row.value) && row.period && row.freshness !== 'invalid'
    && !['projected', 'budget'].includes(row.dataKind) && sourceValid(row.source) && observationFitsClaim(claim, row)
    && (!/^household_electricity_price/.test(id) || !/^(?:kilowatt-hour|kwh)$/i.test(row.unit || '') || Boolean(row.dimensions?.currency)))) {
    const key = scopeKey(item);
    const rows = series.get(key) || [];
    rows.push(item);
    series.set(key, rows);
  }
  // Do not join two populations, territories, units, stages, or survey bases.
  return [...series.values()].slice(0, 3).map((items) => {
    const rows = [...new Map(items.map((item) => [item.period, item])).values()].sort((a, b) => String(a.period).localeCompare(String(b.period)));
    const latest = rows.at(-1);
    const value = `${number(latest.value, id)} ${unitFor(latest)}`.trim();
    const metric = vocabulary.get(id);
    const scope = [latest.geography || latest.dimensionLabels?.geo, latest.population || metric?.population].filter(Boolean).join(' · ');
    const place = placeLabel(latest);
    const finding = `${labels[id] || metric?.name || latest.metric}${place ? ` · ${place}` : ''}: ${value} (${periodLabel(latest.period)}).`;
    return { id, items: rows, latest, finding, scope, sourceIds: [...new Set(rows.map((item) => item.source.id))] };
  });
};

// This composer reports only the supplied observations. It cannot turn a
// contextual proxy into a verdict on a different measurement or silently
// infer a real-wage change from unmatched wage and price periods.
export const focusedEvidencePlan = (claim, { observations = [], propositions = [], now = Date.now() } = {}) => {
  const focus = claimFocusFor(claim);
  if (!focus) return undefined;
  const continuesSameSubject = (item) => {
    const clauseFocus = claimFocusFor(item.text);
    if (clauseFocus) return clauseFocus.id === focus.id;
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
  const allowedDirect = focus.id === 'working-poverty' && fullTime ? ['in_work_poverty_full_time_rate'] : focus.direct;
  const ids = [...focusedMetricIdsFor(claim)];
  const asksAboutMakingEndsMeet = focus.id === 'working-poverty' && /\b(fin de mes|alcanza para vivir|llega para vivir|cubrir (?:los )?gastos)\b/.test(normalize(claim));
  const needs = asksAboutMakingEndsMeet ? ['dificultad declarada para llegar a fin de mes', 'situación laboral y jornada de las personas consultadas', 'periodo y población']
    : focus.id === 'class-size' ? [asksAboutTeachers ? 'alumnado por docente' : 'alumnado por grupo o aula', 'etapa educativa y titularidad', 'territorio y curso'] : focus.needs;
  const directIds = asksAboutMakingEndsMeet ? [] : ids.filter((id) => allowedDirect.includes(id) || allowedDirect.includes(id.replace(/_europe$/, '')));
  const facts = ids.flatMap((id) => factsForMetric(id, observations, claim));
  const territories = requestedTerritories(claim);
  const explanation = focus.explanationEvidence && now < Date.parse(focus.explanationEvidence.expiresAt)
    && territories.every(([id]) => focus.explanationEvidence.territories?.includes(id)) ? focus.explanationEvidence : undefined;
  const sources = [...new Map([...facts.flatMap((fact) => fact.items.map((item) => item.source)), ...(explanation?.sources || [])].map((source) => [source.id, source])).values()];
  const direct = facts.filter((fact) => directIds.includes(fact.id));
  const context = facts.filter((fact) => !directIds.includes(fact.id));
  const evidenceIds = [...new Set([...facts.flatMap((fact) => fact.items.map((item) => item.id)), ...(explanation?.sources || []).map((source) => source.id)].filter(Boolean))];
  const directEvidenceIds = [...new Set([...direct.flatMap((fact) => fact.items.map((item) => item.id)), ...(explanation?.sources || []).map((source) => source.id)].filter(Boolean))];
  const directSourceIds = [...new Set([...direct.flatMap((fact) => fact.sourceIds), ...(explanation?.sources || []).map((source) => source.id)])];
  const missing = direct.length ? [] : needs;
  const primaryFacts = (direct.length ? direct : context).slice(0, 2);
  const scopeNotes = [...new Set(primaryFacts.flatMap((fact) => [
    fact.latest.freshness === 'stale' ? 'La fuente no se ha actualizado en el plazo previsto y puede no incluir revisiones recientes.' : '',
    /^[bep ,]*p[bep ,]*$/i.test(fact.latest.status || '') ? 'La fuente marca este dato como provisional.' : '',
    /^[bep ,]*e[bep ,]*$/i.test(fact.latest.status || '') ? 'La fuente marca este dato como estimado.' : '',
    fact.latest.dimensions?.provisional === true ? 'Resultados provisionales de una oleada; no equivalen al año completo.' : '',
    /^primary_care_wait_/.test(fact.id) ? 'La encuesta se refiere a la última consulta de adultos en medicina de familia pública durante los 12 meses anteriores; excluye mutualidades con asistencia privada.' : '',
    /^household_electricity_price/.test(fact.id) && fact.latest.dimensions?.nrg_cons === 'TOT_KWH' && fact.latest.dimensions?.tax === 'I_TAX'
      ? 'Es un precio medio de los hogares para todos los tramos de consumo, con impuestos y tasas incluidos.' : '',
  ]).filter(Boolean))];
  const findingText = primaryFacts.map((fact) => fact.finding).join(' ');
  const gap = !direct.length ? `Falta una medición directa de ${needs.join('; ')}.` : '';
  const reply = [explanation ? explanation.facts.join('\n\n') : focus.explanation, findingText ? `${direct.length ? 'Datos de la fuente' : 'Como contexto'}: ${findingText}` : explanation ? '' : gap,
    direct.length ? scopeNotes.join(' ') : [gap && findingText ? gap : '', scopeNotes.join(' ')].filter(Boolean).join(' '), focus.limitation].filter(Boolean).join('\n\n');
  const evidenceLevel = directEvidenceIds.length ? 'limited' : 'insufficient';
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
  return {
    id: `measurement-${focus.id}`, schemaVersion: '1', evidenceLevel, coverage: facts.length || explanation ? 'qualified' : 'insufficient',
    claimType: explanation ? 'definition' : 'descriptive', headline: explanation ? `Qué explican las fuentes sobre ${focus.label}` : direct.length ? `Datos sobre ${focus.label}` : facts.length ? `Hay contexto, pero falta medir ${focus.label}` : `Faltan datos compatibles sobre ${focus.label}`,
    summary: focus.explanation, shareableReply: reply, shareableSourceIds: sources.map((source) => source.id),
    interpretation: { kind: 'quantitative', subject: focus.label, predicate: 'requires_compatible_measurement', normalizedClaim: claim, evidenceNeeds: needs },
    blocks: [
      { type: 'claim_breakdown', items: [{ text: claim, type: 'descriptive', explicit: true, evidenceIds: directEvidenceIds, sourceIds: directSourceIds,
        verdict: 'insufficient', evidenceLevel: directEvidenceIds.length ? 'limited' : 'none',
        finding: explanation ? explanation.facts.join(' ') : direct.length ? direct.slice(0, 2).map((fact) => fact.finding).join(' ') : undefined }], propositionIds: ['submitted-claim'] },
      ...(explanation ? [{ type: 'confirmed', evidenceIds: explanation.sources.map((source) => source.id), points: explanation.facts }] : []),
      ...facts.map((fact) => ({ type: 'data_finding', evidenceIds: fact.items.map((item) => item.id).filter(Boolean), points: [fact.finding] })),
      ...(missing.length ? [{ type: 'evidence_gap', missing, needed: needs, nextAction: `Buscar una fuente primaria que mida ${focus.label} con ese ámbito.` }] : []),
      { type: 'cannot_conclude', evidenceIds: [], points: [focus.limitation] },
      { type: 'conversation_reply', evidenceIds, text: reply },
    ],
    limitation: focus.limitation, evidenceIds, sourceIds: sources.map((source) => source.id), sourceLinks: sources,
    evidenceSummary: { mode: facts.length ? 'dynamic' : explanation ? 'snapshot' : 'none', families, ...(missing.length ? { missingDimensions: missing } : {}) },
    answerScope: { kind: 'measurement', family: focus.id, directMetrics: directIds, contextMetrics: ids.filter((id) => !directIds.includes(id)) },
    knowledgeVersion: RUNTIME_VERSIONS.warehouseKnowledge,
  };
};
