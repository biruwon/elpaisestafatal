import { RUNTIME_VERSIONS } from './runtime-versions.mjs';

const HOSPITALITY = 'lfs_employed_persons_hospitality_quarterly';
const TOTAL = 'lfs_employed_persons_total_quarterly';
const METRICS = [HOSPITALITY, TOTAL];
const EXPECTED = {
  [HOSPITALITY]: { nace: 'I', url: '/data/lfsq_egan2' },
  [TOTAL]: { nace: 'TOTAL', url: '/data/lfsq_egan2' },
};
const ACTIVITY = 'alojamiento y servicios de comida (NACE I)';
const normalize = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
const format = (value, digits = 1) => new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: digits, minimumFractionDigits: digits,
}).format(value);
const formatPeople = (thousandPeople) => thousandPeople >= 1000
  ? format(thousandPeople / 1000, 2) + ' millones de personas'
  : format(thousandPeople, 1) + ' mil personas';
const quarterLabel = (period) => String(period).replace(/^(\d{4})-Q([1-4])$/, '$2.º trimestre de $1');
const statusFor = (item) => String(item.status || item.dimensions?.status || '').toLowerCase();
const hasBreakOrLowReliability = (item) => /[bu]/.test(statusFor(item));
const hasDefinitionDifference = (item) => statusFor(item).includes('d');
const yearOf = (period) => Number(String(period).match(/^(\d{4})-Q[1-4]$/)?.[1] || 0);
const isCrossYearRequest = (claim, explicitYears) => explicitYears.length > 1
  || explicitYears.length === 1 && /\b(?:desde|a partir de|hasta|entre|evoluci\w*|tendencia|cada ano|varios anos)\b/.test(normalize(claim))
  || /\b(?:cada vez|evoluci\w*|tendencia|desde hace|a lo largo de los anos)\b/.test(normalize(claim));

const requestedYearFor = (claim, years) => {
  const text = normalize(claim);
  const explicitYears = [...new Set((text.match(/\b(?:19|20|21)\d{2}\b/g) || []).map(Number))];
  if (isCrossYearRequest(claim, explicitYears) || explicitYears.length > 1) return undefined;
  const year = explicitYears[0] || years.at(-1);
  return years.includes(year) ? year : undefined;
};

const eligibleRow = (item, metricId, now) => {
  const expected = EXPECTED[metricId];
  const dimensions = item?.dimensions || {};
  if (item?.metricId !== metricId || item?.kind && item.kind !== 'observation'
    || !/^\d{4}-Q[1-4]$/.test(String(item.period || '')) || !Number.isFinite(item.value) || item.value <= 0 || !item.id
    || ['stale', 'invalid'].includes(item.freshness) || item.dataKind === 'snapshot' || hasBreakOrLowReliability(item)) return false;
  if (dimensions.freq !== 'Q' || dimensions.unit !== 'THS_PER' || dimensions.sex !== 'T' || dimensions.age !== 'Y15-74'
    || dimensions.geo !== 'ES' || dimensions.nace_r2 !== expected.nace) return false;
  const retrievedAt = Date.parse(item.source?.retrievedAt || '');
  const dataUpdatedAt = Date.parse(item.source?.dataUpdatedAt || '');
  if (!item.source?.id || !item.source.title || !Number.isFinite(retrievedAt) || retrievedAt > now + 300000
    || now - retrievedAt > 14 * 86400000 || !Number.isFinite(dataUpdatedAt) || dataUpdatedAt > now + 300000) return false;
  try {
    const url = new URL(item.source.url);
    return url.protocol === 'https:' && url.hostname === 'ec.europa.eu'
      && url.pathname.toLowerCase().endsWith(expected.url);
  } catch { return false; }
};

const seriesFor = (observations, metricId, now) => {
  const groups = new Map();
  for (const item of observations.filter((row) => eligibleRow(row, metricId, now))) {
    const key = item.source.id + ':' + item.source.retrievedAt;
    const group = groups.get(key) || { source: item.source, retrievedAt: Date.parse(item.source.retrievedAt), rows: new Map() };
    const previous = group.rows.get(item.period);
    if (previous && (previous.value !== item.value || statusFor(previous) !== statusFor(item))) group.invalid = true;
    else group.rows.set(item.period, item);
    groups.set(key, group);
  }
  return [...groups.values()].filter((group) => !group.invalid)
    .sort((left, right) => right.retrievedAt - left.retrievedAt)[0];
};

const allQuarters = (year) => [1, 2, 3, 4].map((quarter) => String(year) + '-Q' + quarter);
const observationsForYear = (seriesByMetric, year) => METRICS.flatMap((metricId) => allQuarters(year)
  .map((period) => seriesByMetric[metricId].rows.get(period)));
const hasCompleteYear = (seriesByMetric, year) => observationsForYear(seriesByMetric, year).every(Boolean);
const sourceLinksFor = (rows) => [...new Map(rows.map((item) => [item.source.id, item.source])).values()];
const releaseDate = (value) => new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'long', timeZone: 'UTC',
}).format(new Date(value));

const analysisForYear = (seriesByMetric, year) => {
  if (!hasCompleteYear(seriesByMetric, year)) return undefined;
  const quarters = allQuarters(year).map((period) => {
    const hospitality = seriesByMetric[HOSPITALITY].rows.get(period);
    const total = seriesByMetric[TOTAL].rows.get(period);
    return {
      period, hospitality, total,
      hospitalityShare: hospitality.value / total.value * 100,
    };
  });
  const low = [...quarters].sort((left, right) => left.hospitality.value - right.hospitality.value)[0];
  const high = [...quarters].sort((left, right) => right.hospitality.value - left.hospitality.value)[0];
  return {
    year, quarters, low, high,
    hospitalityChange: (high.hospitality.value / low.hospitality.value - 1) * 100,
    totalChange: (high.total.value / low.total.value - 1) * 100,
    shareChange: high.hospitalityShare - low.hospitalityShare,
  };
};

const claimTypeFor = (claim) => {
  const text = normalize(claim);
  if (/\b(?:oblig\w*|caus\w*|provoc\w*|fuerz\w*|porque|debido|por culpa|because|force\w*)\b/.test(text)) return 'causal';
  if (/\b(?:demasiad\w*|excesiv\w*|too many|too much)\b/.test(text)) return 'normative';
  return /\b(?:compar\w*|mas|menos|mayor|menor|verano|invierno|entre)\b/.test(text) ? 'comparative' : 'descriptive';
};
const asksForQuarterlyVariation = (claim) => {
  const text = normalize(claim);
  return /\b(?:cuant\w*|cuanto|cuanta)\b/.test(text)
    && /\b(?:vari\w*|cambi\w*|fluctu\w*)\b/.test(text)
    && /\b(?:trimest\w*|quarter\w*)\b/.test(text);
};

export const tourismSeasonalEmploymentPlan = (claim, { observations = [], now = Date.now() } = {}) => {
  const seriesByMetric = Object.fromEntries(METRICS.map((metricId) => [metricId, seriesFor(observations, metricId, now)]));
  if (METRICS.some((metricId) => !seriesByMetric[metricId])) return undefined;
  const retrievedAt = METRICS.map((metricId) => seriesByMetric[metricId].retrievedAt);
  if (Math.max(...retrievedAt) - Math.min(...retrievedAt) > 7 * 86400000) return undefined;
  const commonPeriods = [...seriesByMetric[HOSPITALITY].rows.keys()]
    .filter((period) => seriesByMetric[TOTAL].rows.has(period));
  const currentYear = new Date(now).getUTCFullYear();
  const availableYears = [...new Set(commonPeriods.map(yearOf))]
    .filter((year) => year >= 2019 && year < currentYear && year <= 2025 && hasCompleteYear(seriesByMetric, year))
    .sort((left, right) => left - right);
  const year = requestedYearFor(claim, availableYears);
  if (!year) return undefined;
  const analysis = analysisForYear(seriesByMetric, year);
  if (!analysis) return undefined;
  const rows = observationsForYear(seriesByMetric, year);
  const sources = sourceLinksFor(rows);
  const sourceIds = sources.map((source) => source.id);
  const evidenceIds = [...new Set(rows.map((row) => row.id))];
  const hasDefinitionFlag = rows.some(hasDefinitionDifference);
  const directVariationQuestion = asksForQuarterlyVariation(claim);
  const hospitalitySourceId = seriesByMetric[HOSPITALITY].source.id;
  const totalSourceId = seriesByMetric[TOTAL].source.id;
  const updatedAt = [...new Set(sources.map((source) => source.dataUpdatedAt))];
  const finding = 'En ' + year + ', la encuesta de Eurostat estimó ' + formatPeople(analysis.low.hospitality.value)
    + ' en el ' + quarterLabel(analysis.low.period) + ' y ' + formatPeople(analysis.high.hospitality.value)
    + ' en el ' + quarterLabel(analysis.high.period) + ' en ' + ACTIVITY + '. El máximo fue un '
    + format(analysis.hospitalityChange) + ' % superior al mínimo. El sector representó el '
    + format(analysis.low.hospitalityShare) + ' % y el ' + format(analysis.high.hospitalityShare)
    + ' % de las personas ocupadas en España en esos trimestres; la ocupación total varió un '
    + format(analysis.totalChange) + ' %.';
  const limitation = [
    'Cuenta personas residentes de 15 a 74 años por su actividad principal. NACE I agrupa alojamiento y comidas, solo una parte del turismo; no mide puestos ni contratos.',
    'Un año no confirma un patrón que se repita. Los recuentos tampoco identifican transiciones de las mismas personas a la inactividad ni prueban que el turismo cause la variación.',
    'Solo se comparan trimestres del mismo año en España.',
  ].filter(Boolean).join(' ');
  const reply = finding + '\n\n' + limitation;
  const contextFamily = {
    familyId: 'tourism-seasonal-employment', label: 'ocupación trimestral en alojamiento y servicios de comida',
    direction: 'qualifies', status: 'available', dataKind: 'observed',
    finding,
    data: analysis.quarters.map((quarter) => quarterLabel(quarter.period) + ': '
      + formatPeople(quarter.hospitality.value) + ' en NACE I; '
      + format(quarter.hospitalityShare) + ' % del total de personas ocupadas.'),
    evidenceIds, sourceIds,
    dimensions: {
      subject: 'personas ocupadas en alojamiento y servicios de comida, por trimestre',
      population: 'personas residentes de 15 a 74 años, ambos sexos, clasificadas por actividad del empleo principal',
      period: String(year), geography: 'España',
      denominator: 'personas ocupadas de 15 a 74 años en España en el mismo trimestre',
      unit: 'miles de personas y porcentaje de la ocupación total',
    },
    qualityNotes: [...new Set([
      ...(hasDefinitionFlag ? ['Eurostat marca la serie española con una diferencia de definición («d»).'] : []),
      ...updatedAt.map((value) => 'Fecha de actualización de la fuente: ' + releaseDate(value) + '.'),
    ])],
    limitation,
  };
  const directEvidenceIds = directVariationQuestion
    ? rows.filter((row) => row.metricId === HOSPITALITY).map((row) => row.id)
    : [];
  const verdict = directVariationQuestion ? 'supported' : 'insufficient';
  const claimType = claimTypeFor(claim);
  const missing = [
    'una serie longitudinal que observe a las mismas personas y sus transiciones entre empleo, paro e inactividad',
    'evidencia que permita atribuir los cambios trimestrales a la demanda turística',
  ];
  return {
    id: 'measurement-tourism-seasonal-employment', schemaVersion: '1', evidenceLevel: 'limited', coverage: 'qualified', claimType,
    headline: 'La ocupación en alojamiento y comidas varió entre trimestres en ' + year,
    summary: finding, shareableReply: reply, shareableSourceIds: sourceIds,
    interpretation: {
      kind: 'quantitative', subject: 'variación trimestral de personas ocupadas en una rama relacionada con el turismo',
      predicate: 'seasonality', normalizedClaim: claim,
      evidenceNeeds: ['personas ocupadas por trimestre en la rama y en el total', ...missing],
    },
    blocks: [
      { type: 'claim_breakdown', propositionIds: ['submitted-claim'], items: [{
        text: claim, type: claimType, explicit: true, evidenceIds: directEvidenceIds,
        sourceIds: directVariationQuestion ? [hospitalitySourceId] : [],
        contextSourceIds: directVariationQuestion ? [totalSourceId] : sourceIds,
        contextFinding: finding, verdict, evidenceLevel: directVariationQuestion ? 'limited' : 'none',
        finding: directVariationQuestion
          ? 'La serie trimestral mide la variación observada en alojamiento y servicios de comida durante el año indicado.'
          : 'La variación trimestral aporta contexto, pero no demuestra transiciones individuales ni causalidad turística.',
      }] },
      { type: 'data_finding', evidenceIds, points: [finding, ...contextFamily.data] },
      { type: 'evidence_gap', missing, needed: missing, nextAction: 'Consultar datos longitudinales de las mismas personas y una fuente que identifique el papel de la demanda turística.' },
      { type: 'cannot_conclude', evidenceIds, points: [limitation] },
      { type: 'conversation_reply', evidenceIds, text: reply },
    ],
    limitation, evidenceIds, sourceIds, sourceLinks: sources,
    evidenceSummary: { mode: 'dynamic', families: [contextFamily] },
    answerScope: {
      kind: 'measurement', family: 'tourism-seasonal-employment',
      directMetrics: directVariationQuestion ? [HOSPITALITY] : [],
      contextMetrics: directVariationQuestion ? [TOTAL] : METRICS,
    },
    knowledgeVersion: RUNTIME_VERSIONS.warehouseKnowledge,
  };
};

export const tourismSeasonalEmploymentEvidenceGapPlan = (claim, { reason = 'data' } = {}) => {
  const missing = reason === 'period' ? 'cuatro trimestres compatibles del año solicitado'
    : reason === 'geography' ? 'una serie EPA comparable para el territorio solicitado'
      : 'observaciones trimestrales compatibles para alojamiento y comidas y para el empleo total';
  const explanation = 'La EPA trimestral puede mostrar cómo cambia la ocupación en alojamiento y servicios de comida, una parte del turismo.';
  const reply = explanation + '\n\nNo hay datos comparables suficientes para ' + missing
    + '. Aunque los hubiera, el recuento trimestral no identifica a las mismas personas entre periodos ni demuestra que el turismo cause sus transiciones.';
  const claimType = claimTypeFor(claim);
  return {
    id: 'measurement-tourism-seasonal-employment-gap', schemaVersion: '1', evidenceLevel: 'insufficient', coverage: 'insufficient', claimType,
    headline: 'Faltan trimestres compatibles para medir la variación estacional',
    summary: explanation, shareableReply: reply,
    interpretation: {
      kind: 'quantitative', subject: 'ocupación trimestral en alojamiento y servicios de comida',
      predicate: 'seasonality', normalizedClaim: claim, evidenceNeeds: [missing],
    },
    blocks: [
      { type: 'claim_breakdown', propositionIds: ['submitted-claim'], items: [{
        text: claim, type: claimType, explicit: true, verdict: 'insufficient', evidenceLevel: 'none',
        finding: 'Faltan ' + missing + '.',
      }] },
      { type: 'evidence_gap', missing: [missing], needed: [missing], nextAction: 'Comparar los cuatro trimestres del mismo año y territorio, y usar datos longitudinales para medir transiciones de las mismas personas.' },
      { type: 'cannot_conclude', evidenceIds: [], points: ['Una variación agregada del empleo por trimestre no muestra cuántas personas pasan del empleo a la inactividad.'] },
      { type: 'conversation_reply', evidenceIds: [], text: reply },
    ],
    limitation: explanation, evidenceIds: [], sourceIds: [], sourceLinks: [],
    evidenceSummary: { mode: 'none', families: [], missingDimensions: [missing] },
    answerScope: { kind: 'measurement', family: 'tourism-seasonal-employment', directMetrics: [], contextMetrics: METRICS },
    knowledgeVersion: RUNTIME_VERSIONS.warehouseKnowledge,
  };
};
