const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8788';
const checks = [
  { text: 'España supera los 49 millones de residentes.', inputType: 'text', state: 'supported' },
  { text: 'No hay trabajo', inputType: 'text', states: ['clarification', 'supported', 'limited', 'insufficient', 'processing'] },
  { text: 'España va fatal', inputType: 'text', states: ['supported', 'limited', 'insufficient', 'processing'] },
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
    if (!body || typeof body.id !== 'string' || !['clarification', 'supported', 'limited', 'insufficient', 'processing', 'unavailable'].includes(body.state)) failures.push('response does not match the current check contract');
    if (input.states && !input.states.includes(body?.state)) failures.push(`${input.text}: expected one of ${input.states.join(', ')}, received ${body?.state}`);
    if (body?.state === 'clarification' && (!body.question || !Array.isArray(body.options) || body.options.length < 2)) failures.push(`${input.text}: clarification did not expose concrete options`);
    if (body?.state === 'supported' && (!body.result?.evidenceLevel || !body.result?.reply)) failures.push('supported response has no evidence level or reply');
    if (body && /ollama|127\.0\.0\.1|localhost|cloudflare.*token/i.test(JSON.stringify(body))) failures.push('response leaked implementation details');
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Production smoke passed: ${checks.length} unified /api/check requests.`);
