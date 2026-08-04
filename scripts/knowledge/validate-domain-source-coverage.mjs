import { readFile } from 'node:fs/promises';

const contracts = JSON.parse(await readFile(new URL('../../config/domain-source-coverage.json', import.meta.url), 'utf8'));
const required = ['immigration_benefits', 'immigration_crime', 'public_housing_allocation'];
const errors = [];
for (const id of required) {
  const contract = contracts[id];
  if (!contract) { errors.push(`${id}: missing source contract`); continue; }
  if (!['gap', 'partial', 'covered'].includes(contract.status)) errors.push(`${id}: invalid status`);
  if (!Array.isArray(contract.requiredEvidence) || contract.requiredEvidence.length < 4) errors.push(`${id}: insufficient evidence requirements`);
  if (!Array.isArray(contract.preferredSources) || contract.preferredSources.length < 3) errors.push(`${id}: insufficient preferred sources`);
  if (!contract.knownLimitation) errors.push(`${id}: missing limitation`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Domain source coverage valid: ${required.length} high-risk domains have explicit evidence contracts.`);
