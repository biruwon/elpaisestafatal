import { publicResolveResponse } from '../src/lib/knowledge/public-response.mjs';

const valid = publicResolveResponse({
  status: 'partial',
  requestId: 'request-1',
  relatedClaims: [{ kind: 'topic', slug: 'politica', title: 'Política', href: '/preocupaciones/politica', confidence: 0.4 }],
  result: { schemaVersion: '1', headline: 'Aclaración', summary: 'Resumen', coverage: 'partial', claimType: 'mixed', resultState: 'provisional', reviewed: false, blocks: [], evidenceIds: [], sourceIds: [], knowledgeVersion: 'test' },
});
if (!valid || valid.relatedClaims?.[0]?.slug !== 'politica') throw new Error('Valid public response was rejected');

if (publicResolveResponse({ status: 'complete', result: { schemaVersion: '1', headline: 'Bad state', summary: 'Resumen', coverage: 'partial', claimType: 'mixed', resultState: 'unknown', blocks: [], evidenceIds: [], sourceIds: [], knowledgeVersion: 'test' } })) throw new Error('Unknown public result state crossed the boundary');
if (publicResolveResponse({ status: 'complete', result: { schemaVersion: '1', headline: 'Bad review flag', summary: 'Resumen', coverage: 'partial', claimType: 'mixed', reviewed: 'yes', blocks: [], evidenceIds: [], sourceIds: [], knowledgeVersion: 'test' } })) throw new Error('Malformed reviewed flag crossed the boundary');

const malformed = publicResolveResponse({ status: 'complete', result: { headline: 'Missing contract' } });
if (malformed) throw new Error('Malformed provider response crossed the public boundary');

const leaked = publicResolveResponse({ status: 'uncovered', result: { schemaVersion: '1', headline: 'ollama', summary: '', coverage: 'insufficient', claimType: 'mixed', blocks: [], evidenceIds: [], sourceIds: [], knowledgeVersion: 'test' } });
if (leaked) throw new Error('Provider details crossed the public boundary');

const processing = publicResolveResponse({ status: 'processing', requestId: 'request-2', internal: 'dropped' });
if (!processing || Object.keys(processing).length !== 2 || processing.status !== 'processing') throw new Error('Processing response was not reduced to its public contract');

console.log('Public response validation passed: malformed and implementation-leaking upstream payloads fail closed.');
