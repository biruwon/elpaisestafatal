import { createModelProvider, createUnavailableModelProvider } from './model-provider.mjs';
import { createModelTasks } from './model-tasks.mjs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const calls = [];
const fake = {
  kind: 'fixture',
  generateStructured: async (request) => { calls.push(request); return { ok: true, task: request.task }; },
  embed: async (request) => ({ embeddings: [[0.1, 0.2]], request }),
  inspectMedia: async (request) => ({ content: 'fixture media text', request }),
  health: async () => ({ status: 'ready', provider: 'fixture' }),
};
const provider = createModelProvider({ localProvider: fake });
assert(provider.kind === 'fixture', 'Provider kind was not preserved');
assert(['generateStructured', 'embed', 'inspectMedia', 'health'].every((method) => typeof provider[method] === 'function'), 'Provider capability contract is incomplete');
const tasks = createModelTasks({ provider: fake, models: { router: 'router', embedding: 'embed', vision: 'vision' } });
for (const name of ['understandClaim', 'rerankClaimCandidates', 'planResearch', 'extractSourceEvidence', 'compareEvidence', 'composeGroundedAnswer', 'chooseClarification', 'generateEvaluationCandidates', 'clusterKnowledgeGaps', 'embed', 'inspectMedia', 'health']) assert(typeof tasks[name] === 'function', `Missing model task: ${name}`);
await tasks.understandClaim({ schema: { type: 'object' }, messages: [] });
await tasks.composeGroundedAnswer({ schema: { type: 'object' }, messages: [] });
assert(calls[0]?.task === 'understandClaim' && calls[1]?.task === 'composeGroundedAnswer', 'Domain task identity was not passed to the provider');
assert((await tasks.health()).status === 'ready', 'Provider health capability was not exposed');
const unavailable = createUnavailableModelProvider();
assert(unavailable.kind === 'unavailable', 'Unavailable provider does not fail closed');
console.log('Model provider contract valid: provider-neutral capabilities and domain task dispatch are available.');
