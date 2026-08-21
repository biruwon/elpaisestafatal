import { BROAD_SNAPSHOT_POLICY } from '../../src/lib/knowledge/broad-domain-snapshot.mjs';
import { GOVERNMENT_SCORECARD_SNAPSHOT } from '../../src/lib/knowledge/scorecard-snapshot.mjs';
import { snapshotLifecycle } from '../../src/lib/knowledge/snapshot-lifecycle.mjs';

const required = ['owner', 'createdAt', 'expiresAt', 'refreshCommand', 'validationStatus', 'supportedScope', 'unsupportedScope'];
const assertPolicy = (name, policy) => {
  for (const field of required) if (typeof policy?.[field] !== 'string' || !policy[field]) throw new Error(`${name}: missing snapshot policy field ${field}`);
  if (Date.parse(policy.expiresAt) <= Date.parse(policy.createdAt)) throw new Error(`${name}: snapshot expiry must be after creation`);
  if (!['reviewed', 'pending', 'expired'].includes(policy.validationStatus)) throw new Error(`${name}: invalid validation status`);
};
assertPolicy('broad-domain', BROAD_SNAPSHOT_POLICY);
assertPolicy('government-scorecard', GOVERNMENT_SCORECARD_SNAPSHOT);
const expired = snapshotLifecycle({ ...BROAD_SNAPSHOT_POLICY, createdAt: '2024-01-01', expiresAt: '2025-01-01' }, Date.parse('2026-08-20'));
if (expired.usable || expired.status !== 'expired') throw new Error('Expired snapshot was still usable for factual context');
const pending = snapshotLifecycle({ ...BROAD_SNAPSHOT_POLICY, validationStatus: 'pending' }, Date.parse('2026-08-20'));
if (pending.usable || pending.status !== 'unreviewed') throw new Error('Unreviewed snapshot was still usable for factual context');
console.log('Snapshot lifecycle validation passed: ownership, expiry, refresh, scope, and validation metadata are present.');
