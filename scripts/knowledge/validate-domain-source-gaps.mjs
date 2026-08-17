import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('config/domain-source-gaps.json');
const { gaps } = JSON.parse(fs.readFileSync(file, 'utf8'));
const errors = [];
if (!Array.isArray(gaps) || !gaps.length) errors.push('gaps must be a non-empty array');
const ids = new Set();
for (const gap of gaps ?? []) {
  for (const field of ['id', 'domain', 'status', 'permittedConclusion', 'nextEvidence']) {
    if (typeof gap[field] !== 'string' || !gap[field].trim()) errors.push(`${field} missing for gap`);
  }
  if (ids.has(gap.id)) errors.push(`duplicate gap id: ${gap.id}`);
  ids.add(gap.id);
  if (!Array.isArray(gap.missingFields) || !gap.missingFields.length) errors.push(`${gap.id}: missingFields required`);
  if (!Array.isArray(gap.officialSourcesChecked) || !gap.officialSourcesChecked.length) errors.push(`${gap.id}: officialSourcesChecked required`);
  if (!Array.isArray(gap.availableEvidence) || !gap.availableEvidence.length) errors.push(`${gap.id}: availableEvidence required`);
  if (!Array.isArray(gap.sourceTargets) || !gap.sourceTargets.length) errors.push(`${gap.id}: sourceTargets required`);
  if (!Array.isArray(gap.acceptanceCriteria) || !gap.acceptanceCriteria.length) errors.push(`${gap.id}: acceptanceCriteria required`);
  for (const url of gap.officialSourcesChecked ?? []) {
    try { if (new URL(url).protocol !== 'https:') errors.push(`${gap.id}: source must use HTTPS`); } catch { errors.push(`${gap.id}: invalid source URL`); }
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Domain source-gap registry valid (${gaps.length} known gaps).`);
