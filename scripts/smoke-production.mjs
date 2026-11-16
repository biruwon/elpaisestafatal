const base = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8788').replace(/\/$/, '');
const requireTerminal = process.env.SMOKE_REQUIRE_TERMINAL === '1';
const checks = [
  { text: 'España supera los 49 millones de residentes.', inputType: 'text', state: 'supported' },
  { text: 'No hay trabajo', inputType: 'text', states: ['clarification', 'supported', 'limited', 'insufficient', 'processing'] },
  { text: 'Las cifras de crecimiento del PIB no reflejan cómo vive el hogar medio', inputType: 'text', states: ['limited', 'insufficient', 'processing'] },
  { text: 'Un título universitario ya no garantiza encontrar un empleo cualificado', inputType: 'text', states: ['insufficient', 'limited', 'processing'] },
  { text: 'El turismo aumenta el PIB pero genera menos salarios altos que sectores de mayor productividad', inputType: 'text', states: ['insufficient', 'limited', 'processing'] },
  { text: 'Los jóvenes actuales pagarán pensiones durante décadas pero cobrarán una pensión relativamente menor', inputType: 'text', states: ['insufficient', 'limited', 'processing'] },
  { text: 'España va fatal', inputType: 'text', states: ['supported', 'limited', 'insufficient', 'processing'] },
];
const failures = [];
for (const input of checks) {
  try {
    let response;
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        response = await fetch(`${base}/api/check`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
          signal: AbortSignal.timeout(5000),
        });
        break;
      } catch (error) {
        lastError = error;
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
    if (!response) throw lastError || new Error('request failed');
    let body = await response.json().catch(() => undefined);
    if (![200, 202].includes(response.status)) failures.push(`${input.text}: unexpected HTTP status ${response.status}`);
    if (requireTerminal && body?.state === 'processing' && typeof body.id === 'string') {
      const deadline = Date.now() + 60_000;
      while (body.state === 'processing' && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const poll = await fetch(`${base}/api/check/${encodeURIComponent(body.id)}`, { signal: AbortSignal.timeout(5000) });
        if (![200, 202].includes(poll.status)) throw new Error(`${input.text}: polling returned HTTP ${poll.status}`);
        body = await poll.json();
      }
      if (body.state === 'processing') failures.push(`${input.text}: did not complete within 60 seconds`);
    }
    if (!body || typeof body.id !== 'string' || !['clarification', 'supported', 'limited', 'insufficient', 'processing', 'unavailable'].includes(body.state)) failures.push('response does not match the current check contract');
    const expectedStates = input.states || (input.state ? [input.state] : []);
    if (expectedStates.length && !expectedStates.includes(body?.state)) failures.push(`${input.text}: expected one of ${expectedStates.join(', ')}, received ${body?.state}`);
    if (body?.state === 'clarification' && (!body.question || !Array.isArray(body.options) || body.options.length < 2)) failures.push(`${input.text}: clarification did not expose concrete options`);
    if (['supported', 'limited', 'insufficient'].includes(body?.state) && (!body.result?.evidenceLevel || !body.result?.reply || !Array.isArray(body.result?.sources))) failures.push(`${input.text}: result is missing its evidence level, reply or sources list`);
    if (body?.state === 'supported' && !body.result?.sources?.some((source) => /^https:\/\//.test(source.url || ''))) failures.push(`${input.text}: supported response has no source link`);
    if (body && /ollama|127\.0\.0\.1|localhost|cloudflare.*token/i.test(JSON.stringify(body))) failures.push('response leaked implementation details');
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Production smoke passed: ${checks.length} unified /api/check requests.`);
