const base = (process.env.SMOKE_RESOLVE_BASE_URL || 'http://127.0.0.1:4321').replace(/\/$/, '');
const path = process.env.SMOKE_RESOLVE_PATH || '/api/classify';
const failures = [];

try {
  const health = await fetch(`${base}/healthz`, { signal: AbortSignal.timeout(5000) });
  if (!health.ok || (await health.json()).deterministic !== true) failures.push('health contract failed');
  const empty = await fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: '', inputType: 'text' }), signal: AbortSignal.timeout(5000) });
  if (empty.status !== 400) failures.push(`empty input status ${empty.status}`);
  const form = new FormData();
  form.set('text', '');
  form.set('inputType', 'image');
  form.set('file', new Blob(['smoke'], { type: 'image/png' }), 'smoke.png');
  const media = await fetch(`${base}${path}`, { method: 'POST', headers: {}, body: form, signal: AbortSignal.timeout(5000) });
  if (![202, 400, 415].includes(media.status)) failures.push(`media validation status ${media.status}`);
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Local HTTP smoke passed: health, input validation, and multipart lifecycle contracts are valid.');
