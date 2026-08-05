import { isSpecificSemanticSignature, semanticFamilyKeys } from './claim-family-routing.mjs';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const immigration = 'causal|polarity:positive|entity:crime|entity:immigration|causal:crime+immigration:causes:immigration:crime';
const housingTrend = 'trend|polarity:positive|entity:housing|geo:espana|period:2015|trend:housing:trend:rising';
const fixed = 'definition|polarity:positive|entity:employment|definition:employment';
const unrelated = 'descriptive|polarity:positive|entity:taxes|descriptive:taxes';

if (!isSpecificSemanticSignature(immigration) || !semanticFamilyKeys(immigration).length) throw new Error('causal family key missing');
if (!isSpecificSemanticSignature(housingTrend) || !semanticFamilyKeys(housingTrend).some((key) => key.includes('|trend:housing:trend:rising'))) throw new Error('trend family key missing');
if (!isSpecificSemanticSignature(fixed) || !semanticFamilyKeys(fixed).length) throw new Error('definition family key missing');
if (isSpecificSemanticSignature(unrelated)) throw new Error('broad unrelated signature was treated as a family');

const rent = 'trend|polarity:positive|entity:housing|geo:espana|trend:housing:trend:rising';
const prices = 'trend|polarity:positive|entity:housing|geo:espana|trend:housing+prices:trend:rising';
if (semanticFamilyKeys(rent).some((key) => semanticFamilyKeys(prices).includes(key))) throw new Error('Distinct housing metrics shared a family key');
const descriptiveTerms = 'descriptive|polarity:positive|term:compra|term:votos';
if (!semanticFamilyKeys(descriptiveTerms).length) throw new Error('Descriptive term family key missing');

// Keep the static-browser compiler and the local-service compiler aligned at
// the level that matters: equivalent wording must remain equivalent, while
// distinct metrics must remain distinct. Their serialized signatures differ
// by implementation, so compare collision behavior rather than raw strings.
const tsSource = await readFile(new URL('../../src/lib/knowledge/querySignature.ts', import.meta.url), 'utf8');
const tsOutput = ts.transpileModule(tsSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const browserCompiler = await import(`data:text/javascript,${encodeURIComponent(tsOutput)}`);
const browserFamily = (text) => browserCompiler.semanticFamilyKeys(browserCompiler.semanticQuerySignature(text));
const browserEquivalentPairs = [
  ['Los inmigrantes crean inseguridad en España', 'La llegada de extranjeros vuelve inseguro a España'],
  ['Los alquileres han subido en España', 'El alquiler sigue encareciéndose en España'],
];
for (const [left, right] of browserEquivalentPairs) {
  if (!browserFamily(left).some((key) => browserFamily(right).includes(key))) throw new Error(`Browser family parity failed for equivalent wording: ${left}`);
}
if (browserFamily('Los alquileres han subido en España').some((key) => browserFamily('El precio de la vivienda ha subido en España').includes(key))) throw new Error('Browser family parity merged rent and purchase-price metrics');

console.log('Claim-family routing contract passed.');
