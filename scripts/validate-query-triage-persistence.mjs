import { readFile } from 'node:fs/promises';
import {
  buildTriageSql,
  buildTriageUpdateSql,
  triageStatusForCandidate,
} from './knowledge/sync-query-triage.mjs';

const migration = await readFile(new URL('../migrations/0006_query_cluster_triage.sql', import.meta.url), 'utf8');
const triage = await readFile(new URL('./knowledge/triage.mjs', import.meta.url), 'utf8');
const exporter = await readFile(new URL('./knowledge/export-query-clusters.mjs', import.meta.url), 'utf8');
const workflow = await readFile(new URL('../.github/workflows/knowledge-triage.yml', import.meta.url), 'utf8');
const failures = [];
const requireText = (source, text, label) => {
  if (!source.includes(text)) failures.push(`missing ${label}`);
};

for (const field of ['triage_status', 'triage_priority', 'triage_next_action', 'triaged_at']) {
  requireText(migration, field, `migration field ${field}`);
}
requireText(migration, 'idx_query_clusters_triage', 'triage index');
for (const field of ['c.triage_status', 'c.triage_priority', 'c.triage_next_action', 'c.triaged_at']) {
  requireText(exporter, field, `D1 export field ${field}`);
}
requireText(triage, "args.has('sync-d1')", 'explicit D1 triage sync opt-in');
requireText(triage, 'sync-query-triage.mjs', 'durable D1 triage sync command');
requireText(workflow, '--sync-d1', 'scheduled D1 triage sync');

if (triageStatusForCandidate({ researchOnly: true }) !== 'research_needed') failures.push('research candidate status is incorrect');
if (triageStatusForCandidate({ newlyCovered: true }) !== 'newly_covered') failures.push('newly covered status is incorrect');
if (triageStatusForCandidate({}) !== 'materialization_candidate') failures.push('materialization candidate status is incorrect');

const escaped = buildTriageUpdateSql({ clusterId: "cluster-'antonio", priorityScore: 3.5, reason: "Antonio's follow-up" }, "'2026-08-04T00:00:00Z'");
if (!escaped.includes("Antonio''s") || !escaped.includes("WHERE id = 'cluster-''antonio'")) failures.push('triage SQL does not escape values safely');
const sql = buildTriageSql({ candidates: [{ clusterId: 'cluster-1', priorityScore: 2 }], researchCandidates: [{ clusterId: 'cluster-2', priorityScore: 1, researchOnly: true }] }, "'2026-08-04T00:00:00Z'");
if ((sql.match(/UPDATE query_clusters SET/g) || []).length !== 2) failures.push('triage SQL does not persist every candidate');
if (buildTriageSql({ candidates: [], researchCandidates: [] }) !== '') failures.push('empty triage queue should not produce SQL');
for (const forbidden of ['knowledge:materialize', 'knowledge:promote-cluster', 'linked_claim_slug =']) {
  if (triage.includes(forbidden) || workflow.includes(forbidden)) failures.push(`triage path must not publish claims: ${forbidden}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Query triage persistence validated: private D1 status is durable and cannot publish claims.');
