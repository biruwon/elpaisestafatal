import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
const normaliseClaimText = (value) => String(value).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
const claimsDirectory = new URL('../../content/claims/', import.meta.url).pathname;
const parseList = (value) => { try { return JSON.parse(value.replace(/'/g, '"')); } catch { return []; } };
const catalogueEntries = [];
for (const file of (await readdir(claimsDirectory)).filter((item) => item.endsWith('.md'))) {
  const raw = await readFile(`${claimsDirectory}${file}`, 'utf8');
  const frontmatter = raw.match(/^---\s*\n([\s\S]*?)\n---/m)?.[1] || '';
  const field = (name) => frontmatter.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1]?.trim() || '';
  const slug = field('slug') || file.replace(/\.md$/, '');
  const claim = field('claim').replace(/^['"]|['"]$/g, '');
  const aliases = parseList(field('aliases'));
  if (claim) catalogueEntries.push({ id: slug, slug, claim, aliases, basis: field('basis') === 'model' ? 'model' : 'sourced', visibility: 'browsable' });
}

const output = process.argv.find((value) => value.startsWith('--output='))?.slice(9) || '.local/catalogue-seed.json';
const variantsFor = (entry) => {
  const claim = entry.claim.replace(/[¿?¡!]/g, '').trim();
  const forms = new Set([claim, ...entry.aliases]);
  for (const base of [...forms]) {
    const lower = base.charAt(0).toLocaleLowerCase('es') + base.slice(1);
    forms.add(lower);
    forms.add(`¿Es cierto que ${lower}?`);
    forms.add(`¿De verdad ${lower}?`);
    forms.add(`Se dice que ${lower}`);
    forms.add(`${lower}, ¿sí o no?`);
    forms.add(`¿Qué hay de cierto en que ${lower}?`);
    forms.add(`Comprueba si ${lower}`);
    forms.add(`Hay quien afirma que ${lower}`);
    forms.add(`¿Pasa esto en España: ${lower}?`);
    forms.add(`¿Los datos confirman que ${lower}?`);
    forms.add(`¿Los datos desmienten que ${lower}?`);
    forms.add(`¿Se sostiene la frase «${lower}»?`);
    forms.add(`¿Es verdad o bulo: ${lower}?`);
    forms.add(`¿Cómo sabemos si ${lower}?`);
    forms.add(`Necesito comprobar si ${lower}`);
    forms.add(`Me han enviado que ${lower}`);
    forms.add(`He leído que ${lower}`);
    forms.add(`¿Tiene fuentes la afirmación de que ${lower}?`);
    forms.add(`¿Qué dicen las cifras sobre si ${lower}?`);
    forms.add(`¿Hay pruebas de que ${lower}?`);
    forms.add(`¿Es correcto decir que ${lower}?`);
    forms.add(`¿Se cumple que ${lower}?`);
    forms.add(`¿De dónde sale que ${lower}?`);
    forms.add(`Comprueba esta frase: ${lower}`);
    forms.add(`Esto es cierto: ${lower}`);
    forms.add(`Esto es falso: ${lower}`);
    forms.add(`España va mal porque ${lower}`);
    forms.add(`España va bien porque ${lower}`);
    forms.add(`¿Qué parte es cierta de que ${lower}?`);
    forms.add(`¿Qué parte es falsa de que ${lower}?`);
    forms.add(`¿Hay datos para afirmar que ${lower}?`);
    forms.add(`¿Se puede verificar que ${lower}?`);
    forms.add(`¿Qué evidencia respalda que ${lower}?`);
    forms.add(`¿Qué evidencia contradice que ${lower}?`);
    forms.add(`¿La frase ${lower} necesita contexto?`);
    forms.add(`¿La afirmación es demasiado amplia: ${lower}?`);
    forms.add(`¿Coincide con la realidad que ${lower}?`);
    forms.add(`¿Está documentado que ${lower}?`);
    forms.add(`¿Lo confirma una fuente oficial: ${lower}?`);
    forms.add(`¿Qué sabemos realmente de que ${lower}?`);
    forms.add(`¿Hay una cifra detrás de que ${lower}?`);
    forms.add(`¿Se refiere a toda España cuando dice que ${lower}?`);
    forms.add(`¿Se refiere a todos cuando dice que ${lower}?`);
    forms.add(`¿Es una tendencia o un caso aislado: ${lower}?`);
    forms.add(`¿Desde cuándo se afirma que ${lower}?`);
    forms.add(`¿En qué periodo se cumple que ${lower}?`);
    forms.add(`¿En qué territorio se cumple que ${lower}?`);
    forms.add(`¿Qué significa exactamente que ${lower}?`);
    forms.add(`¿Alguien puede comprobar que ${lower}?`);
    forms.add(`¿Esto está bien dicho: ${lower}?`);
    forms.add(`¿Bulo o dato: ${lower}?`);
    // Commonly inverted or colloquial openings preserve the same claim
    // while exercising the routing path used by real user questions.
    if (/^España\s+/i.test(base)) forms.add(base.replace(/^España\s+/i, 'En España '));
    if (/^Los\s+/i.test(base)) forms.add(base.replace(/^Los\s+/i, 'Hay '));
    if (/^La\s+/i.test(base)) forms.add(base.replace(/^La\s+/i, 'Existe '));
    if (/^El\s+/i.test(base)) forms.add(base.replace(/^El\s+/i, 'Existe '));
  }
  return [...forms].map((text) => text.trim()).filter((text) => text.length >= 12).slice(0, 72);
};

const records = [];
const seen = new Set();
const seenFormulations = new Map();
for (const entry of catalogueEntries) {
  for (const formulation of variantsFor(entry)) {
    const fingerprint = normaliseClaimText(formulation);
    if (!fingerprint || seen.has(`${entry.slug}:${fingerprint}`)) continue;
    if (seenFormulations.has(fingerprint) && seenFormulations.get(fingerprint) !== entry.slug) continue;
    seen.add(`${entry.slug}:${fingerprint}`);
    seenFormulations.set(fingerprint, entry.slug);
    records.push({ canonicalId: entry.id, slug: entry.slug, formulation, fingerprint, basis: entry.basis, visibility: entry.visibility });
  }
}
const outputPath = new URL(`../../${output.replace(/^\.\//, '')}`, import.meta.url).pathname;
await mkdir(outputPath.replace(/\/[^/]+$/, ''), { recursive: true });
await writeFile(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), canonicalEntries: catalogueEntries.length, formulations: records.length, records }, null, 2));
console.log(`Catalogue seed written: ${catalogueEntries.length} canonical entries, ${records.length} formulations -> ${output}`);
