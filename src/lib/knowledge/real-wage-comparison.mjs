import { RUNTIME_VERSIONS } from './runtime-versions.mjs';

const WAGES = 'annual_hourly_wage_index';
const PRICES = 'annual_hicp_index';
const normalize = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const n = (value, digits = 1) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: digits }).format(value);
const change = (start, end) => (end / start - 1) * 100;
const describeChange = (value) => Math.abs(value) < 0.05 ? 'prácticamente no cambió' : `${value > 0 ? 'subió' : 'bajó'} aproximadamente un ${n(Math.abs(value))} %`;

// These two national series cannot answer questions about a specific group,
// occupation, net pay, country or locality. An unknown place introduced by
// “en” is treated conservatively instead of silently assuming Spain.
const compatibleClaimScope = (claim) => {
  const text = normalize(claim);
  if (/\b(smi|salari\w* minim\w*|sueld\w* minim\w*|net[oa]s?|median[oa]s?|joven\w*|mujer\w*|hombre\w*|trabajadoras|empleadas|asalariadas|femenin\w*|masculin\w*|pension\w*|jubilad\w*|autonom\w*|funcionari\w*|emplead\w* public\w*|jornada (?:parcial|completa)|tiempo (?:parcial|completo)|contratos? temporales?|sector\w*|profesion\w*|ocupacion\w*|enfermer\w*|medic\w*|docent\w*|profesor\w*|industria|agricultura|construccion|hosteleria|europ\w*|union europea|francia|aleman\w*|italia|portugal|reino unido|estados unidos|comunidad\w*|provincia\w*|municipio\w*|ciudad\w*|puebl\w*|andalucia|aragon|asturias|baleares|canarias|cantabria|castilla|cataluna|galicia|madrid|murcia|navarra|pais vasco|rioja|ceuta|melilla|barcelona|sevilla|valencia)\b/.test(text)) return false;
  if (/\b(?:salari\w*|sueld\w*)\s+(?:public\w*|privad\w*)\b/.test(text)) return false;
  if (/\b(?:mi|mis|tu|tus|nuestro|nuestra)\s+(?:salari\w*|sueld\w*|nomina\w*)\b|\b(?:salari\w*|sueld\w*|nomina\w*)\s+(?:de mi|de tu|mio|mia|nuestro|nuestra)\b/.test(text)) return false;
  if (/\b(?:mismo|misma|equivalente)\s+(?:puesto|trabajo|perfil|profesion|formacion)\b|\b(?:por trabajador|por empleado|por persona|al mes|al ano)\b/.test(text)) return false;
  if (/\b(?:salari\w*|sueld\w*|nomina\w*)\s+(?:(?:medi\w*|mas)\s+)?(?:mensual\w*|anual\w*|por mes|por ano|baj[oa]\w*|alt[oa]\w*)\b/.test(text)) return false;
  const designation = text.match(/\b(?:salari\w*|sueld\w*|nomina\w*)\s+de\s+(?:(?:los|las|el|la)\s+)?([a-z]+)/)?.[1];
  if (designation && !['espana', 'espanoles', 'espanolas', 'trabajadores', 'empleados', 'asalariados'].includes(designation)) return false;
  const allowedAfterEn = new Set(['espana', 'espanol', 'espanola', 'los', 'las', 'el', 'la', 'un', 'una', 'su', 'sus', 'este', 'esta', 'estos', 'estas', 'terminos', 'relacion', 'general', 'comparacion', 'promedio', 'conjunto']);
  for (const match of text.matchAll(/\ben\s+([a-z]+)\b/g)) if (!allowedAfterEn.has(match[1])) return false;
  return true;
};

const selectedWindow = (claim, years, now) => {
  const text = normalize(claim);
  const latest = years.at(-1);
  const requested = [...new Set((text.match(/\b(?:19|20|21)\d{2}\b/g) || []).map(Number))].sort((a, b) => a - b);
  if (requested.length > 2 || !latest) return undefined;
  let start, end, automatic = false;
  if (requested.length === 2) [start, end] = requested;
  else if (requested.length === 1) {
    const year = requested[0];
    if (/\b(desde|a partir de)\b/.test(text)) { start = year; end = latest; }
    else if (/\b(en|durante|para)\b/.test(text)) { start = year - 1; end = year; }
    else return undefined;
  } else {
    // “Since the pandemic” or a named government implies a start date that
    // cannot be recovered safely from this statistical series alone.
    if (/\b(desde que|desde la pandemia|desde la crisis|desde el gobierno|este ano|ano en curso)\b/.test(text)) return undefined;
    if (/\bano pasado\b/.test(text)) { end = new Date(now).getUTCFullYear() - 1; start = end - 1; }
    else if (/\b(ultimo ano|el ano anterior)\b/.test(text)) {
      if (latest !== new Date(now).getUTCFullYear() - 1) return undefined;
      end = latest; start = end - 1;
    }
    else {
      const duration = text.match(/\b(?:ultim\w*|hace|durante)\s+(\d+|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+(?:anos|ejercicios)\b/)?.[1];
      const mentionsDuration = /\b(?:\d+|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+(?:anos|ejercicios)\b/.test(text);
      if (mentionsDuration && !duration) return undefined;
      const words = { uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };
      const decade = /\b(?:ultima|ultimo) decada\b/.test(text);
      if ((duration || decade) && latest !== new Date(now).getUTCFullYear() - 1) return undefined;
      const count = duration ? (words[duration] || Number(duration)) : decade ? 10 : 5;
      if (!Number.isInteger(count) || count < 1 || count > 40) return undefined;
      end = latest; start = end - count; automatic = !duration;
    }
  }
  if (!Number.isInteger(start) || !Number.isInteger(end) || start >= end || !years.includes(start) || !years.includes(end)) return undefined;
  return { start, end, automatic };
};

const eligibleSeries = (observations, metricId, now) => {
  const currentYear = new Date(now).getUTCFullYear();
  const eligible = observations.filter((item) => {
    if (item.metricId !== metricId || !/^\d{4}$/.test(String(item.period || '')) || Number(item.period) >= currentYear
      || typeof item.value !== 'number' || !Number.isFinite(item.value) || item.value <= 0 || !item.id
      || ['projected', 'budget'].includes(item.dataKind) || ['stale', 'invalid'].includes(item.freshness)) return false;
    const d = item.dimensions || {};
    if (d.freq !== 'A' || d.geo !== 'ES') return false;
    if (metricId === WAGES && (d.unit !== 'I20' || d.nace_r2 !== 'B-S' || d.lcstruct !== 'D11')) return false;
    if (metricId === PRICES && (d.unit !== 'INX_A_AVG' || d.coicop18 !== 'TOTAL')) return false;
    const retrieved = Date.parse(item.source?.retrievedAt || '');
    if (!item.source?.id || !item.source?.title || !Number.isFinite(retrieved) || retrieved > now + 300000 || now - retrieved > 14 * 86400000) return false;
    try {
      const url = new URL(item.source.url);
      const dataset = metricId === WAGES ? 'lc_lci_r2_a' : 'prc_hicp_ainr';
      return url.protocol === 'https:' && url.hostname === 'ec.europa.eu' && url.pathname.toLowerCase().endsWith(`/data/${dataset}`);
    } catch { return false; }
  });
  if (!eligible.length) return new Map();
  // Keep one complete source revision per series; do not join observations
  // from independently refreshed versions or differently based indices.
  const newest = eligible.reduce((best, item) => Date.parse(item.source.retrievedAt) > Date.parse(best.source.retrievedAt) ? item : best);
  const rows = new Map();
  for (const item of eligible.filter((row) => row.source.id === newest.source.id)) {
    const year = Number(item.period), prior = rows.get(year);
    if (prior && (prior.value !== item.value || prior.status !== item.status)) return new Map();
    rows.set(year, item);
  }
  return rows;
};

const makeComparison = (wages, prices, start, end) => {
  const observations = [];
  for (let year = start; year <= end; year += 1) {
    const wage = wages.get(year), price = prices.get(year);
    if (!wage || !price) return undefined;
    const flags = [wage.status, price.status].filter(Boolean).join('').toLowerCase();
    // A break after the base year invalidates a simple comparison. Unknown or
    // low-reliability flags require review rather than an invented result.
    if ((year > start && flags.includes('b')) || /[^bep ,]/.test(flags)) return undefined;
    observations.push(wage, price);
  }
  const wageChange = change(wages.get(start).value, wages.get(end).value);
  const priceChange = change(prices.get(start).value, prices.get(end).value);
  const realChange = ((wages.get(end).value / wages.get(start).value) / (prices.get(end).value / prices.get(start).value) - 1) * 100;
  if (![wageChange, priceChange, realChange].every(Number.isFinite)) return undefined;
  const flags = observations.map((item) => item.status || '').join('').toLowerCase();
  return { start, end, wageChange, priceChange, realChange, provisional: flags.includes('p'), estimated: flags.includes('e') };
};

export const realWagePlan = (claim, { observations = [], now = Date.now() } = {}) => {
  const text = normalize(claim);
  if (!compatibleClaimScope(claim) || !/\b(perd\w*|pierd\w*|gan\w*|baj\w*|sub\w*|aument\w*|ca[iy]\w*|crec\w*|estanc\w*|evoluc\w*|mejor\w*|empeor\w*|sigu\w*|come\w*|comid\w*|compar\w*|cambi\w*|compens\w*|reduc\w*|disminu\w*|erosion\w*|recuper\w*|mantien\w*)\b/.test(text)) return undefined;
  const wages = eligibleSeries(observations, WAGES, now), prices = eligibleSeries(observations, PRICES, now);
  const years = [...wages.keys()].filter((year) => prices.has(year)).sort((a, b) => a - b);
  if (!/\b(?:19|20|21)\d{2}\b/.test(text)
    && Math.max(...wages.keys()) !== Math.max(...prices.keys())) return undefined;
  const window = selectedWindow(claim, years, now);
  if (!window) return undefined;
  const main = makeComparison(wages, prices, window.start, window.end);
  if (!main) return undefined;
  const recentStart = window.end - 3;
  const recent = window.automatic && recentStart > window.start ? makeComparison(wages, prices, recentStart, window.end) : undefined;
  const finding = `En España, entre ${main.start} y ${main.end}, el índice de salarios brutos por hora trabajada ${describeChange(main.wageChange)}, mientras el índice armonizado de precios de consumo ${describeChange(main.priceChange)}. Al descontar esos precios, el índice salarial ${describeChange(main.realChange)}.`;
  const recentFinding = recent ? `Entre ${recent.start} y ${recent.end}, el índice salarial ajustado por precios ${describeChange(recent.realChange)}; el resultado depende de las fechas comparadas.` : '';
  const flagNote = [main.provisional || recent?.provisional ? 'La comparación incluye datos provisionales.' : '', main.estimated || recent?.estimated ? 'La comparación incluye datos estimados.' : ''].filter(Boolean).join(' ');
  const limitation = 'Es un índice agregado de salarios brutos por hora en industria, construcción y servicios; excluye agricultura, empleo doméstico y organismos extraterritoriales. No es el sueldo neto o mediano ni mide la evolución de cada persona. El índice armonizado de precios no mide el coste de vida de cada hogar. Los cambios en la composición del empleo pueden influir. Comparar los extremos no demuestra que haya ocurrido lo mismo cada año ni explica sus causas.';
  const method = 'Cálculo propio con dos índices anuales de Eurostat: se compara cómo cambia la relación entre salarios y precios en las mismas fechas.';
  const reply = [finding, recentFinding, method, flagNote, limitation].filter(Boolean).join('\n\n');
  const usedYears = Array.from({ length: main.end - main.start + 1 }, (_, index) => main.start + index);
  const wageRows = usedYears.map((year) => wages.get(year)), priceRows = usedYears.map((year) => prices.get(year));
  const rows = [...wageRows, ...priceRows];
  const evidenceIds = rows.map((item) => item.id);
  const sources = [...new Map(rows.map((item) => [item.source.id, item.source])).values()];
  const sourceIds = sources.map((source) => source.id);
  const families = [
    { familyId: WAGES, label: 'Salarios brutos por hora trabajada', direction: 'qualifies', status: 'available', dataKind: 'observed',
      finding: `Índice de salarios y sueldos por hora: ${n(wages.get(main.start).value, 2)} (${main.start}) y ${n(wages.get(main.end).value, 2)} (${main.end}); base 2020 = 100.`,
      data: [`${main.start}: ${n(wages.get(main.start).value, 2)}`, `${main.end}: ${n(wages.get(main.end).value, 2)}`], evidenceIds: wageRows.map((item) => item.id), sourceIds: [wageRows[0].source.id],
      dimensions: { geography: 'España', period: `${main.start}–${main.end}`, population: 'Personas asalariadas en industria, construcción y servicios; costes salariales por hora', denominator: 'Horas trabajadas', unit: 'Índice, 2020 = 100' } },
    { familyId: PRICES, label: 'Precios de consumo armonizados', direction: 'qualifies', status: 'available', dataKind: 'observed',
      finding: `Índice medio anual de precios: ${n(prices.get(main.start).value, 2)} (${main.start}) y ${n(prices.get(main.end).value, 2)} (${main.end}).`,
      data: [`${main.start}: ${n(prices.get(main.start).value, 2)}`, `${main.end}: ${n(prices.get(main.end).value, 2)}`], evidenceIds: priceRows.map((item) => item.id), sourceIds: [priceRows[0].source.id],
      dimensions: { geography: 'España', period: `${main.start}–${main.end}`, population: 'Cesta armonizada de consumo, todos los productos', unit: 'Índice medio anual' } },
  ];
  return {
    id: 'measurement-real-wages', schemaVersion: '1', evidenceLevel: 'limited', coverage: 'qualified', claimType: 'comparative',
    headline: `Salarios por hora y precios en España, ${main.start}–${main.end}`, summary: finding, shareableReply: reply, shareableSourceIds: sourceIds,
    interpretation: { kind: 'quantitative', subject: 'salarios por hora y precios de consumo', predicate: 'comparison', normalizedClaim: claim, evidenceNeeds: ['series salariales y de precios con las mismas fechas', 'población y definición salarial'] },
    blocks: [
      { type: 'claim_breakdown', propositionIds: ['submitted-claim'], items: [{ text: claim, type: 'comparative', explicit: true, evidenceIds, sourceIds, verdict: 'insufficient', evidenceLevel: 'limited', finding }] },
      { type: 'data_finding', evidenceIds, points: [finding, ...(recentFinding ? [recentFinding] : [])] },
      { type: 'cannot_conclude', evidenceIds: [], points: [limitation] },
      { type: 'conversation_reply', evidenceIds, text: reply },
    ],
    limitation, evidenceIds, sourceIds, sourceLinks: sources, evidenceSummary: { mode: 'dynamic', families },
    answerScope: { kind: 'measurement', family: 'real-wages', directMetrics: [WAGES, PRICES], contextMetrics: [] },
    knowledgeVersion: RUNTIME_VERSIONS.warehouseKnowledge,
  };
};
