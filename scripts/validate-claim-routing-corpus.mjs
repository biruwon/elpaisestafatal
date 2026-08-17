import { readFile } from 'node:fs/promises';
import * as esbuild from 'esbuild';

const bundled = await esbuild.build({ entryPoints: ['src/data/claimIndex.ts'], bundle: true, format: 'esm', platform: 'node', write: false });
const index = await import(`data:text/javascript,${encodeURIComponent(new TextDecoder().decode(bundled.outputFiles[0].contents))}`);
const entries = JSON.parse(await readFile('dist/claim-catalog.json', 'utf8'));
const published = entries.filter((entry) => entry.kind === 'claim');
const failures = [];
const warnings = [];
let examples = 0;
for (const entry of published) {
  const aliases = [entry.title, ...(entry.aliases || [])];
  const reviewed = aliases.filter((text) => text === entry.title || text.trim().split(/\s+/).length >= 4);
  if (reviewed.length < 4) warnings.push(`${entry.slug}: fewer than three reviewed language examples`);
  for (const text of reviewed) {
    examples += 1;
    const primary = index.rankClaimIndex(text, entries, 4)[0];
    if (!primary || primary.slug !== entry.slug || !index.isStrongClaimMatch(primary)) failures.push(`${entry.slug}: reviewed wording did not route to itself: ${text}`);
  }
}
const negatives = [
  ['presion-fiscal-mas-alta-historia', 'La presión fiscal es baja'],
  ['vivienda-triplica-en-tres-anos', 'La vivienda ha bajado de precio'],
  ['ocupacion-respaldo-gobierno-delito-leve', 'La ocupación está prohibida en todos los casos'],
  ['espana-politica-inmigracion-puertas-abiertas', 'La inmigración está completamente controlada'],
  ['inmigrantes-delinquen-y-piden-ayudas', 'Los inmigrantes reciben ayudas'],
  ['inmigrantes-delinquen-y-piden-ayudas', 'Los inmigrantes cometen delitos'],
];
for (const [forbidden, text] of negatives) {
  const primary = index.rankClaimIndex(text, entries, 4)[0];
  if (primary?.slug === forbidden && index.isStrongClaimMatch(primary)) failures.push(`incompatible wording promoted ${forbidden}: ${text}`);
}
if (failures.length) { console.error(failures.slice(0, 40).join('\n')); process.exit(1); }
console.log(`Claim routing corpus passed: ${published.length} published claims, ${examples} reviewed language examples, ${negatives.length} incompatibility controls.`);
if (warnings.length) console.warn(`Routing corpus coverage warnings (${warnings.length}): ${warnings.slice(0, 10).join('; ')}`);
