import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { X509Certificate } from 'node:crypto';
import { spawn } from 'node:child_process';

const configPath = process.argv.includes('--config')
  ? process.argv[process.argv.indexOf('--config') + 1]
  : 'config/domain-source-refresh.json';
const mode = process.env.DOMAIN_REFRESH_MODE || 'active';
let config;
try {
  await access(configPath);
  config = JSON.parse(await readFile(configPath, 'utf8'));
} catch (error) {
  throw new Error(`Cannot read domain refresh configuration ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
}

const feeds = (Array.isArray(config?.feeds) ? config.feeds : [])
  .filter((feed) => mode === 'all' || feed.mode === mode);
if (!feeds.length) {
  console.log(`No domain feeds selected for mode ${mode}.`);
  process.exit(0);
}

const environmentFor = async (feed) => {
  const env = { ...process.env };
  if (!feed.tlsCaCertificate) return env;
  if (feed.id !== 'airef-pension-projection-tables-2026' || new URL(feed.url).hostname !== 'www.airef.es') {
    throw new Error(`Source-specific TLS CA is not approved for domain feed ${feed.id}`);
  }

  const certificatePath = resolve(feed.tlsCaCertificate.path);
  const certificatePem = await readFile(certificatePath, 'utf8');
  const certificate = new X509Certificate(certificatePem);
  const currentTime = Date.now();
  if (!certificate.ca
    || certificate.fingerprint256 !== feed.tlsCaCertificate.sha256
    || Date.parse(certificate.validFrom) > currentTime
    || Date.parse(certificate.validTo) <= currentTime) {
    throw new Error(`Unexpected TLS CA certificate for domain feed ${feed.id}`);
  }

  const existingCaPem = env.NODE_EXTRA_CA_CERTS
    ? await readFile(resolve(env.NODE_EXTRA_CA_CERTS), 'utf8')
    : '';
  const bundlePath = resolve('.local/domain-refresh-ca', `${feed.id}.pem`);
  await mkdir(dirname(bundlePath), { recursive: true });
  await writeFile(bundlePath, [existingCaPem, certificatePem].filter(Boolean).join('\n'), { mode: 0o600 });
  env.NODE_EXTRA_CA_CERTS = bundlePath;
  return env;
};

const run = async (feed) => {
  const args = ['scripts/knowledge/ingest-domain-source.mjs', '--domain', feed.domain, '--url', feed.url, '--title', feed.title];
  if (feed.schedule) args.push('--schedule', feed.schedule);
  if (feed.publishedAt) args.push('--published-at', feed.publishedAt);
  const env = await environmentFor(feed);
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.on('error', reject);
    child.on('exit', (code) => code === 0
      ? resolveRun(output)
      : reject(new Error(`Domain feed ${feed.id} failed (${code})\n${output}`)));
  });
};

const failures = [];
const successes = [];
for (const feed of feeds) {
  console.log(`Refreshing domain feed ${feed.id}: ${feed.url}`);
  try {
    const output = await run(feed);
    successes.push({ id: feed.id, domain: feed.domain, url: feed.url });
    if (output.trim()) process.stdout.write(output.endsWith('\n') ? output : `${output}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push({ id: feed.id, domain: feed.domain, url: feed.url, error: message.slice(0, 1000) });
    console.error(`Domain feed ${feed.id} failed; continuing with remaining feeds.`);
    console.error(message);
  }
}
console.log(`Refreshed ${feeds.length - failures.length}/${feeds.length} domain feed(s) in mode ${mode}.`);
const reportPath = process.env.DOMAIN_REFRESH_REPORT || '.local/domain-refresh-report.json';
await mkdir(join(reportPath, '..'), { recursive: true });
await writeFile(reportPath, JSON.stringify({ schemaVersion: '1', generatedAt: new Date().toISOString(), mode, attempted: feeds.length, succeeded: successes.length, failed: failures.length, successes, failures }, null, 2));
console.log(`Domain refresh report written to ${reportPath}.`);
if (failures.length) {
  console.error(JSON.stringify({ operationalFailures: failures }, null, 2));
  process.exitCode = 1;
}
