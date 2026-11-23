import { RUNTIME_VERSIONS } from './runtime-versions.mjs';

const TOTAL = 'gdp_real_annual';
const PER_CAPITA = 'gdp_real_per_capita_annual';
const normalize = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
const format = (value, digits = 1) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
const change = (start, end) => (end / start - 1) * 100;
const describeChange = (value) => Math.abs(value) < 0.05 ? 'prácticamente no cambió' : `${value > 0 ? 'subió' : 'bajó'} aproximadamente un ${format(Math.abs(value))} %`;

const requestedWindow = (claim, years, latest) => {
  const text = normalize(claim);
  const explicit = [...new Set((text.match(/\b(?:19|20|21)\d{2}\b/g) || []).map(Number))].sort((a, b) => a - b);
  if (explicit.length > 2 || !latest) return undefined;
  if (explicit.length === 2) return { start: explicit[0], end: explicit[1], defaultWindow: false };
  if (explicit.length === 1) {
    const year = explicit[0];
    if (/\b(desde|a partir de)\b/.test(text)) return { start: year, end: latest, defaultWindow: false };
    if (/\b(en|durante|para|el ano)\b/.test(text)) return { start: year - 1, end: year, defaultWindow: false };
    return undefined;
  }
  if (/\b(?:desde|a partir de|a partir del|tras|despues de|antes de|ahora|actualmente|este ano|ano pasado|ultimo ano|ultima semana|ultimos? meses?)\b/.test(text)) return undefined;
  const duration = text.match(/\b(?:ultimos?|hace|durante)\s+(\d+|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+(?:anos|ejercicios)\b/)?.[1];
  const mentionsDuration = /\b(?:\d+|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+(?:anos|ejercicios)\b/.test(text);
  const decade = /\b(?:ultimos?|hace|durante)\s+(?:la )?decada\b/.test(text);
  if (/\b(?:ultimos?|hace|durante)\b/.test(text) && !duration && !decade) return undefined;
  if (mentionsDuration && !duration) return undefined;
  if ((duration || decade) && latest !== new Date().getUTCFullYear() - 1) return undefined;
  const words = { uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };
  const count = duration ? words[duration] || Number(duration) : decade ? 10 : undefined;
  if (count !== undefined) {
    if (!Number.isInteger(count) || count < 1 || count > 10) return undefined;
    return { start: latest - count, end: latest, defaultWindow: false };
  }
  // Without a date, use a transparent pre-pandemic-to-latest comparison.
  // The reply labels this as an example window rather than the whole claim.
  const start = years.includes(2019) ? 2019 : years.at(-1) - 6;
  return { start, end: latest, defaultWindow: true };
};

const eligibleRow = (item, metricId, now, allowReviewedSnapshot) => {
  if (item?.metricId !== metricId || !/^\d{4}$/.test(String(item.period || ''))
    || !Number.isFinite(item.value) || item.value <= 0 || !item.id
    || ['stale', 'invalid'].includes(item.freshness)
    || ['b', 'u'].includes(String(item.status || item.dimensions?.status || '').toLowerCase())
    || item.dataKind === 'snapshot' && !allowReviewedSnapshot) return false;
  const dimensions = item.dimensions || {};
  const expectedUnit = metricId === TOTAL ? 'CLV20_MEUR' : 'CLV20_EUR_HAB';
  if (dimensions.freq !== 'A' || dimensions.geo !== 'ES' || dimensions.na_item !== 'B1GQ' || dimensions.unit !== expectedUnit) return false;
  const source = item.source;
  const retrievedAt = Date.parse(source?.retrievedAt || '');
  if (!source?.id || !source.title || !Number.isFinite(retrievedAt) || retrievedAt > now + 300000
    || now - retrievedAt > 14 * 86400000 && !(allowReviewedSnapshot && item.dataKind === 'snapshot')) return false;
  try {
    const url = new URL(source.url);
    const dataset = metricId === TOTAL ? 'nama_10_gdp' : 'nama_10_pc';
    return url.protocol === 'https:' && url.hostname === 'ec.europa.eu' && url.pathname.toLowerCase().endsWith(`/data/${dataset}`);
  } catch { return false; }
};

const seriesFromOneRevision = (observations, metricId, window, now, allowReviewedSnapshot) => {
  const groups = new Map();
  for (const item of observations.filter((row) => eligibleRow(row, metricId, now, allowReviewedSnapshot))) {
    const key = `${item.source.id}:${item.source.retrievedAt}`;
    const group = groups.get(key) || { retrievedAt: Date.parse(item.source.retrievedAt), source: item.source, rows: new Map() };
    const year = Number(item.period);
    if (year < window.start || year > window.end) continue;
    const existing = group.rows.get(year);
    if (!existing || Date.parse(item.source.retrievedAt) >= Date.parse(existing.source.retrievedAt)) group.rows.set(year, item);
    groups.set(key, group);
  }
  const complete = [...groups.values()].filter((group) => group.rows.has(window.start) && group.rows.has(window.end));
  return complete.sort((a, b) => b.retrievedAt - a.retrievedAt)[0];
};

const totalPhrase = '(?:pib(?: real)? total|pib agregado|producto interior bruto(?: real)? total|economia en su conjunto)';
const perCapitaPhrase = '(?:pib(?: real)? (?:por habitante|por persona|per capita)|producto interior bruto(?: real)? (?:por habitante|por persona|per capita))';
const higher = '(?:mas|mayor\w*|superior\w*)';
const lower = '(?:menos|menor\w*|inferior\w*)';
const explicitComparisonDirection = (text, totalChange, perCapitaChange) => {
  const totalMore = new RegExp(`\\b${totalPhrase}\\b.{0,90}\\b${higher}\\b.{0,70}\\b${perCapitaPhrase}\\b`).test(text)
    || new RegExp(`\\b${perCapitaPhrase}\\b.{0,70}\\b${lower}\\b.{0,90}\\b${totalPhrase}\\b`).test(text);
  const perCapitaMore = new RegExp(`\\b${perCapitaPhrase}\\b.{0,90}\\b${higher}\\b.{0,70}\\b${totalPhrase}\\b`).test(text)
    || new RegExp(`\\b${totalPhrase}\\b.{0,70}\\b${lower}\\b.{0,90}\\b${perCapitaPhrase}\\b`).test(text);
  if (totalMore === perCapitaMore || /\bno\b.{0,40}\b(?:mas|menos|mayor|menor|superior|inferior)\b/.test(text)) return 'mixed';
  if (Math.abs(totalChange - perCapitaChange) < 0.05) return 'mixed';
  return totalMore === (totalChange > perCapitaChange) ? 'supported' : 'contradicted';
};

export const gdpPerCapitaComparisonPlan = (claim, { observations = [], now = Date.now(), allowReviewedSnapshot = false } = {}) => {
  const eligible = observations.filter((item) => eligibleRow(item, TOTAL, now, allowReviewedSnapshot)
    || eligibleRow(item, PER_CAPITA, now, allowReviewedSnapshot));
  if (!eligible.length) return undefined;
  const availableYears = [...new Set(eligible.map((item) => Number(item.period)))].sort((a, b) => a - b);
  const latest = availableYears.filter((year) => year < new Date(now).getUTCFullYear()).at(-1);
  const window = requestedWindow(claim, availableYears, latest);
  if (!window || window.start < availableYears[0] || window.end > latest || window.start >= window.end) return undefined;
  const totalSeries = seriesFromOneRevision(eligible, TOTAL, window, now, allowReviewedSnapshot);
  const perCapitaSeries = seriesFromOneRevision(eligible, PER_CAPITA, window, now, allowReviewedSnapshot);
  if (!totalSeries || !perCapitaSeries) return undefined;
  if (Math.abs(totalSeries.retrievedAt - perCapitaSeries.retrievedAt) > 7 * 86400000) return undefined;
  const totalStart = totalSeries.rows.get(window.start), totalEnd = totalSeries.rows.get(window.end);
  const perCapitaStart = perCapitaSeries.rows.get(window.start), perCapitaEnd = perCapitaSeries.rows.get(window.end);
  const totalChange = change(totalStart.value, totalEnd.value);
  const perCapitaChange = change(perCapitaStart.value, perCapitaEnd.value);
  const difference = totalChange - perCapitaChange;
  const normalizedClaim = normalize(claim);
  const asksAboutWelfare = /\b(nivel de vida|bienestar|condiciones? de vida|hogares?|familias?|renta|ingresos?|distribuci[oó]n|desigualdad)\b/.test(normalizedClaim);
  const asksUnmeasuredIntensity = /\b(mucho|muchisimo|enorme|extraordinari\w*|sustancial\w*|considerable\w*)\b/.test(normalizedClaim);
  const explicitMetrics = new RegExp(`\\b${totalPhrase}\\b`).test(normalizedClaim) && new RegExp(`\\b${perCapitaPhrase}\\b`).test(normalizedClaim);
  const verdict = asksAboutWelfare || asksUnmeasuredIntensity || !explicitMetrics
    ? 'mixed'
    : explicitComparisonDirection(normalizedClaim, totalChange, perCapitaChange);
  const years = [totalStart, totalEnd, perCapitaStart, perCapitaEnd];
  const evidenceIds = years.map((item) => item.id);
  const metadataSource = {
    id: 'eurostat-real-gdp-per-capita-definition',
    title: 'Real GDP per capita · Eurostat metadata',
    publisher: 'Eurostat',
    url: 'https://ec.europa.eu/eurostat/cache/metadata/en/sdg_08_10_esmsip2.htm',
    retrievedAt: '2026-11-23T12:00:00Z',
    role: 'primary',
  };
  const sources = [...new Map([totalSeries.source, perCapitaSeries.source, metadataSource].map((source) => [source.id, source])).values()];
  const sourceIds = sources.map((source) => source.id);
  const changeFinding = `Entre ${window.start} y ${window.end}, en España el PIB real total ${describeChange(totalChange)}, mientras el PIB real por habitante ${describeChange(perCapitaChange)}; la diferencia entre ambas variaciones es de ${format(Math.abs(difference))} puntos porcentuales.`;
  const comparisonSentence = verdict === 'supported'
    ? 'La comparación de PIB total y PIB real por habitante coincide con la dirección de esa afirmación.'
    : verdict === 'contradicted'
      ? 'La comparación de PIB total y PIB real por habitante no coincide con la dirección de esa afirmación.'
      : 'La diferencia entre estos indicadores no demuestra cuánto mejora la vida de cada persona ni si es «mucha».';
  const flagRows = years.map((item) => ({ year: Number(item.period), status: String(item.status || item.dimensions?.status || '').toLowerCase() }));
  const yearsWithStatus = (status) => [...new Set(flagRows.filter((item) => item.status === status).map((item) => item.year))].sort((a, b) => a - b);
  const yearList = (values) => values.length < 2 ? String(values[0] || '') : `${values.slice(0, -1).join(', ')} y ${values.at(-1)}`;
  const provisionalYears = yearsWithStatus('p');
  const estimatedYears = yearsWithStatus('e');
  const flagNote = [
    provisionalYears.length ? `Eurostat marca como provisional${provisionalYears.length > 1 ? 'es' : ''} ${provisionalYears.length > 1 ? 'los datos de ' : 'el dato de '}${yearList(provisionalYears)}.` : '',
    estimatedYears.length ? `Eurostat marca como estimado${estimatedYears.length > 1 ? 's' : ''} ${estimatedYears.length > 1 ? 'los datos de ' : 'el dato de '}${yearList(estimatedYears)}.` : '',
  ].filter(Boolean).join(' ');
  const limitation = 'El PIB por habitante divide el PIB real entre la población media: aproxima el nivel material, pero no mide la renta mediana ni el bienestar completo. Dos extremos no muestran la trayectoria anual ni el reparto.';
  const replyFinding = window.defaultWindow ? changeFinding[0].toLocaleLowerCase('es') + changeFinding.slice(1) : changeFinding;
  const reply = [
    `${window.defaultWindow ? 'Como referencia, ' : ''}${replyFinding}`,
    comparisonSentence,
    flagNote,
    limitation,
  ].filter(Boolean).join('\n\n');
  const totalStartText = `${window.start}: ${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(totalStart.value)} millones €`;
  const totalEndText = `${window.end}: ${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(totalEnd.value)} millones €`;
  const perCapitaStartText = `${window.start}: ${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(perCapitaStart.value)} € por habitante`;
  const perCapitaEndText = `${window.end}: ${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(perCapitaEnd.value)} € por habitante`;
  const totalRows = [totalStart, totalEnd], perCapitaRows = [perCapitaStart, perCapitaEnd];
  const families = [
    {
      familyId: TOTAL, label: 'PIB real total', direction: 'qualifies', status: 'available', dataKind: years.some((item) => item.dataKind === 'snapshot') ? 'snapshot' : 'observed',
      finding: `${totalStartText}; ${totalEndText}; variación ${format(totalChange)} %.`,
      data: [totalStartText, totalEndText, `Variación ${window.start}–${window.end}: ${format(totalChange)} %`],
      evidenceIds: totalRows.map((item) => item.id), sourceIds: [totalSeries.source.id],
      dimensions: { period: `${window.start}–${window.end}`, geography: 'España', population: 'producción final total de unidades productoras residentes', denominator: 'no aplica; agregado de producción', unit: 'millones de euros, volúmenes encadenados (2020)' },
    },
    {
      familyId: PER_CAPITA, label: 'PIB real por habitante', direction: 'qualifies', status: 'available', dataKind: years.some((item) => item.dataKind === 'snapshot') ? 'snapshot' : 'observed',
      finding: `${perCapitaStartText}; ${perCapitaEndText}; variación ${format(perCapitaChange)} %.`,
      data: [perCapitaStartText, perCapitaEndText, `Variación ${window.start}–${window.end}: ${format(perCapitaChange)} %`],
      evidenceIds: [...perCapitaRows.map((item) => item.id), metadataSource.id], sourceIds: [perCapitaSeries.source.id, metadataSource.id],
      dimensions: { period: `${window.start}–${window.end}`, geography: 'España', population: 'producción real dividida por la población media residente del año', denominator: 'población media residente del año', unit: 'euros por habitante, volúmenes encadenados (2020)' },
    },
  ];
  const evidenceIdsWithDefinition = [...evidenceIds, metadataSource.id];
  return {
    id: 'measurement-gdp-total-per-capita', schemaVersion: '1', evidenceLevel: 'limited', coverage: 'qualified', claimType: 'comparative',
    headline: `Variación del PIB real: ${format(totalChange)} % total y ${format(perCapitaChange)} % por habitante`,
    summary: changeFinding,
    shareableReply: reply,
    shareableSourceIds: sourceIds,
    interpretation: { kind: 'quantitative', subject: 'PIB real total y PIB real por habitante', predicate: 'comparison', normalizedClaim: claim, evidenceNeeds: ['series reales de PIB total y por habitante para los mismos años', 'definición y límite del PIB per cápita como proxy de condiciones materiales'] },
    blocks: [
      { type: 'claim_breakdown', propositionIds: ['submitted-claim'], items: [{ text: claim, type: 'comparative', explicit: true, evidenceIds: evidenceIdsWithDefinition, sourceIds, verdict, evidenceLevel: 'limited', finding: `${changeFinding} ${comparisonSentence}` }] },
      { type: 'data_finding', evidenceIds: evidenceIdsWithDefinition, points: [changeFinding] },
      { type: 'cannot_conclude', evidenceIds: [metadataSource.id], points: [limitation] },
      { type: 'conversation_reply', evidenceIds: evidenceIdsWithDefinition, text: reply },
    ],
    limitation, evidenceIds: evidenceIdsWithDefinition, sourceIds, sourceLinks: sources,
    evidenceSummary: { mode: years.some((item) => item.dataKind === 'snapshot') ? 'snapshot' : 'dynamic', families },
    answerScope: { kind: 'measurement', family: 'gdp-total-per-capita', directMetrics: [TOTAL, PER_CAPITA], contextMetrics: [] },
    knowledgeVersion: RUNTIME_VERSIONS.warehouseKnowledge,
  };
};

export const gdpPerCapitaEvidenceGapPlan = (claim, { reason = 'missing-period' } = {}) => {
  const missing = reason === 'period'
    ? 'observaciones comparables para los años extremos del periodo que pide la afirmación'
    : reason === 'geography'
      ? 'las dos series reales con el mismo territorio y periodo'
      : 'el PIB real total y el PIB real por habitante medidos para los mismos años';
  const explanation = 'El PIB total mide producción; el PIB real por habitante la divide por la población media. Es una aproximación material, no una medición de la renta de cada hogar.';
  const reply = `${explanation}\n\nNo hay observaciones compatibles suficientes para comparar ${missing}. Sin esa comparación no se puede confirmar ni descartar la afirmación.`;
  return {
    id: 'measurement-gdp-total-per-capita-gap', schemaVersion: '1', evidenceLevel: 'insufficient', coverage: 'insufficient', claimType: 'comparative',
    headline: 'Faltan series comparables para responder esta comparación', summary: explanation, shareableReply: reply,
    interpretation: { kind: 'quantitative', subject: 'PIB real total y PIB real por habitante', predicate: 'comparison', normalizedClaim: claim, evidenceNeeds: [missing] },
    blocks: [
      { type: 'claim_breakdown', propositionIds: ['submitted-claim'], items: [{ text: claim, type: 'comparative', explicit: true, verdict: 'insufficient', evidenceLevel: 'none', finding: `Falta ${missing}.` }] },
      { type: 'evidence_gap', missing: [missing], needed: [missing], nextAction: 'Elegir un periodo y territorio comunes y comparar las series reales de PIB total y PIB por habitante.' },
      { type: 'cannot_conclude', evidenceIds: [], points: ['El PIB por habitante no mide por sí solo la renta o el bienestar de cada hogar.'] },
      { type: 'conversation_reply', evidenceIds: [], text: reply },
    ],
    limitation: explanation, evidenceIds: [], sourceIds: [], sourceLinks: [],
    evidenceSummary: { mode: 'none', families: [], missingDimensions: [missing] },
    answerScope: { kind: 'measurement', family: 'gdp-total-per-capita', directMetrics: [TOTAL, PER_CAPITA], contextMetrics: [] },
    knowledgeVersion: RUNTIME_VERSIONS.warehouseKnowledge,
  };
};
