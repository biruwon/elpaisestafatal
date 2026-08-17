/**
 * Provider-neutral model contract.
 * Application code should depend on these capabilities, never on Ollama's
 * wire format. A hosted provider can implement the same methods later.
 */
export const createModelProvider = ({ localProvider, unavailableProvider = undefined } = {}) => {
  const provider = localProvider || unavailableProvider;
  if (!provider) throw new Error('A model provider is required');
  return {
    kind: provider.kind || 'unknown',
    generateStructured: async (request) => {
      if (typeof provider.generateStructured === 'function') return provider.generateStructured(request);
      if (typeof provider.chat !== 'function') throw new Error('Provider does not support structured generation');
      const response = await provider.chat({
        model: request.model,
        stream: false,
        think: false,
        format: request.schema,
        keep_alive: request.keepAlive ?? -1,
        options: request.options,
        messages: request.messages,
      }, request.timeoutMs);
      return request.parse ? request.parse(response) : response;
    },
    embed: async (request) => {
      if (typeof provider.embed !== 'function') throw new Error('Provider does not support embeddings');
      return provider.embed({ model: request.model, input: request.input, keep_alive: request.keepAlive ?? -1 }, request.timeoutMs);
    },
    inspectMedia: async (request) => {
      if (typeof provider.inspectMedia === 'function') return provider.inspectMedia(request);
      if (typeof provider.chat !== 'function') throw new Error('Provider does not support media inspection');
      return provider.chat({
        model: request.model,
        stream: false,
        think: false,
        keep_alive: request.keepAlive ?? -1,
        options: request.options,
        messages: request.messages,
      }, request.timeoutMs);
    },
    health: async () => {
      if (typeof provider.health === 'function') return provider.health();
      if (typeof provider.listModels !== 'function') return { status: 'unknown', provider: provider.kind || 'unknown' };
      try {
        const inventory = await provider.listModels(3000);
        return { status: 'ready', provider: provider.kind || 'unknown', models: inventory.models || [] };
      } catch (error) {
        return { status: 'unavailable', provider: provider.kind || 'unknown', error: error instanceof Error ? error.message : String(error) };
      }
    },
  };
};

export const createUnavailableModelProvider = () => createModelProvider({ unavailableProvider: {
  kind: 'unavailable',
  chat: async () => { throw new Error('Inference provider unavailable'); },
  embed: async () => { throw new Error('Inference provider unavailable'); },
  listModels: async () => { throw new Error('Inference provider unavailable'); },
} });
