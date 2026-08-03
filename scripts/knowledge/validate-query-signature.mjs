import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../../src/lib/knowledge/querySignature.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = await import(`data:text/javascript,${encodeURIComponent(output)}`);

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
if (module.semanticQuerySignature('España está por encima de Europa en impuestos') === module.semanticQuerySignature('Europa está por encima de España en impuestos')) throw new Error('Reversed positional comparisons produced the same signature');
if (module.semanticQuerySignature('España tiene el paro más alto de Europa') !== module.semanticQuerySignature('España es el país con más paro de Europa')) throw new Error('Equivalent highest-ranking wording produced different signatures');
if (module.semanticQuerySignature('España tiene el paro más alto de Europa') !== module.semanticQuerySignature('España es el país con más paro')) throw new Error('Compressed highest-ranking wording produced different signatures');
if (module.semanticQuerySignature('España tiene el paro más alto de Europa') === module.semanticQuerySignature('España tiene el paro más bajo de Europa')) throw new Error('Highest and lowest ranking claims produced the same signature');
if (module.semanticQuerySignature('España está peor que hace diez años') !== module.semanticQuerySignature('España está peor que hace diez años')) throw new Error('Relative comparison signature was not stable');
if (module.semanticQuerySignature('España está peor que hace diez años') === module.semanticQuerySignature('España está mejor que hace diez años')) throw new Error('Better and worse relative comparisons produced the same signature');
if (module.semanticQuerySignature('España está destruida') === module.semanticQuerySignature('España cobra demasiados impuestos')) throw new Error('Unrelated semantic families produced the same signature');
console.log('Query signature validation passed.');
