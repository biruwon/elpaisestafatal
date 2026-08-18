import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const input = process.env.CATALOGUE_CANDIDATES_INPUT || '.local/catalogue-model-candidates.json';
const outputDir = process.env.CATALOGUE_MODEL_OUTPUT_DIR || 'content/claims';
const slugify = (value) => String(value).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const quote = (value) => JSON.stringify(value);
const sourcePath = path.resolve(input);
const destination = path.resolve(outputDir);
const payload = JSON.parse(await readFile(sourcePath, 'utf8'));
const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
if (!candidates.length) throw new Error('No candidates found');
await mkdir(destination, { recursive: true });
const seen = new Set(); let written = 0;
for (const candidate of candidates) {
  if (candidate.basis !== 'model' || candidate.visibility !== 'searchable' || !candidate.fingerprint) continue;
  const slugBase = slugify(candidate.claim);
  if (!slugBase || seen.has(candidate.fingerprint)) continue;
  seen.add(candidate.fingerprint);
  const slug = `modelo-${slugBase}`;
  const aliases = [...new Set((candidate.aliases || []).map(String))].slice(0, 20);
  if (aliases.length < 10) continue;
  const frontmatter = [
    '---', `slug: ${quote(slug)}`, `claim: ${quote(candidate.claim)}`,
    'assessment: uncertain', `topicSlugs: ${quote([candidate.topic])}`, `aliases: ${quote(aliases)}`,
    `basis: model`, `visibility: searchable`, 'claimType: descriptive',
    'evidenceStrength: insufficient', 'geography: España', 'period: sin periodo especificado', `reviewed: ${quote(new Date().toISOString().slice(0, 10))}`, 'status: published',
    'sourceRefs: []', 'evidenceIds: []',
    `limitations: ${quote('Respuesta generada por IA; requiere fuentes verificadas antes de tratarse como evidencia.')}`,
    `generatedBy: ${quote(candidate.model || payload.model || 'unknown')}`,
    `generationPromptVersion: ${quote(candidate.promptVersion || payload.promptVersion || 'unknown')}`,
    `semanticFingerprint: ${quote(candidate.fingerprint)}`,
    `generatedAt: ${quote(payload.generatedAt || new Date().toISOString())}`,
    '---', '', '## Qué es cierto', '', 'Esta entrada está generada por IA y todavía no tiene fuentes verificadas; no establece que la afirmación sea verdadera.',
    '', '## Qué falta', '', 'Hay que localizar fuentes primarias y comprobar el periodo, territorio, población y definición antes de convertirla en una respuesta respaldada por datos.',
    '', '## Límite', '', 'No debe interpretarse como un hecho probado ni como una conclusión general sobre España.',
    '', '## Respuesta compartible', '', 'Esta afirmación está pendiente de verificación con fuentes; por ahora solo es una respuesta generada por IA.', '',
  ];
  await writeFile(path.join(destination, `${slug}.md`), frontmatter.join('\n'));
  written += 1;
}
console.log(`Materialized ${written} model catalogue records in ${destination}`);
