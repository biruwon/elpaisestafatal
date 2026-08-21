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

const findingFor = (items, candidate, query) => {
  const latestItems = items.slice().sort((a, b) => String(a.period || a.id).localeCompare(String(b.period || b.id)));
  const latest = latestItems.at(-1);
  const title = latest?.metric || candidate.metricId;
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
  const value = latest && Number.isFinite(Number(latest.value)) ? `${latest.value}${latest.unit ? ` ${latest.unit}` : ''}` : 'datos localizados';
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
    const items = byMetric.get(candidate.metricId) || [];
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
    const decisions = items.map((item) => item.freshness
      ? { status: item.freshness, action: item.freshness === 'fresh' ? 'use' : 'label-limited', reason: staleSourceReason(item.source) }
      : freshnessDecision(item.source));
    const usable = items.filter((_, index) => decisions[index].action !== 'exclude');
    const freshness = decisions
      .filter((_, index) => usable.includes(items[index]))
      .map((decision) => decision.status)
      .sort((a, b) => ({ fresh: 0, unknown: 1, stale: 2, invalid: 3 }[a] ?? 4) - ({ fresh: 0, unknown: 1, stale: 2, invalid: 3 }[b] ?? 4))[0] || 'unknown';
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
      limitation: stale ? `${finding.limitation} La fuente está ${freshness}; este resultado no debe tratarse como una comprobación plenamente actual.` : finding.limitation,
      freshness,
      sourceMode: 'dynamic',
      score: Number((ranked.find((item) => item.candidate.metricId === candidate.metricId)?.score || 0).toFixed(3)),
    };
  });
  const missingDimensions = selected.length ? [] : ['indicador compatible', 'periodo comparable', 'territorio o población'];
  const overallLevel = selected.length && selected.some((item) => item.freshness === 'fresh') && selected.every((item) => item.direction !== 'supports' || item.evidenceIds.length) ? 'qualified' : 'insufficient';
  return { selected, rejected, missingDimensions, overallLevel };
};

export const evidenceSummaryForPublic = (selection, { mode = 'dynamic', fallbackReason } = {}) => ({
  mode,
  families: (selection?.selected || []).map((item) => ({ label: item.title, direction: item.direction, evidenceIds: item.evidenceIds })),
  ...(selection?.missingDimensions?.length ? { missingDimensions: selection.missingDimensions } : {}),
  ...(fallbackReason ? { fallbackReason } : {}),
});
