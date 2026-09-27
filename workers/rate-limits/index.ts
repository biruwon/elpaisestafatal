interface RateLimitBinding { limit(options: { key: string }): Promise<{ success: boolean }> }
interface Env { CHECK_LIMITER: RateLimitBinding; QUESTIONS_LIMITER: RateLimitBinding }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const scope = new URL(request.url).pathname.split('/').filter(Boolean).at(-1);
    const limiter = scope === 'check' ? env.CHECK_LIMITER : scope === 'questions' ? env.QUESTIONS_LIMITER : undefined;
    const key = request.headers.get('x-rate-limit-key') || 'anonymous';
    if (request.method !== 'POST' || !limiter) return new Response(null, { status: 404 });
    const result = await limiter.limit({ key });
    return new Response(null, { status: result.success ? 204 : 429 });
  },
};
