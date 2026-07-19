const base = (process.env.SMOKE_BASE_URL || 'https://elpaisestafatal.es').replace(/\/$/, '');
const checks = [
  { path: '/', status: 200, title: 'El país está fatal' },
  { path: '/aclarar/inmigracion-delincuencia/', status: 200, title: 'Aclaración' },
  { path: '/aclarar/viviendas-vacias/', status: 200, title: 'Aclaración' },
  { path: '/aclarar/empleo-record/', status: 200, title: 'Aclaración' },
  { path: '/afirmaciones/inmigrantes-ayudas/', status: 200, title: 'El país está fatal' },
  { path: '/preocupaciones/vivienda/', status: 200, title: 'Vivienda' },
  { path: '/verificaciones/inmigrantes-ayudas/', status: 301 },
];

const failures = [];
const forbidden = /ollama|localhost|127\.0\.0\.1|host\.docker\.internal|local_classifier|whisper_command|cloudflare_api_token|cors/i;
for (const check of checks) {
  try {
    const response = await fetch(`${base}${check.path}`, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
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
    path: '/api/resolve',
    init: { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) },
    validate(response, body) {
      if (![200, 400].includes(response.status)) failures.push(`/api/resolve: expected a handled response, received ${response.status}`);
      if (!body || typeof body !== 'object' || typeof body.status !== 'string') failures.push('/api/resolve: missing generic status payload');
      if (forbidden.test(JSON.stringify(body))) failures.push('/api/resolve: exposed implementation details');
    },
  },
];

for (const check of apiChecks) {
  try {
    const response = await fetch(`${base}${check.path}`, { ...check.init, signal: AbortSignal.timeout(15000) });
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
console.log(`Production smoke passed: ${checks.length} routes and ${apiChecks.length} API checks at ${base}`);
