import { spawn } from 'node:child_process';

const port = Number(process.env.PAGES_SMOKE_PORT || 8788);
const base = `http://127.0.0.1:${port}`;
const log = process.env.PAGES_SMOKE_LOG || '/tmp/elpaisestafatal-pages-smoke.log';
// Wrangler's local workerd may lag the production compatibility date. Keep
// this override local to the harness; the deployed Pages configuration remains
// authoritative and is still validated by deployment:validate.
const compatibilityDate = process.env.PAGES_SMOKE_COMPATIBILITY_DATE || '2026-05-03';
const child = spawn('npx', ['wrangler', 'pages', 'dev', 'dist', '--local', '--ip', '127.0.0.1', '--port', String(port), '--compatibility-date', compatibilityDate], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, NO_COLOR: '1' },
});

const chunks = [];
child.stdout.on('data', (chunk) => chunks.push(chunk));
child.stderr.on('data', (chunk) => chunks.push(chunk));

const stop = () => {
  if (!child.killed) child.kill('SIGTERM');
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

let ready = false;
for (let attempt = 0; attempt < 40; attempt += 1) {
  try {
    const response = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(1000) });
    if (response.ok) { ready = true; break; }
  } catch { /* Pages is still starting. */ }
  await new Promise((resolve) => setTimeout(resolve, 250));
}

if (!ready) {
  stop();
  console.error(`Pages smoke server did not become ready. Output: ${Buffer.concat(chunks).toString().slice(-4000)}`);
  process.exit(1);
}

const smoke = spawn(process.execPath, ['scripts/smoke-production.mjs'], {
  stdio: 'inherit',
  env: { ...process.env, SMOKE_BASE_URL: base, SMOKE_ALLOW_OPERATIONAL_UNAVAILABLE: '1' },
});
const exitCode = await new Promise((resolve) => smoke.once('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0))));
stop();
await new Promise((resolve) => child.once('exit', resolve));
await import('node:fs/promises').then(({ writeFile }) => writeFile(log, Buffer.concat(chunks), 'utf8')).catch(() => {});
process.exit(exitCode);
