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
console.log('Query signature validation passed.');
