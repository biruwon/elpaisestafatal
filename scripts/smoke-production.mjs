const base = (process.env.SMOKE_BASE_URL || 'https://elpaisestafatal.es').replace(/\/$/, '');
const allowOperationalUnavailable = process.env.SMOKE_ALLOW_OPERATIONAL_UNAVAILABLE === '1';
const maxRouteMs = Math.max(250, Number(process.env.SMOKE_MAX_ROUTE_MS || 8000));
const maxApiMs = Math.max(500, Number(process.env.SMOKE_MAX_API_MS || 12000));
const checks = [
  { path: '/', status: 200, title: 'El país está fatal' },
  { path: '/datos/', status: 200, title: 'Datos' },
  { path: '/afirmaciones/inmigrantes-ayudas/', status: 200, title: 'El país está fatal' },
  { path: '/afirmaciones/inmigracion-delincuencia/', status: 200, title: 'El país está fatal' },
  { path: '/preocupaciones/vivienda/', status: 200, title: 'Vivienda' },
];

const failures = [];
const timings = [];
const forbidden = /ollama|localhost|127\.0\.0\.1|host\.docker\.internal|local_classifier|whisper_command|cloudflare_api_token|cors/i;
for (const check of checks) {
  try {
    const startedAt = performance.now();
    const response = await fetch(`${base}${check.path}`, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    const elapsedMs = Math.round(performance.now() - startedAt);
    timings.push({ path: check.path, elapsedMs });
    if (elapsedMs > maxRouteMs) failures.push(`${check.path}: exceeded ${maxRouteMs}ms route budget (${elapsedMs}ms)`);
    const body = await response.text();
    if (response.status !== check.status) failures.push(`${check.path}: expected ${check.status}, received ${response.status}`);
    const title = body.match(/<title>([^<]*)<\/title>/)?.[1] || '';
    if (check.title && !title.includes(check.title)) failures.push(`${check.path}: expected title containing ${check.title}, received ${title || '(missing)'}`);
  } catch (error) {
    failures.push(`${check.path}: ${error.message}`);
  }
}

const apiChecks = [
  {
    path: '/api/health',
    init: { method: 'GET' },
    validate(response, body) {
      if (response.status !== 200) failures.push(`/api/health: expected 200, received ${response.status}`);
      if (!body || typeof body !== 'object' || (body.status !== 'ok' && body.status !== 'degraded')) failures.push('/api/health: missing generic health status');
      if (typeof body?.deterministic !== 'boolean') failures.push('/api/health: missing deterministic status');
      if (forbidden.test(JSON.stringify(body))) failures.push('/api/health: exposed implementation details');
    },
  },
  {
    path: '/api/classify',
    init: { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) },
    validate(response, body) {
      if (![200, 400].includes(response.status)) failures.push(`/api/classify: expected a handled response, received ${response.status}`);
      if (!body || typeof body !== 'object' || typeof body.status !== 'string') failures.push('/api/classify: missing generic status payload');
      if (forbidden.test(JSON.stringify(body))) failures.push('/api/classify: exposed implementation details');
    },
  },
  {
    path: '/api/classify',
    init: { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'pedro sanchez está destruyendo españa', inputType: 'text' }) },
    validate(response, body) {
      if (response.status !== 200) failures.push(`/api/classify political fallback: expected 200, received ${response.status}`);
      if (body?.relatedClaims?.[0]?.kind !== 'topic' || body.relatedClaims[0].slug !== 'politica') failures.push('/api/classify political fallback: missing topic-only political context');
      if (body?.result?.evidenceIds?.length || body?.result?.sourceIds?.length) failures.push('/api/classify political fallback: invented evidence');
      if (/impuestos/i.test(JSON.stringify(body))) failures.push('/api/classify political fallback: attached unrelated tax context');
    },
  },
  {
    path: '/api/classify',
    init: { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'España cobra menos impuestos sobre renta y riqueza que la Unión Europea', inputType: 'text' }) },
    validate(response, body) {
      if (response.status !== 200) failures.push(`/api/classify published fallback: expected 200, received ${response.status}`);
      if (body?.status !== 'published' || body?.primary?.kind !== 'claim' || body?.primary?.slug !== 'espana-cobra-menos-impuestos-renta-riqueza-europa') failures.push('/api/classify published fallback: did not resolve the published claim index');
      if (forbidden.test(JSON.stringify(body))) failures.push('/api/classify published fallback: exposed implementation details');
    },
  },
  {
    path: '/api/classify',
    init: { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'Desde que llegaron más extranjeros hay más inseguridad', inputType: 'text' }) },
    validate(response, body) {
      if (response.status !== 200) failures.push(`/api/classify semantic causal fallback: expected 200, received ${response.status}`);
      if (body?.status !== 'published' || body?.primary?.kind !== 'claim' || body?.primary?.slug !== 'inmigracion-delincuencia') failures.push('/api/classify semantic causal fallback: did not resolve the published causal family');
      if (forbidden.test(JSON.stringify(body))) failures.push('/api/classify semantic causal fallback: exposed implementation details');
    },
  },
  {
    path: '/api/classify',
    init: { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'España está destruida', inputType: 'text' }) },
    validate(response, body) {
      if (response.status !== 200) failures.push(`/api/classify broad political fallback: expected 200, received ${response.status}`);
      if (body?.relatedClaims?.[0]?.kind !== 'topic' || body.relatedClaims[0].slug !== 'politica') failures.push('/api/classify broad political fallback: missing topic-only political context');
      if (body?.result?.evidenceIds?.length || body?.result?.sourceIds?.length) failures.push('/api/classify broad political fallback: invented evidence');
      if (/impuestos/i.test(JSON.stringify(body))) failures.push('/api/classify broad political fallback: attached unrelated tax context');
    },
  },
  {
    path: '/api/classify',
    init: { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'La economía y el empleo van a peor', inputType: 'text' }) },
    validate(response, body) {
      if (response.status !== 200) failures.push(`/api/classify related context: expected 200, received ${response.status}`);
      if (body?.status !== 'uncovered') failures.push('/api/classify related context: weak input was incorrectly upgraded to a verdict');
      if (!Array.isArray(body?.relatedClaims) || body.relatedClaims.length === 0) failures.push('/api/classify related context: missing closest safe published context');
      if (body?.result?.evidenceIds?.length || body?.result?.sourceIds?.length) failures.push('/api/classify related context: fallback invented evidence');
    },
  },
  ...['image', 'audio'].map((inputType) => ({
    path: '/api/classify',
    init: (() => {
      const form = new FormData();
      form.set('text', 'España está en recesión');
      form.set('inputType', inputType);
      form.set('file', new Blob(['smoke-test'], { type: inputType === 'image' ? 'image/png' : 'audio/wav' }), `smoke-test.${inputType === 'image' ? 'png' : 'wav'}`);
      return { method: 'POST', body: form };
    })(),
    validate(response, body) {
      if (![200, 400, 415].includes(response.status)) failures.push(`/api/classify ${inputType}: expected a handled response, received ${response.status}`);
      if (!body || typeof body !== 'object' || typeof body.status !== 'string') failures.push(`/api/classify ${inputType}: missing generic status payload`);
      if (forbidden.test(JSON.stringify(body))) failures.push(`/api/classify ${inputType}: exposed implementation details`);
    },
  })),
  {
    path: '/api/questions',
    init: { method: 'GET' },
    validate(response, body) {
      if (allowOperationalUnavailable && response.status === 503) {
        if (!body || body.status !== 'unavailable' || !Array.isArray(body.claims)) failures.push('/api/questions: missing generic unavailable fallback');
        return;
      }
      if (response.status !== 200) failures.push(`/api/questions: expected 200 with the operational database bound, received ${response.status}`);
      if (!body || body.status !== 'ok' || !Array.isArray(body.claims)) failures.push('/api/questions: missing operational popularity feed');
      if (forbidden.test(JSON.stringify(body))) failures.push('/api/questions: exposed implementation details');
    },
  },
];

for (const check of apiChecks) {
  try {
    const startedAt = performance.now();
    const response = await fetch(`${base}${check.path}`, { ...check.init, signal: AbortSignal.timeout(15000) });
    const elapsedMs = Math.round(performance.now() - startedAt);
    timings.push({ path: check.path, elapsedMs });
    if (elapsedMs > maxApiMs) failures.push(`${check.path}: exceeded ${maxApiMs}ms API budget (${elapsedMs}ms)`);
    const body = await response.json().catch(() => ({}));
    check.validate(response, body);
  } catch (error) {
    failures.push(`${check.path}: ${error.message}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
const slowest = [...timings].sort((left, right) => right.elapsedMs - left.elapsedMs).slice(0, 3).map((item) => `${item.path} ${item.elapsedMs}ms`).join(', ');
console.log(`Production smoke passed: ${checks.length} routes and ${apiChecks.length} API checks at ${base}; slowest: ${slowest}`);
