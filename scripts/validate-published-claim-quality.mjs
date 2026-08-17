import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const claimsDir = join(root, 'content/claims');
const requiredSections = ['Qué es cierto', 'Qué falta', 'Escala', 'Límite', 'Respuesta compartible'];
const genericGap = 'Los datos disponibles no permiten concluir más de lo indicado.';
const failures = [];

for (const file of (await readdir(claimsDir)).filter((name) => name.endsWith('.md'))) {
  const raw = await readFile(join(claimsDir, file), 'utf8');
  const frontmatter = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/m)?.[1] || '';
  if (!/status:\s*published\b/.test(frontmatter)) continue;
  const body = raw.replace(/^---[\s\S]*?---\s*/, '');
  for (const section of requiredSections) {
    const matches = body.match(new RegExp(`^## ${section}$`, 'gm')) || [];
    if (matches.length !== 1) failures.push(`${file}: expected one ## ${section} section`);
  }
  const missing = body.match(/^## Qué falta$\n+([\s\S]*?)(?=\n## |$)/m)?.[1]?.trim() || '';
  if (missing === genericGap) failures.push(`${file}: generic evidence-gap text hides the specific missing evidence`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Published claim quality passed: required evidence sections are explicit and renderable.');
