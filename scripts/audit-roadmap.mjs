import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = new URL('../dist/', import.meta.url).pathname;
const files = [];
async function walk(dir) { for (const entry of await readdir(dir, { withFileTypes: true })) { const path = join(dir, entry.name); if (entry.isDirectory()) await walk(path); else files.push(path); } }
await walk(root);
const html = files.filter((file) => file.endsWith('.html'));
const failures = [];
const localTargets = new Set(files.map((file) => '/' + relative(root, file).replace(/\\/g, '/')));
const routeExists = (route) => localTargets.has(route.endsWith('/') ? `${route}index.html` : `${route}/index.html`) || localTargets.has(route);

for (const file of html) {
  const source = await readFile(file, 'utf8');
  const route = '/' + relative(root, file).replace(/\\/g, '/').replace(/index\.html$/, '');
  if (route.startsWith('/verificaciones')) continue;
  if (!/<html[^>]+lang="es"/.test(source)) failures.push(`${route}: missing lang=es`);
  if (!/<title>[^<]+<\/title>/.test(source)) failures.push(`${route}: missing title`);
  if (!/<meta name="description" content="[^"]+"/.test(source)) failures.push(`${route}: missing description`);
  if (!/<link rel="canonical" href="[^"]+"/.test(source)) failures.push(`${route}: missing canonical`);
  for (const match of source.matchAll(/<img\b([^>]*)>/g)) if (!/\balt="/.test(match[1])) failures.push(`${route}: image missing alt`);
  for (const match of source.matchAll(/href="(\/[^"#?]*)/g)) { const target = match[1]; if (target && !target.startsWith('/_') && !target.startsWith('/cards/') && !target.startsWith('/datos/') && !target.startsWith('/styles') && !target.startsWith('/quick') && !target.startsWith('/foundation') && !target.startsWith('/topic') && !routeExists(target)) failures.push(`${route}: missing local href ${target}`); }
}

const concernPages = html.filter((file) => file.includes('/preocupaciones/') && file.endsWith('/index.html'));
const claimPages = html.filter((file) => file.includes('/afirmaciones/') && !file.endsWith('/afirmaciones/index.html') && file.endsWith('/index.html'));
if (concernPages.length !== 14) failures.push(`expected 14 concern pages, found ${concernPages.length}`);
if (claimPages.length !== 20) failures.push(`expected 20 affirmation pages, found ${claimPages.length}`);
const redirects = await readFile(new URL('../public/_redirects', import.meta.url), 'utf8');
if (!redirects.includes('/verificaciones/* /afirmaciones/:splat 301')) failures.push('missing legacy verification redirect');
if (!redirects.includes('/contacto /acerca-de#contacto 301')) failures.push('missing contact redirect');

if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Roadmap audit passed: ${html.length} HTML pages, ${concernPages.length} concerns, ${claimPages.length} affirmations.`);
