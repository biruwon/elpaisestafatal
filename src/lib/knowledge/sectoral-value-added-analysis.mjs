import { observationFlagNotes } from './observation-quality.mjs';
import { RUNTIME_VERSIONS } from './runtime-versions.mjs';

const GVA = 'gva_chain_volume_by_activity';
const HOURS = 'employment_hours_by_activity';
const JOBS = 'employment_jobs_by_activity';
const METRICS = [GVA, HOURS, JOBS];
const EXPECTED = {
  [GVA]: { unit: 'CLV20_MEUR', na_item: 'B1G', dataset: 'nama_10_a10' },
  [HOURS]: { unit: 'THS_HW', na_item: 'EMP_DC', dataset: 'nama_10_a10_e' },
  [JOBS]: { unit: 'THS_JOB', na_item: 'EMP_DC', dataset: 'nama_10_a10_e' },
};
// Keep the ten non-overlapping NACE Rev. 2 main groups. Eurostat also reports
// manufacturing (C) inside B-E; including both would double-count activity.
const ACTIVITIES = [
  { code: 'A', label: 'Agricultura, silvicultura y pesca' },
  { code: 'B-E', label: 'Industrias extractivas, manufactureras y energía y agua' },
  { code: 'F', label: 'Construcción' },
  { code: 'G-I', label: 'Comercio, transporte, alojamiento y comidas' },
  { code: 'J', label: 'Información y comunicaciones' },
  { code: 'K', label: 'Actividades financieras y de seguros' },
  { code: 'L', label: 'Actividades inmobiliarias' },
  { code: 'M_N', label: 'Actividades profesionales y servicios administrativos' },
  { code: 'O-Q', label: 'Administración pública, educación, salud y servicios sociales' },
  { code: 'R-U', label: 'Arte, ocio y otros servicios' },
];
const normalize = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
const format = (value, digits = 1) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
const formatJobs = (thousandJobs) => thousandJobs >= 1000
  ? `${format(thousandJobs / 1000)} millones de puestos`
  : `${format(thousandJobs, 1)} mil puestos`;
const isTrend = (claim) => /\b(?:cada vez|tendencia|desde|entre|ha aumentado|han aumentado|aument\w*|crec\w*|sub\w*|depend\w* mas|mayor dependencia|mas depend\w*)\b/.test(normalize(claim));
const requestedYears = (claim, years) => {
  const text = normalize(claim);
  const explicit = [...new Set((text.match(/\b(?:19|20|21)\d{2}\b/g) || []).map(Number))].sort((a, b) => a - b);
  const latest = years.at(-1);
  if (!latest || explicit.length > 2) return undefined;
  if (explicit.length === 2) return { start: explicit[0], end: explicit[1], trend: true };
  if (explicit.length === 1 && /\b(?:desde|a partir de|a partir del)\b/.test(text)) return { start: explicit[0], end: latest, trend: true };
  if (explicit.length === 1 && isTrend(claim)) return { start: explicit[0], end: latest, trend: true };
  if (explicit.length === 1) return { year: explicit[0], trend: false };
  if (isTrend(claim)) {
    const start = years.includes(2019) ? 2019 : years.at(-1) - 6;
    return { start, end: latest, trend: true };
  }
  return { year: latest, trend: false };
};
const acceptedStatus = (item) => {
  const status = String(item.status || item.dimensions?.status || '').toLowerCase();
  return !status || ['p', 'a', 'e'].includes(status);
};
const eligibleRow = (item, metricId, now, allowReviewedSnapshot = false) => {
  const expected = EXPECTED[metricId];
  const dimensions = item?.dimensions || {};
  if (item?.metricId !== metricId || item?.kind && item.kind !== 'observation'
    || !/^\d{4}$/.test(String(item.period || '')) || !Number.isFinite(item.value) || item.value <= 0 || !item.id
    || ['stale', 'invalid'].includes(item.freshness) || item.dataKind === 'snapshot' && !allowReviewedSnapshot || !acceptedStatus(item)) return false;
  if (dimensions.freq !== 'A' || dimensions.geo !== 'ES' || dimensions.unit !== expected.unit || dimensions.na_item !== expected.na_item
    || !['TOTAL', ...ACTIVITIES.map(({ code }) => code), 'C'].includes(dimensions.nace_r2)) return false;
  const retrievedAt = Date.parse(item.source?.retrievedAt || '');
  const dataUpdatedAt = Date.parse(item.source?.dataUpdatedAt || '');
  if (!item.source?.id || !item.source.title || !Number.isFinite(retrievedAt) || retrievedAt > now + 300000
    || now - retrievedAt > 14 * 86400000 || !Number.isFinite(dataUpdatedAt) || dataUpdatedAt > now + 300000) return false;
  try {
    const url = new URL(item.source.url);
    return url.protocol === 'https:' && url.hostname === 'ec.europa.eu'
      && url.pathname.toLowerCase().endsWith(`/data/${expected.dataset}`);
  } catch { return false; }
};
const seriesFor = (observations, metricId, now, allowReviewedSnapshot = false) => {
  const groups = new Map();
  for (const item of observations.filter((row) => eligibleRow(row, metricId, now, allowReviewedSnapshot))) {
    const key = `${item.source.id}:${item.source.retrievedAt}`;
    const group = groups.get(key) || { source: item.source, retrievedAt: Date.parse(item.source.retrievedAt), rows: new Map() };
    const period = Number(item.period);
    const activity = item.dimensions.nace_r2;
    const rowKey = `${period}:${activity}`;
    const previous = group.rows.get(rowKey);
    if (previous && (previous.value !== item.value || String(previous.status || '') !== String(item.status || ''))) {
      group.invalid = true;
    } else if (!previous || Date.parse(item.source.retrievedAt) >= Date.parse(previous.source.retrievedAt)) group.rows.set(rowKey, item);
    groups.set(key, group);
  }
  return [...groups.values()].filter((group) => !group.invalid)
    .sort((left, right) => right.retrievedAt - left.retrievedAt)[0];
};
const observationAt = (series, period, activity) => series?.rows.get(`${period}:${activity}`);
const hasCompletePeriod = (seriesByMetric, period) => METRICS.every((metric) => {
  const series = seriesByMetric[metric];
  return ['TOTAL', ...ACTIVITIES.map(({ code }) => code)].every((activity) => observationAt(series, period, activity));
});
const analysisForYear = (seriesByMetric, year) => {
  if (!hasCompletePeriod(seriesByMetric, year)) return undefined;
  const totalGva = observationAt(seriesByMetric[GVA], year, 'TOTAL');
  const totalHours = observationAt(seriesByMetric[HOURS], year, 'TOTAL');
  const totalJobs = observationAt(seriesByMetric[JOBS], year, 'TOTAL');
  const economyRate = totalGva.value * 1000 / totalHours.value;
  const rows = ACTIVITIES.map((activity) => {
    const gva = observationAt(seriesByMetric[GVA], year, activity.code);
    const hours = observationAt(seriesByMetric[HOURS], year, activity.code);
    const jobs = observationAt(seriesByMetric[JOBS], year, activity.code);
    return { ...activity, gva, hours, jobs, valuePerHour: gva.value * 1000 / hours.value };
  });
  const below = rows.filter((row) => row.valuePerHour < economyRate);
  const jobsBelow = below.reduce((sum, row) => sum + row.jobs.value, 0);
  return {
    year, economyRate, totalJobs: totalJobs.value, rows, below,
    jobsBelow, belowShare: jobsBelow / totalJobs.value * 100,
    observations: [...METRICS.flatMap((metric) => [
      observationAt(seriesByMetric[metric], year, 'TOTAL'),
      ...ACTIVITIES.map(({ code }) => observationAt(seriesByMetric[metric], year, code)),
    ])],
  };
};
const sourceLinksFor = (rows) => [...new Map(rows.map((item) => [item.source.id, item.source])).values()];
const flagsFor = (rows) => [...new Set(rows.flatMap((item) => observationFlagNotes(item.status)))];
const releaseDate = (value) => new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(value));
const categoryBreakdown = (analysis) => analysis.below.map((row) => `${row.label}: ${format(row.valuePerHour)} €/hora; ${formatJobs(row.jobs.value)}`).join('; ');
const largestBelowBreakdown = (analysis) => [...analysis.below].sort((left, right) => right.jobs.value - left.jobs.value).slice(0, 3)
  .map((row) => `${row.label} (${formatJobs(row.jobs.value)}; ${format(row.valuePerHour)} €/hora)`).join('; ');
const typeForClaim = (claim) => {
  const text = normalize(claim);
  if (/\b(?:caus\w*|provoc\w*|porque|debido|por culpa)\b/.test(text)) return 'causal';
  if (/\b(?:demasiad\w*|excesiv\w*|too many|too much|too dependent)\b/.test(text)) return 'normative';
  return isTrend(claim) ? 'trend' : 'comparative';
};

export const sectoralValueAddedAnalysisPlan = (claim, { observations = [], now = Date.now(), allowReviewedSnapshot = false } = {}) => {
  const seriesByMetric = Object.fromEntries(METRICS.map((metricId) => [metricId, seriesFor(observations, metricId, now, allowReviewedSnapshot)]));
  if (METRICS.some((metricId) => !seriesByMetric[metricId])) return undefined;
  const retrievedAt = METRICS.map((metricId) => seriesByMetric[metricId].retrievedAt);
  if (Math.max(...retrievedAt) - Math.min(...retrievedAt) > 7 * 86400000) return undefined;
  const periodSets = METRICS.map((metricId) => [...new Set([...seriesByMetric[metricId].rows.keys()].map((key) => Number(key.split(':', 1)[0])))]);
  const allPeriods = periodSets.slice(1).reduce((years, items) => years.filter((year) => items.includes(year)), periodSets[0] || []);
  const currentYear = new Date(now).getUTCFullYear();
  const availableYears = allPeriods.filter((year) => year < currentYear && hasCompletePeriod(seriesByMetric, year)).sort((a, b) => a - b);
  if (!availableYears.length) return undefined;
  const window = requestedYears(claim, availableYears);
  if (!window) return undefined;
  const years = window.trend ? [window.start, window.end] : [window.year];
  if (years.some((year) => !availableYears.includes(year)) || years.length === 2 && years[0] >= years[1]) return undefined;
  const analyses = years.map((year) => analysisForYear(seriesByMetric, year));
  if (analyses.some((analysis) => !analysis)) return undefined;
  const allRows = analyses.flatMap((analysis) => analysis.observations);
  const sources = sourceLinksFor(allRows);
  const sourceIds = sources.map((source) => source.id);
  const evidenceIds = [...new Set(allRows.map((row) => row.id))];
  const rawQualityNotes = flagsFor(allRows);
  const first = analyses[0];
  const last = analyses.at(-1);
  const denominator = formatJobs(first.totalJobs);
  const finding = analyses.length === 1
    ? `En ${first.year}, el valor añadido bruto real de la economía española fue de ${format(first.economyRate)} € por hora trabajada (volúmenes encadenados con referencia 2020). ${first.below.length} de las diez grandes ramas quedaron por debajo de esa media; sumaban ${formatJobs(first.jobsBelow)}, el ${format(first.belowShare)} % del total de ${denominator}. La cuenta es de puestos, no de personas ocupadas, según el concepto doméstico de cuentas nacionales.`
    : `Entre ${first.year} y ${last.year}, la proporción de puestos en grandes ramas cuyo valor añadido bruto por hora quedó por debajo de la media de ese mismo año pasó del ${format(first.belowShare)} % al ${format(last.belowShare)} % (${format(last.belowShare - first.belowShare)} puntos porcentuales). Es una comparación descriptiva de ramas amplias, no una clasificación de puestos individuales.`;
  const provisionalYears = [...new Set(allRows.filter((row) => String(row.status || '').toLowerCase().includes('p')).map((row) => Number(row.period)))].sort((a, b) => a - b);
  const provisionalNote = provisionalYears.length ? `Eurostat marca como provisionales los datos de ${provisionalYears.join(', ')}.` : '';
  const gvaUpdatedAt = seriesByMetric[GVA].source.dataUpdatedAt;
  const employmentUpdatedAt = seriesByMetric[HOURS].source.dataUpdatedAt;
  const jobsUpdatedAt = seriesByMetric[JOBS].source.dataUpdatedAt;
  const updateDatesDiffer = new Set([gvaUpdatedAt, employmentUpdatedAt, jobsUpdatedAt].map((value) => new Date(value).toISOString().slice(0, 10))).size > 1;
  const updateNote = updateDatesDiffer
    ? `Las tablas de horas y puestos se actualizaron el ${releaseDate(employmentUpdatedAt)} y la tabla de VAB el ${releaseDate(gvaUpdatedAt)}; las series coinciden en el año, pero sus fechas de actualización son distintas y podrían incorporar revisiones de momentos diferentes.`
    : `Eurostat actualizó las tres tablas el ${releaseDate(gvaUpdatedAt)}.`;
  const qualityNotes = [...new Set([
    ...rawQualityNotes.filter((note) => !/marca este dato como provisional/i.test(note)),
    ...(provisionalNote ? [provisionalNote] : []),
    updateNote,
  ])];
  const narrowIndustryNote = /\b(?:hosteler\w*|turis\w*|hotel\w*|restaur\w*|comercio\w*|transporte\w*)\b/.test(normalize(claim))
    ? 'La rama G-I combina comercio, transporte y alojamiento/comidas; no permite atribuir este resultado solo a turismo u hostelería.' : '';
  const limitation = [
    '“Por debajo de la media” es un umbral comparativo elegido para describir estos datos, no una categoría oficial de empleos de bajo valor añadido. El cociente sectorial no mide cada puesto, salarios ni calidad del empleo, y no permite decidir qué proporción sería excesiva.',
    'Son diez grandes ramas NACE Rev. 2; no se deben interpretar como ocupaciones concretas. La actividad inmobiliaria incluye alquileres imputados de vivienda, que influyen en la media total.',
    narrowIndustryNote,
    provisionalNote,
    updateNote,
  ].filter(Boolean).join(' ');
  const reply = [
    finding,
    analyses.length === 1 ? `Las tres ramas con más puestos dentro de ese grupo fueron: ${largestBelowBreakdown(first)}.`
      : `En ${first.year}, las ramas con más puestos por debajo de la media fueron ${largestBelowBreakdown(first)}. En ${last.year}, ${largestBelowBreakdown(last)}.`,
    limitation,
  ].filter(Boolean).join('\n\n');
  const contextFamily = {
    familyId: 'employment-value-added-by-activity', label: 'valor añadido real por hora y puestos de trabajo por actividad',
    direction: 'qualifies', status: 'available', dataKind: 'observed',
    finding, data: [finding, ...analyses.map((analysis) => `${analysis.year}: ramas por debajo de la media: ${categoryBreakdown(analysis)}.`)],
    evidenceIds, sourceIds,
    dimensions: {
      subject: 'valor añadido bruto real por hora trabajada y número de puestos por actividad económica',
      population: 'puestos de trabajo en España según el concepto doméstico de cuentas nacionales',
      period: years.join('–'), geography: 'España', denominator: 'total de puestos de trabajo en España del mismo año',
      unit: 'euros de 2020 de VAB por hora; miles de puestos de trabajo y porcentaje del total',
    },
    qualityNotes,
    limitation,
  };
  const claimType = typeForClaim(claim);
  const verdict = 'insufficient';
  return {
    id: 'measurement-employment-value-added-by-activity', schemaVersion: '1', evidenceLevel: 'limited', coverage: 'qualified', claimType,
    headline: analyses.length === 1 ? `${format(first.belowShare)} % de los puestos estaba en ramas por debajo de la media en ${first.year}` : `La proporción cambió ${format(last.belowShare - first.belowShare)} puntos entre ${first.year} y ${last.year}`,
    summary: finding, shareableReply: reply, shareableSourceIds: sourceIds,
    interpretation: {
      kind: 'quantitative', subject: 'composición de puestos de trabajo y valor añadido por actividad',
      predicate: analyses.length === 1 ? 'composition' : 'comparison', normalizedClaim: claim,
      evidenceNeeds: ['VAB real y horas trabajadas para calcular una media por hora en cada rama', 'puestos de trabajo y total del mismo año', 'definición explícita del umbral usado para llamar a una rama “por debajo de la media”'],
    },
    blocks: [
      { type: 'claim_breakdown', propositionIds: ['submitted-claim'], items: [{ text: claim, type: claimType, explicit: true, evidenceIds: [], sourceIds: [], contextSourceIds: sourceIds, contextFinding: finding, verdict, evidenceLevel: 'limited', finding: 'La comparación por actividad aporta contexto, pero no establece qué nivel de empleo de menor valor añadido sería excesivo.' }] },
      { type: 'data_finding', evidenceIds, points: [finding, ...analyses.map((analysis) => `Ramas por debajo de la media en ${analysis.year}: ${categoryBreakdown(analysis)}.`)] },
      { type: 'cannot_conclude', evidenceIds, points: [limitation] },
      { type: 'conversation_reply', evidenceIds, text: reply },
    ],
    limitation, evidenceIds, sourceIds, sourceLinks: sources,
    evidenceSummary: { mode: 'dynamic', families: [contextFamily] },
    answerScope: { kind: 'measurement', family: 'employment-value-added-by-activity', directMetrics: [], contextMetrics: METRICS },
    knowledgeVersion: RUNTIME_VERSIONS.warehouseKnowledge,
  };
};

export const sectoralValueAddedEvidenceGapPlan = (claim, { reason = 'data' } = {}) => {
  const missing = reason === 'period' ? 'observaciones compatibles para el año o intervalo solicitado'
    : reason === 'geography' ? 'series comparables de actividad para el territorio solicitado'
      : 'VAB real, horas y puestos de trabajo por las mismas ramas y años';
  const explanation = 'Puede compararse el valor añadido real por hora entre grandes ramas y describirse qué proporción de los puestos corresponde a ramas por debajo de la media.';
  const reply = `${explanation}\n\nNo hay datos compatibles suficientes para ${missing}. Aunque se encontrara esa proporción, no definiría por sí sola qué empleos tienen bajo valor añadido ni si son demasiados.`;
  return {
    id: 'measurement-employment-value-added-gap', schemaVersion: '1', evidenceLevel: 'insufficient', coverage: 'insufficient', claimType: typeForClaim(claim),
    headline: 'Faltan datos comparables por actividad', summary: explanation, shareableReply: reply,
    interpretation: { kind: 'quantitative', subject: 'valor añadido y empleo por actividad', predicate: 'comparison', normalizedClaim: claim, evidenceNeeds: [missing] },
    blocks: [
      { type: 'claim_breakdown', propositionIds: ['submitted-claim'], items: [{ text: claim, type: typeForClaim(claim), explicit: true, verdict: 'insufficient', evidenceLevel: 'none', finding: `Falta ${missing}.` }] },
      { type: 'evidence_gap', missing: [missing], needed: [missing], nextAction: 'Comparar VAB real, horas trabajadas y puestos para las mismas ramas, territorio y años; definir un umbral antes de llamar “bajo” al valor añadido.' },
      { type: 'cannot_conclude', evidenceIds: [], points: ['El valor añadido por hora de una rama es un promedio agregado. No mide salarios, calidad del empleo ni el valor de cada puesto.'] },
      { type: 'conversation_reply', evidenceIds: [], text: reply },
    ],
    limitation: explanation, evidenceIds: [], sourceIds: [], sourceLinks: [],
    evidenceSummary: { mode: 'none', families: [], missingDimensions: [missing] },
    answerScope: { kind: 'measurement', family: 'employment-value-added-by-activity', directMetrics: [], contextMetrics: METRICS },
    knowledgeVersion: RUNTIME_VERSIONS.warehouseKnowledge,
  };
};
