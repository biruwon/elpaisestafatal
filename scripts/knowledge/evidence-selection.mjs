import { metricCandidatesForIds } from './metric-query-hints.mjs';
import { staleSourceReason, freshnessDecision } from './source-freshness.mjs';

const normalise = (value) => String(value || '')
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ñ/g, 'n')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const broadJudgement = (value) => /\b(?:fatal|abandonad|invad|destruy|colaps|peor|mentir|mienten|desastre|ruina|insegur|peligro)\w*/.test(value);
const supportsForClaim = (claimType = '') => claimType === 'causal' ? ['descriptive', 'trend'] : [claimType || 'descriptive', 'descriptive', 'trend'];

const sourceTypeScore = (source = {}) => source.sourceType === 'official' || source.role === 'primary' ? 0.2 : source.sourceType === 'academic' ? 0.15 : 0;
const freshnessScore = (status) => status === 'fresh' ? 0.2 : status === 'stale' ? 0.04 : 0;

const observationKey = (item) => item.metricId || item.metric;
const numericValue = (value) => (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') && Number.isFinite(Number(value));
const scopeOf = (item) => Object.fromEntries(Object.entries({
  geography: item.geography, population: item.population, denominator: item.denominator, unit: item.unit,
  ...(item.dimensions || {}),
}).filter(([key, value]) => value !== undefined && value !== null && value !== '' && !['time', 'period', 'year'].includes(key)).sort(([a], [b]) => a.localeCompare(b)));
const seriesKey = (item) => JSON.stringify({ scope: scopeOf(item), dataKind: item.dataKind || 'observed', periodType: item.periodType || 'observation' });

const findingFor = (items, candidate, query) => {
  const latestItems = items.slice().sort((a, b) => String(a.period || a.id).localeCompare(String(b.period || b.id)));
  const latest = latestItems.at(-1);
  const title = latest?.metric || candidate.metricId;
  const series = new Map();
  for (const item of latestItems) series.set(seriesKey(item), item);
  if (series.size > 1 && candidate.metricId !== 'public_housing_actions') {
    const rows = [...series.values()].slice(0, 6);
    const values = rows.map((item) => `${Object.values(scopeOf(item)).join(' · ')}: ${item.value}${item.unit ? ` ${item.unit}` : ''}${item.period ? ` (${item.period})` : ''}`).join('; ');
    return { title, finding: `${title}: ${values}.`, direction: 'qualifies',
      limitation: 'Son series con ámbitos distintos. No se calcula una media, una tasa común ni una comparación causal entre ellas.' };
  }
  if (candidate.metricId === 'public_housing_actions' && latestItems.length) {
    const period = latest?.period;
    const recent = latestItems.filter((item) => item.period === period && Number(item.value) > 0).sort((a, b) => Number(b.value) - Number(a.value));
    const item = recent[0] || latest;
    const place = item?.geography ? ` en ${item.geography}` : '';
    return {
      title,
      finding: `${title}: ${item?.value ?? 'datos localizados'}${item?.unit ? ` ${item.unit}` : ''}${place}${period ? ` (${period})` : ''}.`,
      direction: 'qualifies',
      limitation: 'Describe actuaciones administrativas de vivienda protegida, no adjudicaciones por nacionalidad ni prioridad entre grupos.',
    };
  }
  const samePeriod = latest?.period ? latestItems.filter((item) => item.period === latest.period) : latestItems;
  const groups = samePeriod.filter((item) => item.dimensions?.group || item.group);
  if (groups.length >= 2 && (candidate.metricId.includes('by_nationality') || candidate.metricId.includes('by_group'))) {
    const values = groups.map((item) => `${item.dimensions?.group || item.group}: ${item.value}${item.unit ? ` ${item.unit}` : ''}`).join('; ');
    const limitation = candidate.limitations?.[0] || 'La comparación usa solo los grupos y el denominador publicados por la fuente.';
    return { title, finding: `${title}: ${values}${latest.period ? ` (${latest.period})` : ''}.`, direction: 'qualifies', limitation };
  }
  const value = latest && numericValue(latest.value) ? `${latest.value}${latest.unit ? ` ${latest.unit}` : ''}` : 'documento localizado, sin medición numérica';
  const period = latest?.period ? ` (${latest.period})` : '';
  const limitation = candidate.limitations?.[0] || (candidate.metricId.endsWith('_europe') ? 'La comparación se refiere a la definición europea de este indicador.' : 'El indicador mide solo esta dimensión y no resume por sí solo el estado general del país.');
  const direction = broadJudgement(normalise(query)) ? 'qualifies' : 'neutral';
  return { title, finding: `${title}: ${value}${period}.`, direction, limitation };
};

export const selectEvidence = ({ query = '', observations = [], candidateIds = [], claimType = 'descriptive', maxFamilies = 5 } = {}) => {
  const candidates = metricCandidatesForIds(candidateIds);
  const byMetric = new Map();
  for (const observation of observations) {
    const metricId = observationKey(observation);
    if (!metricId) continue;
    const list = byMetric.get(metricId) || [];
    list.push(observation);
    byMetric.set(metricId, list);
  }
  const supportedTypes = supportsForClaim(claimType);
  const rejected = [];
  const ranked = [];
  for (const candidate of candidates) {
    const items = (byMetric.get(candidate.metricId) || []).filter((item) => numericValue(item.value) || ['official_publication', 'legal_document', 'legal_rule'].includes(item.kind));
    if (candidate.metricId === 'public_housing_allocations_by_nationality' && !/euskadi|pa[ií]s\s+vasco|etxebide|capv/i.test(query)) {
      rejected.push({ metricId: candidate.metricId, reason: 'territorial_scope_not_requested' });
      continue;
    }
    if (candidate.metricId === 'public_housing_allocations_by_documentation' && !/euskadi|pa[ií]s\s+vasco|etxebide|dni|nie|pasaporte|documentaci[oó]n/i.test(query)) {
      rejected.push({ metricId: candidate.metricId, reason: 'documentation_or_territorial_scope_not_requested' });
      continue;
    }
    if (!items.length) {
      rejected.push({ metricId: candidate.metricId, reason: 'no_compatible_observations' });
      continue;
    }
    if (candidate.supports?.length && !candidate.supports.some((type) => supportedTypes.includes(type))) {
      rejected.push({ metricId: candidate.metricId, reason: `claim_type_not_supported:${claimType}` });
      continue;
    }
    const queryIsGroupComparison = /(?:más|menos|mayor|menor|son|delincu|criminal|insegur)/i.test(query);
    const groups = new Set(items.map((item) => item.dimensions?.group || item.group).filter(Boolean));
    if (queryIsGroupComparison && candidate.metricId === 'recorded_offences') {
      rejected.push({ metricId: candidate.metricId, reason: 'group_comparison_requires_group_measure' });
      continue;
    }
    if (queryIsGroupComparison && candidate.metricId === 'foreign_citizenship_population' && items.every((item) => item.periodType === 'retrieval_snapshot')) {
      rejected.push({ metricId: candidate.metricId, reason: 'population_snapshot_not_aligned_to_comparison_period' });
      continue;
    }
    if (queryIsGroupComparison && candidate.metricId === 'crime_convictions_by_nationality' && groups.size < 2) {
      rejected.push({ metricId: candidate.metricId, reason: 'comparison_requires_two_source_groups' });
      continue;
    }
    const decisions = items.map((item) => {
      const checked = freshnessDecision(item.source);
      if (item.freshness === 'invalid') return { status: 'invalid', action: 'exclude' };
      if (checked.status !== 'fresh') return checked;
      return item.freshness ? { status: item.freshness, action: item.freshness === 'fresh' ? 'use' : 'label-limited', reason: staleSourceReason(item.source) } : checked;
    });
    const usable = items.filter((_, index) => decisions[index].action !== 'exclude');
    // A family is as current as the least-current observation it actually
    // presents. One fresh historical row cannot freshen a stale newer value.
    const freshness = decisions
      .filter((_, index) => usable.includes(items[index]))
      .map((decision) => decision.status)
      .sort((a, b) => ({ fresh: 0, unknown: 1, stale: 2, invalid: 3 }[b] ?? 4) - ({ fresh: 0, unknown: 1, stale: 2, invalid: 3 }[a] ?? 4))[0] || 'unknown';
    if (!usable.length) {
      rejected.push({ metricId: candidate.metricId, reason: decisions[0]?.reason || 'stale_source_not_allowed_for_dynamic_evidence' });
      continue;
    }
    const bestFit = Math.max(...usable.map((item) => item.evidenceFit === 'direct' ? 1 : item.evidenceFit === 'qualified' ? 0.7 : 0.35));
    const score = candidate.confidence * 0.45 + bestFit * 0.25 + freshnessScore(freshness) + sourceTypeScore(items[0]?.source) + Math.min(items.length, 3) * 0.02;
    ranked.push({ candidate, items: usable, freshness, score });
  }
  ranked.sort((a, b) => b.score - a.score);
  const selected = ranked.slice(0, maxFamilies).map(({ candidate, items, freshness }) => {
    const finding = findingFor(items, candidate, query);
    const stale = freshness !== 'fresh';
    return {
      metricId: candidate.metricId,
      family: candidate.family,
      title: finding.title,
      finding: finding.finding,
      direction: finding.direction,
      evidenceIds: items.map((item) => item.id).filter(Boolean),
      limitation: stale ? `${finding.limitation} ${freshness === 'stale' ? 'La fuente necesita una actualización' : 'No se ha podido verificar la fecha de consulta de la fuente'}; este resultado no debe tratarse como una comprobación plenamente actual.` : finding.limitation,
      freshness,
      dataKind: items.every((item) => (item.dataKind || 'observed') === (items[0]?.dataKind || 'observed')) ? items[0]?.dataKind || 'observed' : 'context',
      period: [...new Set(items.map((item) => item.period).filter(Boolean))].sort().join(' · '),
      dimensions: items.length && new Set(items.map(seriesKey)).size === 1 ? { ...scopeOf(items[0]), period: [...new Set(items.map((item) => item.period).filter(Boolean))].sort().join(' · ') } : undefined,
      sourceIds: [...new Set(items.map((item) => item.source?.id).filter(Boolean))],
      sourceMode: 'dynamic',
      score: Number((ranked.find((item) => item.candidate.metricId === candidate.metricId)?.score || 0).toFixed(3)),
    };
  });
  const missingDimensions = selected.length ? [] : ['indicador compatible', 'periodo comparable', 'territorio o población'];
  const overallLevel = selected.length && selected.every((item) => item.freshness === 'fresh' && item.evidenceIds.length) ? 'qualified' : 'insufficient';
  return { selected, rejected, missingDimensions, overallLevel };
};

export const evidenceSummaryForPublic = (selection, { mode = 'dynamic', fallbackReason } = {}) => ({
  mode,
  families: (selection?.selected || []).map((item) => ({
    label: item.title,
    direction: item.direction,
    evidenceIds: item.evidenceIds,
    finding: item.finding,
    limitation: item.limitation,
    period: item.period,
    dimensions: item.dimensions,
    sourceIds: item.sourceIds || [],
    dataKind: item.dataKind,
  })),
  ...(selection?.missingDimensions?.length ? { missingDimensions: selection.missingDimensions } : {}),
  ...(fallbackReason ? { fallbackReason } : {}),
});
