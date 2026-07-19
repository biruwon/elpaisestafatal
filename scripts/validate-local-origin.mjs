import { readFile } from 'node:fs/promises';

const failures = [];
const example = await readFile('config/cloudflared.example.yml', 'utf8');
if (!example.includes('service: http://127.0.0.1:8789')) failures.push('tunnel must terminate at the loopback resolver');
if (!example.includes('service: http_status:404')) failures.push('tunnel must have a deny-by-default fallback ingress');
if (!example.includes('<TUNNEL_UUID>') || !example.includes('<CLASSIFIER_ORIGIN_HOSTNAME>')) failures.push('tunnel template must keep deployment-specific values out of Git');

const endpoint = process.env.LOCAL_CLASSIFIER_ENDPOINT || '';
if (endpoint) {
  let url;
  try { url = new URL(endpoint); } catch { failures.push('LOCAL_CLASSIFIER_ENDPOINT must be a valid URL'); }
  if (url && url.protocol !== 'https:') failures.push('the production classifier endpoint must use HTTPS');
  if (url && ['localhost', '127.0.0.1', '::1', 'host.docker.internal'].includes(url.hostname)) failures.push('the production classifier endpoint cannot be loopback-only');
}

if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(endpoint ? 'Local origin contract valid: configured endpoint uses HTTPS.' : 'Local origin contract valid: durable endpoint is not configured; deterministic fallback remains active.');
