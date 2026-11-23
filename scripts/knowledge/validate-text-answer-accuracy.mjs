import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { deterministicApiFallback } from '../../src/lib/knowledge/deterministic-api-fallback.mjs';
import { traceabilityFor } from './evaluation-metrics.mjs';
import { textAnswerAccuracyCases } from './text-answer-accuracy-cases.mjs';
import { localPublicCheckResponse } from '../lib/local-public-check-response.mjs';

const now = Date.parse('2026-11-23T12:00:00Z');
const normalize = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');
const sorted = (values) => [...new Set(values || [])].sort();
const errors = [];
const outcomes = [];

for (const item of textAnswerAccuracyCases) {
  const raw = deterministicApiFallback({ text: item.input, inputType: 'text', now });
  const response = localPublicCheckResponse({ ...raw, requestId: `answer-accuracy-${item.id}` }, item.input);
  const result = response.result || {};
  const expected = item.expected;
  const reply = String(result.reply || '');
  const firstArgument = result.arguments?.[0];
  const directSourceIds = sorted((result.arguments || []).flatMap((argument) => argument.sourceIds || []));
  const linkedSourceIds = new Set((result.sources || []).filter((source) => source?.id && /^https:\/\//i.test(source.url || '')).map((source) => source.id));
  const checks = {
    state: response.state === expected.state,
    family: result.answerScope?.family === expected.family,
    verdict: expected.verdict === undefined || firstArgument?.verdict === expected.verdict,
    directSources: JSON.stringify(directSourceIds) === JSON.stringify(sorted(expected.directSourceIds)),
    sourceLinks: directSourceIds.every((sourceId) => linkedSourceIds.has(sourceId)),
    evidence: true,
    reply: true,
    digest: reply.trim().split(/\s+/).filter(Boolean).length <= expected.maxReplyWords,
  };
  const familyMap = new Map((result.evidenceSummary?.families || []).map((family) => [family.familyId, family]));

  for (const wanted of expected.evidence) {
    const family = familyMap.get(wanted.familyId);
    if (!family) {
      checks.evidence = false;
      errors.push(`${item.id}: missing evidence family ${wanted.familyId}`);
      continue;
    }
    if (JSON.stringify(sorted(family.sourceIds)) !== JSON.stringify(sorted(wanted.sourceIds))) {
      checks.evidence = false;
      errors.push(`${item.id}: evidence source mismatch for ${wanted.familyId}`);
    }
    const dataText = (family.data || []).join(' ');
    for (const text of wanted.dataIncludes || []) if (!normalize(dataText).includes(normalize(text))) {
      checks.evidence = false;
      errors.push(`${item.id}: ${wanted.familyId} data omitted expected value/context «${text}»`);
    }
    for (const [dimension, expectedValue] of Object.entries(wanted.dimensions || {})) {
      if (!normalize(family.dimensions?.[dimension]).includes(normalize(expectedValue))) {
        checks.evidence = false;
        errors.push(`${item.id}: ${wanted.familyId} omitted or changed ${dimension} «${expectedValue}»`);
      }
    }
  }

  for (const text of expected.replyIncludes || []) if (!normalize(reply).includes(normalize(text))) {
    checks.reply = false;
    errors.push(`${item.id}: public reply omitted «${text}»`);
  }
  for (const text of expected.replyExcludes || []) if (normalize(reply).includes(normalize(text))) {
    checks.reply = false;
    errors.push(`${item.id}: public reply included out-of-scope or mismatched text «${text}»`);
  }
  if (!checks.state) errors.push(`${item.id}: expected public state ${expected.state}, received ${response.state}`);
  if (!checks.family) errors.push(`${item.id}: expected family ${expected.family || '(none)'}, received ${result.answerScope?.family || '(none)'}`);
  if (!checks.verdict) errors.push(`${item.id}: expected verdict ${expected.verdict}, received ${firstArgument?.verdict || '(none)'}`);
  if (!checks.directSources) errors.push(`${item.id}: direct claim source IDs did not match the reviewed expectation`);
  if (!checks.sourceLinks) errors.push(`${item.id}: a direct source ID has no secure public link`);
  if (!checks.digest) errors.push(`${item.id}: public reply exceeded ${expected.maxReplyWords} words`);

  const traceability = traceabilityFor(response);
  if (!traceability.passed) errors.push(`${item.id}: public evidence traceability failed (${traceability.issues.join('; ')})`);
  outcomes.push({
    id: item.id,
    equivalenceGroup: item.equivalenceGroup,
    expected: { state: expected.state, family: expected.family, verdict: expected.verdict, directSourceIds: sorted(expected.directSourceIds) },
    actual: { state: response.state, family: result.answerScope?.family, verdict: firstArgument?.verdict, directSourceIds },
    checks: { ...checks, traceability: traceability.passed },
    replyWords: reply.trim().split(/\s+/).filter(Boolean).length,
  });
}

const equivalenceGroups = new Map();
for (const outcome of outcomes.filter((item) => item.equivalenceGroup)) {
  const members = equivalenceGroups.get(outcome.equivalenceGroup) || [];
  members.push(outcome);
  equivalenceGroups.set(outcome.equivalenceGroup, members);
}
for (const [group, members] of equivalenceGroups) {
  if (members.length < 2) continue;
  const signatures = new Set(members.map((item) => JSON.stringify({ family: item.actual.family, sourceIds: item.actual.directSourceIds })));
  if (signatures.size > 1) errors.push(`${group}: paraphrases selected different evidence families or sources`);
}

const dimensions = ['state', 'family', 'verdict', 'directSources', 'sourceLinks', 'evidence', 'reply', 'digest', 'traceability'];
const report = {
  generatedAt: new Date().toISOString(),
  benchmarkScope: 'Held-out text answer checks over reviewed snapshot-backed families; measures answer value, verdict, source attribution, scope, paraphrase consistency, and concise public rendering. It is not a population-wide estimate of factual accuracy.',
  cases: outcomes.length,
  passed: outcomes.filter((item) => dimensions.every((dimension) => item.checks[dimension])).length,
  scores: Object.fromEntries(dimensions.map((dimension) => [dimension, {
    passed: outcomes.filter((item) => item.checks[dimension]).length,
    total: outcomes.length,
  }])),
  paraphraseGroups: equivalenceGroups.size,
  failures: errors,
  outcomes,
};
const outputDirectory = join(process.cwd(), '.local');
await mkdir(outputDirectory, { recursive: true });
await writeFile(join(outputDirectory, 'text-answer-accuracy-latest.json'), JSON.stringify(report, null, 2));

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`Text answer accuracy benchmark failed: ${report.passed}/${report.cases} cases passed all ${dimensions.length} checks.`);
  process.exit(1);
}
console.log(`Text answer accuracy benchmark passed: ${report.passed}/${report.cases} held-out cases; evidence, verdict, source, scope, concise rendering, traceability, and ${report.paraphraseGroups} paraphrase groups checked.`);
