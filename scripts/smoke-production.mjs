const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8788';
const checks = [
  { text: 'España supera los 49 millones de residentes.', inputType: 'text' },
  { text: 'España va fatal', inputType: 'text' },
];
const failures = [];
for (const input of checks) {
  try {
    const response = await fetch(`${base}/api/check`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(5000),
    });
    const body = await response.json().catch(() => undefined);
    if (![200, 202, 400, 429].includes(response.status)) failures.push(`unexpected HTTP status ${response.status}`);
    if (!body || typeof body.id !== 'string' || !['clarification', 'reviewed', 'provisional', 'unresolved', 'processing', 'unavailable'].includes(body.state)) failures.push('response does not match the current check contract');
    if (body?.state === 'reviewed' && (!body.result?.canonicalHref || !Array.isArray(body.result?.sources) || body.result.sources.length === 0)) failures.push('reviewed response has no canonical URL or sources');
    if (body && /ollama|127\.0\.0\.1|localhost|cloudflare.*token/i.test(JSON.stringify(body))) failures.push('response leaked implementation details');
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Production smoke passed: ${checks.length} unified /api/check requests.`);
