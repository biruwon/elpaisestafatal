const stringArray = (maxItems, maxLength = 240) => ({ type: 'array', maxItems, items: { type: 'string', maxLength } });

export const researchPlanSchema = {
  type: 'object', additionalProperties: false,
  required: ['propositions', 'metricCandidates', 'neutralQueries', 'requiredDimensions'],
  properties: {
    propositions: { type: 'array', maxItems: 6, items: { type: 'object', additionalProperties: false, required: ['id', 'evidenceNeeds'], properties: { id: { type: 'string', maxLength: 120 }, evidenceNeeds: stringArray(8, 80) } } },
    metricCandidates: stringArray(8, 120),
    neutralQueries: stringArray(3, 240),
    requiredDimensions: stringArray(8, 80),
  },
};

export const rerankSchema = {
  type: 'object', additionalProperties: false, required: ['selectedSlug', 'confidence', 'reason'],
  properties: { selectedSlug: { type: 'string', maxLength: 120 }, confidence: { type: 'number', minimum: 0, maximum: 1 }, reason: { type: 'string', maxLength: 300 } },
};

export const sourceEvidenceSchema = {
  type: 'object', additionalProperties: false,
  required: ['findings'],
  properties: {
    findings: { type: 'array', maxItems: 12, items: { type: 'object', additionalProperties: false, required: ['propositionId', 'sourceId', 'finding', 'support'], properties: { propositionId: { type: 'string', maxLength: 120 }, sourceId: { type: 'string', maxLength: 120 }, finding: { type: 'string', maxLength: 700 }, support: { type: 'string', enum: ['supports', 'contradicts', 'context', 'insufficient'] }, stage: { type: 'string', enum: ['report', 'complaint', 'investigation', 'charge', 'conviction'] }, quantities: { type: 'array', maxItems: 8, items: { type: 'object', additionalProperties: false, required: ['value', 'unit'], properties: { value: { type: 'string', maxLength: 80 }, unit: { type: 'string', maxLength: 80 } } } } } } },
  },
};

export const evidenceComparisonSchema = {
  type: 'object', additionalProperties: false,
  required: ['status', 'reason'],
  properties: { status: { type: 'string', enum: ['agrees', 'conflicts', 'syndicated', 'insufficient'] }, reason: { type: 'string', maxLength: 500 } },
};

export const clarificationSchema = {
  type: 'object', additionalProperties: false,
  required: ['question', 'reason'],
  properties: { question: { type: 'string', maxLength: 300 }, reason: { type: 'string', maxLength: 300 } },
};

export const evaluationCandidatesSchema = {
  type: 'object', additionalProperties: false,
  required: ['candidates'],
  properties: { candidates: { type: 'array', maxItems: 12, items: { type: 'object', additionalProperties: false, required: ['text', 'kind'], properties: { text: { type: 'string', maxLength: 300 }, kind: { type: 'string', enum: ['paraphrase', 'negative', 'reversed', 'scope_change', 'compound'] } } } } },
};

export const gapClusterSchema = {
  type: 'object', additionalProperties: false,
  required: ['canonicalProposition', 'semanticSignature', 'topicIds'],
  properties: { canonicalProposition: { type: 'string', maxLength: 300 }, semanticSignature: { type: 'string', maxLength: 600 }, topicIds: stringArray(8, 100) },
};

export const modelTaskSchemas = { researchPlanSchema, rerankSchema, sourceEvidenceSchema, evidenceComparisonSchema, clarificationSchema, evaluationCandidatesSchema, gapClusterSchema };
