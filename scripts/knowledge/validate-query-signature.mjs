import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../../src/lib/knowledge/querySignature.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = await import(`data:text/javascript,${encodeURIComponent(output)}`);

const claimIndexSource = await readFile(new URL('../../src/data/claimIndex.ts', import.meta.url), 'utf8');
const claimIndexOutput = ts.transpileModule(
  `const semanticQuerySignature = (() => {\n${source.replaceAll('export ', '')}\nreturn semanticQuerySignature;\n})();\n${claimIndexSource.replace("import { semanticQuerySignature } from '../lib/knowledge/querySignature';", '')}`,
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
).outputText;
const claimIndex = await import(`data:text/javascript,${encodeURIComponent(claimIndexOutput)}`);

const equivalent = [
  ['Los inmigrantes reciben ayudas', 'ayudas inmigrantes reciben'],
  ['¿Los INMIGRANTES reciben   ayudas?', 'los inmigrantes reciben ayudas'],
];
for (const [left, right] of equivalent) {
  if (module.canonicalQuerySignature(left) !== module.canonicalQuerySignature(right)) throw new Error(`Equivalent inputs produced different signatures: ${left}`);
}
if (module.canonicalQuerySignature('España está destruida') === module.canonicalQuerySignature('España cobra demasiados impuestos')) throw new Error('Unrelated inputs produced the same signature');
if (module.semanticQuerySignature('Los inmigrantes crean inseguridad en España') !== module.semanticQuerySignature('La inmigración aumenta la delincuencia en España')) throw new Error('Equivalent semantic families produced different signatures');
const causalParaphrases = [
  'Los migrantes hacen que aumenten los delitos en España',
  'La llegada de extranjeros vuelve inseguro a España',
  'Con más inmigración hay más delitos en España',
  'Desde que hay más inmigración, hay más delitos en España',
  'Cuanto más inmigración, más delitos en España',
  'La inmigración está detrás del aumento de la delincuencia en España',
  'La inmigración está provocando más inseguridad en España',
  'La inmigración tiene la culpa de la delincuencia en España',
  'La inmigración hace crecer la delincuencia en España',
  'Desde que llegaron más inmigrantes hay más delitos',
];
for (const paraphrase of causalParaphrases) {
  if (module.semanticQuerySignature('Los inmigrantes crean inseguridad en España') !== module.semanticQuerySignature(paraphrase)) throw new Error(`Natural causal paraphrase produced a different signature: ${paraphrase}`);
}
if (module.semanticQuerySignature('Los inmigrantes crean inseguridad en España') === module.semanticQuerySignature('La inmigración y la delincuencia están relacionadas')) throw new Error('Association wording was incorrectly collapsed into a causal family');
if (module.semanticQuerySignature('La inmigración y la delincuencia están relacionadas en España') !== module.semanticQuerySignature('Existe una relación entre la delincuencia y la inmigración en España')) throw new Error('Equivalent association wording produced different signatures');
if (module.semanticQuerySignature('La inmigración y la delincuencia están relacionadas en España') !== module.semanticQuerySignature('La inmigración se relaciona con la delincuencia en España')) throw new Error('Informal association wording produced a different signature');
if (module.semanticQuerySignature('La inmigración y la delincuencia están relacionadas en España') === module.semanticQuerySignature('Los inmigrantes crean inseguridad en España')) throw new Error('Association wording collapsed into a causal signature');
if (module.semanticQuerySignature('Los inmigrantes crean inseguridad en España') === module.semanticQuerySignature('La inmigración no aumenta la delincuencia en España')) throw new Error('Opposing semantic families produced the same signature');
if (module.semanticQuerySignature('España cobra más impuestos que Europa') === module.semanticQuerySignature('Europa cobra más impuestos que España')) throw new Error('Reversed comparison families produced the same signature');
if (module.semanticQuerySignature('Cada vez hay más empleo en España') !== module.semanticQuerySignature('El empleo sube en España')) throw new Error('Natural rising-trend paraphrases produced different signatures');
if (module.semanticQuerySignature('Cada vez hay más empleo en España') !== module.semanticQuerySignature('El empleo ha subido en España')) throw new Error('Past-tense rising-trend paraphrase produced a different signature');
if (module.semanticQuerySignature('Cada vez hay más empleo en España') === module.semanticQuerySignature('Cada vez hay menos empleo en España')) throw new Error('Opposing trend directions produced the same signature');
if (module.semanticQuerySignature('La vivienda sigue encareciéndose') !== module.semanticQuerySignature('La vivienda sube')) throw new Error('Inflected rising-price wording produced a different signature');
if (module.semanticQuerySignature('Los precios no dejan de subir') !== module.semanticQuerySignature('Los precios suben')) throw new Error('Idiomatic persistent-rise wording produced a different signature');
if (module.semanticQuerySignature('Los precios no dejan de subir') === module.semanticQuerySignature('Los precios bajan')) throw new Error('Persistent-rise wording collapsed with the opposing trend');
if (!module.semanticQuerySignature('Los alquileres suben porque faltan viviendas').includes('causal:causes')) throw new Error('Porque connector did not preserve a causal semantic relation');
if (module.semanticQuerySignature('España está por encima de Europa en impuestos') === module.semanticQuerySignature('Europa está por encima de España en impuestos')) throw new Error('Reversed positional comparisons produced the same signature');
if (module.semanticQuerySignature('España tiene el paro más alto de Europa') !== module.semanticQuerySignature('España es el país con más paro de Europa')) throw new Error('Equivalent highest-ranking wording produced different signatures');
if (module.semanticQuerySignature('España tiene el paro más alto de Europa') !== module.semanticQuerySignature('España es el país con más paro')) throw new Error('Compressed highest-ranking wording produced different signatures');
if (module.semanticQuerySignature('España tiene el paro más alto de Europa') === module.semanticQuerySignature('España tiene el paro más bajo de Europa')) throw new Error('Highest and lowest ranking claims produced the same signature');
for (const wording of ['España lidera el paro en Europa', 'España encabeza el desempleo europeo', 'España está a la cabeza del paro en Europa']) {
  if (module.semanticQuerySignature('España tiene el paro más alto de Europa') !== module.semanticQuerySignature(wording)) throw new Error(`Natural highest-ranking wording produced a different signature: ${wording}`);
}
if (module.semanticQuerySignature('Primero los españoles') !== module.semanticQuerySignature('Los españoles antes que los extranjeros')) throw new Error('Equivalent priority wording produced different signatures');
if (module.semanticQuerySignature('España está peor que hace diez años') !== module.semanticQuerySignature('España está peor que hace diez años')) throw new Error('Relative comparison signature was not stable');
if (module.semanticQuerySignature('España está peor que hace diez años') === module.semanticQuerySignature('España está mejor que hace diez años')) throw new Error('Better and worse relative comparisons produced the same signature');
const debtStockSignature = module.semanticQuerySignature('La deuda pública en euros aumenta');
if (debtStockSignature !== module.semanticQuerySignature('La deuda de España en euros aumenta')) throw new Error('Absolute public-debt wording did not share a semantic family');
if (!debtStockSignature.includes('concept:public_debt_stock')) throw new Error('Absolute public-debt signature did not expose its specific concept');
if (debtStockSignature === module.semanticQuerySignature('La deuda pública supera el 100% del PIB')) throw new Error('Absolute public-debt stock was merged with debt-to-GDP ratio');
if (!module.semanticQuerySignature('Cuánto debe España en euros').includes('concept:public_debt_stock')) throw new Error('Absolute debt question was not routed to the debt-stock family');
if (!module.semanticQuerySignature('La deuda pública supera el 100% del PIB').includes('concept:public_debt_ratio')) throw new Error('Debt-to-GDP comparison was not routed to the ratio family');
if (!module.semanticQuerySignature('La deuda pública sobre el PIB sigue por encima del 100%').includes('concept:public_debt_ratio')) throw new Error('Debt-to-GDP wording was not routed to the ratio family');
const longTailFamilies = [
  ['Cada vez cuesta más llegar a fin de mes en España', 'La vida se ha encarecido en España'],
  ['La deuda pública de España crece', 'España está cada vez más endeudada'],
  ['Las listas de espera sanitarias están colapsadas', 'La sanidad está saturada por sus esperas largas'],
  ['La renta de las familias sube', 'Los ingresos familiares han aumentado'],
  ['Cada vez hay menos jóvenes en España', 'La población joven está disminuyendo en España'],
  ['Cada vez hay menos jóvenes que ni estudian ni trabajan en España', 'La tasa de ninis ha bajado en España'],
];
for (const [left, right] of longTailFamilies) {
  if (module.semanticQuerySignature(left) !== module.semanticQuerySignature(right)) throw new Error(`Long-tail semantic family did not merge: ${left} / ${right}`);
}
if (module.semanticQuerySignature('Cada vez cuesta más llegar a fin de mes en España') === module.semanticQuerySignature('La deuda pública de España crece')) throw new Error('Cost-of-living and public-finance families were merged');
if (module.semanticQuerySignature('La sanidad no da abasto con las listas de espera') === module.semanticQuerySignature('España gasta más por habitante en sanidad')) throw new Error('Health access and health spending families were merged');
if (module.semanticQuerySignature('La tasa de ninis ha bajado en España') === module.semanticQuerySignature('El paro juvenil ha bajado en España')) throw new Error('NEET and youth unemployment families were merged');
if (module.semanticQuerySignature('España está destruida') === module.semanticQuerySignature('España cobra demasiados impuestos')) throw new Error('Unrelated semantic families produced the same signature');
const semanticIndexEntries = [
  { kind: 'claim', slug: 'inmigracion-delincuencia', title: 'La inmigración aumenta la delincuencia', href: '/', aliases: ['Los inmigrantes crean inseguridad'], keywords: [] },
  { kind: 'claim', slug: 'espana-impuestos-europa', title: 'España cobra menos impuestos sobre renta y riqueza que la Unión Europea', href: '/', aliases: [], keywords: [] },
];
const semanticIndexMatch = claimIndex.rankClaimIndex('Desde que llegaron más extranjeros hay más inseguridad', semanticIndexEntries, 2)[0];
if (!semanticIndexMatch || semanticIndexMatch.slug !== 'inmigracion-delincuencia' || !claimIndex.isStrongClaimMatch(semanticIndexMatch)) throw new Error('Claim index did not route a causal paraphrase to the published family');
const vagueTaxMatch = claimIndex.rankClaimIndex('España cobra demasiados impuestos', semanticIndexEntries, 2)[0];
if (vagueTaxMatch?.slug === 'espana-impuestos-europa' && claimIndex.isStrongClaimMatch(vagueTaxMatch)) throw new Error('Claim index over-routed a vague tax complaint to a comparative tax claim');
const vagueEmploymentMatch = claimIndex.rankClaimIndex('La economía y el empleo van a peor', semanticIndexEntries, 2)[0];
if (vagueEmploymentMatch && claimIndex.isStrongClaimMatch(vagueEmploymentMatch)) throw new Error('Claim index over-routed a broad employment complaint to a specific claim');
console.log('Query signature validation passed.');
