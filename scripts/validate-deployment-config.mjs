import { readFile } from 'node:fs/promises';

const failures = [];
let routes;
try {
  routes = JSON.parse(await readFile('public/_routes.json', 'utf8'));
} catch (error) {
  failures.push(`public/_routes.json is not valid JSON: ${error.message}`);
}

if (routes?.version !== 1) failures.push('public/_routes.json must use version 1');
if (!Array.isArray(routes?.include) || !routes.include.includes('/api/*')) failures.push('Pages Functions must be limited to /api/*');
if (Array.isArray(routes?.include) && routes.include.some((route) => route === '/*' || route === '/')) failures.push('A broad Pages Functions route would make static traffic dynamic');
if (!Array.isArray(routes?.exclude) || routes.exclude.length !== 0) failures.push('The API-only route contract must not contain a broad exclusion that changes its meaning');

let wrangler;
try {
  wrangler = await readFile('wrangler.jsonc', 'utf8');
} catch (error) {
  failures.push(`wrangler.jsonc cannot be read: ${error.message}`);
}
if (wrangler && !/['"]pages_build_output_dir['"]\s*:\s*["']\.\/dist["']/.test(wrangler)) failures.push('wrangler.jsonc must retain the static Pages build output');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Deployment config valid: static Pages traffic is separated from /api/* Functions.');
