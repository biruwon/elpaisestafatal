interface Env { LOCAL_CLASSIFIER_ENDPOINT?: string }
interface Context { request: Request; env: Env }

const json = (body: unknown, status = 200): Response => Response.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store' },
});

const requestBody = async (request: Request): Promise<{ text: string; inputType: string; file?: File }> => {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const value = await request.json() as { text?: unknown; inputType?: unknown };
    return { text: typeof value.text === 'string' ? value.text.trim() : '', inputType: typeof value.inputType === 'string' ? value.inputType : 'text' };
  }
  const form = await request.formData();
  const candidate = form.get('file');
  return {
    text: String(form.get('text') || '').trim(),
    inputType: String(form.get('inputType') || 'text'),
    file: candidate instanceof File ? candidate : undefined,
  };
};

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  const body = await requestBody(request);
  if ((!body.text && !body.file) || body.text.length > 12000) return json({ status: 'uncovered', relatedClaims: [] }, 400);
  if (!env.LOCAL_CLASSIFIER_ENDPOINT) return json({ status: 'unavailable', relatedClaims: [] });
  try {
    const isMultipart = Boolean(body.file);
    const payload = isMultipart ? (() => {
      const form = new FormData();
      form.set('text', body.text);
      form.set('inputType', body.inputType);
      if (body.file) form.set('file', body.file, body.file.name || 'upload');
      return form;
    })() : JSON.stringify({ text: body.text, inputType: body.inputType });
    const response = await fetch(`${env.LOCAL_CLASSIFIER_ENDPOINT}/v1/resolve`, {
      method: 'POST',
      headers: isMultipart ? undefined : { 'content-type': 'application/json' },
      body: payload,
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return json({ status: 'unavailable', relatedClaims: [] });
    return new Response(response.body, { status: response.status, headers: { 'content-type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return json({ status: 'unavailable', relatedClaims: [] });
  }
};
