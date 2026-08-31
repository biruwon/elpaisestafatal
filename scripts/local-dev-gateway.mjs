import { createServer, request as proxyRequest } from 'node:http';

const port = Number(process.env.LOCAL_GATEWAY_PORT || 4321);
const astroPort = Number(process.env.LOCAL_ASTRO_PORT || 4322);
const classifierPort = Number(process.env.LOCAL_CLASSIFIER_PORT || 8789);

const forward = (request, response, targetPort, targetPath = request.url) => {
  const proxy = proxyRequest({ hostname: '127.0.0.1', port: targetPort, path: targetPath, method: request.method, headers: request.headers }, (upstream) => {
    response.writeHead(upstream.statusCode || 502, upstream.headers);
    upstream.pipe(response);
  });
  proxy.on('error', () => { if (!response.headersSent) response.writeHead(503); response.end(); });
  request.pipe(proxy);
};

const publicCheckResponse = (payload, claim = '') => {
  if (payload?.status === 'processing' && payload.requestId) return { state: 'processing', id: payload.requestId, claim };
  const plan = payload?.status === 'complete' ? payload.result : undefined;
  if (!plan || typeof plan !== 'object') return { state: 'unavailable', id: `local-${Date.now().toString(36)}`, claim, message: 'La comprobación local no pudo completarse.', retryable: true };
  const criteria = (Array.isArray(plan.blocks) ? plan.blocks : []).filter((block) => block?.type === 'confirmed' || block?.type === 'data_finding').flatMap((block, blockIndex) => (Array.isArray(block.points) ? block.points : []).slice(0, 3).map((finding, pointIndex) => ({ id: `evidence-${blockIndex + 1}-${pointIndex + 1}`, label: pointIndex ? 'Contexto' : 'Dato respaldado', finding, sourceIds: Array.isArray(block.evidenceIds) ? block.evidenceIds : [] })));
  const sources = (Array.isArray(plan.sourceLinks) ? plan.sourceLinks : []).map((source) => ({ id: source.id, title: source.title, publisher: source.publisher, url: source.url, publishedAt: source.publishedAt, retrievedAt: source.retrievedAt }));
  const composedReply = (Array.isArray(plan.blocks) ? plan.blocks : []).find((block) => block?.type === 'conversation_reply')?.text;
  const reply = composedReply || [criteria[0]?.finding, plan.summary].filter(Boolean).join(' ');
  const evidenceLevel = plan.evidenceLevel === 'supported' && criteria.length && sources.length ? 'supported' : plan.evidenceLevel === 'insufficient' ? 'insufficient' : 'limited';
  return { state: evidenceLevel, id: payload.requestId || `local-${Date.now().toString(36)}`, result: { claim, interpretation: plan.interpretation, reply, answer: reply || plan.summary || plan.headline, keyFact: plan.headline, criteria, whatWeKnow: criteria.map((item) => item.finding), limitations: [plan.limitation].filter(Boolean), scope: { checkedAt: plan.asOf }, sources, evidenceSummary: plan.evidenceSummary, evidenceLevel } };
};

const forwardCheck = (request, response, targetPath) => {
  const chunks = [];
  request.on('data', (chunk) => chunks.push(chunk));
  request.on('end', () => {
    const body = Buffer.concat(chunks);
    let claim = '';
    if (String(request.headers['content-type'] || '').includes('application/json')) {
      try { claim = String(JSON.parse(body.toString('utf8')).text || ''); } catch { /* upstream returns the validation response */ }
    }
    const headers = { ...request.headers, 'content-length': String(body.length) };
    const proxy = proxyRequest({ hostname: '127.0.0.1', port: classifierPort, path: targetPath, method: request.method, headers }, (upstream) => {
      const responseChunks = [];
      upstream.on('data', (chunk) => responseChunks.push(chunk));
      upstream.on('end', () => {
        try {
          const payload = JSON.parse(Buffer.concat(responseChunks).toString('utf8'));
          const publicPayload = publicCheckResponse(payload, claim);
          response.writeHead(upstream.statusCode === 202 ? 202 : 200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
          response.end(JSON.stringify(publicPayload));
        } catch { response.writeHead(502); response.end(); }
      });
    });
    proxy.on('error', () => { if (!response.headersSent) response.writeHead(503); response.end(); });
    proxy.end(body);
  });
};

createServer((request, response) => {
  if (request.url === '/healthz') {
    forward(request, response, classifierPort, '/healthz');
    return;
  }
  if (request.url?.startsWith('/api/check')) {
    const targetPath = request.url.replace(/^\/api\/check/, '/v1/classify');
    forwardCheck(request, response, targetPath);
    return;
  }
  forward(request, response, astroPort);
}).listen(port, '127.0.0.1', () => console.log(`Local dev gateway listening on 127.0.0.1:${port}`));
