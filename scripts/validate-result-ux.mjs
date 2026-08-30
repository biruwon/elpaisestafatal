import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/scripts/claim-checker.ts', import.meta.url), 'utf8');
const page = await readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const required = ['renderResult', 'Respuesta con fuentes', 'Evidencia limitada', 'Comprobación directa', 'Datos relacionados, pero insuficientes para la conclusión', 'Respuesta basada en snapshot', 'Datos dinámicos y snapshot separados', 'No hay datos compatibles', 'data-copy-answer', 'claim-sources', 'claim-facts', 'claim-key-fact', 'classList.toggle', 'h2', 'prefers-reduced-motion'];
const missing = required.filter((item) => !source.includes(item) && !page.includes(item));
if (missing.length) throw new Error(`Unified result UX is missing: ${missing.join(', ')}`);
if (source.includes('Los datos no apoyan') || page.includes('Los datos no apoyan')) throw new Error('Unified result must not publish a global scorecard verdict');
console.log('Result UX validation passed: unified answer hierarchy, provenance, limitations, sources, visual tables, and actions are present.');
