import { readFile } from 'node:fs/promises';

const failures = [];
const example = await readFile('config/cloudflared.example.yml', 'utf8');
const supervisor = await readFile('config/com.elpaisestafatal.local-origin.plist.example', 'utf8');
const runner = await readFile('scripts/serve-local-origin.mjs', 'utf8');
if (!example.includes('service: http://127.0.0.1:8789')) failures.push('tunnel must terminate at the loopback resolver');
if (!example.includes('service: http_status:404')) failures.push('tunnel must have a deny-by-default fallback ingress');
if (!example.includes('<TUNNEL_UUID>') || !example.includes('<CLASSIFIER_ORIGIN_HOSTNAME>')) failures.push('tunnel template must keep deployment-specific values out of Git');
if (!supervisor.includes('&lt;NODE_BINARY_PATH&gt;') || !supervisor.includes('RunAtLoad') || !supervisor.includes('KeepAlive')) failures.push('launchd template must remain machine-specific and restart the origin at login');
if (!runner.includes('supervising it without starting a duplicate') || !runner.includes('starting a replacement resolver')) failures.push('origin supervisor must avoid duplicates and restart an unhealthy resolver');

const endpoint = process.env.LOCAL_CLASSIFIER_ENDPOINT || '';
const token = process.env.LOCAL_CLASSIFIER_TOKEN || '';
if (endpoint) {
  let url;
  try { url = new URL(endpoint); } catch { failures.push('LOCAL_CLASSIFIER_ENDPOINT must be a valid URL'); }
  if (url && url.protocol !== 'https:') failures.push('the production classifier endpoint must use HTTPS');
  if (url && ['localhost', '127.0.0.1', '::1', 'host.docker.internal'].includes(url.hostname)) failures.push('the production classifier endpoint cannot be loopback-only');
  if (!token) failures.push('LOCAL_CLASSIFIER_TOKEN is required when LOCAL_CLASSIFIER_ENDPOINT is configured');
}

if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(endpoint ? 'Local origin contract valid: configured endpoint uses HTTPS.' : 'Local origin contract valid: durable endpoint is not configured; deterministic fallback remains active.');
