import registry from './measurement-definitions.generated.mjs';
import { asksForMeasurementMeaning } from './measurement-intent.mjs';
import { RUNTIME_VERSIONS } from './runtime-versions.mjs';

const normalize = (text) => String(text || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export const measurementMeaningPlan = (claim) => {
  if (!asksForMeasurementMeaning(claim)) return undefined;
  const text = ` ${normalize(claim)} `;
  const matches = Object.entries(registry).filter(([, metric]) => metric.definition?.sources?.length)
    .flatMap(([id, metric]) => metric.aliases.flatMap((alias) => {
      const term = ` ${normalize(alias)} `;
      const spans = [];
      for (let start = text.indexOf(term); start !== -1; start = text.indexOf(term, start + term.length - 1)) spans.push({ id, metric, start, end: start + term.length - 1 });
      return spans;
    })).sort((a, b) => (b.end - b.start) - (a.end - a.start));
  const selected = [];
  for (const item of matches) if (!selected.some((other) => item.start < other.end && item.end > other.start)) selected.push(item);
  const measurements = [...new Map(selected.sort((a, b) => a.start - b.start).map((item) => [item.id, item.metric])).values()].slice(0, 3);
  if (!measurements.length) return undefined;
  const sources = [...new Map(measurements.flatMap((metric) => metric.definition.sources).map((source) => [source.id, source])).values()];
  const headline = measurements.length > 1 ? 'Estas medidas usan poblaciones o denominadores diferentes' : `Qué mide ${measurements[0].definition.label.toLocaleLowerCase('es')}`;
  const explanation = (metric) => `${metric.definition.label}: ${metric.definition.explanation}`;
  const finding = (metric) => `${metric.definition.label}: ${metric.definition.explanation} Numerador: ${metric.definition.numerator}. Denominador: ${metric.definition.denominator}.`;
  const limitation = 'Esta explicación compara definiciones. No determina las tasas actuales ni permite comparar cifras sin el mismo periodo, territorio y grupo de edad.';
  const reply = `${measurements.map(explanation).join('\n\n')}\n\n${limitation}`;
  return {
    schemaVersion: '1', evidenceLevel: 'limited', claimType: 'definition', headline, summary: measurements.map(finding).join('\n\n'),
    blocks: [...measurements.map((metric, index) => ({ type: 'confirmed', propositionIds: [`definition-${index + 1}`], evidenceIds: metric.definition.sources.map((source) => source.id), points: [finding(metric)] })),
      { type: 'conversation_reply', evidenceIds: sources.map((source) => source.id), text: reply }],
    shareableReply: reply, shareableSourceIds: sources.map((source) => source.id),
    limitation, evidenceIds: sources.map((source) => source.id), sourceIds: sources.map((source) => source.id), sourceLinks: sources,
    knowledgeVersion: RUNTIME_VERSIONS.fallbackKnowledge,
  };
};
