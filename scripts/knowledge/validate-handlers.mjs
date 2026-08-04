import { handlerForInput } from './handlers.mjs';

const required = [
  'trend',
  'ranking',
  'group_comparison',
  'proportion',
  'quantity',
  'budget_transfer',
  'government_event',
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
  quantity: 'Hay 500 mil viviendas vacías',
  budget_transfer: 'El Gobierno transfiere 310 millones del presupuesto',
  government_event: 'El Ministerio de Sanidad aprueba una ayuda para municipios',
  legal_rule: 'La ley permite desalojar al ocupante',
  causal: 'Los pisos turísticos causan la crisis',
  prediction: 'La vivienda caerá como en 2008',
  normative: 'Los españoles deberían tener prioridad',
};
if (handlerForInput('La información pública se puede reutilizar sin condiciones', 'descriptive') !== 'legal_rule') throw new Error('Public-information reuse claims must use legal guidance');
if (handlerForInput(probes.government_event, 'descriptive') !== 'government_event') throw new Error('Official government events must use event guidance');
for (const wording of [
  'Bolaños se lleva 310 millones de Educación',
  'Educación pierde 310 millones para Presidencia',
  'El Gobierno mueve dinero de educación para pagar nóminas en presidencia',
]) {
  if (handlerForInput(wording, 'descriptive') !== 'budget_transfer') throw new Error(`Budget event wording was not routed: ${wording}`);
}
if (handlerForInput(probes.group_comparison, 'comparative') !== 'group_comparison') throw new Error('Comparative group claims must remain group comparisons');
for (const wording of ['Uno de cada tres jóvenes está en paro', 'La mitad de los hogares llega justo a fin de mes']) {
  if (handlerForInput(wording, 'descriptive') !== 'proportion') throw new Error(`Natural fraction wording was not routed as a proportion: ${wording}`);
}
if (handlerForInput('Por cada diez hogares, tres tienen dificultades para llegar a fin de mes', 'descriptive') !== 'proportion') throw new Error('Ratio wording was not routed as a proportion');
for (const wording of ['Todos los políticos son corruptos', 'Nadie encuentra vivienda asequible']) {
  if (handlerForInput(wording, 'descriptive') !== (wording.startsWith('Todos') ? 'group_comparison' : 'proportion')) throw new Error(`Absolute quantifier wording was not routed safely: ${wording}`);
}
for (const wording of ['Los marroquíes reciben más ayudas que los españoles', 'Los rumanos delinquen más que los españoles']) {
  if (handlerForInput(wording, 'comparative') !== 'group_comparison') throw new Error(`Named demographic group was not routed as group comparison: ${wording}`);
}
if (handlerForInput('La vivienda acabará cayendo como en 2008', 'mixed') !== 'prediction') throw new Error('Forecast wording must remain a prediction');
if (handlerForInput({ retrievalHints: ['España está destruida'], impliedPropositions: [{ type: 'definition', explicit: false }] }, 'descriptive') !== 'definition') throw new Error('Broad evaluative claims must use definition guidance');

const expected = { ...Object.fromEntries(required.map((handler) => [handler, handler])), quantity: 'quantity' };
const failures = required.filter((handler) => handlerForInput(probes[handler], handler) !== expected[handler]);
if (failures.length) throw new Error(`Handler probes failed: ${failures.join(', ')}`);
console.log(`Validated ${required.length} claim-handler probes.`);
