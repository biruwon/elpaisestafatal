import { readFile } from 'node:fs/promises';

const service = await readFile(new URL('../local-claim-service.mjs', import.meta.url), 'utf8');
const ui = await readFile(new URL('../../src/scripts/claim-checker.ts', import.meta.url), 'utf8');
const failures = [];
if (!/const cacheTtlMs\s*=\s*15\s*\*\s*60\s*\*\s*1000/.test(service)) failures.push('resolver cache must be 15 minutes');
if (!/const currentEventCacheTtlMs\s*=\s*5\s*\*\s*60\s*\*\s*1000/.test(service)) failures.push('current-event cache must be 5 minutes');
if (!/detectCurrentEvent\(text\)\s*\?\s*currentEventCacheTtlMs\s*:\s*cacheTtlMs/.test(service)) failures.push('event cache expiry must use the five-minute TTL');
if (ui.includes('sessionStorage.getItem')) failures.push('legacy browser response cache must not remain; caching is server-side');
if (!ui.includes("fetchJson('/api/check'")) failures.push('checker must use the unified server cache path');
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Research-cache contract valid: warehouse answers cache for 15 minutes and current-event sessions expire after 5 minutes.');
