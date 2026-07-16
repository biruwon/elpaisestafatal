interface Env { LOCAL_CLASSIFIER_ENDPOINT?: string }
interface Context { request: Request; env: Env }

const unavailable = (): Response => Response.json({ status: 'unavailable' }, {
  headers: { 'Cache-Control': 'no-store' },
});

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  const endpoint = env.LOCAL_CLASSIFIER_ENDPOINT;
  const text = new URL(request.url).searchParams.get('text');
  if (!endpoint || !text) return unavailable();
  try {
    return await fetch(`${endpoint}/api/classify?text=${encodeURIComponent(text)}`);
  } catch { return unavailable(); }
};
