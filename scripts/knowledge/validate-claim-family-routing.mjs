import { isSpecificSemanticSignature, semanticFamilyKeys } from './claim-family-routing.mjs';
import { deterministicFallbackCompiler } from './fallback-compiler.mjs';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const immigration = 'causal|polarity:positive|entity:crime|entity:immigration|causal:crime+immigration:causes:immigration:crime';
const housingTrend = 'trend|polarity:positive|entity:housing|geo:espana|period:2015|trend:housing:trend:rising';
const fixed = 'definition|polarity:positive|entity:employment|definition:employment';
const unrelated = 'descriptive|polarity:positive|descriptive:taxes';

if (!isSpecificSemanticSignature(immigration) || !semanticFamilyKeys(immigration).length) throw new Error('causal family key missing');
if (!isSpecificSemanticSignature(housingTrend) || !semanticFamilyKeys(housingTrend).some((key) => key.includes('|trend:housing:trend:rising'))) throw new Error('trend family key missing');
if (!isSpecificSemanticSignature(fixed) || !semanticFamilyKeys(fixed).length) throw new Error('definition family key missing');
if (isSpecificSemanticSignature(unrelated)) throw new Error('broad unrelated signature was treated as a family');

const rent = 'trend|polarity:positive|entity:housing|geo:espana|trend:housing:trend:rising';
const prices = 'trend|polarity:positive|entity:housing|geo:espana|trend:housing+prices:trend:rising';
if (semanticFamilyKeys(rent).some((key) => semanticFamilyKeys(prices).includes(key))) throw new Error('Distinct housing metrics shared a family key');
const descriptiveTerms = 'descriptive|polarity:positive|term:compra|term:votos';
if (!semanticFamilyKeys(descriptiveTerms).length) throw new Error('Descriptive term family key missing');
const structuredTrend = 'trend|polarity:negative|trend:employment_record';
if (!isSpecificSemanticSignature(structuredTrend) || !semanticFamilyKeys(structuredTrend).length) throw new Error('Structured single-concept trend family was rejected');

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

// These are deliberately different surface forms, not aliases from the
// published index. They prove that the reusable family is derived from the
// proposition structure rather than from a page-specific phrase list.
const localEquivalentPairs = [
  ['Los inmigrantes crean inseguridad', 'La llegada de extranjeros hace que haya más delincuencia'],
  ['España tiene más paro juvenil que Europa', 'El desempleo entre los jóvenes españoles supera al de la UE'],
  ['Los alquileres han subido', 'Vivir de alquiler cuesta cada vez más'],
  ['España recauda cada vez más impuestos', 'La presión fiscal española está aumentando'],
  ['El Gobierno transfirió dinero de Educación a Presidencia para personal', 'Se movieron fondos de educación al ministerio de Presidencia para pagar nóminas'],
];
for (const [left, right] of localEquivalentPairs) {
  const leftKeys = semanticFamilyKeys(deterministicFallbackCompiler(left).semanticSignature);
  const rightKeys = semanticFamilyKeys(deterministicFallbackCompiler(right).semanticSignature);
  if (!leftKeys.some((key) => rightKeys.includes(key))) {
    throw new Error(`Local family routing failed for equivalent wording: ${left} <> ${right}`);
  }
}

const localDistinctPairs = [
  ['Los alquileres han subido', 'El precio de compra de la vivienda ha subido'],
  ['España tiene más paro juvenil que Europa', 'España tiene más paro que Europa'],
  ['Los inmigrantes crean inseguridad', 'Los inmigrantes reciben más ayudas'],
];
for (const [left, right] of localDistinctPairs) {
  const leftKeys = semanticFamilyKeys(deterministicFallbackCompiler(left).semanticSignature);
  const rightKeys = semanticFamilyKeys(deterministicFallbackCompiler(right).semanticSignature);
  if (leftKeys.some((key) => rightKeys.includes(key))) {
    throw new Error(`Local family routing merged distinct propositions: ${left} <> ${right}`);
  }
}

const crossTypeEquivalentPairs = [
  ['España tiene una presión fiscal elevada', 'Pagamos demasiados impuestos en España'],
];
for (const [left, right] of crossTypeEquivalentPairs) {
  const leftKeys = semanticFamilyKeys(deterministicFallbackCompiler(left).semanticSignature);
  const rightKeys = semanticFamilyKeys(deterministicFallbackCompiler(right).semanticSignature);
  if (!leftKeys.some((key) => rightKeys.includes(key))) {
    throw new Error(`Cross-type metric family routing failed: ${left} <> ${right}`);
  }
}

// Both execution paths must agree on the important decision: equivalent
// wording may share a family, but different propositions must not. Their
// serialized signatures are intentionally different, so compare the
// resulting collision relation rather than implementation details.
const browserEquivalent = (left, right) => browserFamily(left).some((key) => browserFamily(right).includes(key));
const localEquivalent = (left, right) => {
  const leftKeys = semanticFamilyKeys(deterministicFallbackCompiler(left).semanticSignature);
  const rightKeys = semanticFamilyKeys(deterministicFallbackCompiler(right).semanticSignature);
  return leftKeys.some((key) => rightKeys.includes(key));
};
for (const [left, right] of localEquivalentPairs) {
  if (browserEquivalent(left, right) !== localEquivalent(left, right)) {
    throw new Error(`Browser/local family parity failed: ${left} <> ${right}`);
  }
}

console.log('Claim-family routing contract passed.');
