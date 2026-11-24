import { readFile } from 'node:fs/promises';
const path = process.argv[2] || '.local/research-evidence.json';
const report = JSON.parse(await readFile(path, 'utf8'));
if (report.schemaVersion !== '1' || !Array.isArray(report.results)) throw new Error('Invalid LLM research evidence report');
const allowed = new Set(['review_required', 'covered_by_llm', 'partially_covered_by_llm', 'unsupported_after_llm_review', 'llm_error']);
let legacyAssessments = 0;
for (const item of report.results) {
  if (!item.id || !item.source?.url || !allowed.has(item.status)) throw new Error(`Invalid LLM assessment: ${item.id || 'unknown'}`);
  if (!['llm_error'].includes(item.status) && !Array.isArray(item.findings)) throw new Error(`Missing findings: ${item.id}`);
  if (item.status === 'review_required' && item.reviewStatus !== 'pending') throw new Error(`Unreviewed model candidate has invalid review state: ${item.id}`);
  if (['covered_by_llm', 'partially_covered_by_llm', 'unsupported_after_llm_review'].includes(item.status)) legacyAssessments += 1;
  if (item.reviewStatus === 'approved' || item.trust === 'primary') throw new Error(`Model assessment cannot carry source approval: ${item.id}`);
}
console.log(`Research candidate validation passed: ${report.results.length} assessment(s); ${legacyAssessments} legacy result(s) will be treated as unverified review candidates.`);
