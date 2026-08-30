import { deterministicFallbackCompiler } from './knowledge/fallback-compiler.mjs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const immigration = 'Aumento dramático de la inseguridad en las calles. Los nuevos españoles provocan acuchillamientos, hurtos, robos, violaciones y palizas.';
const sanchez = `Corrupción a su alrededor, Ceuta, la dana, el apagón, los trenes...\n\n- IMV\n- Ley de vivienda\n- Amnistía\n- Solo si es si\n- Pensiones revalorizadas con el IPC\n- Bono joven\n- Regularización masiva\n- Más impuestos`;

const immigrationResult = deterministicFallbackCompiler(immigration);
const sanchezResult = deterministicFallbackCompiler(sanchez);
assert(immigrationResult.explicitPropositions.length >= 2, 'Immigration compound fixture collapsed into one proposition');
assert(sanchezResult.explicitPropositions.length === 12, `Sánchez fixture expected 12 explicit arguments, got ${sanchezResult.explicitPropositions.length}`);
assert(sanchezResult.explicitPropositions.some((item) => /amnistía/i.test(item.text)), 'Amnesty argument was lost');
assert(sanchezResult.explicitPropositions.some((item) => /pensiones/i.test(item.text)), 'Pensions argument was lost');
console.log('Compound claim fixtures passed: independent sentences, event lists, and policy bullets remain addressable.');
