const base = (process.env.SMOKE_RESOLVE_BASE_URL || 'http://127.0.0.1:8788').replace(/\/$/, '');
const resolvePath = process.env.SMOKE_RESOLVE_PATH || '/api/check';
const failures = [];
const states = new Set(['clarification', 'supported', 'limited', 'insufficient', 'processing', 'unavailable']);

const request = async (body, multipart = false) => {
  const response = await fetch(`${base}${resolvePath}`, {
    method: 'POST',
    headers: multipart ? { 'x-knowledge-gap-origin': 'smoke' } : { 'content-type': 'application/json', 'x-knowledge-gap-origin': 'smoke' },
    body: multipart ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const payload = await response.json().catch(() => undefined);
  if (!payload || typeof payload.id !== 'string' || !states.has(payload.state)) throw new Error(`invalid public response (${response.status})`);
  return payload;
};

const check = async (test) => {
  try {
    let result = await request({ text: test.text, inputType: test.inputType || 'text' });
    for (let attempt = 0; attempt < 30 && result.state === 'processing'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      const pending = await fetch(`${base}${resolvePath}/${encodeURIComponent(result.id)}`, { signal: AbortSignal.timeout(5000) });
      result = await pending.json();
    }
    if (result.state !== test.state) failures.push(`${test.text}: expected ${test.state}, received ${result.state}`);
    if (result.state === 'supported') {
      const item = result.result;
      if (!item || !item.reply || !item.evidenceLevel) failures.push(`${test.text}: supported result is missing evidence level or reply`);
    }
    if (result.state === 'clarification' && (!result.question || !Array.isArray(result.options) || result.options.length < 2)) failures.push(`${test.text}: clarification has no concrete options`);
    if (['limited', 'insufficient'].includes(result.state) && !result.result?.evidenceLevel) failures.push(`${test.text}: evidence-level result is missing its level`);
    if (JSON.stringify(result).match(/ollama|127\.0\.0\.1|localhost|cloudflare.*token/i)) failures.push(`${test.text}: response leaked implementation details`);
  } catch (error) { failures.push(`${test.text}: ${error instanceof Error ? error.message : String(error)}`); }
};

const cases = [
  { text: 'España supera los 49 millones de residentes.', state: 'supported' },
  { text: 'España gasta menos por habitante en sanidad que la Unión Europea', state: 'supported' },
  { text: 'La amnistía rompe la igualdad ante la ley.', state: 'supported' },
  { text: 'No hay trabajo', state: 'clarification' },
  { text: 'España va fatal', state: 'clarification' },
  { text: 'España cobra demasiados impuestos', state: 'clarification' },
  { text: 'Pedro Sánchez traidor', state: 'insufficient' },
  { text: 'Pedro Sánchez corrupto', state: 'insufficient' },
  { text: 'Cómo ha cambiado la situación de una cuestión que no tiene fuentes', state: 'insufficient' },
];
for (const test of cases) await check(test);

if (process.env.SMOKE_MEDIA === '1') {
  for (const [inputType, mimeType] of [['image', 'image/png'], ['audio', 'audio/wav']]) {
    const form = new FormData();
    form.set('text', 'España está en recesión');
    form.set('inputType', inputType);
    form.set('file', new Blob(['smoke-test'], { type: mimeType }), 'smoke-test.bin');
    try {
      const result = await request(form, true);
      if (result.state === 'unavailable') failures.push(`${inputType}: media fallback unavailable`);
    } catch (error) { failures.push(`${inputType}: ${error instanceof Error ? error.message : String(error)}`); }
  }
}

if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Public resolver smoke passed: ${cases.length}${process.env.SMOKE_MEDIA === '1' ? ' + media' : ''} state-aware requests.`);
