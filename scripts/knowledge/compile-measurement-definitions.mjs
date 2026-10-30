import { readFile, writeFile } from 'node:fs/promises';

export const compileMeasurementDefinitions = async () => {
  const registry = JSON.parse(await readFile(new URL('../../config/metric-registry.json', import.meta.url), 'utf8'));
  const definitions = Object.fromEntries(Object.entries(registry).filter(([, metric]) => metric.definition)
    .map(([id, metric]) => [id, { aliases: metric.aliases, definition: metric.definition }]));
  const output = new URL('../../src/lib/knowledge/measurement-definitions.generated.mjs', import.meta.url);
  const source = `// Generated from config/metric-registry.json by catalogue:compile.\n// Edit the registry; this module also supports older Pages build parsers.\nexport default ${JSON.stringify(definitions, null, 2)};\n`;
  if (await readFile(output, 'utf8').catch(() => '') !== source) await writeFile(output, source);
};
