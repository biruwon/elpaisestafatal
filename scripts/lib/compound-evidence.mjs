import { preferredMetricIdsForQuery } from '../knowledge/metric-query-hints.mjs';
import { claimFocusFor } from '../../src/lib/knowledge/claim-focus.mjs';

export const propositionPlanCompatible = (item, plan) => {
  if (!plan) return false;
  if (plan.answerScope?.kind === 'measurement') return claimFocusFor(item.text)?.id === plan.answerScope.family;
  if (String(plan.id || '').startsWith('broad-')) return false;
  const metrics = preferredMetricIdsForQuery(item.text || '');
  return (plan.evidenceSummary?.families || []).some((family) => metrics.has(family.metricId || family.familyId));
};

// Map outcomes to the actual clauses that launched them. A filtered-out whole
// claim, a failed request, or duplicate text must never shift another clause's
// sources or result onto the wrong proposition.
export const alignPropositionOutcomes = (items, outcomes, launched = items, { requireCompatibility = false } = {}) => {
  const remaining = launched.map((item, index) => ({ item, index, used: false }));
  return items.map((item) => {
    const match = remaining.find((entry) => !entry.used && item.id && entry.item.id === item.id)
      || remaining.find((entry) => !entry.used && String(entry.item.text || '').trim() === String(item.text || '').trim());
    if (!match) return item;
    match.used = true;
    const outcome = outcomes[match.index];
    const plan = outcome?.status === 'fulfilled' ? outcome.value?.result : undefined;
    if (!plan || requireCompatibility && !propositionPlanCompatible(item, plan)) return item;
    // A source-backed observation can be relevant without proving the whole
    // proposition. Evidence level is not itself a truth verdict.
    return { ...item, evidenceIds: plan.evidenceIds || [], sourceIds: plan.sourceIds || [],
      verdict: 'insufficient', evidenceLevel: plan.evidenceLevel === 'supported' ? 'strong' : plan.evidenceLevel === 'limited' ? 'limited' : 'none',
      finding: [plan.summary || plan.headline, plan.limitation].filter(Boolean).join(' ') };
  });
};

export const composePropositionFindings = (items, excerpt = (value) => value) => {
  const explicit = items.filter((item) => item.explicit !== false);
  const reply = explicit.slice(0, 8).map((item) => `«${excerpt(item.text, 180)}»: ${item.finding || 'No hay evidencia revisada suficiente para confirmarla.'}`).join(' ');
  return explicit.length > 8 ? `${reply} Se muestran las primeras ocho partes; las demás están en el detalle.` : reply;
};

// Shared words such as “public” do not establish a measurement relationship.
// Evidence needs an explicit proposition link or that clause's own metric
// contract. A source about revenue cannot measure perceived service quality.
export const evidenceForProposition = (proposition, observations) => {
  const metricIds = preferredMetricIdsForQuery(proposition.text || '');
  return observations.filter((item) => (proposition.id && (item.propositionId === proposition.id || item.propositionIds?.includes(proposition.id)))
    || metricIds.has(item.metricId));
};

export const contextualPropositionEvidence = (proposition, observations, describe) => {
  const linked = evidenceForProposition(proposition, observations).slice(0, 24);
  const evidenceIds = linked.map((item) => item.id).filter(Boolean);
  if (!linked.length) return { ...proposition, evidenceIds, verdict: 'insufficient', evidenceLevel: 'none',
    finding: 'No hemos localizado una observación revisada que mida o documente exactamente esta parte de la afirmación.' };
  const evidenceText = linked.slice(0, 2).map(describe).filter(Boolean).join('; ');
  const text = String(proposition.text || '').toLocaleLowerCase('es');
  const ratioOnly = linked.some((item) => /^government_(?:revenue|expenditure)_ratio(?:_europe)?$/.test(item.metricId || ''))
    && !/\bpib\b|producto interior bruto|porcentaje de la economia/i.test(text);
  const boundary = ratioOnly
    ? 'Es una proporción del PIB; no mide directamente el total nominal recaudado o gastado.'
    : ['causal', 'predictive', 'normative', 'legal'].includes(proposition.type)
      ? 'Son datos relacionados y no demuestran por sí solos la relación, predicción o valoración propuesta.'
      : 'Estos datos aportan contexto, pero no demuestran por sí solos toda esta parte de la afirmación.';
  return { ...proposition, evidenceIds, verdict: 'insufficient', evidenceLevel: 'limited', finding: `Datos relacionados: ${evidenceText}. ${boundary}` };
};

export const comparableObservationGroups = (observations) => {
  const groups = new Map();
  for (const item of observations) {
    if (typeof item.value !== 'number' || !Number.isFinite(item.value)) continue;
    const key = JSON.stringify({ metricId: item.metricId || item.metric, geography: item.geography || '', population: item.population || '', denominator: item.denominator || '',
      unit: item.unit || '', dataKind: item.dataKind || 'observed', periodType: item.periodType || '',
      dimensions: Object.fromEntries(Object.entries(item.dimensions || {}).filter(([key]) => !['time', 'period', 'year'].includes(key)).sort(([a], [b]) => a.localeCompare(b))),
    });
    groups.set(key, [...(groups.get(key) || []), item]);
  }
  return [...groups.values()].map((items) => items.sort((a, b) => String(a.period).localeCompare(String(b.period))));
};
