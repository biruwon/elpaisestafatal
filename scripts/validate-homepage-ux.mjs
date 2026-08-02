import { readFile } from 'node:fs/promises';

const homepage = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const claimInput = await readFile(new URL('../src/scripts/claim-input.ts', import.meta.url), 'utf8');
const popularScript = await readFile(new URL('../src/scripts/popular-claims.ts', import.meta.url), 'utf8');
const stylesheetPath = homepage.match(/href="(\/_astro\/[^\"]+\.css)"/)?.[1];
const styles = stylesheetPath ? await readFile(new URL(`../dist${stylesheetPath}`, import.meta.url), 'utf8').catch(() => '') : '';
const failures = [];
const requireText = (text, label) => { if (!homepage.includes(text)) failures.push(`homepage is missing ${label}`); };
const order = (first, second, label) => { if (homepage.indexOf(first) < 0 || homepage.indexOf(second) < 0 || homepage.indexOf(first) > homepage.indexOf(second)) failures.push(`homepage order is wrong for ${label}`); };

requireText('¿De qué estáis', 'the conversation-first heading');
requireText('id="conversation-form"', 'the claim form');
requireText('id="conversation-counter"', 'the input character counter');
requireText('class="examples-heading"', 'the popular prompt heading');
requireText('data-example-filter="all"', 'the popular prompt filters');
requireText('data-example-more', 'the progressive popular-prompt list');
requireText('data-example-topic=', 'topic metadata for popular prompts');
requireText('href="/afirmaciones"', 'the full claim catalogue link');
requireText('aria-current="page"', 'the active navigation state');
if (!claimInput.includes('Comprobar otra frase') || !claimInput.includes('data-new-check')) failures.push('claim input is missing the repeat-check action');
order('id="afirmaciones"', 'class="home-how"', 'popular prompts before methodology');
if (!homepage.includes('hero-promises')) failures.push('homepage is missing the result promise list');
if (!styles.includes('max-width:900px')) failures.push('homepage is missing the responsive checker layout');
if (!popularScript.includes('data-example-filter') || !popularScript.includes('aria-pressed') || !popularScript.includes('updateExampleVisibility')) failures.push('popular prompt filter behavior is missing');

if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Homepage UX validation passed: conversation entry, popular prompts, navigation state, and responsive checker markers are present.');
