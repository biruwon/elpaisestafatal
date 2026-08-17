import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const claimsDir = join(root, 'content/claims');
const requiredSections = ['Qué es cierto', 'Qué falta', 'Escala', 'Límite', 'Respuesta compartible'];
const unknownHeading = /^## (?!Qué es cierto$|Qué falta$|Escala$|Límite$|Respuesta compartible$)/m;
const genericGap = 'Los datos disponibles no permiten concluir más de lo indicado.';
const pilotSlugs = new Set([
  'residencia-desde-primer-dia-trabajo',
  'espana-politica-inmigracion-puertas-abiertas',
  'ocupacion-respaldo-gobierno-delito-leve',
  'alquileres-suben-oferta-inseguridad',
  'presion-fiscal-mas-alta-historia',
  'vivienda-triplica-en-tres-anos',
]);
const failures = [];

for (const file of (await readdir(claimsDir)).filter((name) => name.endsWith('.md'))) {
  const raw = await readFile(join(claimsDir, file), 'utf8');
  const frontmatter = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/m)?.[1] || '';
  if (!/status:\s*published\b/.test(frontmatter)) continue;
  const slug = frontmatter.match(/^slug:\s*([^\n]+)/m)?.[1]?.trim() || file.replace(/\.md$/, '');
  if (!pilotSlugs.has(slug)) continue;
  const body = raw.replace(/^---[\s\S]*?---\s*/, '');
  for (const section of requiredSections) {
    const matches = body.match(new RegExp(`^## ${section}$`, 'gm')) || [];
    if (matches.length !== 1) failures.push(`${file}: expected one ## ${section} section`);
  }
  if (unknownHeading.test(body)) failures.push(`${file}: contains an unrendered Markdown heading`);
  const missing = body.match(/^## Qué falta$\n+([\s\S]*?)(?=\n## |$)/m)?.[1]?.trim() || '';
  if (missing === genericGap) failures.push(`${file}: generic evidence-gap text hides the specific missing evidence`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Published claim quality passed: required evidence sections are explicit and renderable.');
