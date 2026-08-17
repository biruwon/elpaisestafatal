import { readFile } from 'node:fs/promises';
import * as esbuild from 'esbuild';

const bundled = await esbuild.build({ entryPoints: ['src/data/claimIndex.ts'], bundle: true, format: 'esm', platform: 'node', write: false });
const index = await import(`data:text/javascript,${encodeURIComponent(new TextDecoder().decode(bundled.outputFiles[0].contents))}`);
const entries = JSON.parse(await readFile('dist/claim-catalog.json', 'utf8'));

const cases = [
  ['residencia-desde-primer-dia-trabajo', 'Si vienes con contrato te dan papeles al llegar'],
  ['residencia-desde-primer-dia-trabajo', 'Basta con encontrar trabajo para obtener residencia automáticamente'],
  ['espana-politica-inmigracion-puertas-abiertas', 'En España entra cualquiera sin control'],
  ['espana-politica-inmigracion-puertas-abiertas', 'España no pone límites a la inmigración'],
  ['ocupacion-respaldo-gobierno-delito-leve', 'El Gobierno protege a los okupas'],
  ['ocupacion-respaldo-gobierno-delito-leve', 'Ocupar una casa solo es un delito leve'],
  ['alquileres-suben-oferta-inseguridad', 'El alquiler sube porque los propietarios no tienen seguridad jurídica'],
  ['alquileres-suben-oferta-inseguridad', 'La falta de vivienda y las leyes anti-casero disparan los alquileres'],
  ['presion-fiscal-mas-alta-historia', 'Nunca habíamos tenido tanta presión fiscal'],
  ['presion-fiscal-mas-alta-historia', 'España soporta una presión fiscal récord'],
  ['vivienda-triplica-en-tres-anos', 'Mi piso vale el triple que cuando lo compré hace tres años'],
  ['vivienda-triplica-en-tres-anos', 'En solo tres años la vivienda cuesta tres veces más'],
];

for (const [expectedSlug, text] of cases) {
  const ranked = index.rankClaimIndex(text, entries, 4);
  const primary = ranked[0];
  if (!primary || primary.slug !== expectedSlug || !index.isStrongClaimMatch(primary)) {
    throw new Error(`${text}: expected ${expectedSlug}, got ${primary?.slug || 'uncovered'} (${primary?.score || 0})`);
  }
}

const negatives = [
  ['presion-fiscal-mas-alta-historia', 'España tiene una presión fiscal baja'],
  ['vivienda-triplica-en-tres-anos', 'El precio de compra de la vivienda ha bajado'],
  ['ocupacion-respaldo-gobierno-delito-leve', 'La ocupación está prohibida en todos los casos'],
];
for (const [forbiddenSlug, text] of negatives) {
  const primary = index.rankClaimIndex(text, entries, 4)[0];
  if (primary?.slug === forbiddenSlug && index.isStrongClaimMatch(primary)) throw new Error(`${text}: incompatible proposition was promoted`);
}

console.log(`Published paraphrase routing passed: ${cases.length} variants and ${negatives.length} negative controls.`);
