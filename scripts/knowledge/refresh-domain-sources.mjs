import { access, readFile } from 'node:fs/promises';
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

const run = (feed) => new Promise((resolve, reject) => {
  const args = ['scripts/knowledge/ingest-domain-source.mjs', '--domain', feed.domain, '--url', feed.url, '--title', feed.title];
  const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  child.on('error', reject);
  child.on('exit', (code) => code === 0
    ? resolve(output)
    : reject(new Error(`Domain feed ${feed.id} failed (${code})\n${output}`)));
});

for (const feed of feeds) {
  console.log(`Refreshing domain feed ${feed.id}: ${feed.url}`);
  const output = await run(feed);
  if (output.trim()) process.stdout.write(output.endsWith('\n') ? output : `${output}\n`);
}
console.log(`Refreshed ${feeds.length} domain feed(s) in mode ${mode}.`);
