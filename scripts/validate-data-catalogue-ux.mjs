import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../dist/datos/index.html', import.meta.url), 'utf8');
const metricCount = (html.match(/<article\b[^>]*\bdata-metric-card(?:\s|>)/g) || []).length;
const required = [
  'data-catalogue-search',
  'data-catalogue-count',
  'data-catalogue-empty',
  'data-data-filter',
  'aria-pressed',
  'data-domain',
  'no es un veredicto',
  '/#comprobar',
];
const missing = required.filter((snippet) => !html.includes(snippet));
if (metricCount < 25) missing.push(`at least 25 metric cards (found ${metricCount})`);
if (missing.length) throw new Error(`Data catalogue UX is missing: ${missing.join(', ')}`);
if (/ollama|localhost|model/i.test(html)) throw new Error('Data catalogue exposes implementation details');
console.log(`Data catalogue UX passed: ${metricCount} metric families are discoverable and launch the checker.`);
