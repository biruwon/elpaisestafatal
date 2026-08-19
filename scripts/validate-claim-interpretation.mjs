import { readFile } from 'node:fs/promises';

const api = await readFile(new URL('../functions/api/check.ts', import.meta.url), 'utf8');
const response = await readFile(new URL('../functions/lib/public-check-response.ts', import.meta.url), 'utf8');
const publicTypes = await readFile(new URL('../src/lib/knowledge/public-check.ts', import.meta.url), 'utf8');
const client = await readFile(new URL('../src/scripts/claim-checker.ts', import.meta.url), 'utf8');
const required = ['interpretation?.normalizedClaim', 'criteriaProfiles', "state: 'supported'", 'data-clarification-kind'];
const missing = required.filter((fragment) => !api.includes(fragment) && !response.includes(fragment) && !client.includes(fragment) && !publicTypes.includes(fragment));
if (missing.length) throw new Error(`Claim interpretation contract is missing: ${missing.join(', ')}`);
if (!publicTypes.includes("'insufficient'")) throw new Error('Public response contract must retain the insufficient evidence state');
if (/missingDimensions\.join\(', '\)/.test(response)) throw new Error('Loaded claim responses must not use generic dimension prompts');
if (!response.includes("'democratic-power'") || !response.includes("'performance-judgment'") || !response.includes('public or influential actors')) throw new Error('Criteria profiles do not cover institutional, allegation, and judgment claims');
if (!response.includes("'collective-allegation'") || !response.includes('definition:')) throw new Error('Semantic criteria profiles are missing definitions');
if (api.includes('directClaimCheck') || response.includes('directClaimCheck') || response.includes('roban?')) throw new Error('Loaded claim interpretation must not depend on phrase-specific routing');
console.log('Claim interpretation validation passed: semantic profiles and structured interpretation routing are present.');
