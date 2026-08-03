import { readFile } from 'node:fs/promises';

const inputPath = process.argv[2] || '.local/query-clusters.json';
let parsed;
try {
  parsed = JSON.parse(await readFile(inputPath, 'utf8'));
} catch {
  console.log(`Query-cluster validation skipped: ${inputPath} is not available.`);
  process.exit(0);
}

const clusters = Array.isArray(parsed?.clusters) ? parsed.clusters : [];
const expected = new Map([
  ['la brecha salarial de genero es un mito', 'brecha-salarial-genero-no-es-mito'],
  ['la amnistia rompe la igualdad ante la ley', 'la-amnistia-rompe-la-igualdad-ante-la-ley'],
  ['la ley trans permite cambiar de sexo sin ningun control', 'la-ley-trans-permite-cambiar-de-sexo-sin-ningun-control'],
  ['desalojar a un ocupante ilegal tarda anos', 'desalojar-a-un-ocupante-ilegal-tarda-anos'],
  ['espana esta sufriendo un reemplazo poblacional', 'espana-esta-sufriendo-un-reemplazo-poblacional'],
  ['inmigratnes pagaran nuestras pensiones', 'inmigrantes-pensiones'],
  ['es verdad que el precio de la vivienda va a caer como en 2008', 'precio-vivienda-caera'],
]);

const failures = [];
for (const [text, slug] of expected) {
  const matches = clusters.filter((cluster) => cluster.text === text || cluster.signature.includes(text.replaceAll(' ', '+')) || cluster.linkedClaimSlug === slug);
  if (!matches.some((cluster) => cluster.linkedClaimSlug === slug && cluster.coverageStatus === 'covered' && cluster.reviewStatus === 'published' && cluster.unresolved === false)) {
    failures.push(`${text} was not reconciled to ${slug}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Query-cluster validation passed: ${expected.size} published families reconciled.`);
