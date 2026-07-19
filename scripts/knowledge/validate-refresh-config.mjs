import { readFile } from 'node:fs/promises';
import { sourceForHost } from './source-registry.mjs';
import { hasMetric } from './metric-registry.mjs';

const files = process.argv.slice(2).length ? process.argv.slice(2) : ['config/source-refresh.json', 'config/source-refresh.example.json'];
const errors = [];
for (const file of files) {
  let config;
  try { config = JSON.parse(await readFile(file, 'utf8')); } catch (error) {
    errors.push(`${file}: cannot read valid JSON (${error.message})`);
    continue;
  }
  const seen = new Set();
  for (const [sourceId, resources] of Object.entries(config || {})) {
    if (!Array.isArray(resources) || !resources.length) {
      errors.push(`${file}: ${sourceId} must contain at least one resource`);
      continue;
    }
    for (const [index, resource] of resources.entries()) {
      const value = typeof resource === 'string' ? { url: resource } : resource;
      if (!value || typeof value.url !== 'string') {
        errors.push(`${file}: ${sourceId}[${index}] must contain a URL`);
        continue;
      }
      let url;
      try { url = new URL(value.url.replaceAll('{today}', '20260101').replaceAll('{yesterday}', '20251231')); } catch {
        errors.push(`${file}: ${sourceId}[${index}] has an invalid URL`);
        continue;
      }
      if (url.protocol !== 'https:') errors.push(`${file}: ${sourceId}[${index}] must use HTTPS`);
      const source = sourceForHost(url.hostname);
      if (!source || source.id !== sourceId) errors.push(`${file}: ${sourceId}[${index}] host is not registered for ${sourceId}`);
      if (seen.has(value.url)) errors.push(`${file}: duplicate resource URL ${value.url}`);
      seen.add(value.url);
      if (value.title !== undefined && typeof value.title !== 'string') errors.push(`${file}: ${sourceId}[${index}] title must be a string`);
      if (value.aliases !== undefined && (!Array.isArray(value.aliases) || value.aliases.some((alias) => typeof alias !== 'string'))) errors.push(`${file}: ${sourceId}[${index}] aliases must be strings`);
      if (value.metricId !== undefined && (typeof value.metricId !== 'string' || !(await hasMetric(value.metricId)))) errors.push(`${file}: ${sourceId}[${index}] references unknown metricId ${value.metricId}`);
    }
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Refresh configuration valid: ${files.length} file(s) checked.`);
