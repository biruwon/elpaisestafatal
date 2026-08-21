import { readFile } from 'node:fs/promises';
const path = process.argv[2] || '.local/research-evidence.json';
const report = JSON.parse(await readFile(path, 'utf8'));
if (report.schemaVersion !== '1' || !Array.isArray(report.results)) throw new Error('Invalid LLM research evidence report');
const allowed = new Set(['covered_by_llm', 'partially_covered_by_llm', 'unsupported_after_llm_review', 'llm_error']);
for (const item of report.results) {
  if (!item.id || !item.source?.url || !allowed.has(item.status)) throw new Error(`Invalid LLM assessment: ${item.id || 'unknown'}`);
  if (['covered_by_llm', 'partially_covered_by_llm'].includes(item.status) && !Array.isArray(item.findings)) throw new Error(`Missing findings: ${item.id}`);
}
console.log(`LLM research evidence validation passed: ${report.results.length} assessment(s); review is post-hoc and non-blocking.`);
