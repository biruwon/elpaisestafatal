import { connectorForId, connectorRegistry, connectorSupports } from './connector-registry.mjs';
import { sourceRegistry } from './source-registry.mjs';

const failures = [];
for (const source of sourceRegistry) {
  const connector = connectorForId(source.connector);
  if (!connector) failures.push(`${source.id}: connector is missing`);
  if (connector && source.formats.some((format) => !connector.formats.includes(format))) failures.push(`${source.id}: source format is not supported by connector`);
}
const probes = [
  ['ine-table', 'application/json'],
  ['json-stat', 'application/json'],
  ['boe-summary', 'application/json'],
  ['catalogue', 'text/html'],
  ['official-document', 'application/pdf'],
];
for (const [id, contentType] of probes) if (!connectorSupports(id, contentType)) failures.push(`${id}: expected content type probe to be supported`);
if (Object.keys(connectorRegistry).length < 5) failures.push('expected the initial connector set to cover structured, catalogue, and document sources');
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Connector registry valid: ${Object.keys(connectorRegistry).length} connector types cover ${sourceRegistry.length} sources.`);
