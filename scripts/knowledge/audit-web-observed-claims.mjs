import { readFile, writeFile } from 'node:fs/promises';
import { normalizeCompilerOutput } from './local-compiler-contract.mjs';
import { deterministicApiFallback } from '../../src/lib/knowledge/deterministic-api-fallback.mjs';

const resolveMode = process.argv.includes('--resolve');
const deterministicMode = process.argv.includes('--deterministic');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const offsetArg = process.argv.find((arg) => arg.startsWith('--offset='));
const timeoutArg = process.argv.find((arg) => arg.startsWith('--timeout='));
const resolveTimeoutMs = timeoutArg ? Math.max(1000, Number.parseInt(timeoutArg.slice(10), 10) || 1000) : 30000;
const inputPath = process.argv.slice(2).find((arg) => !arg.startsWith('--')) || 'elpaisestafatal-web-observed-claims-300.json';
const data = JSON.parse(await readFile(inputPath, 'utf8'));
const candidates = data.candidates;
const resolveLimit = limitArg ? Math.max(1, Number.parseInt(limitArg.slice(8), 10) || 1) : candidates.length;
const resolveOffset = offsetArg ? Math.max(0, Number.parseInt(offsetArg.slice(9), 10) || 0) : 0;
const runtimeCatalogue = JSON.parse(await readFile('dist/claim-catalog.json', 'utf8'));
const normalizeText = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
const publicPhrases = new Set(runtimeCatalogue.filter((entry) => entry.status === 'published' && entry.basis !== 'model').flatMap((entry) => [entry.claim, ...(entry.aliases || [])]).map(normalizeText));
const required = ['id', 'claim', 'aliases', 'topicKey', 'claimType', 'geography', 'period', 'basis', 'visibility', 'researchStatus', 'status', 'evidenceStrength', 'sourceRefs', 'evidenceIds', 'provenanceNote'];
const fieldUsage = {
  runtime: ['claim', 'aliases', 'claimType', 'geography', 'period', 'basis', 'visibility', 'status', 'sourceRefs', 'evidenceIds'],
  routingOrReview: ['id', 'topicKey', 'polarity', 'fingerprint', 'evidenceStrength', 'researchStatus'],
  discoveryOnly: ['discoverySourceIds', 'observedPlatforms', 'recurrenceSignal', 'provenanceNote'],
};
const errors = [];
if (data.schemaVersion !== 'web-observed-catalogue-v1') errors.push(`unexpected schemaVersion: ${data.schemaVersion}`);
if (!Array.isArray(candidates) || candidates.length !== data.candidateCount) errors.push('candidateCount does not match candidates array');
const seen = new Set();
const typeCounts = {};
let multiProposition = 0;
let metricRouted = 0;
let exactCatalogue = 0;
const unroutedExamples = [];
for (const candidate of candidates || []) {
  if (!candidate || typeof candidate !== 'object') { errors.push('candidate is not an object'); continue; }
  for (const field of required) if (!(field in candidate)) errors.push(`${candidate.id || '(unknown)'} missing ${field}`);
  if (seen.has(candidate.id)) errors.push(`duplicate id: ${candidate.id}`);
  seen.add(candidate.id);
  if (candidate.basis !== 'sourced' || candidate.researchStatus !== 'unverified' || candidate.status !== 'planned') errors.push(`${candidate.id} is not marked as an unverified discovery candidate`);
  const compiled = normalizeCompilerOutput(null, candidate.claim);
  typeCounts[compiled.claimType] = (typeCounts[compiled.claimType] || 0) + 1;
  if (compiled.propositions.length > 1) multiProposition += 1;
  if (compiled.metricIds?.length) metricRouted += 1;
  if (publicPhrases.has(normalizeText(candidate.claim))) exactCatalogue += 1;
  else if (unroutedExamples.length < 10) unroutedExamples.push(candidate.claim);
}
const report = { inputPath, claims: candidates?.length || 0, requiredFields: required, fieldUsage, typeCounts, multiProposition, metricRouted, exactCatalogue, unroutedExamples, errors };
if (deterministicMode) {
  const outcomes = candidates.map((candidate) => {
    const result = deterministicApiFallback({ text: candidate.claim, inputType: 'text' });
    return { id: candidate.id, status: result.status, evidence: result.result?.evidenceIds?.length || 0, sources: result.result?.sourceIds?.length || 0, propositions: result.result?.blocks?.find((block) => block.type === 'claim_breakdown')?.items?.length || 0 };
  });
  report.deterministic = { outcomes, completed: outcomes.filter((item) => item.status === 'complete').length, limited: outcomes.filter((item) => item.status === 'partial' || item.status === 'draft').length, uncovered: outcomes.filter((item) => item.status === 'uncovered').length, withEvidence: outcomes.filter((item) => item.evidence > 0).length, withSources: outcomes.filter((item) => item.sources > 0).length, compoundResponses: outcomes.filter((item) => item.propositions > 1).length };
}
if (resolveMode) {
  const base = (process.env.WEB_CLAIMS_RESOLVE_URL || 'http://127.0.0.1:8789').replace(/\/$/, '');
  const outcomes = [];
  const resolveCandidates = candidates.slice(resolveOffset, resolveOffset + resolveLimit);
  let cursor = 0;
  const resolveOne = async (candidate) => {
    const started = Date.now();
    try {
      const response = await fetch(`${base}/v1/classify`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-knowledge-gap-origin': 'web-observed-audit' }, body: JSON.stringify({ text: candidate.claim, inputType: 'text' }), signal: AbortSignal.timeout(resolveTimeoutMs) });
      let payload = await response.json();
      for (let attempt = 0; attempt < Math.ceil(resolveTimeoutMs / 1000) && payload.status === 'processing'; attempt += 1) { await new Promise((wait) => setTimeout(wait, 1000)); payload = await fetch(`${base}/v1/classify/${encodeURIComponent(payload.requestId)}`, { signal: AbortSignal.timeout(Math.min(10000, resolveTimeoutMs)) }).then((item) => item.json()); }
      const result = payload.result;
      const timedOut = payload.status === 'processing';
      return { id: candidate.id, status: timedOut ? 'timeout' : payload.status, evidence: result?.evidenceIds?.length || 0, sources: result?.sourceLinks?.length || 0, propositions: result?.blocks?.find((block) => block.type === 'claim_breakdown')?.items?.length || 0, latencyMs: Date.now() - started };
    } catch (error) { return { id: candidate.id, status: 'error', error: error instanceof Error ? error.message : String(error), latencyMs: Date.now() - started }; }
  };
  const worker = async () => { while (cursor < resolveCandidates.length) { const candidate = resolveCandidates[cursor++]; outcomes.push(await resolveOne(candidate)); } };
  await Promise.all(Array.from({ length: Math.min(3, resolveCandidates.length) }, worker));
  report.resolve = { base, offset: resolveOffset, requested: resolveCandidates.length, outcomes, completed: outcomes.filter((item) => !['error', 'timeout'].includes(item.status)).length, errors: outcomes.filter((item) => item.status === 'error').length, timeouts: outcomes.filter((item) => item.status === 'timeout').length, withEvidence: outcomes.filter((item) => item.status !== 'timeout' && item.evidence > 0).length, withSources: outcomes.filter((item) => item.status !== 'timeout' && item.sources > 0).length, compoundResponses: outcomes.filter((item) => item.propositions > 1).length };
}
await writeFile('.local/web-observed-claims-audit.json', JSON.stringify(report, null, 2));
if (errors.length) { console.error(errors.slice(0, 20).join('\n')); process.exit(1); }
console.log(`Web-observed claims audited: ${report.claims} candidates, ${report.multiProposition} compound, ${report.metricRouted} metric-routed, ${report.exactCatalogue} exact published matches${report.resolve ? `; resolved ${report.resolve.completed}/${report.resolve.requested}, evidence ${report.resolve.withEvidence}, sources ${report.resolve.withSources}` : ''}${report.deterministic ? `; deterministic ${report.deterministic.completed} complete, ${report.deterministic.limited} limited, ${report.deterministic.uncovered} uncovered` : ''}; all remain explicitly unverified discovery inputs.`);
