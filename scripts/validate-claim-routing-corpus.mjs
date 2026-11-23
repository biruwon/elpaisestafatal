import { readFile } from 'node:fs/promises';
import { deterministicFallbackCompiler } from './knowledge/fallback-compiler.mjs';
import { semanticFamilyKeys } from './knowledge/claim-family-routing.mjs';

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
const fixedDiscontinuous = published.find((entry) => entry.slug === 'fijos-discontinuos');
if (!Array.isArray(fixedDiscontinuous?.semanticFamilyKeys) || !fixedDiscontinuous.semanticFamilyKeys.length) {
  failures.push('fijos-discontinuos: published semantic family keys are missing');
} else {
  const fixedKeys = new Set(fixedDiscontinuous.semanticFamilyKeys);
  const overlapsPublishedFamily = (formulation) => semanticFamilyKeys(deterministicFallbackCompiler(formulation).semanticSignature)
    .some((key) => fixedKeys.has(key));
  for (const paraphrase of [
    'Los contratos fijos discontinuos esconden parte del desempleo estacional',
    'Los trabajadores fijos discontinuos son parados encubiertos',
  ]) if (!overlapsPublishedFamily(paraphrase)) failures.push(`fijos-discontinuos: semantic paraphrase did not find the reviewed family: ${paraphrase}`);
  for (const neighbour of [
    'El desempleo estacional está infravalorado',
    'Los temporales de hostelería esconden el paro estacional',
  ]) if (overlapsPublishedFamily(neighbour)) failures.push(`fijos-discontinuos: a nearby claim shared the published family: ${neighbour}`);
}
for (const [slug, phrase] of forbidden) {
  const entry = published.find((candidate) => candidate.slug === slug);
  if (entry?.aliases?.some((alias) => alias.toLocaleLowerCase('es') === phrase.toLocaleLowerCase('es'))) failures.push(`${slug}: incompatible formulation was catalogued`);
}

if (failures.length) { console.error(failures.slice(0, 40).join('\n')); process.exit(1); }
console.log(`Claim routing corpus passed: ${published.length} published claims, ${examples} indexed formulations, ${forbidden.length} incompatibility controls, fixed-discontinuous semantic paraphrases and neighbours.`);
