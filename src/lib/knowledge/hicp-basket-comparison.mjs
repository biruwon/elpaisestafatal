import { RUNTIME_VERSIONS } from './runtime-versions.mjs';
import { HICP_METHODOLOGY_SOURCE } from './hicp-basket-snapshot.mjs';

const TOTAL = 'annual_hicp_index';
const FOOD = 'annual_hicp_food_index';
const ACTUAL_RENT = 'annual_hicp_actual_rent_index';
const SPECS = [
  { id: TOTAL, label: 'Índice general armonizado de precios de consumo', group: 'TOTAL', population: 'cesta armonizada de consumo, todos los productos' },
  { id: FOOD, label: 'Alimentos y bebidas no alcohólicas', group: 'CP01', population: 'alimentos y bebidas no alcohólicas' },
  { id: ACTUAL_RENT, label: 'Alquileres efectivamente pagados', group: 'CP041', population: 'pagos efectivos de alquiler de vivienda; no incluye alquiler imputado de vivienda en propiedad' },
];

const normalize = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const format = (value) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(value);
const formatIndex = (value) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value);
const change = (start, end) => (end / start - 1) * 100;
const describeChange = (value) => Math.abs(value) < 0.05 ? 'prácticamente no cambió' : `${value > 0 ? 'subió' : 'bajó'} aproximadamente un ${format(Math.abs(value))} %`;

const requestedWindow = (claim, years, latest) => {
  const text = normalize(claim);
  const requested = [...new Set((text.match(/\b(?:19|20|21)\d{2}\b/g) || []).map(Number))].sort((a, b) => a - b);
  if (!latest || requested.length > 2) return undefined;
  if (requested.length === 2) return { start: requested[0], end: requested[1] };
  if (requested.length === 1) {
    const year = requested[0];
    if (/\b(desde|a partir de|a partir del)\b/.test(text)) return { start: year, end: latest };
    if (/\b(en|durante|para|el ano)\b/.test(text)) return { start: year - 1, end: year };
    return undefined;
  }
  if (/\b(desde|a partir de|tras|despues de|desde la pandemia|desde la crisis|este ano|ano pasado|ultimo ano|actualmente|ahora)\b/.test(text)) return undefined;
  const duration = text.match(/\b(?:ultimos?|hace|durante)\s+(\d+|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+(?:anos|ejercicios)\b/)?.[1];
  const saysDuration = /\b(?:\d+|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+(?:anos|ejercicios)\b/.test(text);
  if (saysDuration && !duration) return undefined;
  if (duration) {
    const counts = { uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };
    const count = counts[duration] || Number(duration);
    if (!Number.isInteger(count) || count < 1 || count > 40) return undefined;
    return { start: latest - count, end: latest };
  }
  return { start: latest - 5, end: latest, automatic: true };
};

const eligibleObservation = (item, metricId, now, allowReviewedSnapshot) => {
  if (item?.metricId !== metricId || !/^\d{4}$/.test(String(item.period || ''))
    || typeof item.value !== 'number' || !Number.isFinite(item.value) || item.value <= 0 || !item.id
    || ['stale', 'invalid'].includes(item.freshness)
    || ['projected', 'budget'].includes(item.dataKind)
    || item.dataKind === 'snapshot' && !allowReviewedSnapshot) return false;
  const dimensions = item.dimensions || {};
  const spec = SPECS.find((entry) => entry.id === metricId);
  if (dimensions.freq !== 'A' || dimensions.geo !== 'ES' || dimensions.unit !== 'INX_A_AVG' || dimensions.coicop18 !== spec.group) return false;
  const source = item.source;
  const retrievedAt = Date.parse(source?.retrievedAt || '');
  if (!source?.id || !source.title || !Number.isFinite(retrievedAt) || retrievedAt > now + 300000
    || now - retrievedAt > 14 * 86400000 && !(allowReviewedSnapshot && item.dataKind === 'snapshot')) return false;
  try {
    const url = new URL(source.url);
    const query = url.searchParams;
    return url.protocol === 'https:' && url.hostname === 'ec.europa.eu'
      && url.pathname.toLowerCase().endsWith('/data/prc_hicp_ainr')
      && query.get('geo') === 'ES' && query.get('coicop18') === spec.group && query.get('unit') === 'INX_A_AVG'
      && (!query.has('freq') || query.get('freq') === 'A');
  } catch { return false; }
};

const latestSeries = (observations, metricId, now, allowReviewedSnapshot) => {
  const eligible = observations.filter((item) => eligibleObservation(item, metricId, now, allowReviewedSnapshot));
  if (!eligible.length) return undefined;
  const newest = eligible.reduce((best, item) => Date.parse(item.source.retrievedAt) > Date.parse(best.source.retrievedAt) ? item : best);
  const revisionRows = eligible.filter((item) => item.source.id === newest.source.id && item.source.retrievedAt === newest.source.retrievedAt);
  const values = new Map();
  for (const item of revisionRows) {
    const year = Number(item.period), existing = values.get(year);
    if (existing && (existing.value !== item.value || existing.status !== item.status)) return undefined;
    values.set(year, item);
  }
  return { values, source: newest.source, retrievedAt: Date.parse(newest.source.retrievedAt) };
};

const measurementValues = (series, start, end) => {
  const rows = [];
  for (let year = start; year <= end; year += 1) {
    const row = series.values.get(year);
    if (!row) return undefined;
    const flags = String(row.status || row.dimensions?.status || '').toLowerCase();
    if (year > start && flags.includes('b') || /[^bep ,]/.test(flags)) return undefined;
    rows.push(row);
  }
  return rows;
};

const family = (spec, series, rows, start, end, delta) => {
  const begin = series.values.get(start), finish = series.values.get(end);
  return {
    familyId: spec.id,
    label: spec.label,
    direction: 'qualifies',
    status: 'available',
    dataKind: rows.some((item) => item.dataKind === 'snapshot') ? 'snapshot' : 'observed',
    finding: `El subíndice de ${spec.population} ${describeChange(delta)} entre ${start} y ${end}.`,
    data: [`${start}: ${formatIndex(begin.value)}`, `${end}: ${formatIndex(finish.value)}`, `Variación ${start}–${end}: ${delta >= 0 ? '+' : ''}${format(delta)} %`],
    evidenceIds: rows.map((item) => item.id),
    sourceIds: [series.source.id],
    dimensions: {
      geography: 'España',
      period: `${start}–${end}`,
      population: spec.population,
      unit: 'Índice armonizado medio anual; variación calculada entre extremos',
    },
  };
};

export const hicpBasketComparisonPlan = (claim, { observations = [], now = Date.now(), allowReviewedSnapshot = false } = {}) => {
  const currentYear = new Date(now).getUTCFullYear();
  const series = new Map(SPECS.map((spec) => [spec.id, latestSeries(observations, spec.id, now, allowReviewedSnapshot)]));
  if ([...series.values()].some((item) => !item)) return undefined;
  const timestamps = [...series.values()].map((item) => item.retrievedAt);
  if (Math.max(...timestamps) - Math.min(...timestamps) > 24 * 60 * 60 * 1000) return undefined;
  const allYears = SPECS.map((spec) => [...series.get(spec.id).values.keys()].filter((year) => year < currentYear));
  const commonYears = allYears.reduce((common, years) => common.filter((year) => years.includes(year)));
  const latest = commonYears.at(-1);
  const window = requestedWindow(claim, commonYears, latest);
  if (!window || window.start >= window.end || window.end >= currentYear
    || !commonYears.includes(window.start) || !commonYears.includes(window.end)) return undefined;
  const rowsByMetric = new Map(SPECS.map((spec) => [spec.id, measurementValues(series.get(spec.id), window.start, window.end)]));
  if ([...rowsByMetric.values()].some((rows) => !rows)) return undefined;
  const changes = new Map(SPECS.map((spec) => {
    const item = series.get(spec.id);
    return [spec.id, change(item.values.get(window.start).value, item.values.get(window.end).value)];
  }));
  if ([...changes.values()].some((value) => !Number.isFinite(value))) return undefined;

  const totalChange = changes.get(TOTAL), foodChange = changes.get(FOOD), rentChange = changes.get(ACTUAL_RENT);
  const foodGap = foodChange - totalChange, rentGap = rentChange - totalChange;
  const comparison = `En España, ${window.start}–${window.end}: el índice armonizado general subió aproximadamente un ${format(totalChange)} %; alimentos y bebidas no alcohólicas, un ${format(foodChange)} %; alquileres efectivamente pagados, un ${format(rentChange)} %. Frente al índice general, la subida de alimentos fue ${format(Math.abs(foodGap))} puntos porcentuales ${foodGap >= 0 ? 'mayor' : 'menor'} y la de alquileres, ${format(Math.abs(rentGap))} puntos porcentuales ${rentGap >= 0 ? 'mayor' : 'menor'}.`;
  const interpretation = 'El índice general pondera los grupos según el gasto agregado; no representa la cesta de cada hogar.';
  const limitation = 'El índice armonizado excluye el alquiler imputado de viviendas en propiedad. El subíndice de alquileres cubre pagos efectivos, pero no compra, hipotecas ni todos los gastos de vivienda. Sin los pesos de gasto del hogar no se calcula su inflación personal.';
  const method = `Cálculo propio: variación acumulada de los índices anuales medios entre ${window.start} y ${window.end}.`;
  const flags = [...rowsByMetric.values()].flat().map((row) => String(row.status || '').toLowerCase()).join('');
  const flagNote = [flags.includes('p') ? 'Algunas observaciones son provisionales.' : '', flags.includes('e') ? 'Algunas observaciones son estimadas.' : ''].filter(Boolean).join(' ');
  const reply = [comparison, interpretation, method, flagNote, limitation].filter(Boolean).join('\n\n');
  const families = [
    ...SPECS.map((spec) => family(spec, series.get(spec.id), rowsByMetric.get(spec.id), window.start, window.end, changes.get(spec.id))),
    {
      familyId: 'hicp-methodology',
      label: 'Cobertura y ponderación del índice armonizado',
      direction: 'qualifies',
      status: 'available',
      dataKind: 'snapshot',
      finding: `${interpretation} ${limitation}`,
      data: [],
      evidenceIds: [],
      sourceIds: [HICP_METHODOLOGY_SOURCE.id],
      dimensions: { geography: 'España', period: 'metodología vigente del HICP', population: 'gasto de consumo monetario de los hogares', unit: 'definición y cobertura' },
    },
  ];
  const rows = [...rowsByMetric.values()].flat();
  const evidenceIds = rows.map((item) => item.id);
  const sources = [...new Map([...rows.map((item) => item.source), HICP_METHODOLOGY_SOURCE].map((source) => [source.id, source])).values()];
  const sourceIds = sources.map((item) => item.id);
  const finding = `${comparison} ${interpretation}`;
  const dataKind = rows.some((item) => item.dataKind === 'snapshot') ? 'snapshot' : 'observed';

  return {
    id: 'measurement-household-inflation-basket',
    schemaVersion: '1',
    evidenceLevel: 'limited',
    coverage: 'qualified',
    claimType: 'comparative',
    headline: `Inflación general, alimentos y alquileres en España, ${window.start}–${window.end}`,
    summary: finding,
    shareableReply: reply,
    shareableSourceIds: sourceIds,
    interpretation: { kind: 'quantitative', subject: 'índice general de precios y dos grupos de consumo', predicate: 'comparison', normalizedClaim: claim, evidenceNeeds: ['índice general y subíndices con años y geografía compatibles', 'pesos de gasto del hogar para una tasa personalizada'] },
    blocks: [
      { type: 'claim_breakdown', propositionIds: ['submitted-claim'], items: [{ text: claim, type: 'comparative', explicit: true, evidenceIds, sourceIds, verdict: 'mixed', evidenceLevel: 'limited', finding }] },
      { type: 'data_finding', evidenceIds, points: [comparison] },
      { type: 'cannot_conclude', evidenceIds: [], points: [interpretation, limitation] },
      { type: 'conversation_reply', evidenceIds, text: reply },
    ],
    limitation,
    evidenceIds,
    sourceIds,
    sourceLinks: sources,
    evidenceSummary: { mode: dataKind, families },
    answerScope: { kind: 'measurement', family: 'household-inflation-basket', directMetrics: [FOOD, ACTUAL_RENT], contextMetrics: [TOTAL] },
    knowledgeVersion: RUNTIME_VERSIONS.warehouseKnowledge,
  };
};

export const hicpBasketEvidenceGapPlan = (claim, { reason = 'data' } = {}) => {
  const missing = reason === 'geography' ? 'La serie disponible cubre España; falta una serie comparable de HICP general, alimentos y alquileres para el territorio solicitado.'
    : reason === 'period' ? 'No hay datos anuales compatibles para todos los años solicitados; indica otro intervalo con datos publicados.'
      : 'Falta un índice anual armonizado general, de alimentos y de alquileres efectivamente pagados para los mismos años.';
  const limitation = 'Los índices por categoría no bastan para calcular la inflación de una familia concreta. Para ello también hacen falta sus pesos de gasto y una cobertura de vivienda que corresponda a su situación.';
  return {
    id: 'measurement-household-inflation-basket-gap', schemaVersion: '1', evidenceLevel: 'insufficient', coverage: 'unavailable', claimType: 'comparative',
    headline: 'No hay una comparación compatible para ese intervalo o territorio',
    summary: missing,
    shareableReply: `${missing} ${limitation}`,
    shareableSourceIds: [],
    interpretation: { kind: 'quantitative', subject: 'inflación por grupo de consumo', predicate: 'comparison', normalizedClaim: claim, evidenceNeeds: ['índices anuales general, de alimentos y de alquileres con la misma geografía e intervalo'] },
    blocks: [
      { type: 'claim_breakdown', propositionIds: ['submitted-claim'], items: [{ text: claim, type: 'comparative', explicit: true, evidenceIds: [], sourceIds: [], verdict: 'insufficient', evidenceLevel: 'insufficient', finding: missing }] },
      { type: 'cannot_conclude', evidenceIds: [], points: [limitation] },
      { type: 'conversation_reply', evidenceIds: [], text: `${missing} ${limitation}` },
    ],
    limitation,
    evidenceIds: [], sourceIds: [], sourceLinks: [],
    evidenceSummary: { mode: 'none', families: [], missingDimensions: [missing, limitation] },
    answerScope: { kind: 'measurement', family: 'household-inflation-basket', directMetrics: [FOOD, ACTUAL_RENT], contextMetrics: [TOTAL] },
    knowledgeVersion: RUNTIME_VERSIONS.warehouseKnowledge,
  };
};
