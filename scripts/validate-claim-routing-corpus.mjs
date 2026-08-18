import { readFile } from 'node:fs/promises';

const entries = JSON.parse(await readFile('dist/claim-catalog.json', 'utf8'));
const published = entries.filter((entry) => entry.kind === 'claim');
const failures = [];
let examples = 0;

for (const entry of published) {
  const formulations = [entry.title, ...(entry.aliases || [])].filter((value) => typeof value === 'string' && value.trim().length >= 12);
  if (formulations.length < 3) failures.push(`${entry.slug}: fewer than three routing formulations`);
  examples += formulations.length;
  if (!entry.slug || !entry.title || !entry.href || !Array.isArray(entry.aliases)) failures.push(`${entry.slug || 'unknown'}: malformed routing projection`);
}

const forbidden = [
  ['presion-fiscal-mas-alta-historia', 'La presión fiscal es baja'],
  ['vivienda-triplica-en-tres-anos', 'La vivienda ha bajado de precio'],
  ['inmigrantes-delinquen-y-piden-ayudas', 'Los inmigrantes reciben ayudas'],
];
for (const [slug, phrase] of forbidden) {
  const entry = published.find((candidate) => candidate.slug === slug);
  if (entry?.aliases?.some((alias) => alias.toLocaleLowerCase('es') === phrase.toLocaleLowerCase('es'))) failures.push(`${slug}: incompatible formulation was catalogued`);
}

if (failures.length) { console.error(failures.slice(0, 40).join('\n')); process.exit(1); }
console.log(`Claim routing corpus passed: ${published.length} published claims, ${examples} indexed formulations, ${forbidden.length} incompatibility controls.`);
