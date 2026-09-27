import { readFile } from 'node:fs/promises';

const files = [
  'functions/api/check.ts',
  'functions/api/questions.ts',
];
const sources = await Promise.all(files.map((file) => readFile(file, 'utf8')));
const rateLimitWorker = await readFile('workers/rate-limits/index.ts', 'utf8');
const rateLimitConfig = await readFile('wrangler.rate-limits.jsonc', 'utf8');
const pagesConfig = await readFile('wrangler.jsonc', 'utf8');
const failures = [];

if (!rateLimitConfig.includes('"ratelimits"')) failures.push('native Worker rate-limit bindings are missing');
if (!rateLimitWorker.includes('.limit({ key })')) failures.push('rate-limit Worker does not use the native binding');
if (!pagesConfig.includes('"binding": "RATE_LIMITER"')) failures.push('Pages is missing the rate-limit Worker service binding');
if (rateLimitConfig.includes('"name": "FEEDBACK_LIMITER"')) failures.push('unused feedback rate-limit binding remains');
for (const [index, source] of sources.entries()) {
  if (!source.includes("../lib/rate-limit") && !source.includes("../../lib/rate-limit")) failures.push(`${files[index]} does not use the shared limiter`);
  if (source.includes('const requestWindows = new Map')) failures.push(`${files[index]} retains a private isolate-only limiter`);
}
if (!sources.every((source) => source.includes('allowRateLimitedRequest'))) failures.push('all operational endpoints must enforce a request limit');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Rate-limit contract valid: operational endpoints use Cloudflare native limits with a bounded local fallback.');
