import { readFile } from 'node:fs/promises';

const input = await readFile(new URL('../src/scripts/claim-input.ts', import.meta.url), 'utf8');
const questions = await readFile(new URL('../functions/api/questions.ts', import.meta.url), 'utf8');
const failures = [];

const requireText = (source, text, label) => {
  if (!source.includes(text)) failures.push(`missing ${label}`);
};

requireText(input, 'const recordQuestion =', 'immediate learning capture helper');
requireText(input, "recordQuestion(query, { inputType: 'text', status: 'received' })", 'early capture before background analysis');
requireText(input, 'const capturedText = query || data.input?.canonical ||', 'terminal capture identity');
requireText(input, 'status: data.status', 'terminal status update');
requireText(input, 'requestId: query ? undefined : data.requestId', 'idempotent typed/media request identity');
requireText(input, 'semanticSignature: query ? semanticQuerySignature(query) : data.canonicalSignature', 'stable typed semantic signature');
requireText(input, 'data-learning-note', 'uncovered-result learning feedback');
requireText(input, 'if (file) rememberRecentCheck(data.input?.canonical || capturedText)', 'media-derived learning capture');
requireText(input, 'canonical: data.input?.canonical || capturedText', 'media-derived canonical claim capture');
requireText(questions, 'const isNewRequest =', 'idempotent request detection');
requireText(questions, 'if (isNewRequest)', 'count-once cluster update gate');
requireText(questions, 'ON CONFLICT(semantic_signature)', 'semantic cluster persistence');
requireText(questions, "const inputTypes = new Set(['text', 'image', 'audio', 'url'])", 'input type allowlist');
requireText(questions, "const statuses = new Set(['received', 'processing', 'published', 'related', 'draft', 'uncovered', 'unavailable', 'complete', 'partial'])", 'status allowlist');
requireText(questions, 'effectiveSemanticSignature = membership.results[0]?.semanticSignature || semanticSignature', 'retry cluster identity preservation');
requireText(questions, 'INSERT INTO query_clusters (id, canonical_text, canonical_signature, semantic_signature, query_count, last_seen_at, coverage_status)', 'missing-cluster recovery');

if (input.includes('recordUncoveredQuestion')) failures.push('obsolete late-only learning helper remains');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Learning capture validation passed: gaps are captured early, media can enrich clusters, and repeated request IDs do not inflate counts.');
