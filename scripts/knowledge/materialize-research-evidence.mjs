import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
const root = new URL('../../', import.meta.url).pathname;
const input = process.argv[2] || join(root, '.local/research-evidence.json');
const report = JSON.parse(await readFile(input, 'utf8'));
const output = process.argv[3] || join(root, '.local/research-review-queue.json');
const candidates = (report.results || []).filter((item) => item.status !== 'llm_error').map((item) => ({
  id: item.id,
  clusterId: item.clusterId || (String(item.id || '').startsWith('cluster:') ? String(item.id).slice('cluster:'.length) : null),
  canonicalText: item.canonicalText || item.claim || null,
  source: item.source || null,
  modelAssessment: item.modelAssessment || (item.status === 'covered_by_llm' ? 'possible_match' : item.status === 'partially_covered_by_llm' ? 'possible_partial_match' : item.status === 'unsupported_after_llm_review' ? 'no_candidate_found' : 'unclassified'),
  modelFindings: item.findings || [],
  model: item.model || report.model || null,
  assessedAt: item.reviewedAt || null,
  reviewStatus: 'pending',
  nextAction: 'Open the source, verify each finding and its scope, then add reviewed facts through the normal versioned source workflow.',
}));
await mkdir(join(output, '..'), { recursive: true });
await writeFile(output, JSON.stringify({ schemaVersion: '1', generatedAt: new Date().toISOString(), status: 'private_review_queue', candidates }, null, 2));
console.log(`Research review queue written: ${candidates.length} unverified model candidate(s) → ${output}. Nothing was added to the source warehouse.`);
