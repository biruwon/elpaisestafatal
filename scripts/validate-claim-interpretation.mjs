import { readFile } from 'node:fs/promises';

const api = await readFile(new URL('../functions/api/check.ts', import.meta.url), 'utf8');
const response = await readFile(new URL('../functions/lib/public-check-response.ts', import.meta.url), 'utf8');
const client = await readFile(new URL('../src/scripts/claim-checker.ts', import.meta.url), 'utf8');
const required = ['directClaimCheck(body.text)', 'interpretation?.normalizedClaim', 'criteriaProfiles', "state: 'supported'", "state: 'insufficient'", 'data-clarification-kind'];
const missing = required.filter((fragment) => !api.includes(fragment) && !response.includes(fragment) && !client.includes(fragment));
if (missing.length) throw new Error(`Claim interpretation contract is missing: ${missing.join(', ')}`);
if (/missingDimensions\.join\(', '\)/.test(response)) throw new Error('Loaded claim responses must not use generic dimension prompts');
if (!/dictador\|dictadura/.test(response) || !/corrupt/.test(response) || !/incompetent/.test(response)) throw new Error('Criteria profiles do not cover institutional, allegation, and judgment claims');
if (!response.includes("'collective-allegation'") || !/roban\?/.test(response)) throw new Error('Collective loaded allegations need a reusable interpretation profile');
console.log('Claim interpretation validation passed: loaded labels, individual and collective allegations, judgments, and structured clarification routing are present.');
