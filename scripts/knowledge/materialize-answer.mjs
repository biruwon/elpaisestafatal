import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = new Map(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), values[index + 1] && !values[index + 1].startsWith('--') ? values[index + 1] : 'true']);
  return pairs;
}, []));
const inputPath = args.get('input');
const slug = args.get('slug');
if (!inputPath || !slug || args.get('approved') !== 'true') {
  console.error('Usage: npm run knowledge:materialize -- --input answer.json --slug canonical-slug --approved');
  console.error('Materialization requires explicit owner approval and a structured answer with evidence/source IDs.');
  process.exit(1);
}

const answer = JSON.parse(await readFile(inputPath, 'utf8'));
if (answer.reviewed !== true && answer.reviewStatus !== 'reviewed') throw new Error('Materialization requires answer.reviewed=true or answer.reviewStatus="reviewed".');
const evidenceIds = Array.isArray(answer.evidenceIds) ? answer.evidenceIds.filter((id) => typeof id === 'string') : [];
const sourceRefs = Array.isArray(answer.sourceIds) ? answer.sourceIds.filter((id) => typeof id === 'string') : [];
if (!evidenceIds.length || !sourceRefs.length) throw new Error('Cannot materialize an answer without evidenceIds and sourceIds.');
const idsFromDirectory = async (directory) => {
  const files = (await readdir(directory)).filter((file) => file.endsWith('.md'));
  const ids = new Set();
  for (const file of files) {
    const raw = await readFile(join(directory, file), 'utf8');
    const match = raw.match(/^id:\s*["']?([^"'\n]+)["']?/m);
    if (match) ids.add(match[1].trim());
  }
  return ids;
};
const evidenceDirectory = new URL('../../content/evidence/', import.meta.url).pathname;
const sourceDirectory = new URL('../../content/sources/', import.meta.url).pathname;
const [knownEvidence, knownSources] = await Promise.all([idsFromDirectory(evidenceDirectory), idsFromDirectory(sourceDirectory)]);
const missingEvidence = evidenceIds.filter((id) => !knownEvidence.has(id));
const missingSources = sourceRefs.filter((id) => !knownSources.has(id));
if (missingEvidence.length || missingSources.length) throw new Error(`Materialization requires reviewed Git records. Missing evidence: ${missingEvidence.join(', ') || 'none'}; missing sources: ${missingSources.join(', ') || 'none'}.`);
const target = new URL(`../../content/claims/${slug}.md`, import.meta.url).pathname;
try { await access(target); throw new Error(`Claim already exists: ${slug}`); } catch (error) { if (error.message.startsWith('Claim already exists')) throw error; }

const quote = (value) => JSON.stringify(String(value || '').slice(0, 4000));
const aliases = [...new Set([...(Array.isArray(answer.aliases) ? answer.aliases : []), ...(args.get('aliases') ? args.get('aliases').split('|') : [])].map((value) => String(value).trim()).filter(Boolean))].slice(0, 12);
const assessments = ['true', 'mostly-true', 'misleading', 'unsupported', 'uncertain', 'false'];
const body = `## Qué es cierto\n\n${String(answer.summary || answer.headline || '').trim()}\n\n## Qué falta\n\n${String(answer.limitation || 'La respuesta depende del alcance, periodo y definición de la evidencia disponible.').trim()}\n\n## Límite\n\nEsta aclaración fue materializada desde un plan estructurado revisado. No debe interpretarse más allá de las fuentes y del periodo indicados.\n\n## Respuesta compartible\n\n${String(answer.summary || '').trim()}\n`;
const frontmatter = `---
slug: ${slug}
claim: ${quote(answer.headline || slug)}
assessment: ${assessments.includes(answer.assessment) ? answer.assessment : 'uncertain'}
topicSlugs: ["${String(args.get('topic') || 'general').replace(/"/g, '')}"]
aliases: ${JSON.stringify(aliases)}
claimType: ${['descriptive', 'comparative', 'causal', 'predictive', 'legal', 'normative', 'mixed'].includes(answer.claimType) ? answer.claimType : 'mixed'}
evidenceStrength: ${answer.coverage === 'strong' ? 'high' : 'limited'}
geography: ${quote(answer.geography || 'España')}
period: ${quote(answer.period || 'actualidad')}
reviewed: ${new Date().toISOString().slice(0, 10)}
status: published
sourceRefs: ${JSON.stringify(sourceRefs)}
evidenceIds: ${JSON.stringify(evidenceIds)}
---

`;
await mkdir(join(new URL('../../content/claims/', import.meta.url).pathname), { recursive: true });
await writeFile(target, frontmatter + body);
console.log(`Materialized reviewed claim: ${target}`);
