import { deterministicFallbackCompiler } from './knowledge/fallback-compiler.mjs';
import { readFile } from 'node:fs/promises';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const immigration = 'Aumento dramático de la inseguridad en las calles. Los nuevos españoles provocan acuchillamientos, hurtos, robos, violaciones y palizas.';
const sanchez = `Corrupción a su alrededor, Ceuta, la dana, el apagón, los trenes...\n\n- IMV\n- Ley de vivienda\n- Amnistía\n- Solo si es si\n- Pensiones revalorizadas con el IPC\n- Bono joven\n- Regularización masiva\n- Más impuestos`;

const immigrationResult = deterministicFallbackCompiler(immigration);
const sanchezResult = deterministicFallbackCompiler(sanchez);
const evaluative = deterministicFallbackCompiler('Sánchez es el peor presidente de la historia por Ceuta, la amnistía y los trenes.');
const resolver = await readFile(new URL('./local-claim-service.mjs', import.meta.url), 'utf8');
assert(immigrationResult.explicitPropositions.length >= 2, 'Immigration compound fixture collapsed into one proposition');
assert(sanchezResult.explicitPropositions.length === 12, `Sánchez fixture expected 12 explicit arguments, got ${sanchezResult.explicitPropositions.length}`);
assert(sanchezResult.explicitPropositions.some((item) => /amnistía/i.test(item.text)), 'Amnesty argument was lost');
assert(sanchezResult.explicitPropositions.some((item) => /pensiones/i.test(item.text)), 'Pensions argument was lost');
assert(evaluative.explicitPropositions.length >= 3, 'Evaluative thesis and short supporting events were collapsed');
assert(/peor presidente/i.test(evaluative.explicitPropositions[0].text), 'Evaluative thesis was not preserved');
assert(resolver.includes('const compoundAnswer ='), 'Compound answers must be composed from detected propositions');
assert(resolver.includes('verdict: linked.length ? \'mixed\' : \'insufficient\''), 'Compound propositions must receive independent evidence statuses');
assert(!resolver.includes("text: 'La frase reúne varias cuestiones. Conviene discutir cada indicador por separado antes de extraer una conclusión general.'"), 'Compound answers must not fall back to editorial-only copy');
console.log('Compound claim fixtures passed: independent sentences, event lists, and policy bullets remain addressable.');
