import { createModelProvider } from './model-provider.mjs';
import { modelTaskSchemas } from './knowledge/model-task-contracts.mjs';

const parseJsonMessage = (response) => {
  const content = response?.message?.content ?? response?.content ?? response;
  const text = typeof content === 'string' ? content : JSON.stringify(content || '');
  const object = text.match(/\{[\s\S]*\}/)?.[0];
  try { return object ? JSON.parse(object) : null; } catch { return null; }
};

const task = (provider, request) => provider.generateStructured({ ...request, parse: parseJsonMessage });

export const createModelTasks = ({ provider, models = {}, keepAlive = 600 } = {}) => {
  const modelProvider = createModelProvider({ localProvider: provider });
  const model = models.router;
  return {
    understandClaim: (request) => task(modelProvider, { ...request, keepAlive, task: 'understandClaim', model }),
    rerankClaimCandidates: (request) => task(modelProvider, { ...request, keepAlive, schema: request.schema || modelTaskSchemas.rerankSchema, task: 'rerankClaimCandidates', model }),
    planResearch: (request) => task(modelProvider, { ...request, keepAlive, schema: request.schema || modelTaskSchemas.researchPlanSchema, task: 'planResearch', model }),
    extractSourceEvidence: (request) => task(modelProvider, { ...request, keepAlive, schema: request.schema || modelTaskSchemas.sourceEvidenceSchema, task: 'extractSourceEvidence', model }),
    compareEvidence: (request) => task(modelProvider, { ...request, keepAlive, schema: request.schema || modelTaskSchemas.evidenceComparisonSchema, task: 'compareEvidence', model }),
    composeGroundedAnswer: (request) => task(modelProvider, { ...request, keepAlive, task: 'composeGroundedAnswer', model }),
    chooseClarification: (request) => task(modelProvider, { ...request, keepAlive, schema: request.schema || modelTaskSchemas.clarificationSchema, task: 'chooseClarification', model }),
    generateEvaluationCandidates: (request) => task(modelProvider, { ...request, keepAlive, schema: request.schema || modelTaskSchemas.evaluationCandidatesSchema, task: 'generateEvaluationCandidates', model }),
    clusterKnowledgeGaps: (request) => task(modelProvider, { ...request, keepAlive, schema: request.schema || modelTaskSchemas.gapClusterSchema, task: 'clusterKnowledgeGaps', model }),
    embed: (request) => modelProvider.embed({ ...request, keepAlive, model: models.embedding }),
    inspectMedia: (request) => modelProvider.inspectMedia({ ...request, keepAlive, model: models.vision }),
    health: () => modelProvider.health(),
  };
};
