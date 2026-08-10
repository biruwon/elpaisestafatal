import { enrichTrustedWebResults, neutralWebQuery, searchTrustedWeb } from './trusted-web-discovery.mjs';

if (neutralWebQuery('La invasión viola a las mujeres https://example.test x@y.test +34 600 123 456').includes('https://')) throw new Error('URLs leaked into trusted-web query');
if (neutralWebQuery('La invasión viola a las mujeres').includes('violando') || neutralWebQuery('La invasión viola a las mujeres').includes('invasion')) throw new Error('Loaded wording was not neutralized');
const calls = [];
const results = await searchTrustedWeb({ token: 'fixture', queries: ['cruce fronterizo Ceuta'], fetchImpl: async (url) => {
  calls.push(String(url));
  return { ok: true, async json() { return { web: { results: [
    { title: 'Official', url: 'https://interior.gob.es/nota', description: 'Parte oficial' },
    { title: 'Unknown', url: 'https://unknown.example/story', description: 'No evidence tier' },
    { title: 'EFE', url: 'https://efe.com/espana/story', description: 'Report' },
  ] } }; } };
}, limit: 6 });
if (calls.length !== 1 || results.length !== 2 || !results.some((item) => item.role === 'primary') || !results.some((item) => item.role === 'corroboration')) throw new Error('Trusted-web source tiers were not enforced');
const enriched = await enrichTrustedWebResults(results.slice(0, 1), { query: 'Ceuta frontera', fetchImpl: async () => ({ ok: true, async text() { return '<html><body><p>Parte oficial sobre la frontera de Ceuta.</p></body></html>'; } }) });
if (!enriched[0]?.excerpt.includes('frontera de Ceuta')) throw new Error('Trusted-web page excerpt was not extracted');
const redirectCalls = [];
const redirected = await enrichTrustedWebResults([{ ...results[0], url: 'https://interior.gob.es/redirect' }], { query: 'Ceuta', fetchImpl: async (url) => {
  redirectCalls.push(String(url));
  return { status: 302, ok: false, headers: { get(name) { return name === 'location' ? 'https://unknown.example/target' : null; } } };
} });
if (redirectCalls.length !== 1 || redirected[0].excerpt !== results[0].description) throw new Error('Unregistered trusted-web redirect was followed');
console.log('Trusted-web discovery validation passed: queries are neutralized, bounded, and source-tier filtered.');
