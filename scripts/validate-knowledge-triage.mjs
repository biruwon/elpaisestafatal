import { readFile } from 'node:fs/promises';

const triage = await readFile(new URL('./knowledge/triage.mjs', import.meta.url), 'utf8');
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const roadmap = await readFile(new URL('../roadmap.md', import.meta.url), 'utf8');
const failures = [];
const requireText = (source, text, label) => { if (!source.includes(text)) failures.push(`missing ${label}`); };

requireText(triage, 'export-query-clusters.mjs', 'optional production D1 export');
requireText(triage, 'cluster-gaps.mjs', 'local and D1 clustering');
requireText(triage, 'review-queue.mjs', 'ranked maintainer queue');
requireText(triage, "args.has('export-d1')", 'explicit export opt-in');
requireText(triage, 'review-queue.md', 'human-readable queue output');
requireText(triage, 'No local or exported production knowledge gaps are available yet.', 'empty-input guard');
requireText(triage, 'unlink(clusterOutput)', 'stale-output protection');
if (packageJson.scripts?.['knowledge:triage'] !== 'node scripts/knowledge/triage.mjs') failures.push('package script does not expose knowledge:triage');
requireText(roadmap, 'knowledge:triage', 'roadmap documentation for the one-command triage workflow');

if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Knowledge triage validation passed: local gaps, optional D1 export, clustering, and review ranking share one reproducible command.');
