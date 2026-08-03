const defaultLocalHosts = new Set(['127.0.0.1', 'localhost', '::1', 'host.docker.internal']);

const requestJson = async ({ endpoint, path, method = 'POST', body, timeout, allowedHosts, isDisabled, disable }) => {
  const host = new URL(endpoint).hostname;
  if (!allowedHosts.has(host)) throw new Error('Inference endpoint is not local');
  if (isDisabled()) throw new Error('Local inference temporarily unavailable');
  try {
    const response = await fetch(`${endpoint}${path}`, {
      method,
      ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok) throw new Error(`Inference request failed: ${response.status} ${String(await response.text()).slice(0, 240)}`);
    return response.json();
  } catch (error) {
    if (path !== '/api/embed') disable();
    throw error;
  }
};

export const createUnavailableInferenceProvider = () => ({
  kind: 'unavailable',
  chat: async () => { throw new Error('Inference provider unavailable'); },
  embed: async () => { throw new Error('Inference provider unavailable'); },
  listModels: async () => { throw new Error('Inference provider unavailable'); },
});

export const createLocalInferenceProvider = ({ endpoint, allowedHosts = defaultLocalHosts, isDisabled = () => false, disable = () => {} } = {}) => {
  let parsedEndpoint;
  try { parsedEndpoint = new URL(endpoint); } catch { return createUnavailableInferenceProvider(); }
  if (!allowedHosts.has(parsedEndpoint.hostname)) return createUnavailableInferenceProvider();
  return {
    kind: 'local',
    chat: (body, timeout = 5000) => requestJson({ endpoint: parsedEndpoint.toString().replace(/\/$/, ''), path: '/api/chat', body, timeout, allowedHosts, isDisabled, disable }),
    embed: (body, timeout = 5000) => requestJson({ endpoint: parsedEndpoint.toString().replace(/\/$/, ''), path: '/api/embed', body, timeout, allowedHosts, isDisabled, disable }),
    listModels: (timeout = 5000) => requestJson({ endpoint: parsedEndpoint.toString().replace(/\/$/, ''), path: '/api/tags', method: 'GET', timeout, allowedHosts, isDisabled, disable }),
  };
};
