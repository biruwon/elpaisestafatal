import { readFile } from 'node:fs/promises';

const workflow = await readFile('.github/workflows/knowledge-triage.yml', 'utf8');
const failures = [];

for (const required of [
  'knowledge:triage:validate',
  'knowledge:triage -- --export-d1',
  '.local/review-queue.json',
  '.local/review-queue.md',
  'actions/upload-artifact@v4',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
]) {
  if (!workflow.includes(required)) failures.push(`triage workflow is missing ${required}`);
}
for (const forbidden of ['knowledge:materialize', 'knowledge:promote-cluster', 'git push', 'wrangler pages deploy']) {
  if (workflow.includes(forbidden)) failures.push(`triage workflow must not perform public promotion: ${forbidden}`);
}
if (!workflow.includes("github.event_name") || !workflow.includes('configured=false')) failures.push('scheduled triage must skip safely without credentials and fail only for manual runs');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Knowledge triage workflow valid: production gaps become private review artifacts without automatic publication.');
