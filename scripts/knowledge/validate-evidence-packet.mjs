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
  observations: [{ id: 'e1', metric: 'Población', value: 49128297, unit: 'Number', period: '2025', excerpt: 'La población residente se situó en el último periodo publicado.', source: { title: 'Fuente oficial', publisher: 'Instituto oficial', role: 'primary', url: 'https://example.test/data' } }],
});
if (!validateEvidencePacket(packet).ok) throw new Error('valid evidence packet was rejected');
if (packet.evidence[0].excerpt !== 'La población residente se situó en el último periodo publicado.') throw new Error('source excerpt was not preserved in the packet');
const upgraded = applySafePlanUpgrade(basePlan, {
  headline: 'La cifra es una aproximación',
  directAnswer: 'La cifra puede ser aproximada; hay que citar el periodo.',
  factualClaims: [{ text: 'La cifra puede ser aproximada.', evidenceIds: ['e1'] }],
  limitations: ['La comparación sigue siendo provisional.'],
  followUps: ['¿Qué periodo y población estás usando?'],
}, packet);
if (upgraded.headline === basePlan.headline || upgraded.blocks[1].text === basePlan.blocks[1].text) throw new Error('valid planner upgrade was not applied');
const inventedNumber = applySafePlanUpgrade(basePlan, {
  headline: 'Hay 100 millones de habitantes',
  directAnswer: 'La fuente confirma 100 millones.',
  factualClaims: [{ text: 'La fuente confirma 100 millones.', evidenceIds: ['e1'] }],
  limitations: ['La cifra es provisional.'],
  followUps: ['¿Qué periodo usas?'],
}, packet);
if (inventedNumber !== basePlan) throw new Error('planner accepted an unsupported number');
const inventedEvidence = applySafePlanUpgrade(basePlan, {
  headline: 'Respuesta inventada',
  directAnswer: 'La fuente lo confirma.',
  factualClaims: [{ text: 'La fuente lo confirma.', evidenceIds: ['invented-evidence'] }],
  limitations: ['La evidencia es limitada.'],
  followUps: ['¿Qué periodo quieres revisar?'],
}, packet);
if (inventedEvidence !== basePlan) throw new Error('planner accepted an evidence ID outside the packet');
const broken = buildEvidencePacket({ text: 'dato', compiler: {}, handlerId: 'quantity', plan: { ...basePlan, evidenceIds: [], blocks: [{ type: 'key_number', evidenceId: 'missing', value: '1', label: 'x' }] }, observations: [] });
if (validateEvidencePacket(broken).ok) throw new Error('packet accepted an untraceable evidence reference');
const oversizedExcerpt = buildEvidencePacket({ text: 'dato', compiler: {}, handlerId: 'quantity', plan: basePlan, observations: [{ id: 'e2', metric: 'x', excerpt: 'x'.repeat(701) }] });
if (oversizedExcerpt.evidence[0].excerpt.length !== 700) throw new Error('source excerpt was not bounded');
console.log('Evidence packet validation passed: planner upgrades are bounded by evidence and numbers.');
