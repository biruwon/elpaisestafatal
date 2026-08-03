import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const contentRoot = new URL('../../content/', import.meta.url).pathname;
const records = [];

const walk = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (file.endsWith('.md') && !file.endsWith('/README.md')) records.push({ file, raw: await readFile(file, 'utf8') });
  }
};

const frontmatter = (raw) => {
  const block = raw.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] || '';
  return Object.fromEntries(block.split('\n').flatMap((line) => {
    const index = line.indexOf(':');
    return index >= 0 ? [[line.slice(0, index).trim(), line.slice(index + 1).trim()]] : [];
  }));
};

const list = (value) => {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

await walk(contentRoot);

const sources = new Set(records.filter(({ file }) => file.includes('/sources/')).map(({ raw }) => frontmatter(raw).id));
const evidence = new Map(records.filter(({ file }) => file.includes('/evidence/')).map(({ raw }) => {
  const data = frontmatter(raw);
  return [data.id, data];
}));
const claims = records.filter(({ file }) => file.includes('/claims/')).map(({ file, raw }) => ({ file, ...frontmatter(raw) }));
const failures = [];
const propositions = [];
try {
  const propositionDirectory = join(contentRoot, 'propositions');
  for (const file of await readdir(propositionDirectory)) {
    if (!file.endsWith('.json')) continue;
    try { propositions.push({ file: join(propositionDirectory, file), data: JSON.parse(await readFile(join(propositionDirectory, file), 'utf8')) }); }
    catch { failures.push(`${join(propositionDirectory, file)}: proposition is not valid JSON`); }
  }
} catch { failures.push(`${join(contentRoot, 'propositions')}: proposition directory is missing`); }
if (propositions.length === 0) failures.push(`${join(contentRoot, 'propositions')}: no proposition records found`);
const propositionMap = new Map();
const propositionTypes = new Set(['descriptive', 'comparative', 'definition', 'trend', 'causal', 'predictive', 'legal', 'normative', 'mixed']);
const propositionStatuses = new Set(['supported', 'contradicted', 'qualified', 'insufficient', 'unreviewed']);

for (const item of propositions) {
  const data = item.data || {};
  if (!data.id || typeof data.id !== 'string') failures.push(`${item.file}: proposition is missing id`);
  else if (propositionMap.has(data.id)) failures.push(`${item.file}: duplicate proposition id ${data.id}`);
  else propositionMap.set(data.id, data);
  if (!data.claimSlug || typeof data.claimSlug !== 'string') failures.push(`${item.file}: proposition is missing claimSlug`);
  if (!data.text || typeof data.text !== 'string') failures.push(`${item.file}: proposition is missing text`);
  if (!propositionTypes.has(data.type)) failures.push(`${item.file}: proposition has invalid type ${data.type}`);
  if (!propositionStatuses.has(data.status)) failures.push(`${item.file}: proposition has invalid status ${data.status}`);
  if (!Array.isArray(data.evidenceIds) || data.evidenceIds.length === 0) failures.push(`${item.file}: proposition has no evidence references`);
  for (const evidenceId of Array.isArray(data.evidenceIds) ? data.evidenceIds : []) {
    if (!evidence.has(evidenceId)) failures.push(`${item.file}: proposition references missing evidence ${evidenceId}`);
  }
}

const relationshipPath = join(contentRoot, 'relationships', 'evidence-proposition-links.json');
let relationshipManifest;
try {
  relationshipManifest = JSON.parse(await readFile(relationshipPath, 'utf8'));
} catch {
  failures.push(`${relationshipPath}: evidence relationship manifest is missing or invalid JSON`);
  relationshipManifest = { schemaVersion: 0, links: [] };
}

const relationshipTypes = new Set(['supports', 'contradicts', 'qualifies', 'context', 'insufficient']);
const relationshipStatuses = new Set(['unreviewed', 'reviewed', 'superseded']);
const expectedRelationshipForStatus = {
  supported: 'supports',
  contradicted: 'contradicts',
  qualified: 'qualifies',
  insufficient: 'insufficient',
  unreviewed: 'context',
};
const relationshipMap = new Map();
if (relationshipManifest.schemaVersion !== 1) failures.push(`${relationshipPath}: schemaVersion must be 1`);
if (!Array.isArray(relationshipManifest.links)) failures.push(`${relationshipPath}: links must be an array`);
for (const link of Array.isArray(relationshipManifest.links) ? relationshipManifest.links : []) {
  const key = `${link.evidenceId}::${link.propositionId}`;
  if (!link.evidenceId || !link.propositionId) failures.push(`${relationshipPath}: relationship is missing evidenceId or propositionId`);
  if (relationshipMap.has(key)) failures.push(`${relationshipPath}: duplicate relationship ${key}`);
  relationshipMap.set(key, link);
  if (!relationshipTypes.has(link.relationship)) failures.push(`${relationshipPath}: invalid relationship ${link.relationship} for ${key}`);
  if (!relationshipStatuses.has(link.reviewStatus)) failures.push(`${relationshipPath}: invalid reviewStatus for ${key}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(link.reviewedAt || '')) failures.push(`${relationshipPath}: ${key} is missing reviewedAt`);
  if (!evidence.has(link.evidenceId)) failures.push(`${relationshipPath}: relationship references missing evidence ${link.evidenceId}`);
  const proposition = propositionMap.get(link.propositionId);
  if (!proposition) failures.push(`${relationshipPath}: relationship references missing proposition ${link.propositionId}`);
  else if (expectedRelationshipForStatus[proposition.status] !== link.relationship) {
    failures.push(`${relationshipPath}: ${key} relationship ${link.relationship} does not match proposition status ${proposition.status}`);
  }
}

for (const proposition of propositions.map((item) => item.data)) {
  for (const evidenceId of Array.isArray(proposition.evidenceIds) ? proposition.evidenceIds : []) {
    const key = `${evidenceId}::${proposition.id}`;
    if (!relationshipMap.has(key)) failures.push(`${relationshipPath}: missing relationship for ${key}`);
  }
}

for (const item of records.filter(({ file }) => file.includes('/evidence/'))) {
  const data = frontmatter(item.raw);
  if (!data.id) failures.push(`${item.file}: evidence is missing id`);
  for (const sourceId of list(data.sourceIds)) {
    if (!sources.has(sourceId)) failures.push(`${item.file}: evidence references missing source ${sourceId}`);
  }
}

for (const claim of claims) {
  for (const sourceId of list(claim.sourceRefs)) {
    if (!sources.has(sourceId)) failures.push(`${claim.file}: claim references missing source ${sourceId}`);
  }
  for (const evidenceId of list(claim.evidenceIds)) {
    if (!evidence.has(evidenceId)) failures.push(`${claim.file}: claim references missing evidence ${evidenceId}`);
  }
  if (claim.status === 'published' && list(claim.evidenceIds).length === 0) {
    failures.push(`${claim.file}: published claim has no evidence references`);
  }
  const propositionIds = list(claim.propositionIds);
  if (claim.status === 'published' && propositionIds.length === 0) failures.push(`${claim.file}: published claim has no proposition references`);
  for (const propositionId of propositionIds) {
    const proposition = propositionMap.get(propositionId);
    if (!proposition) failures.push(`${claim.file}: claim references missing proposition ${propositionId}`);
    else {
      if (proposition.claimSlug !== claim.slug) failures.push(`${claim.file}: proposition ${propositionId} belongs to ${proposition.claimSlug}`);
      for (const evidenceId of list(proposition.evidenceIds)) if (!list(claim.evidenceIds).includes(evidenceId)) failures.push(`${claim.file}: proposition ${propositionId} evidence ${evidenceId} is not linked by the claim`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Knowledge relations passed: ${claims.length} claims, ${propositions.length} propositions, ${evidence.size} evidence records, ${sources.size} sources.`);
console.log(`Evidence relationships passed: ${relationshipMap.size} proposition links.`);
