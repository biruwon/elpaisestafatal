import { handlerForInput } from './handlers.mjs';

const required = [
  'trend',
  'ranking',
  'group_comparison',
  'proportion',
  'quantity',
  'budget_transfer',
  'legal_rule',
  'causal',
  'prediction',
  'normative',
];

const probes = {
  trend: 'La delincuencia sube cada vez más',
  ranking: 'España cobra más impuestos que Europa',
  group_comparison: 'Los inmigrantes reciben más ayudas',
  proportion: 'La mayoría de la población vive en ciudades',
  quantity: 'Todos los políticos son corruptos',
  budget_transfer: 'El Gobierno transfiere 310 millones del presupuesto',
  legal_rule: 'La ley permite desalojar al ocupante',
  causal: 'Los pisos turísticos causan la crisis',
  prediction: 'La vivienda caerá como en 2008',
  normative: 'Los españoles deberían tener prioridad',
};
if (handlerForInput('La información pública se puede reutilizar sin condiciones', 'descriptive') !== 'legal_rule') throw new Error('Public-information reuse claims must use legal guidance');
if (handlerForInput(probes.group_comparison, 'comparative') !== 'group_comparison') throw new Error('Comparative group claims must remain group comparisons');
if (handlerForInput('La vivienda acabará cayendo como en 2008', 'mixed') !== 'prediction') throw new Error('Forecast wording must remain a prediction');
if (handlerForInput({ retrievalHints: ['España está destruida'], impliedPropositions: [{ type: 'definition', explicit: false }] }, 'descriptive') !== 'definition') throw new Error('Broad evaluative claims must use definition guidance');

const expected = { ...Object.fromEntries(required.map((handler) => [handler, handler])), quantity: 'quantity' };
const failures = required.filter((handler) => handlerForInput(probes[handler], handler) !== expected[handler]);
if (failures.length) throw new Error(`Handler probes failed: ${failures.join(', ')}`);
console.log(`Validated ${required.length} claim-handler probes.`);
