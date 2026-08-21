import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const root = new URL('../../', import.meta.url).pathname;
const input = process.argv[2] || join(root, '.local/research-evidence.json');
const report = JSON.parse(await readFile(input, 'utf8'));
const recordsDir = join(root, '.local/source-warehouse/records');
const manifestsDir = join(root, '.local/source-warehouse/manifests');
await mkdir(recordsDir, { recursive: true }); await mkdir(manifestsDir, { recursive: true });
let materialized = 0;
for (const item of report.results || []) {
  if (item.status === 'llm_error') continue;
  const source = item.source || {};
  const digest = createHash('sha256').update(`${item.id}|${source.url}|${report.model}`).digest('hex').slice(0, 16);
  const sourceId = `research-${digest}`;
  const evidenceRecords = (item.findings || []).map((finding, index) => ({
    id: `${sourceId}-finding-${index + 1}`,
    kind: 'llm-research-evidence', sourceId, clusterId: item.id, propositionId: finding.propositionId || null,
    finding: finding.finding, support: finding.support, stage: finding.stage || null,
    quantities: finding.quantities || [], retrievedAt: item.reviewedAt, model: item.model || report.model,
  }));
  const manifest = { id: sourceId, sourceRegistryId: 'llm-research', url: source.url, publisher: source.publisher || 'Official source', title: source.title || source.url, retrievedAt: item.reviewedAt, trust: 'primary', connector: 'llm-source-assessment', model: item.model || report.model, clusterId: item.id, status: item.status, limitation: 'LLM-assessed source evidence; reviewable post-hoc.', recordCount: evidenceRecords.length, recordPath: join(recordsDir, `${sourceId}.json`) };
  await writeFile(join(manifestsDir, `${sourceId}.json`), JSON.stringify(manifest, null, 2));
  await writeFile(join(recordsDir, `${sourceId}.json`), JSON.stringify({ source: manifest, records: evidenceRecords }, null, 2));
  materialized++;
}
console.log(`Research evidence materialized: ${materialized} LLM result(s) into the warehouse and coverage inputs.`);
