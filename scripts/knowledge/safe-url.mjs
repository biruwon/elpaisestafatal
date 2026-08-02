import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const ipv4Number = (value) => {
  const parts = String(value).split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return (((parts[0] * 256) + parts[1]) * 256 + parts[2]) * 256 + parts[3];
};

const ipv4Range = (address, start, end) => {
  const value = ipv4Number(address);
  return value !== null && value >= start && value <= end;
};

const blockedIpv4 = (address) => [
  [0, 0x00ffffff],
  [0x0a000000, 0x0affffff],
  [0x64400000, 0x647fffff],
  [0x7f000000, 0x7fffffff],
  [0xa9fe0000, 0xa9feffff],
  [0xac100000, 0xac1fffff],
  [0xc0000000, 0xc00000ff],
  [0xc0000200, 0xc00002ff],
  [0xc0a80000, 0xc0a8ffff],
  [0xc6120000, 0xc613ffff],
  [0xc6336400, 0xc63364ff],
  [0xcb007100, 0xcb0071ff],
  [0xe0000000, 0xffffffff],
].some(([start, end]) => ipv4Range(address, start, end));

export const isBlockedAddress = (address) => {
  const value = String(address || '').replace(/^\[|\]$/g, '').toLowerCase();
  if (isIP(value) === 4) return blockedIpv4(value);
  if (isIP(value) !== 6) return true;
  const mappedIpv4 = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedIpv4) return blockedIpv4(mappedIpv4[1]);
  return value === '::'
    || value === '::1'
    || value.startsWith('fc')
    || value.startsWith('fd')
    || /^fe[89ab]/.test(value)
    || value.startsWith('ff')
    || value.startsWith('2001:db8:');
};

const blockedHostname = (hostname) => {
  const value = String(hostname || '').toLowerCase().replace(/\.$/, '');
  return !value
    || value === 'localhost'
    || value.endsWith('.localhost')
    || value.endsWith('.local')
    || value.endsWith('.internal')
    || value.endsWith('.home.arpa');
};

export const resolvePublicHttpsUrl = async (value, lookupHost = lookup) => {
  let url;
  try { url = new URL(String(value || '')); } catch { throw new Error('Invalid URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) throw new Error('URL must use public HTTPS');
  if (blockedHostname(url.hostname)) throw new Error('URL host is not public');
  if (isIP(url.hostname)) {
    if (isBlockedAddress(url.hostname)) throw new Error('URL host is not public');
    return url;
  }
  const addresses = await lookupHost(url.hostname, { all: true, verbatim: true });
  if (!Array.isArray(addresses) || !addresses.length || addresses.some((item) => isBlockedAddress(item.address))) throw new Error('URL host is not public');
  return url;
};
