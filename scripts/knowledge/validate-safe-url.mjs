import { isBlockedAddress, resolvePublicHttpsUrl } from './safe-url.mjs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const fakeLookup = async () => [{ address: '93.184.216.34', family: 4 }];

assert(isBlockedAddress('127.0.0.1'), 'loopback IPv4 was not blocked');
assert(isBlockedAddress('10.0.0.8'), 'private IPv4 was not blocked');
assert(isBlockedAddress('::1'), 'loopback IPv6 was not blocked');
assert(isBlockedAddress('fd00::1'), 'private IPv6 was not blocked');
assert(!isBlockedAddress('93.184.216.34'), 'public IPv4 was blocked');
assert((await resolvePublicHttpsUrl('https://example.com/story', fakeLookup)).hostname === 'example.com', 'public HTTPS URL was rejected');
for (const value of ['http://example.com', 'https://localhost/story', 'https://127.0.0.1/story', 'https://user:pass@example.com/story']) {
  await resolvePublicHttpsUrl(value, fakeLookup).then(() => { throw new Error(`unsafe URL was accepted: ${value}`); }, () => undefined);
}
await resolvePublicHttpsUrl('https://example.com/story', async () => [{ address: '192.168.1.4', family: 4 }]).then(() => { throw new Error('DNS-resolved private address was accepted'); }, () => undefined);
console.log('Safe URL validation passed: HTTPS, host, DNS, and private-address SSRF gates are enforced.');
