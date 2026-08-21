import { readFile } from 'node:fs/promises';
import { approvedSourceHosts, sourceForHost } from './source-registry.mjs';

const path = process.argv[2] || '.local/research-job.json';
const report = JSON.parse(await readFile(path, 'utf8'));
if (report.schemaVersion !== '1' || !Array.isArray(report.results)) throw new Error('Research job report has an invalid schema');
for (const item of report.results) {
  if (!item.id || !item.query || !Array.isArray(item.requiredDimensions) || !Array.isArray(item.leads)) throw new Error(`Incomplete research item: ${item.id}`);
  if (item.status === 'source_leads_found') for (const lead of item.leads) {
    const host = new URL(lead.url).hostname;
    if (!approvedSourceHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`)) || sourceForHost(host)?.trustTier !== 'primary') throw new Error(`${item.id}: non-primary lead escaped the research queue`);
    if ('published' in lead || 'assessment' in lead || 'answer' in lead) throw new Error(`${item.id}: research lead contains publishable answer fields`);
  }
}
console.log(`Research-gap validation passed: ${report.results.length} private source-work items; LLM assessment may proceed automatically and remains reviewable post-hoc.`);
