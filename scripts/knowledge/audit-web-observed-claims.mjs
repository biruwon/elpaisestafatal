import { readFile, writeFile } from 'node:fs/promises';
import { normalizeCompilerOutput } from './local-compiler-contract.mjs';

const inputPath = process.argv[2] || 'elpaisestafatal-web-observed-claims-300.json';
const data = JSON.parse(await readFile(inputPath, 'utf8'));
const candidates = data.candidates;
const runtimeCatalogue = JSON.parse(await readFile('dist/claim-catalog.json', 'utf8'));
const normalizeText = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
const publicPhrases = new Set(runtimeCatalogue.filter((entry) => entry.status === 'published' && entry.basis !== 'model').flatMap((entry) => [entry.claim, ...(entry.aliases || [])]).map(normalizeText));
const required = ['id', 'claim', 'aliases', 'topicKey', 'claimType', 'geography', 'period', 'basis', 'visibility', 'researchStatus', 'status', 'evidenceStrength', 'sourceRefs', 'evidenceIds', 'provenanceNote'];
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
const report = { inputPath, claims: candidates?.length || 0, requiredFields: required, typeCounts, multiProposition, metricRouted, exactCatalogue, unroutedExamples, errors };
await writeFile('.local/web-observed-claims-audit.json', JSON.stringify(report, null, 2));
if (errors.length) { console.error(errors.slice(0, 20).join('\n')); process.exit(1); }
console.log(`Web-observed claims audited: ${report.claims} candidates, ${report.multiProposition} compound, ${report.metricRouted} metric-routed, ${report.exactCatalogue} exact published matches; all remain explicitly unverified discovery inputs.`);
