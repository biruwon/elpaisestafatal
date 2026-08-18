import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/scripts/claim-checker.ts', import.meta.url), 'utf8');
const page = await readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
if (source.includes('Los datos no apoyan') || page.includes('Los datos no apoyan')) throw new Error('Scorecard must not publish a global verdict');
if (!source.includes('visual') || !source.includes('<table>')) throw new Error('Indicator responses must expose accessible data tables');
console.log('Scorecard UX contract passed: indicator data is neutral and accessible.');
