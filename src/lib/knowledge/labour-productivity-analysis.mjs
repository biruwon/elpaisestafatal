import { RUNTIME_VERSIONS } from './runtime-versions.mjs';

const TOTAL_GDP = 'gdp_real_annual';
const GDP_PER_CAPITA = 'gdp_real_per_capita_annual';
const EMPLOYMENT_PER_CAPITA = 'employment_persons_per_capita_national_accounts';
const PER_PERSON = 'real_labour_productivity_per_person';
const PER_HOUR = 'real_labour_productivity_per_hour';
const PRODUCTIVITY_IDS = [PER_PERSON, PER_HOUR];
const normalize = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
const format = (value, digits = 1) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
const change = (start, end) => (end / start - 1) * 100;
const describeChange = (value) => Math.abs(value) < 0.05 ? 'prácticamente no cambió' : `${value > 0 ? 'subió' : 'bajó'} aproximadamente un ${format(Math.abs(value))} %`;
const yearsFrom = (observations) => [...new Set(observations.map((item) => Number(item.period)).filter(Number.isInteger))].sort((a, b) => a - b);

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
  const start = years.includes(2019) ? 2019 : years.at(-1) - 6;
  return { start, end: latest, defaultWindow: true };
};

const expectedDimensions = {
  [TOTAL_GDP]: { na_item: 'B1GQ', unit: 'CLV20_MEUR' },
  [GDP_PER_CAPITA]: { na_item: 'B1GQ', unit: 'CLV20_EUR_HAB' },
  [EMPLOYMENT_PER_CAPITA]: { na_item: 'EMP_HAB', unit: 'PC' },
  [PER_PERSON]: { na_item: 'RLPR_PER', unit: 'I20' },
  [PER_HOUR]: { na_item: 'RLPR_HW', unit: 'I20' },
};

const eligibleRow = (item, metricId, now, allowReviewedSnapshot) => {
  if (item?.metricId !== metricId || !/^\d{4}$/.test(String(item.period || ''))
    || !Number.isFinite(item.value) || item.value <= 0 || !item.id
    || ['stale', 'invalid'].includes(item.freshness)
    || ['b', 'u'].includes(String(item.status || item.dimensions?.status || '').toLowerCase())
    || item.dataKind === 'snapshot' && !allowReviewedSnapshot) return false;
  const dimensions = item.dimensions || {};
  const expected = expectedDimensions[metricId];
  if (dimensions.freq !== 'A' || dimensions.geo !== 'ES' || dimensions.na_item !== expected.na_item || dimensions.unit !== expected.unit) return false;
  const source = item.source;
  const retrievedAt = Date.parse(source?.retrievedAt || '');
  if (!source?.id || !source.title || !Number.isFinite(retrievedAt) || retrievedAt > now + 300000
    || now - retrievedAt > 14 * 86400000 && !(allowReviewedSnapshot && item.dataKind === 'snapshot')) return false;
  try {
    const url = new URL(source.url);
    return url.protocol === 'https:' && url.hostname === 'ec.europa.eu'
      && url.pathname.toLowerCase().endsWith(`/data/${metricId.startsWith('gdp_real_') ? metricId === TOTAL_GDP ? 'nama_10_gdp' : 'nama_10_pc' : 'nama_10_lp_ulc'}`);
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
  return [...groups.values()].filter((group) => group.rows.has(window.start) && group.rows.has(window.end))
    .sort((a, b) => b.retrievedAt - a.retrievedAt)[0];
};

const statusNote = (rows) => {
  const provisional = [...new Set(rows.filter((item) => String(item.status || item.dimensions?.status || '').toLowerCase() === 'p').map((item) => Number(item.period)))].sort((a, b) => a - b);
  const estimated = [...new Set(rows.filter((item) => String(item.status || item.dimensions?.status || '').toLowerCase() === 'e').map((item) => Number(item.period)))].sort((a, b) => a - b);
  const list = (values) => values.length < 2 ? String(values[0] || '') : `${values.slice(0, -1).join(', ')} y ${values.at(-1)}`;
  return [
    provisional.length ? `Eurostat marca como provisionales los datos de ${list(provisional)}.` : '',
    estimated.length ? `Eurostat marca como estimados los datos de ${list(estimated)}.` : '',
  ].filter(Boolean).join(' ');
};

const explicitVerdict = (claim, perPersonChange, perHourChange) => {
  const text = normalize(claim);
  if (/\b(?:estanc\w*|lent\w*|demasiad\w*|insuficient\w*|apenas|casi|depende demasiado|oculta)\b/.test(text)) return 'mixed';
  const personMeasure = /\b(?:por trabajador|por persona ocupada|por empleado)\b/.test(text);
  const hourMeasure = /\bpor hora\b/.test(text);
  const up = /\b(?:crec\w*|aument\w*|sub\w*|avanz\w*|mejor\w*)\b/.test(text);
  const down = /\b(?:cay\w*|baj\w*|descend\w*|disminu\w*|retroced\w*)\b/.test(text);
  if (up === down || personMeasure === hourMeasure) return 'mixed';
  const measuredChange = personMeasure ? perPersonChange : perHourChange;
  if (Math.abs(measuredChange) < 0.05) return 'mixed';
  return up === (measuredChange > 0) ? 'supported' : 'contradicted';
};

export const labourProductivityAnalysisPlan = (claim, {
  observations = [], now = Date.now(), allowReviewedSnapshot = false,
} = {}) => {
  const productivityRows = observations.filter((item) => PRODUCTIVITY_IDS.includes(item.metricId)
    && eligibleRow(item, item.metricId, now, allowReviewedSnapshot));
  if (!productivityRows.length) return undefined;
  const allYears = yearsFrom(productivityRows);
  const latest = allYears.filter((year) => year < new Date(now).getUTCFullYear()).at(-1);
  const window = requestedWindow(claim, allYears, latest);
  if (!window || window.start < allYears[0] || window.end > latest || window.start >= window.end) return undefined;

  const perPerson = seriesFromOneRevision(observations, PER_PERSON, window, now, allowReviewedSnapshot);
  const perHour = seriesFromOneRevision(observations, PER_HOUR, window, now, allowReviewedSnapshot);
  if (!perPerson || !perHour || Math.abs(perPerson.retrievedAt - perHour.retrievedAt) > 7 * 86400000) return undefined;
  const personStart = perPerson.rows.get(window.start), personEnd = perPerson.rows.get(window.end);
  const hourStart = perHour.rows.get(window.start), hourEnd = perHour.rows.get(window.end);
  const perPersonChange = change(personStart.value, personEnd.value);
  const perHourChange = change(hourStart.value, hourEnd.value);
  const text = normalize(claim);
  const asksPopulationContext = /\b(?:poblacion|por habitante|por persona(?! (?:ocupad[oa]|emplead[oa]|trabajador[ao]))|nivel de vida|condiciones de vida|bienestar)\b/.test(text);
  const asksGdpContext = /\b(?:pib|crecimiento economico|crecimiento del producto|economia en su conjunto|crecimiento espanol)\b/.test(text) || asksPopulationContext;
  const asksGdpPerCapitaContext = asksGdpContext && asksPopulationContext;
  const asksEmploymentContext = /\b(?:aumento (?:de|del) empleo|crecimiento (?:de|del) empleo|creacion de empleo|mas empleo|mas puestos de trabajo|empleo total|personas ocupadas por habitante|personas empleadas por habitante|hay mas personas trabajando)\b/.test(text);
  let totalSeries, perCapitaSeries, employmentSeries, totalChange, perCapitaChange, impliedPopulationChange;
  let employmentChange, employmentPercentagePointChange;
  if (asksGdpContext) {
    totalSeries = seriesFromOneRevision(observations, TOTAL_GDP, window, now, allowReviewedSnapshot);
    if (!totalSeries
      || Math.abs(totalSeries.retrievedAt - perPerson.retrievedAt) > 7 * 86400000
      || Math.abs(totalSeries.retrievedAt - perHour.retrievedAt) > 7 * 86400000) return undefined;
    if (asksGdpPerCapitaContext) {
      perCapitaSeries = seriesFromOneRevision(observations, GDP_PER_CAPITA, window, now, allowReviewedSnapshot);
      if (!perCapitaSeries || Math.abs(totalSeries.retrievedAt - perCapitaSeries.retrievedAt) > 7 * 86400000) return undefined;
    }
    const totalStart = totalSeries.rows.get(window.start), totalEnd = totalSeries.rows.get(window.end);
    totalChange = change(totalStart.value, totalEnd.value);
    if (asksGdpPerCapitaContext) {
      const capitaStart = perCapitaSeries.rows.get(window.start), capitaEnd = perCapitaSeries.rows.get(window.end);
      perCapitaChange = change(capitaStart.value, capitaEnd.value);
      impliedPopulationChange = ((totalEnd.value / totalStart.value) / (capitaEnd.value / capitaStart.value) - 1) * 100;
    }
  }
  if (asksEmploymentContext) {
    employmentSeries = seriesFromOneRevision(observations, EMPLOYMENT_PER_CAPITA, window, now, allowReviewedSnapshot);
    if (!employmentSeries || Math.abs(employmentSeries.retrievedAt - perPerson.retrievedAt) > 7 * 86400000
      || Math.abs(employmentSeries.retrievedAt - perHour.retrievedAt) > 7 * 86400000
      || asksGdpContext && Math.abs(employmentSeries.retrievedAt - totalSeries.retrievedAt) > 7 * 86400000) return undefined;
    const employmentStart = employmentSeries.rows.get(window.start), employmentEnd = employmentSeries.rows.get(window.end);
    employmentChange = change(employmentStart.value, employmentEnd.value);
    employmentPercentagePointChange = employmentEnd.value - employmentStart.value;
  }

  const contextMetrics = [
    ...(asksGdpContext ? [TOTAL_GDP] : []),
    ...(asksGdpPerCapitaContext ? [GDP_PER_CAPITA] : []),
    ...(asksEmploymentContext ? [EMPLOYMENT_PER_CAPITA] : []),
  ];
  const selectedRows = [personStart, personEnd, hourStart, hourEnd,
    ...(asksGdpContext ? [totalSeries.rows.get(window.start), totalSeries.rows.get(window.end)] : []),
    ...(asksGdpPerCapitaContext ? [perCapitaSeries.rows.get(window.start), perCapitaSeries.rows.get(window.end)] : []),
    ...(asksEmploymentContext ? [employmentSeries.rows.get(window.start), employmentSeries.rows.get(window.end)] : [])];
  const allObservedRows = selectedRows;
  const metadataSource = {
    id: 'eurostat-labour-productivity-definition',
    title: 'Labour and capital productivity · Eurostat metadata',
    publisher: 'Eurostat',
    url: 'https://ec.europa.eu/eurostat/cache/metadata/en/nama_10_prod_esms.htm',
    retrievedAt: '2026-11-23T12:00:00Z',
    role: 'primary',
  };
  const populationDefinitionSource = {
    id: 'eurostat-real-gdp-per-capita-definition',
    title: 'GDP per capita · Eurostat metadata',
    publisher: 'Eurostat',
    url: 'https://ec.europa.eu/eurostat/cache/metadata/en/sdg_08_10_esmsip2.htm',
    retrievedAt: '2026-11-23T12:00:00Z',
    role: 'primary',
  };
  const sources = [...new Map([...PRODUCTIVITY_IDS.map((id) => id === PER_PERSON ? perPerson.source : perHour.source),
    ...(asksGdpContext ? [totalSeries.source] : []),
    ...(asksGdpPerCapitaContext ? [perCapitaSeries.source, populationDefinitionSource] : []),
    ...(asksEmploymentContext ? [employmentSeries.source] : []), metadataSource].map((source) => [source.id, source])).values()];
  const sourceIds = sources.map((source) => source.id);
  const productivityFinding = `Entre ${window.start} y ${window.end}, en España la productividad real por persona ocupada ${describeChange(perPersonChange)}, mientras que por hora trabajada ${describeChange(perHourChange)}.`;
  const gdpFinding = asksGdpContext
    ? asksGdpPerCapitaContext
      ? `En el mismo periodo, el PIB real total ${describeChange(totalChange)} y el PIB real por habitante ${describeChange(perCapitaChange)}. El cociente de ambas series implica un aumento aproximado del ${format(impliedPopulationChange)} % de la población media.`
      : `En el mismo periodo, el PIB real total ${describeChange(totalChange)}.`
    : '';
  const employmentStart = asksEmploymentContext ? employmentSeries.rows.get(window.start) : undefined;
  const employmentEnd = asksEmploymentContext ? employmentSeries.rows.get(window.end) : undefined;
  const employmentFinding = asksEmploymentContext
    ? `El empleo total por habitante pasó del ${format(employmentStart.value)} % al ${format(employmentEnd.value)} %: ${format(employmentPercentagePointChange)} puntos porcentuales (${format(employmentChange)} % relativo).`
    : '';
  const contextFindings = [gdpFinding, employmentFinding].filter(Boolean);
  const verdict = explicitVerdict(claim, perPersonChange, perHourChange);
  const comparisonSentence = asksEmploymentContext
    ? 'El empleo por habitante aumentó, pero estas series no cuantifican cuánto del crecimiento del PIB corresponde a más empleo frente a mejoras de productividad.'
    : verdict === 'supported'
    ? 'La medida de productividad que menciona la afirmación coincide con esa dirección.'
    : verdict === 'contradicted'
      ? 'La medida de productividad que menciona la afirmación no coincide con esa dirección.'
      : 'Por persona ocupada bajó; por hora subió, así que la conclusión depende de la medida.';
  const defaultNote = window.defaultWindow ? 'Como referencia, ' : '';
  const timingNote = window.defaultWindow && /\b(?:mucho tiempo|demasiado tiempo|lleva años|desde hace anos|durante anos)\b/.test(text)
    ? 'Esta ventana de seis años no basta para juzgar “durante mucho tiempo”.' : '';
  const flagNote = statusNote(allObservedRows);
  const limitation = [
    asksEmploymentContext
      ? 'Son promedios de toda la economía; no miden causas ni productividad total de los factores.'
      : 'Son promedios de toda la economía: no miden productividad total de los factores, calidad del empleo ni causas.',
    ...(asksGdpPerCapitaContext ? ['La población media se infiere del PIB total y el PIB por habitante.'] : []),
    ...(asksEmploymentContext ? ['El empleo por habitante divide empleo total (concepto doméstico) por población total (concepto nacional).'] : []),
  ].join(' ');
  const reply = [
    `${defaultNote}${window.defaultWindow ? productivityFinding[0].toLocaleLowerCase('es') + productivityFinding.slice(1) : productivityFinding}`,
    ...contextFindings,
    timingNote,
    comparisonSentence,
    flagNote,
    limitation,
  ].filter(Boolean).join('\n\n');
  const personSeries = [personStart, personEnd];
  const hourSeries = [hourStart, hourEnd];
  const metricFamily = (metricId, label, rows, series, denominator, unit) => {
    const startText = `${window.start}: ${format(rows[0].value, 3)} (índice 2020=100)`;
    const endText = `${window.end}: ${format(rows[1].value, 3)} (índice 2020=100)`;
    const rate = metricId === PER_PERSON ? perPersonChange : perHourChange;
    return {
      familyId: metricId, label, direction: 'qualifies', status: 'available',
      dataKind: rows.some((item) => item.dataKind === 'snapshot') ? 'snapshot' : 'observed',
      finding: `${startText}; ${endText}; variación ${format(rate)} %.`,
      data: [startText, endText, `Variación ${window.start}–${window.end}: ${format(rate)} %`],
      evidenceIds: rows.map((item) => item.id), sourceIds: [series.source.id],
      dimensions: { period: `${window.start}–${window.end}`, geography: 'España', population: 'total de la economía, sectores de mercado y no mercado', denominator, unit },
    };
  };
  const families = [
    metricFamily(PER_PERSON, 'Productividad laboral real por persona ocupada', personSeries, perPerson, 'empleo total, por cuenta ajena y propia', 'índice 2020=100'),
    metricFamily(PER_HOUR, 'Productividad laboral real por hora trabajada', hourSeries, perHour, 'total de horas trabajadas por empleados y autónomos', 'índice 2020=100'),
  ];
  if (asksGdpContext) {
    const totalStart = totalSeries.rows.get(window.start), totalEnd = totalSeries.rows.get(window.end);
    families.push({
        familyId: TOTAL_GDP, label: 'PIB real total', direction: 'qualifies', status: 'available',
        dataKind: [totalStart, totalEnd].some((item) => item.dataKind === 'snapshot') ? 'snapshot' : 'observed',
        finding: `Variación ${format(totalChange)} % entre ${window.start} y ${window.end}.`,
        data: [`Variación ${format(totalChange)} %`], evidenceIds: [totalStart.id, totalEnd.id], sourceIds: [totalSeries.source.id],
        dimensions: { period: `${window.start}–${window.end}`, geography: 'España', population: 'producción final total de unidades productoras residentes', denominator: 'no aplica; agregado de producción', unit: 'millones de euros, volúmenes encadenados (2020)' },
      });
  }
  if (asksGdpPerCapitaContext) {
    const capitaStart = perCapitaSeries.rows.get(window.start), capitaEnd = perCapitaSeries.rows.get(window.end);
    families.push({
        familyId: GDP_PER_CAPITA, label: 'PIB real por habitante', direction: 'qualifies', status: 'available',
        dataKind: [capitaStart, capitaEnd].some((item) => item.dataKind === 'snapshot') ? 'snapshot' : 'observed',
        finding: `Variación ${format(perCapitaChange)} % entre ${window.start} y ${window.end}; población media implícita ${format(impliedPopulationChange)} %.`,
        data: [`Variación ${format(perCapitaChange)} %`, `Población media implícita: ${format(impliedPopulationChange)} %`],
        evidenceIds: [capitaStart.id, capitaEnd.id, populationDefinitionSource.id], sourceIds: [perCapitaSeries.source.id, populationDefinitionSource.id],
        dimensions: { period: `${window.start}–${window.end}`, geography: 'España', population: 'producción real dividida por la población media residente del año', denominator: 'población media residente del año', unit: 'euros por habitante, volúmenes encadenados (2020)' },
      });
  }
  if (asksEmploymentContext) {
    families.push({
      familyId: EMPLOYMENT_PER_CAPITA, label: 'Empleo total por habitante', direction: 'qualifies', status: 'available',
      dataKind: [employmentStart, employmentEnd].some((item) => item.dataKind === 'snapshot') ? 'snapshot' : 'observed',
      finding: `${window.start}: ${format(employmentStart.value)} %; ${window.end}: ${format(employmentEnd.value)} %; variación ${format(employmentPercentagePointChange)} puntos porcentuales (${format(employmentChange)} % relativo).`,
      data: [`${window.start}: ${format(employmentStart.value)} %`, `${window.end}: ${format(employmentEnd.value)} %`, `Variación: ${format(employmentPercentagePointChange)} puntos porcentuales`, `Cambio relativo: ${format(employmentChange)} %`],
      evidenceIds: [employmentStart.id, employmentEnd.id], sourceIds: [employmentSeries.source.id],
      dimensions: { period: `${window.start}–${window.end}`, geography: 'España', population: 'empleo total (concepto doméstico) respecto a población total (concepto nacional)', denominator: 'población total', unit: '%' },
    });
  }
  const evidenceIds = [...allObservedRows.map((item) => item.id), metadataSource.id, ...(asksGdpPerCapitaContext ? [populationDefinitionSource.id] : [])];
  const plan = {
    id: 'measurement-labour-productivity-and-growth', schemaVersion: '1', evidenceLevel: 'limited', coverage: 'qualified', claimType: 'comparative',
    headline: `Productividad real: ${format(perPersonChange)} % por persona ocupada y ${format(perHourChange)} % por hora`,
    summary: [productivityFinding, ...contextFindings].filter(Boolean).join(' '),
    shareableReply: reply,
    shareableSourceIds: sourceIds,
    interpretation: { kind: 'quantitative', subject: 'productividad laboral real y crecimiento económico', predicate: 'comparison', normalizedClaim: claim, evidenceNeeds: ['productividad real por persona ocupada y por hora', ...(asksGdpContext ? ['PIB real total del mismo periodo'] : []), ...(asksGdpPerCapitaContext ? ['PIB real por habitante del mismo periodo para contextualizar la población'] : []), ...(asksEmploymentContext ? ['proporción de empleo total sobre la población para separar el indicador de empleo del producto por persona ocupada'] : [])] },
    blocks: [
      { type: 'claim_breakdown', propositionIds: ['submitted-claim'], items: [{ text: claim, type: 'comparative', explicit: true, evidenceIds, sourceIds, verdict, evidenceLevel: 'limited', finding: `${productivityFinding} ${contextFindings.join(' ')} ${comparisonSentence}` }] },
      { type: 'data_finding', evidenceIds, points: [productivityFinding, ...contextFindings].filter(Boolean) },
      { type: 'cannot_conclude', evidenceIds: [metadataSource.id], points: [limitation, ...(timingNote ? [timingNote] : [])] },
      { type: 'conversation_reply', evidenceIds, text: reply },
    ],
    limitation, evidenceIds, sourceIds, sourceLinks: sources,
    evidenceSummary: { mode: allObservedRows.some((item) => item.dataKind === 'snapshot') ? 'snapshot' : 'dynamic', families },
    answerScope: { kind: 'measurement', family: 'labour-productivity-and-growth', directMetrics: PRODUCTIVITY_IDS, contextMetrics },
    knowledgeVersion: RUNTIME_VERSIONS.warehouseKnowledge,
  };
  return plan;
};

export const labourProductivityEvidenceGapPlan = (claim, { reason = 'missing-period' } = {}) => {
  const missing = reason === 'period'
    ? 'observaciones de productividad comparables para los años que pide la afirmación'
    : reason === 'geography'
      ? 'series de productividad real por persona ocupada y por hora para el mismo territorio'
      : 'series comparables de productividad real por persona ocupada y por hora';
  const explanation = 'La productividad puede medirse como PIB real por persona ocupada o por hora trabajada; ambas medidas pueden evolucionar de forma distinta.';
  const reply = `${explanation}\n\nNo hay observaciones compatibles suficientes para comparar ${missing}. Sin ellas no se puede confirmar ni descartar la afirmación.`;
  return {
    id: 'measurement-labour-productivity-gap', schemaVersion: '1', evidenceLevel: 'insufficient', coverage: 'insufficient', claimType: 'comparative',
    headline: 'Faltan medidas de productividad comparables', summary: explanation, shareableReply: reply,
    interpretation: { kind: 'quantitative', subject: 'productividad laboral', predicate: 'comparison', normalizedClaim: claim, evidenceNeeds: [missing] },
    blocks: [
      { type: 'claim_breakdown', propositionIds: ['submitted-claim'], items: [{ text: claim, type: 'comparative', explicit: true, verdict: 'insufficient', evidenceLevel: 'none', finding: `Falta ${missing}.` }] },
      { type: 'evidence_gap', missing: [missing], needed: [missing], nextAction: 'Elegir un periodo y territorio comunes y comparar productividad por persona ocupada y por hora trabajada.' },
      { type: 'cannot_conclude', evidenceIds: [], points: ['Ninguna de las dos medidas identifica por sí sola las causas del crecimiento ni la productividad total de los factores.'] },
      { type: 'conversation_reply', evidenceIds: [], text: reply },
    ],
    limitation: explanation, evidenceIds: [], sourceIds: [], sourceLinks: [],
    evidenceSummary: { mode: 'none', families: [], missingDimensions: [missing] },
    answerScope: { kind: 'measurement', family: 'labour-productivity-and-growth', directMetrics: [PER_PERSON, PER_HOUR], contextMetrics: [] },
    knowledgeVersion: RUNTIME_VERSIONS.warehouseKnowledge,
  };
};
