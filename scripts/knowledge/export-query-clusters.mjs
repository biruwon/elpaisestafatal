import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);
const root = new URL('../../', import.meta.url).pathname;
const args = new Map(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), values[index + 1] && !values[index + 1].startsWith('--') ? values[index + 1] : 'true']);
  return pairs;
}, []));
const database = args.get('database') || 'elpaisestafatal-ops';
const output = args.get('output') || join(root, '.local/d1-query-clusters.json');
const sql = "SELECT c.id, c.canonical_text, c.canonical_signature, c.query_count, MIN(r.created_at) AS first_seen_at, MAX(r.created_at) AS last_seen_at, SUM(CASE WHEN r.created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS count_7d, SUM(CASE WHEN r.created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) AS count_30d, c.coverage_status, c.linked_claim_slug, c.review_status FROM query_clusters c LEFT JOIN query_cluster_members m ON m.cluster_id = c.id LEFT JOIN resolve_requests r ON r.id = m.request_id GROUP BY c.id, c.canonical_text, c.canonical_signature, c.query_count, c.last_seen_at, c.coverage_status, c.linked_claim_slug, c.review_status ORDER BY c.query_count DESC, c.last_seen_at DESC";

try {
  const { stdout } = await execFileAsync('npx', ['--no-install', 'wrangler', 'd1', 'execute', database, '--remote', '--command', sql, '--json'], { maxBuffer: 4 * 1024 * 1024 });
  const parsed = JSON.parse(stdout);
  const rows = Array.isArray(parsed) ? parsed.flatMap((item) => item?.results || []) : parsed?.results || [];
  await writeFile(output, JSON.stringify({ exportedAt: new Date().toISOString(), database, clusters: rows }, null, 2));
  console.log(`Exported ${rows.length} operational query clusters to ${output}.`);
} catch (error) {
  console.error(error?.stderr || error?.message || String(error));
  process.exit(1);
}
