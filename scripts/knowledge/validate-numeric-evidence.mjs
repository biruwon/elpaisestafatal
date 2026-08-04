import { claimUnitClass, observationUnitClass, unitCompatible } from './numeric-evidence.mjs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(claimUnitClass('España debe 1,6 billones de euros') === 'currency', 'Currency claim was not classified');
assert(claimUnitClass('España gasta 2.000 euros por habitante') === 'per_capita', 'Per-capita claim was not classified');
assert(observationUnitClass({ unit: 'Persons', metric: 'Resident population' }) === 'people', 'Population observation was not classified');
assert(unitCompatible('España debe 1,6 billones de euros', { unit: 'Persons', metric: 'Resident population' }) === false, 'Currency claim incorrectly accepted a population series');
assert(unitCompatible('España gasta 2.000 euros por habitante', { unit: 'EUR per capita', metric: 'Health expenditure' }) === true, 'Per-capita claim rejected a compatible observation');
console.log('Numeric evidence validation passed: claim and observation units remain compatible before assessment.');
