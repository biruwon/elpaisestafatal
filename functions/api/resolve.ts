interface Env { LOCAL_CLASSIFIER_ENDPOINT?: string }
interface Context { request: Request; env: Env }

const json = (body: unknown, status = 200): Response => Response.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store' },
});

const requestBody = async (request: Request): Promise<{ text: string; inputType: string }> => {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const value = await request.json() as { text?: unknown; inputType?: unknown };
    return { text: typeof value.text === 'string' ? value.text.trim() : '', inputType: typeof value.inputType === 'string' ? value.inputType : 'text' };
  }
  const form = await request.formData();
  return { text: String(form.get('text') || '').trim(), inputType: String(form.get('inputType') || 'text') };
};

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  const body = await requestBody(request);
  if (!body.text || body.text.length > 12000) return json({ status: 'uncovered', relatedClaims: [] }, 400);
  if (!env.LOCAL_CLASSIFIER_ENDPOINT) return json({ status: 'unavailable', relatedClaims: [] });
  try {
    const response = await fetch(`${env.LOCAL_CLASSIFIER_ENDPOINT}/v1/resolve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return json({ status: 'unavailable', relatedClaims: [] });
    return new Response(response.body, { status: response.status, headers: { 'content-type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return json({ status: 'unavailable', relatedClaims: [] });
  }
};
