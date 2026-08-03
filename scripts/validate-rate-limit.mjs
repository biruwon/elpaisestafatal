import { readFile } from 'node:fs/promises';

const files = [
  'functions/api/classify.ts',
  'functions/api/classify/[requestId].ts',
  'functions/api/questions.ts',
  'functions/api/feedback.ts',
];
const sources = await Promise.all(files.map((file) => readFile(file, 'utf8')));
const migration = await readFile('migrations/0005_api_rate_limits.sql', 'utf8');
const maintenance = await readFile('.github/workflows/operations-maintenance.yml', 'utf8');
const failures = [];

if (!migration.includes('CREATE TABLE IF NOT EXISTS api_rate_limits')) failures.push('missing durable rate-limit table');
if (!migration.includes('PRIMARY KEY (identity, window_start)')) failures.push('rate-limit table must be unique per identity and window');
if (!maintenance.includes('DELETE FROM api_rate_limits WHERE updated_at < datetime')) failures.push('operational maintenance must prune expired rate-limit windows');
if (!maintenance.includes('CLOUDFLARE_API_TOKEN') || !maintenance.includes('CLOUDFLARE_ACCOUNT_ID')) failures.push('operational maintenance must require Cloudflare credentials');
if (maintenance.includes('query_clusters') || maintenance.includes('resolve_requests') || maintenance.includes('content/')) failures.push('rate-limit maintenance must not touch reviewed knowledge or claim submissions');
for (const [index, source] of sources.entries()) {
  if (!source.includes("../lib/rate-limit") && !source.includes("../../lib/rate-limit")) failures.push(`${files[index]} does not use the shared limiter`);
  if (source.includes('const requestWindows = new Map')) failures.push(`${files[index]} retains a private isolate-only limiter`);
}
if (!sources.every((source) => source.includes('allowRateLimitedRequest'))) failures.push('all operational endpoints must enforce a request limit');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Rate-limit contract valid: operational endpoints share the durable D1 limiter and bounded fallback.');
