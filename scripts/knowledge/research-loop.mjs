import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const root = new URL('../../', import.meta.url).pathname;
const run = async (script, args = []) => {
  const { stdout, stderr } = await exec(process.execPath, [script, ...args], { cwd: root, maxBuffer: 8 * 1024 * 1024 });
  if (stdout.trim()) process.stdout.write(stdout.trim() + '\n');
  if (stderr.trim()) process.stderr.write(stderr.trim() + '\n');
};
const limit = process.argv.includes('--all') ? '1000' : String(Math.max(1, Number(process.env.RESEARCH_GAP_LIMIT || 25)));
await run('scripts/knowledge/triage.mjs', ['--min-count', '1', '--limit', limit]);
await run('scripts/knowledge/audit-coverage.mjs');
await run('scripts/knowledge/research-gaps.mjs', ['--limit', limit, '--concurrency', process.env.RESEARCH_GAP_CONCURRENCY || '3']);
await run('scripts/knowledge/validate-research-gaps.mjs');
await run('scripts/knowledge/assess-research-leads.mjs', ['--limit', limit, '--concurrency', process.env.RESEARCH_LLM_CONCURRENCY || '2']);
await run('scripts/knowledge/validate-research-evidence.mjs');
await run('scripts/knowledge/materialize-research-evidence.mjs');
await run('scripts/knowledge/audit-coverage.mjs');
console.log('Research loop complete. New gaps are automatically clustered, researched, assessed by the LLM, and written to a post-hoc review artifact.');
