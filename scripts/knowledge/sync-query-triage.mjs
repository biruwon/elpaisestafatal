import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const sqlQuote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

export const triageStatusForCandidate = (candidate) => candidate?.researchOnly
  ? 'research_needed'
  : candidate?.newlyCovered
    ? 'newly_covered'
    : 'materialization_candidate';

export const buildTriageUpdateSql = (candidate, triagedAt = "datetime('now')") => {
  if (!candidate?.clusterId) return '';
  const status = triageStatusForCandidate(candidate);
  const action = String(candidate.nextAction || candidate.reason || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
  return `UPDATE query_clusters SET triage_status = ${sqlQuote(status)}, triage_priority = ${number(candidate.priorityScore)}, triage_next_action = ${sqlQuote(action)}, triaged_at = ${triagedAt} WHERE id = ${sqlQuote(candidate.clusterId)};`;
};

export const buildTriageSql = (queue, triagedAt = "datetime('now')") => {
  const candidates = [...(Array.isArray(queue?.candidates) ? queue.candidates : []), ...(Array.isArray(queue?.researchCandidates) ? queue.researchCandidates : [])];
  const statements = candidates.map((candidate) => buildTriageUpdateSql(candidate, triagedAt)).filter(Boolean);
  return statements.length ? ['BEGIN;', ...statements, 'COMMIT;'].join('\n') : '';
};

const args = new Map(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), values[index + 1] && !values[index + 1].startsWith('--') ? values[index + 1] : 'true']);
  return pairs;
}, []));

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const database = args.get('database') || 'elpaisestafatal-ops';
  const queuePath = args.get('queue') || '.local/review-queue.json';
  let queue;
  try { queue = JSON.parse(await readFile(queuePath, 'utf8')); } catch { console.error(`Triage queue not found at ${queuePath}.`); process.exit(1); }
  const sql = buildTriageSql(queue);
  if (!sql) { console.log('No triage candidates to persist.'); process.exit(0); }
  try {
    await execFileAsync('npx', ['--no-install', 'wrangler', 'd1', 'execute', database, '--remote', '--command', sql], { maxBuffer: 2 * 1024 * 1024 });
    const count = (sql.match(/UPDATE query_clusters SET/g) || []).length;
    console.log(`Persisted ${count} private knowledge-gap triage record(s).`);
  } catch (error) {
    console.error(error?.stderr || error?.message || String(error));
    process.exit(1);
  }
}
