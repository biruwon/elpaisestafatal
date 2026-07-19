import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
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
const evidenceIds = Array.isArray(answer.evidenceIds) ? answer.evidenceIds.filter((id) => typeof id === 'string') : [];
const sourceRefs = Array.isArray(answer.sourceIds) ? answer.sourceIds.filter((id) => typeof id === 'string') : [];
if (!evidenceIds.length || !sourceRefs.length) throw new Error('Cannot materialize an answer without evidenceIds and sourceIds.');
const target = new URL(`../../content/claims/${slug}.md`, import.meta.url).pathname;
try { await access(target); throw new Error(`Claim already exists: ${slug}`); } catch (error) { if (error.message.startsWith('Claim already exists')) throw error; }

const quote = (value) => JSON.stringify(String(value || '').slice(0, 4000));
const body = `## Qué es cierto\n\n${String(answer.summary || answer.headline || '').trim()}\n\n## Qué falta\n\n${String(answer.limitation || 'La respuesta depende del alcance, periodo y definición de la evidencia disponible.').trim()}\n\n## Límite\n\nEsta aclaración fue materializada desde un plan estructurado revisado. No debe interpretarse más allá de las fuentes y del periodo indicados.\n\n## Respuesta compartible\n\n${String(answer.summary || '').trim()}\n`;
const frontmatter = `---
slug: ${slug}
claim: ${quote(answer.headline || slug)}
assessment: uncertain
topicSlugs: ["${String(args.get('topic') || 'general').replace(/"/g, '')}"]
aliases: []
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
