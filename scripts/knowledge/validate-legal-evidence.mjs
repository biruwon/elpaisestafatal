import { legalEvidenceProfile, legalEvidenceSteps } from './legal-evidence.mjs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const profile = legalEvidenceProfile([{ kind: 'legal_rule', metric: 'Artículo vigente', period: '2026', dimensions: { currentVersion: true }, excerpt: 'El procedimiento corresponde al registro competente, salvo la excepción prevista y con plazo de recurso.' }]);
assert(profile.sufficientForGeneralRule && profile.procedure && profile.exceptions, 'Legal rule evidence fields were not detected');
assert(legalEvidenceSteps(profile).some((step) => step.label === 'Aplicación al caso' && step.status === 'missing'), 'Legal evidence must retain the case-specific limitation');
const missing = legalEvidenceProfile([]);
assert(!missing.sufficientForGeneralRule && legalEvidenceSteps(missing)[0].status === 'missing', 'Missing legal evidence was not marked unresolved');
console.log('Legal evidence validation passed: current rules remain distinct from case-specific application.');
