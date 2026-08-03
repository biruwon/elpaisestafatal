import { access, unlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);
const root = new URL('../../', import.meta.url).pathname;
const args = new Map(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), values[index + 1] && !values[index + 1].startsWith('--') ? values[index + 1] : 'true']);
  return pairs;
}, []));

const localInput = args.get('input') || join(root, '.local/knowledge-gaps.jsonl');
const d1Input = args.get('d1-input') || join(root, '.local/d1-query-clusters.json');
const clusterOutput = args.get('clusters') || join(root, '.local/query-clusters.json');
const queueOutput = args.get('queue') || join(root, '.local/review-queue.json');
const markdownOutput = args.get('markdown') || join(root, '.local/review-queue.md');
const database = args.get('database') || 'elpaisestafatal-ops';
const minCount = String(Math.max(1, Number(args.get('min-count') || 3)));
const limit = String(Math.max(1, Number(args.get('limit') || 25)));
const run = async (command, commandArgs) => {
  const { stdout, stderr } = await execFileAsync(command, commandArgs, { cwd: root, maxBuffer: 4 * 1024 * 1024 });
  if (stdout.trim()) process.stdout.write(stdout.trim() + '\n');
  if (stderr.trim()) process.stderr.write(stderr.trim() + '\n');
};
const exists = async (path) => { try { await access(path); return true; } catch { return false; } };

if (args.has('help')) {
  console.log('Usage: npm run knowledge:triage [--export-d1] [--input path] [--d1-input path] [--embedding-endpoint http://127.0.0.1:11434] [--min-count 3] [--limit 25]');
  console.log('Creates .local/query-clusters.json and .local/review-queue.{json,md}. Production D1 export is opt-in.');
  process.exit(0);
}

if (args.has('export-d1')) {
  await run(process.execPath, ['scripts/knowledge/export-query-clusters.mjs', '--database', database, '--output', d1Input]);
}

const hasLocalInput = await exists(localInput);
const hasD1Input = await exists(d1Input);
if (!hasLocalInput && !hasD1Input) {
  console.log('No local or exported production knowledge gaps are available yet.');
  process.exit(0);
}

// Avoid presenting a previous generated queue when the current inputs are
// empty or unavailable.
await unlink(clusterOutput).catch(() => {});
const clusterArgs = ['scripts/knowledge/cluster-gaps.mjs', '--input', localInput, '--output', clusterOutput];
if (hasD1Input) clusterArgs.push('--d1-input', d1Input);
for (const option of ['embedding-endpoint', 'embedding-model', 'embedding-threshold', 'embedding-max']) {
  if (args.has(option)) clusterArgs.push(`--${option}`, args.get(option));
}
await run(process.execPath, clusterArgs);

if (!(await exists(clusterOutput))) {
  console.log('No review queue generated: no local or exported production knowledge gaps are available yet.');
  process.exit(0);
}

await run(process.execPath, [
  'scripts/knowledge/review-queue.mjs',
  '--input', clusterOutput,
  '--output', queueOutput,
  '--markdown', markdownOutput,
  '--min-count', minCount,
  '--limit', limit,
]);
console.log(`Triage complete. Review ${markdownOutput} before promoting any answer.`);
