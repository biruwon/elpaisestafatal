interface Env { LOCAL_CLASSIFIER_ENDPOINT?: string; LOCAL_CLASSIFIER_TOKEN?: string }
interface Context { request: Request; env: Env; params: { requestId: string } }

export const onRequestGet = async ({ env, params }: Context): Promise<Response> => {
  if (!env.LOCAL_CLASSIFIER_ENDPOINT) return Response.json({ status: 'unavailable' }, { headers: { 'Cache-Control': 'no-store' } });
  try {
    const headers = new Headers();
    if (env.LOCAL_CLASSIFIER_TOKEN) headers.set('authorization', `Bearer ${env.LOCAL_CLASSIFIER_TOKEN}`);
    const response = await fetch(`${env.LOCAL_CLASSIFIER_ENDPOINT}/v1/resolve/${encodeURIComponent(params.requestId)}`, {
      headers,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return Response.json({ status: 'unavailable' }, { headers: { 'Cache-Control': 'no-store' } });
    return new Response(response.body, { status: response.status, headers: { 'content-type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ status: 'unavailable' }, { headers: { 'Cache-Control': 'no-store' } });
  }
};
