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

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Production smoke passed: ${checks.length} routes checked at ${base}`);
