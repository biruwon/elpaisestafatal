import { RUNTIME_VERSIONS } from './runtime-versions.mjs';

const AGREEMENTS = 'collective_agreement_wage_settlement_rate';
const PRICES = 'annual_hicp_index';
const normalize = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const number = (value, digits = 1) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: digits, useGrouping: 'always' }).format(value);
const change = (start, end) => (end / start - 1) * 100;

const compatibleScope = (claim) => {
  const text = normalize(claim);
  if (/\b(?:smi|salari\w* minim\w*|sueldo\w* minim\w*)\b/.test(text)) return false;
  if (/\b(?:mi|mis|tu|tus|nuestro|nuestra)\s+(?:salari\w*|sueldo\w*|nomina\w*)\b|\b(?:salari\w*|sueldo\w*|nomina\w*)\s+(?:net\w*|median\w*|de mi|de tu)\b/.test(text)) return false;
  if (/\b(?:mujer\w*|hombre\w*|joven\w*|mayor\w*|pension\w*|autonom\w*|funcionari\w*|parcial|completa|edad|ocupacion\w*|profesion\w*|empresa\w*|sector\w*|hosteler\w*|agricultur\w*|industria\w*|construccion|comercio|provincia\w*|comunidad\w*|ciudad\w*|municipio\w*|madrid|andalucia|cataluna|galicia|valencia|barcelona|sevilla|zaragoza)\b/.test(text)) return false;
  if (/\b(?:caus\w*|provoc\w*|gener\w*|traslad\w*|oblig\w*)\b/.test(text)) return false;
  return true;
};

const hasSupportedRelation = (text) => /\b(?:mas lent\w*|mas despaci\w*|menos que|mas que|por debajo|por detras|no compens\w*|no.{0,12}(?:segu|sigui)\w*|perdi\w* poder|erosion\w*|mas rapid\w*|mas deprisa|por encima|por delante|super\w*|compens\w*|recuper\w*|al mismo ritmo|a la par|igual que|ritmo de los precios)\b/.test(text);

const selectedWindow = (claim, years, now) => {
  const text = normalize(claim);
  const latest = years.at(-1);
  const requested = [...new Set((text.match(/\b(?:19|20|21)\d{2}\b/g) || []).map(Number))].sort((a, b) => a - b);
  if (requested.length > 2 || !latest) return undefined;
  let start, end;
  if (requested.length === 2) [start, end] = requested;
  else if (requested.length === 1) {
    const year = requested[0];
    if (/\b(desde|a partir de)\b/.test(text)) { start = year; end = latest; }
    else if (/\b(en|durante|para)\b/.test(text)) { start = year - 1; end = year; }
    else return undefined;
  } else {
    if (/\b(desde que|desde la pandemia|este ano|ano en curso)\b/.test(text)) return undefined;
    if (/\bano pasado\b/.test(text)) { end = new Date(now).getUTCFullYear() - 1; start = end - 1; }
    else if (/\b(?:ultimo ano|el ano anterior)\b/.test(text)) {
      if (latest !== new Date(now).getUTCFullYear() - 1) return undefined;
      end = latest; start = end - 1;
    } else {
      const duration = text.match(/\b(?:ultim\w*|hace|durante)\s+(\d+|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+(?:anos|ejercicios)\b/)?.[1];
      const mentionsDuration = /\b(?:\d+|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+(?:anos|ejercicios)\b/.test(text);
      if (mentionsDuration && !duration) return undefined;
      const words = { uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };
      const count = duration ? (words[duration] || Number(duration)) : 5;
      if (!Number.isInteger(count) || count < 1 || count > 20) return undefined;
      end = latest; start = end - count;
    }
  }
  if (!Number.isInteger(start) || !Number.isInteger(end) || start >= end || !years.includes(start) || !years.includes(end)) return undefined;
  return { start, end };
};

const isSourceFor = (item, metricId, now, allowReviewedSnapshot) => {
  if (item.metricId !== metricId || !/^\d{4}$/.test(String(item.period || ''))
    || typeof item.value !== 'number' || !Number.isFinite(item.value)
    || metricId === PRICES && item.value <= 0 || metricId === AGREEMENTS && item.value <= -100 || !item.id
    || ['projected', 'budget'].includes(item.dataKind) || ['stale', 'invalid'].includes(item.freshness)) return false;
  const d = item.dimensions || {};
  if (d.freq !== 'A' || d.geo !== 'ES') return false;
  if (metricId === AGREEMENTS && (d.unit !== 'PC' || d.agreement !== 'all')) return false;
  if (metricId === PRICES && (d.unit !== 'INX_A_AVG' || d.coicop18 !== 'TOTAL')) return false;
  const retrieved = Date.parse(item.source?.retrievedAt || '');
  if (!item.source?.id || !item.source?.title || !Number.isFinite(retrieved) || retrieved > now + 300000) return false;
  if (now - retrieved > 14 * 86400000 && !(allowReviewedSnapshot && item.dataKind === 'snapshot')) return false;
  try {
    const url = new URL(item.source.url);
    return url.protocol === 'https:' && (metricId === AGREEMENTS
      ? item.source.publisher === 'Ministerio de Trabajo y Economía Social'
        && url.hostname === 'www.mites.gob.es' && /\/estadisticas\/cct\/cct\d{2}[a-z]{3}av\//.test(url.pathname)
      : item.source.publisher === 'Eurostat' && url.hostname === 'ec.europa.eu'
        && url.pathname.toLowerCase().endsWith('/data/prc_hicp_ainr'));
  } catch { return false; }
};

const eligibleSeries = (observations, metricId, now, allowReviewedSnapshot) => {
  const eligible = observations.filter((item) => isSourceFor(item, metricId, now, allowReviewedSnapshot));
  if (!eligible.length) return new Map();
  const newest = eligible.reduce((best, item) => Date.parse(item.source.retrievedAt) > Date.parse(best.source.retrievedAt) ? item : best);
  const rows = new Map();
  for (const item of eligible.filter((row) => row.source.id === newest.source.id)) {
    const prior = rows.get(Number(item.period));
    if (prior && (prior.value !== item.value || prior.status !== item.status)) return new Map();
    rows.set(Number(item.period), item);
  }
  return rows;
};

const claimDirection = (text) => {
  if (/\b(?:mas lent\w*|mas despaci\w*|menos que|por debajo|por detras|no compens\w*|no.{0,12}(?:segu|sigui)\w*|perdi\w* poder|erosion\w*)\b/.test(text)) return 'slower';
  if (/\b(?:mas rapid\w*|mas deprisa|mas que|por encima|por delante|super\w*|compens\w*|recuper\w*)\b/.test(text)) return 'faster';
  if (/\b(?:al mismo ritmo|a la par|igual que)\b/.test(text)) return 'equal';
  return undefined;
};

export const collectiveAgreementWagePlan = (claim, { observations = [], now = Date.now(), allowReviewedSnapshot = false } = {}) => {
  const text = normalize(claim);
  if (!compatibleScope(claim) || !hasSupportedRelation(text)) return undefined;
  const agreements = eligibleSeries(observations, AGREEMENTS, now, allowReviewedSnapshot);
  const prices = eligibleSeries(observations, PRICES, now, allowReviewedSnapshot);
  const years = [...agreements.keys()].filter((year) => prices.has(year) && prices.has(year - 1)).sort((a, b) => a - b);
  const window = selectedWindow(claim, years, now);
  if (!window) return undefined;
  const { start, end } = window;
  const annual = [];
  for (let year = start + 1; year <= end; year += 1) {
    const settlement = agreements.get(year), price = prices.get(year), previousPrice = prices.get(year - 1);
    if (!settlement || !price || !previousPrice) return undefined;
    const flags = [settlement.status, price.status, previousPrice.status].filter(Boolean).join('').toLowerCase();
    if ((year > start && flags.includes('b')) || /[^bep ,]/.test(flags)) return undefined;
    annual.push({ year, settlement, priceChange: change(previousPrice.value, price.value) });
  }
  const priceStart = prices.get(start), priceEnd = prices.get(end);
  if (!priceStart || !priceEnd || !annual.length) return undefined;
  const settlementFactor = annual.reduce((factor, item) => factor * (1 + item.settlement.value / 100), 1);
  const settlementChange = (settlementFactor - 1) * 100;
  const settlementPeriod = start + 1 === end ? `en ${end}` : `entre ${start + 1} y ${end}`;
  const priceChange = change(priceStart.value, priceEnd.value);
  const realChange = ((settlementFactor / (priceEnd.value / priceStart.value)) - 1) * 100;
  if (![settlementChange, priceChange, realChange].every(Number.isFinite)) return undefined;
  const direction = claimDirection(text);
  const verdict = direction === 'slower' ? (realChange < 0 ? 'supported' : 'contradicted')
    : direction === 'faster' ? (realChange > 0 ? 'supported' : 'contradicted')
      : direction === 'equal' ? (Math.abs(realChange) < 0.05 ? 'supported' : 'contradicted') : 'mixed';
  const yearBreakdown = annual.map(({ year, settlement, priceChange: annualPrice }) => `${year}: pactada ${number(settlement.value)} % / precios ${number(annualPrice)} %`).join('; ');
  const latestSettlementDimensions = annual.at(-1).settlement.dimensions || {};
  const coverageNote = latestSettlementDimensions.registeredCutoff === '2026-10'
    ? `El avance del Ministerio registrado hasta octubre de 2026 incluye ${number(latestSettlementDimensions.agreementsCount)} convenios con efectos económicos conocidos y cuantificados, que afectan a ${number(latestSettlementDimensions.affectedWorkers)} trabajadores.`
    : '';
  const finding = `Entre ${start} y ${end}, las subidas salariales pactadas en convenios ${settlementPeriod} se acumularon aproximadamente un ${number(settlementChange)} %. En el mismo tramo, el índice armonizado medio de precios pasó de ${number(priceStart.value, 2)} a ${number(priceEnd.value, 2)} (${number(priceChange)} %); al descontar esa variación, la subida pactada acumulada quedó aproximadamente un ${number(Math.abs(realChange))} % ${realChange < 0 ? 'por debajo' : 'por encima'} de los precios.`;
  const annualFinding = `Variación anual pactada / variación calculada del HICP medio: ${yearBreakdown}.`;
  const allFlags = annual.flatMap(({ settlement, year }) => [settlement.status, prices.get(year)?.status, prices.get(year - 1)?.status]).map((status) => String(status || '').toLowerCase()).join('');
  const provisional2025 = String(agreements.get(2025)?.status || '').toLowerCase().includes('p');
  const flagNote = [provisional2025 ? 'El dato de 2025 es provisional.' : allFlags.includes('p') ? 'La comparación incluye datos provisionales.' : '', allFlags.includes('e') ? 'La comparación incluye datos estimados.' : ''].filter(Boolean).join(' ');
  const limitation = 'La variación pactada es el promedio de convenios registrados con efectos económicos conocidos y cuantificados; no mide cuánto cobró cada trabajador ni incluye necesariamente a todas las personas asalariadas. La subida puede aplicarse en fechas distintas o con efectos retroactivos. El HICP es una cesta de consumo agregada y no el coste de vida de cada hogar. La comparación no prueba que los convenios causen la inflación.';
  const method = 'Cálculo propio: se acumulan las variaciones salariales pactadas de cada año entre los dos extremos y se comparan con el cambio del índice HICP medio anual en las mismas fechas.';
  const reply = [coverageNote, finding, annualFinding, method, flagNote, limitation].filter(Boolean).join('\n\n');
  const agreementRows = annual.map(({ settlement }) => settlement), priceRows = [priceStart, priceEnd];
  const evidenceIds = [...agreementRows, ...priceRows].map((item) => item.id);
  const sources = [...new Map([...agreementRows, ...priceRows].map((item) => [item.source.id, item.source])).values()];
  const sourceIds = sources.map((source) => source.id);
  const agreementEvidence = {
    familyId: AGREEMENTS, label: 'Variación salarial media pactada en convenios registrados', direction: 'qualifies', status: 'available', dataKind: 'observed',
    finding: `Variación anual pactada entre ${start + 1} y ${end}; ${agreementRows.length} observaciones.`,
    data: agreementRows.map((item) => `${item.period}: ${number(item.value)} %${item.status === 'p' ? ' (provisional)' : ''}`),
    evidenceIds: agreementRows.map((item) => item.id), sourceIds: [agreementRows[0].source.id],
    dimensions: { geography: 'España', period: `${start + 1}–${end}`, population: 'Personas trabajadoras afectadas por convenios registrados con efectos económicos conocidos y cuantificados', denominator: 'Personas trabajadoras afectadas por esos convenios', unit: 'Variación salarial anual pactada (%)' },
  };
  const priceEvidence = {
    familyId: PRICES, label: 'Precios de consumo armonizados', direction: 'qualifies', status: 'available', dataKind: 'observed',
    finding: `Índice HICP medio anual: ${number(priceStart.value, 2)} (${start}) y ${number(priceEnd.value, 2)} (${end}).`,
    data: [`${start}: ${number(priceStart.value, 2)}`, `${end}: ${number(priceEnd.value, 2)}`],
    evidenceIds: priceRows.map((item) => item.id), sourceIds: [priceStart.source.id],
    dimensions: { geography: 'España', period: `${start}–${end}`, population: 'Cesta armonizada de consumo, todos los productos', denominator: 'Índice medio anual', unit: 'Índice HICP' },
  };
  return {
    id: 'measurement-collective-agreement-wages', schemaVersion: '1', evidenceLevel: 'limited', coverage: 'qualified', claimType: 'comparative',
    headline: `Subidas pactadas y precios en España, ${start}–${end}`, summary: finding, shareableReply: reply, shareableSourceIds: sourceIds,
    interpretation: { kind: 'quantitative', subject: 'subidas pactadas en convenios y precios de consumo', predicate: 'comparison', normalizedClaim: claim, evidenceNeeds: ['variación salarial pactada en convenios y HICP para los mismos años', 'población y provisionalidad de la fuente laboral'] },
    blocks: [
      { type: 'claim_breakdown', propositions: [], items: [{ text: claim, type: 'comparative', explicit: true, evidenceIds, sourceIds, verdict, evidenceLevel: 'limited', finding }] },
      { type: 'data_finding', evidenceIds, points: [finding, annualFinding] },
      { type: 'cannot_conclude', evidenceIds: [], points: [limitation] },
      { type: 'conversation_reply', evidenceIds, text: reply },
    ],
    limitation, evidenceIds, sourceIds, sourceLinks: sources,
    evidenceSummary: { mode: 'dynamic', families: [agreementEvidence, priceEvidence] },
    answerScope: { kind: 'measurement', family: 'collective-agreement-wages', directMetrics: [AGREEMENTS, PRICES], contextMetrics: [] },
    knowledgeVersion: RUNTIME_VERSIONS.warehouseKnowledge,
  };
};
