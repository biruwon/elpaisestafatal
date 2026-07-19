const numberPattern = /\b\d[\d.,%]*\b/g;

const boundedString = (value, maximum) => typeof value === 'string' ? value.trim().slice(0, maximum) : '';

const numberKey = (value) => String(value || '').replace(/[^0-9]/g, '');

const numberVariants = (value) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return [];
  const number = Number(value);
  return [...new Set([
    String(value),
    String(number),
    number.toLocaleString('es-ES'),
    number.toLocaleString('en-US'),
  ])].map(numberKey).filter(Boolean);
};

export const buildEvidencePacket = ({ text, compiler, handlerId, plan, observations = [] }) => {
  const evidence = observations.slice(0, 12).map((item) => ({
    id: boundedString(item.id, 180),
    metric: boundedString(item.metric || item.datasetId, 180),
    value: typeof item.value === 'number' && Number.isFinite(item.value) ? item.value : null,
    unit: boundedString(item.unit, 100),
    period: boundedString(item.period, 80),
    dimensions: item.dimensions && typeof item.dimensions === 'object' ? item.dimensions : {},
    dimensionLabels: item.dimensionLabels && typeof item.dimensionLabels === 'object' ? item.dimensionLabels : {},
    source: item.source?.url ? { title: boundedString(item.source.title, 180), url: item.source.url } : undefined,
  })).filter((item) => item.id);
  return {
    schemaVersion: '1',
    input: boundedString(text, 1200),
    claimType: boundedString(compiler?.claimType || 'mixed', 40),
    handlerId: boundedString(handlerId, 40),
    propositions: Array.isArray(compiler?.propositions) ? compiler.propositions.slice(0, 6).map((item) => ({
      text: boundedString(item.text, 300),
      type: boundedString(item.type, 40),
      explicit: item.explicit !== false,
    })) : [],
    deterministicPlan: {
      headline: boundedString(plan?.headline, 300),
      summary: boundedString(plan?.summary, 700),
      coverage: boundedString(plan?.coverage, 40),
      clarificationQuestion: boundedString(plan?.clarificationQuestion, 300),
      limitation: boundedString(plan?.limitation, 500),
      blocks: Array.isArray(plan?.blocks) ? plan.blocks.map((block) => ({ type: block.type, evidenceIds: block.evidenceIds || (block.evidenceId ? [block.evidenceId] : []) })) : [],
    },
    evidence,
    sourceLinks: Array.isArray(plan?.sourceLinks) ? plan.sourceLinks.slice(0, 5).map((source) => ({ title: boundedString(source.title, 180), url: source.url })) : [],
  };
};

export const validateEvidencePacket = (packet) => {
  if (!packet || packet.schemaVersion !== '1' || typeof packet.input !== 'string' || typeof packet.handlerId !== 'string') return { ok: false, errors: ['invalid packet header'] };
  if (!Array.isArray(packet.evidence) || !Array.isArray(packet.sourceLinks)) return { ok: false, errors: ['packet evidence or sources are not arrays'] };
  const ids = new Set(packet.evidence.map((item) => item.id));
  const errors = [];
  for (const item of packet.evidence) {
    if (!item.id || typeof item.metric !== 'string') errors.push('evidence item is missing identity');
    if (item.source && !/^https:\/\//i.test(item.source.url || '')) errors.push(`evidence ${item.id} has an unattributable source`);
  }
  for (const block of packet.deterministicPlan?.blocks || []) for (const id of block.evidenceIds || []) if (!ids.has(id)) errors.push(`plan references evidence outside packet: ${id}`);
  return { ok: errors.length === 0, errors };
};

const packetNumberKeys = (packet) => {
  const values = [
    ...(packet.evidence || []).map((item) => item.value),
    ...(packet.propositions || []).map((item) => item.text),
    packet.input,
    ...(packet.evidence || []).map((item) => item.period),
  ];
  return new Set(values.flatMap((value) => {
    if (typeof value === 'number') return numberVariants(value);
    return String(value || '').match(numberPattern)?.map(numberKey) || [];
  }).filter(Boolean));
};

const hasOnlyPacketNumbers = (text, packet) => {
  const allowed = packetNumberKeys(packet);
  return (String(text || '').match(numberPattern) || []).every((value) => allowed.has(numberKey(value)));
};

const safeCopy = (value, maximum, packet) => {
  const text = boundedString(value, maximum);
  return text && hasOnlyPacketNumbers(text, packet) ? text : '';
};

export const plannerSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'summary', 'clarificationQuestion', 'limitation', 'replyText'],
  properties: {
    headline: { type: 'string' },
    summary: { type: 'string' },
    clarificationQuestion: { type: 'string' },
    limitation: { type: 'string' },
    replyText: { type: 'string' },
  },
};

export const applySafePlanUpgrade = (plan, draft, packet) => {
  if (validateEvidencePacket(packet).ok !== true || !draft || typeof draft !== 'object') return plan;
  const headline = safeCopy(draft.headline, 300, packet);
  const summary = safeCopy(draft.summary, 700, packet);
  const clarificationQuestion = safeCopy(draft.clarificationQuestion, 300, packet);
  const limitation = safeCopy(draft.limitation, 500, packet);
  const replyText = safeCopy(draft.replyText, 700, packet);
  if (!headline || !summary || !clarificationQuestion || !limitation || !replyText) return plan;
  const blocks = plan.blocks.map((block) => block.type === 'conversation_reply' ? { ...block, text: replyText } : block);
  return { ...plan, headline, summary, clarificationQuestion, limitation, blocks };
};
