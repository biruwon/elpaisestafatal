type LocalWindow = { startedAt: number; count: number };
interface RateLimitService { fetch(request: Request): Promise<Response> }
interface Env { RATE_LIMITER?: RateLimitService }

const localWindows = new Map<string, LocalWindow>();

const clientIdentity = (request: Request): string => request.headers.get('cf-connecting-ip')
  || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  || 'anonymous';

const allowInMemory = (identity: string, scope: string, limit: number, windowMs: number, now: number): boolean => {
  const key = `${scope}:${identity}`;
  const current = localWindows.get(key);
  if (!current || now - current.startedAt >= windowMs) {
    if (!current && localWindows.size >= 10_000) {
      for (const [expiredKey, window] of localWindows) {
        if (now - window.startedAt >= windowMs) localWindows.delete(expiredKey);
        if (localWindows.size < 8_000) break;
      }
      if (localWindows.size >= 10_000) localWindows.delete(localWindows.keys().next().value || '');
    }
    localWindows.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
};

export const allowRateLimitedRequest = async (
  request: Request,
  env: object,
  { scope, limit, windowMs = 60_000 }: { scope: string; limit: number; windowMs?: number },
): Promise<boolean> => {
  const identity = clientIdentity(request);
  const now = Date.now();
  const binding = (env as Env).RATE_LIMITER;
  if (binding) {
    try {
      const response = await binding.fetch(new Request(`https://rate-limiter.internal/${encodeURIComponent(scope)}`, {
        method: 'POST',
        headers: { 'x-rate-limit-key': identity },
      }));
      if (response.status === 204) return true;
      if (response.status === 429) return false;
    } catch {
      // Rate limiting is an abuse control; service binding failure must not
      // turn the public deterministic claim path into an outage.
    }
  }

  return allowInMemory(identity, scope, limit, windowMs, now);
};
