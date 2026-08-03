import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const retired = [
  'src/data/search.ts',
  'src/data/concernComparison.ts',
  'src/data/evidence.ts',
  'scripts/audit-investigations.mjs',
  'investigaciones/README.md',
  'investigaciones/corrupcion.md',
  'investigaciones/crisis-valores.md',
  'investigaciones/desigualdad.md',
  'investigaciones/economia.md',
  'investigaciones/empleo.md',
  'investigaciones/extremismos.md',
  'investigaciones/impuestos.md',
  'investigaciones/inmigracion.md',
  'investigaciones/juventud.md',
  'investigaciones/politica.md',
  'investigaciones/problemas-sociales.md',
  'investigaciones/sanidad.md',
  'investigaciones/seguridad.md',
  'investigaciones/vivienda.md',
];

const failures = [];
for (const relativePath of retired) {
  try {
    await access(join(root, relativePath));
    failures.push(`${relativePath} is an orphaned legacy module and must not return`);
  } catch {
    // Expected: dead modules are intentionally absent.
  }
}

const layout = await readFile(join(root, 'src/layouts/BaseLayout.astro'), 'utf8');
if (layout.includes("startsWith('/aclarar')") || layout.includes('startsWith("/aclarar")')) {
  failures.push('BaseLayout still contains the retired /aclarar compatibility branch');
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Dead data-module audit passed: retired orphaned modules are absent.');
