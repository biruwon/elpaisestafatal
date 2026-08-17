import { connectorForId, connectorRegistry, connectorSupports } from './connector-registry.mjs';
import { sourceRegistry } from './source-registry.mjs';
import { readFile } from 'node:fs/promises';

const failures = [];
const ingestSource = await readFile(new URL('./ingest-source.mjs', import.meta.url), 'utf8');
if (!ingestSource.includes('parseDelimited') || !ingestSource.includes('const delimiter') || !ingestSource.includes("contentType.includes('csv')")) failures.push('CSV connector inputs must materialize bounded records and detect delimiters');
for (const source of sourceRegistry) {
  const connector = connectorForId(source.connector);
  if (!connector) failures.push(`${source.id}: connector is missing`);
  if (connector && source.formats.some((format) => !connector.formats.includes(format))) failures.push(`${source.id}: source format is not supported by connector`);
}
for (const id of ['regional-open-data', 'judicial-records', 'procurement']) {
  const connector = connectorForId(id);
  if (!Array.isArray(connector?.requiredDimensions) || connector.requiredDimensions.length < 3) failures.push(`${id}: evidence dimensions are not declared`);
}
const probes = [
  ['ine-table', 'application/json'],
  ['json-stat', 'application/json'],
  ['boe-summary', 'application/json'],
  ['catalogue', 'text/html'],
  ['official-document', 'application/pdf'],
  ['regional-open-data', 'text/csv'],
  ['judicial-records', 'application/xml'],
  ['procurement', 'application/json'],
];
for (const [id, contentType] of probes) if (!connectorSupports(id, contentType)) failures.push(`${id}: expected content type probe to be supported`);
if (Object.keys(connectorRegistry).length < 8) failures.push('expected connector contracts for regional data, judicial records, and procurement');
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Connector registry valid: ${Object.keys(connectorRegistry).length} connector types cover ${sourceRegistry.length} sources.`);
