import { modelTaskSchemas } from './knowledge/model-task-contracts.mjs';

const required = {
  researchPlanSchema: ['propositions', 'metricCandidates', 'neutralQueries', 'requiredDimensions'],
  rerankSchema: ['selectedSlug', 'confidence', 'reason'],
  sourceEvidenceSchema: ['findings'],
  evidenceComparisonSchema: ['status', 'reason'],
  clarificationSchema: ['question', 'reason'],
  evaluationCandidatesSchema: ['candidates'],
  gapClusterSchema: ['canonicalProposition', 'semanticSignature', 'topicIds'],
};
for (const [name, fields] of Object.entries(required)) {
  const schema = modelTaskSchemas[name];
  if (!schema || schema.additionalProperties !== false || fields.some((field) => !schema.required.includes(field))) throw new Error(`${name} is not a closed structured task contract`);
}
console.log(`Model task contracts valid: ${Object.keys(modelTaskSchemas).length} provider-neutral tasks have bounded schemas.`);
