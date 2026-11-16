import { claimUnitClass, numericThresholdOperator, numericThresholdRelation, observationUnitClass, satisfiesNumericThreshold, unitCompatible } from './numeric-evidence.mjs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(claimUnitClass('España debe 1,6 billones de euros') === 'currency', 'Currency claim was not classified');
assert(claimUnitClass('España gasta 2.000 euros por habitante') === 'per_capita', 'Per-capita claim was not classified');
assert(claimUnitClass('España supera los 49 millones de habitantes') === 'people', 'A population amount was misclassified as currency because it uses “millones de”');
assert(claimUnitClass('La población residente supera los 49 millones') === null, 'An unspecified unit was inferred from the magnitude wording alone');
assert(observationUnitClass({ unit: 'Persons', metric: 'Resident population' }) === 'people', 'Population observation was not classified');
assert(unitCompatible('España debe 1,6 billones de euros', { unit: 'Persons', metric: 'Resident population' }) === false, 'Currency claim incorrectly accepted a population series');
assert(unitCompatible('España supera los 49 millones de habitantes', { unit: 'Number', metric: 'Resident population' }) === true, 'A population threshold rejected its matching resident-population series');
assert(unitCompatible('España supera los 49 millones de habitantes', { unit: 'Euro', metric: 'Public expenditure' }) === false, 'A population threshold incorrectly accepted a monetary series');
assert(unitCompatible('España gasta 2.000 euros por habitante', { unit: 'EUR per capita', metric: 'Health expenditure' }) === true, 'Per-capita claim rejected a compatible observation');
for (const [wording, operator] of [
  ['España supera los 49 millones de residentes', 'greater_than'],
  ['La población pasa de 49 millones', 'greater_than'],
  ['La población supera los 49 millones', 'greater_than'],
  ['España no supera los 49 millones', 'at_most'],
  ['España tiene no más de 49 millones', 'at_most'],
  ['España tiene como máximo 49 millones', 'at_most'],
  ['España alcanza al menos 49 millones', 'at_least'],
  ['España no baja de 49 millones', 'at_least'],
  ['España tiene menos de 49 millones', 'less_than'],
]) assert(numericThresholdOperator(wording) === operator, `Numeric threshold operator was misread: ${wording}`);
assert(satisfiesNumericThreshold(49, 49, 'greater_than') === false, 'Strict greater-than accepted equality');
assert(satisfiesNumericThreshold(49, 49, 'at_least') === true, 'Inclusive lower threshold rejected equality');
assert(satisfiesNumericThreshold(49, 49, 'at_most') === true, 'Inclusive upper threshold rejected equality');
assert(satisfiesNumericThreshold(49, 49, 'less_than') === false, 'Strict less-than accepted equality');
assert(numericThresholdRelation(true, 'at_most') === 'no supera', 'An at-most finding used the wrong comparison direction');
console.log('Numeric evidence validation passed: claim and observation units remain compatible before assessment.');
