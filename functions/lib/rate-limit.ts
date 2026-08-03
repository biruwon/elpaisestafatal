interface DatabaseStatement {
  bind(...values: unknown[]): DatabaseStatement;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

interface Database {
  prepare(query: string): DatabaseStatement;
}

type LocalWindow = { startedAt: number; count: number };

const localWindows = new Map<string, LocalWindow>();

const clientIdentity = (request: Request): string => {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return request.headers.get('cf-connecting-ip') || forwarded || 'anonymous';
};

const allowInMemory = (identity: string, scope: string, limit: number, windowMs: number, now: number): boolean => {
  const key = `${scope}:${identity}`;
  const current = localWindows.get(key);
  if (!current || now - current.startedAt >= windowMs) {
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
  const windowStart = Math.floor(now / windowMs) * windowMs;

  const database = (env as { DB?: Database }).DB;
  if (database) {
    try {
      const rows = await database.prepare(`
        INSERT INTO api_rate_limits (identity, window_start, request_count, updated_at)
        VALUES (?, ?, 1, ?)
        ON CONFLICT (identity, window_start)
        DO UPDATE SET request_count = request_count + 1, updated_at = excluded.updated_at
        RETURNING request_count
      `).bind(`${scope}:${identity}`, windowStart, new Date(now).toISOString()).all<{ request_count?: number }>();
      const count = Number(rows.results[0]?.request_count || 0);
      if (count > 0) return count <= limit;
    } catch {
      // The limiter must never turn an unavailable operational database into
      // a failure of the public deterministic claim path.
    }
  }

  return allowInMemory(identity, scope, limit, windowMs, now);
};
