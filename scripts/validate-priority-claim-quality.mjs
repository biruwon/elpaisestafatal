import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const priority = {
  'residencia-desde-primer-dia-trabajo': ['residencia', 'trabajar'],
  'espana-politica-inmigracion-puertas-abiertas': ['entrada', 'residencia', 'expuls'],
  'ocupacion-respaldo-gobierno-delito-leve': ['ocup', 'delito leve', 'gobierno'],
  'alquileres-suben-oferta-inseguridad': ['alquiler', 'oferta', 'inseguridad jurídica'],
  'presion-fiscal-mas-alta-historia': ['máximo', 'historia', 'PIB'],
  'vivienda-triplica-en-tres-anos': ['vivienda', 'triple', 'casa'],
};
const failures = [];
for (const [slug, terms] of Object.entries(priority)) {
  const body = await readFile(join(root, 'content/claims', `${slug}.md`), 'utf8');
  const response = body.match(/^## Respuesta compartible\s*\n+([\s\S]*?)(?=\n## |$)/m)?.[1]?.trim() || '';
  const evidenceIds = body.match(/^evidenceIds:\s*\[(.*?)\]/m)?.[1] || '';
  if (response.length < 80) failures.push(`${slug}: shared response is too short to answer the central doubt`);
  if (!evidenceIds.trim()) failures.push(`${slug}: no evidence IDs are mapped in frontmatter`);
  for (const term of terms) if (!response.toLocaleLowerCase('es').includes(term.toLocaleLowerCase('es'))) failures.push(`${slug}: shared response does not address “${term}”`);
  if (/Los datos disponibles no permiten concluir más de lo indicado\./.test(response)) failures.push(`${slug}: shared response is generic filler`);
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Priority claim quality passed: ${Object.keys(priority).length} high-recurrence claims answer their central doubts with mapped evidence.`);
