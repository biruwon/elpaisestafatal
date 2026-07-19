import { applySafePlanUpgrade, buildEvidencePacket, validateEvidencePacket } from './evidence-packet.mjs';

const basePlan = {
  schemaVersion: '1',
  headline: 'La cifra necesita contexto',
  summary: 'La observación sirve para comparar la afirmación.',
  coverage: 'qualified',
  claimType: 'descriptive',
  blocks: [
    { type: 'key_number', evidenceId: 'e1', label: 'Población', value: '49128297' },
    { type: 'conversation_reply', evidenceIds: ['e1'], text: 'La cifra debe citar el periodo.' },
  ],
  clarificationQuestion: '¿Qué periodo estás usando?',
  limitation: 'La definición y el periodo pueden cambiar la comparación.',
  evidenceIds: ['e1'],
  sourceIds: ['s1'],
  sourceLinks: [{ id: 's1', title: 'Fuente oficial', url: 'https://example.test/data' }],
  knowledgeVersion: 'test',
};
const packet = buildEvidencePacket({
  text: 'España tiene 48 millones de habitantes',
  compiler: { claimType: 'descriptive', propositions: [{ text: 'España tiene 48 millones de habitantes', type: 'descriptive', explicit: true }] },
  handlerId: 'quantity',
  plan: basePlan,
  observations: [{ id: 'e1', metric: 'Población', value: 49128297, unit: 'Number', period: '2025', source: { title: 'Fuente oficial', url: 'https://example.test/data' } }],
});
if (!validateEvidencePacket(packet).ok) throw new Error('valid evidence packet was rejected');
const upgraded = applySafePlanUpgrade(basePlan, {
  headline: 'La cifra es una aproximación',
  summary: 'La serie localizada permite comparar la cifra con el último periodo.',
  clarificationQuestion: '¿Qué periodo y población estás usando?',
  limitation: 'La comparación sigue siendo provisional.',
  replyText: 'La cifra puede ser aproximada; hay que citar el periodo.',
}, packet);
if (upgraded.headline === basePlan.headline || upgraded.blocks[1].text === basePlan.blocks[1].text) throw new Error('valid planner upgrade was not applied');
const inventedNumber = applySafePlanUpgrade(basePlan, {
  headline: 'Hay 100 millones de habitantes',
  summary: 'La fuente demuestra 100 millones.',
  clarificationQuestion: '¿Qué periodo usas?',
  limitation: 'La cifra es provisional.',
  replyText: 'La fuente confirma 100 millones.',
}, packet);
if (inventedNumber !== basePlan) throw new Error('planner accepted an unsupported number');
const broken = buildEvidencePacket({ text: 'dato', compiler: {}, handlerId: 'quantity', plan: { ...basePlan, evidenceIds: [], blocks: [{ type: 'key_number', evidenceId: 'missing', value: '1', label: 'x' }] }, observations: [] });
if (validateEvidencePacket(broken).ok) throw new Error('packet accepted an untraceable evidence reference');
console.log('Evidence packet validation passed: planner upgrades are bounded by evidence and numbers.');
