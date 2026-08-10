import { approvedSourceHosts, liveSourceRegistry, sourceRegistry } from './source-registry.mjs';
import { connectorForId } from './connector-registry.mjs';

const errors = [];
const ids = new Set();
const domains = new Set();
for (const source of sourceRegistry) {
  if (!source.id || ids.has(source.id)) errors.push(`Duplicate or missing source id: ${source.id || '(empty)'}`);
  ids.add(source.id);
  if (!source.publisher || !source.connector) errors.push(`${source.id}: missing publisher or connector`);
  if (source.connector && !connectorForId(source.connector)) errors.push(`${source.id}: unknown connector ${source.connector}`);
  if (!Array.isArray(source.domains) || !source.domains.length) errors.push(`${source.id}: missing domains`);
  if (!Array.isArray(source.formats) || !source.formats.length) errors.push(`${source.id}: missing formats`);
  const connector = connectorForId(source.connector);
  if (connector && source.formats.some((format) => !connector.formats.includes(format))) errors.push(`${source.id}: format is not supported by ${source.connector}`);
  for (const domain of source.domains || []) {
    if (!/^[a-z0-9.-]+$/i.test(domain) || domains.has(domain)) errors.push(`Duplicate or invalid domain: ${domain}`);
    domains.add(domain);
  }
  if (!['primary', 'discovery'].includes(source.trustTier)) errors.push(`${source.id}: invalid trust tier`);
}
if (approvedSourceHosts.length !== domains.size) errors.push('Approved host list does not match registry domains');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
const liveIds = new Set();
const liveDomains = new Set();
for (const source of liveSourceRegistry) {
  if (!source.id || liveIds.has(source.id)) errors.push(`Duplicate live source id: ${source.id || '(empty)'}`);
  liveIds.add(source.id);
  if (!source.publisher || !['primary', 'corroboration'].includes(source.role)) errors.push(`${source.id}: invalid live source role`);
  for (const domain of source.domains || []) {
    if (liveDomains.has(domain) || approvedSourceHosts.includes(domain)) errors.push(`Duplicate live source domain: ${domain}`);
    liveDomains.add(domain);
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Source registry valid: ${sourceRegistry.length} primary sources, ${liveSourceRegistry.length} live sources, and ${approvedSourceHosts.length} approved hosts.`);
