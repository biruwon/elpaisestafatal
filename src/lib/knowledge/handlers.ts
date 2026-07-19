import type { ClaimType } from './contracts';

export type HandlerId =
  | 'quantity'
  | 'trend'
  | 'ranking'
  | 'definition'
  | 'budget_transfer'
  | 'legal_rule'
  | 'group_comparison'
  | 'causal'
  | 'prediction'
  | 'normative';

export type HandlerDefinition = {
  id: HandlerId;
  claimTypes: ClaimType[];
  requiredFields: string[];
  preferredSources: string[];
  visual: 'key_number' | 'line_chart' | 'bar_chart' | 'money_flow' | 'decision_tree' | 'comparison_chart' | 'evidence_ladder' | 'trade_offs';
  rules: string[];
};

export const handlerRegistry: HandlerDefinition[] = [
  { id: 'quantity', claimTypes: ['descriptive', 'mixed'], requiredFields: ['metric', 'value', 'unit', 'period'], preferredSources: ['ine', 'official-ministry', 'eurostat'], visual: 'key_number', rules: ['A number must retain its unit, period, geography, and population.'] },
  { id: 'trend', claimTypes: ['descriptive', 'comparative', 'mixed'], requiredFields: ['metric', 'period'], preferredSources: ['ine', 'eurostat', 'official-ministry'], visual: 'line_chart', rules: ['Do not compare periods across a methodology break without displaying it.'] },
  { id: 'ranking', claimTypes: ['comparative', 'mixed'], requiredFields: ['metric', 'period', 'comparisonSet'], preferredSources: ['eurostat', 'ine', 'official-ministry'], visual: 'bar_chart', rules: ['Use one definition and one period for every ranked observation.'] },
  { id: 'definition', claimTypes: ['descriptive', 'legal', 'mixed'], requiredFields: ['term', 'definition'], preferredSources: ['boe', 'ine', 'official-ministry'], visual: 'evidence_ladder', rules: ['Do not treat two similarly named measurements as equivalent.'] },
  { id: 'budget_transfer', claimTypes: ['descriptive', 'mixed'], requiredFields: ['amount', 'originEntity', 'destinationEntity', 'purpose'], preferredSources: ['boe', 'council-of-ministers', 'finance'], visual: 'money_flow', rules: ['A credit transfer does not prove a service cut without the affected programme and execution impact.'] },
  { id: 'legal_rule', claimTypes: ['legal', 'mixed'], requiredFields: ['jurisdiction', 'scenario', 'effectiveDate'], preferredSources: ['boe', 'judicial'], visual: 'decision_tree', rules: ['Resolve the legal scenario and effective date before summarising a rule.'] },
  { id: 'group_comparison', claimTypes: ['comparative', 'mixed'], requiredFields: ['groups', 'metric', 'population', 'period'], preferredSources: ['ine', 'official-ministry', 'eurostat'], visual: 'comparison_chart', rules: ['Arrests, convictions, beneficiaries, residents, and workers are different populations.'] },
  { id: 'causal', claimTypes: ['causal', 'mixed'], requiredFields: ['cause', 'effect', 'period', 'geography'], preferredSources: ['academic', 'official-statistics', 'official-report'], visual: 'evidence_ladder', rules: ['Correlation, co-occurrence, and a plausible mechanism do not by themselves establish causation.'] },
  { id: 'prediction', claimTypes: ['predictive', 'mixed'], requiredFields: ['outcome', 'deadline', 'indicator'], preferredSources: ['official-statistics', 'academic'], visual: 'line_chart', rules: ['Return assumptions and a measurable follow-up rather than a present true/false verdict.'] },
  { id: 'normative', claimTypes: ['normative', 'mixed'], requiredFields: ['policyChoice', 'affectedGroups'], preferredSources: ['legal', 'official-statistics', 'academic'], visual: 'trade_offs', rules: ['Evidence can show consequences and rules; it cannot settle a value priority.'] },
];

export const handlerFor = (type: ClaimType, preferred?: HandlerId): HandlerDefinition => {
  if (preferred) {
    const explicit = handlerRegistry.find((handler) => handler.id === preferred);
    if (explicit) return explicit;
  }
  return handlerRegistry.find((handler) => handler.claimTypes.includes(type)) || handlerRegistry[0];
};
