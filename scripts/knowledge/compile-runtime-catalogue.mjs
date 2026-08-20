import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const claimsDir = path.join(root, 'content/claims');
const output = path.join(root, 'functions/lib/generated-catalogue.ts');
const normalise = (value) => String(value).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
const parseValue = (value) => { try { return JSON.parse(value); } catch { return []; } };
const field = (frontmatter, name) => frontmatter.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1]?.trim() || '';
const section = (raw, heading) => raw.match(new RegExp(`##\\s+${heading}\\s*\\n\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i'))?.[1]?.trim().replace(/\n+/g, ' ') || '';
const familyFor = (topics, claim) => {
  const text = normalise(`${topics.join(' ')} ${claim}`);
  if (/vivienda|alquiler|piso|casa/.test(text)) return 'vivienda-precios';
  if (/corrup|robo|roban|contratacion|soborno/.test(text)) return 'integridad-publica';
  if (/empleo|paro|salario|sueldo|nomina|trabaj/.test(text)) return 'empleo-poder-adquisitivo';
  if (/inmigr|extranj|poblacion|demograf/.test(text)) return 'inmigracion-demografia';
  if (/sanidad|hospital|salud|medic|espera/.test(text)) return 'sanidad-servicios';
  if (/impuesto|iva|fiscal|deuda|presupuesto/.test(text)) return 'fiscalidad-cuentas-publicas';
  if (/politic|gobierno|presidente|pais|espana/.test(text)) return 'gobierno-politicas';
  return normalise(topics[0] || 'general').replace(/ /g, '-').slice(0, 64) || 'general';
};
const hashVector = (text, size = 64) => {
  const vector = Array.from({ length: size }, () => 0);
  for (const token of normalise(text).split(' ').filter((item) => item.length > 2)) {
    let hash = 2166136261;
    for (const char of token) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    vector[Math.abs(hash) % size] += 1;
  }
  const magnitude = Math.hypot(...vector) || 1;
  return vector.map((value) => Number((value / magnitude).toFixed(6)));
};
const entries = [];
const sources = new Map();
for (const file of (await readdir(path.join(root, 'content/sources'))).filter((name) => name.endsWith('.md'))) {
  const raw = await readFile(path.join(root, 'content/sources', file), 'utf8');
  const frontmatter = raw.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] || '';
  const id = field(frontmatter, 'id').replace(/^['"]|['"]$/g, '');
  if (id) sources.set(id, { id, title: field(frontmatter, 'title').replace(/^['"]|['"]$/g, '') || id, publisher: field(frontmatter, 'type').replace(/^['"]|['"]$/g, '') || 'Fuente registrada', url: field(frontmatter, 'url').replace(/^['"]|['"]$/g, ''), date: field(frontmatter, 'date').replace(/^['"]|['"]$/g, '') });
}
for (const file of (await readdir(claimsDir)).filter((name) => name.endsWith('.md'))) {
  const raw = await readFile(path.join(claimsDir, file), 'utf8');
  const frontmatter = raw.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] || '';
  const claim = field(frontmatter, 'claim').replace(/^['"]|['"]$/g, '');
  if (!claim) continue;
  const aliases = parseValue(field(frontmatter, 'aliases')).filter((value) => typeof value === 'string');
  const topics = parseValue(field(frontmatter, 'topicSlugs')).filter((value) => typeof value === 'string');
  const status = field(frontmatter, 'status');
  if (status !== 'published' && status !== 'planned') continue;
  const slug = field(frontmatter, 'slug').replace(/^['"]|['"]$/g, '') || file.replace(/\.md$/, '');
  const basis = field(frontmatter, 'basis') === 'model' ? 'model' : 'sourced';
  const assessment = field(frontmatter, 'assessment').replace(/^['"]|['"]$/g, '');
  const family = familyFor(topics, claim);
  const formulations = [...new Set([claim, ...aliases])];
  const answer = field(frontmatter, 'shareable').replace(/^['"]|['"]$/g, '') || section(raw, 'Respuesta compartible') || claim;
  const sourceRefs = parseValue(field(frontmatter, 'sourceRefs'));
  entries.push({ slug, claim, aliases: formulations, answer, explanation: section(raw, 'Qué es cierto') || (basis === 'model' ? 'Esta respuesta está generada por IA y todavía no tiene fuentes verificadas.' : 'Respuesta basada en la ficha canónica y sus referencias publicadas.'), assessment, basis, status, family, topicSlugs: topics, geography: field(frontmatter, 'geography'), period: field(frontmatter, 'period'), evidenceIds: parseValue(field(frontmatter, 'evidenceIds')), sourceRefs, sources: sourceRefs.map((id) => sources.get(id)).filter(Boolean), vector: hashVector(formulations.join(' ')), semanticSignatures: formulations.map((phrase) => normalise(phrase)).filter(Boolean), semanticFamilyKeys: [...new Set([family, ...topics.map((topic) => normalise(topic))].filter(Boolean))] });
}
entries.sort((left, right) => left.slug.localeCompare(right.slug));
const version = process.env.CATALOGUE_VERSION || `claims-${entries.length}-${Date.now()}`;
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `// Generated by scripts/knowledge/compile-runtime-catalogue.mjs. Do not edit.\nexport type RuntimeCatalogueEntry = { slug: string; claim: string; aliases: string[]; answer: string; explanation: string; assessment: string; basis: 'sourced' | 'model'; status: 'published' | 'planned'; family: string; topicSlugs: string[]; geography: string; period: string; evidenceIds: string[]; sourceRefs: string[]; sources: Array<{ id: string; title: string; publisher: string; url: string; date: string }>; vector: number[]; semanticSignatures: string[]; semanticFamilyKeys: string[] };\nexport type RuntimeCatalogue = { version: string; generatedAt: string; entries: RuntimeCatalogueEntry[] };\nexport const runtimeCatalogue: RuntimeCatalogue = ${JSON.stringify({ version, generatedAt: new Date().toISOString(), entries })};\n`);
console.log(`Runtime catalogue compiled: ${entries.length} entries -> ${output}`);
