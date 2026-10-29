import { createServer, request as proxyRequest } from 'node:http';
import { localPublicCheckResponse } from './lib/local-public-check-response.mjs';
import { INPUT_LIMITS } from '../src/lib/knowledge/input-contract.mjs';
import { safeHealthEnvelope } from '../src/lib/knowledge/safe-health.mjs';

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

const forwardCheck = (request, response, targetPath) => {
  // The resolver poll route is GET; the public route uses POST for UTF-8 text.
  const polling = /^\/v1\/classify\/[^/?]+/.test(targetPath);
  const chunks = [];
  let size = 0;
  request.on('data', (chunk) => { size += chunk.length; if (size <= INPUT_LIMITS.maxRequestBytes) chunks.push(chunk); });
  request.on('end', () => {
    if (size > INPUT_LIMITS.maxRequestBytes) { response.writeHead(413, { 'content-type': 'application/json' }); response.end(JSON.stringify({ state: 'unavailable', id: 'too-large', claim: '', message: 'El archivo o texto supera el tamaño permitido.', retryable: false })); return; }
    const body = Buffer.concat(chunks);
    let claim = '';
    if (String(request.headers['content-type'] || '').includes('application/json')) {
      try { const parsed = JSON.parse(body.toString('utf8')); claim = String(parsed.claim || parsed.text || ''); } catch { /* upstream returns the validation response */ }
    }
    const headers = { ...request.headers, 'content-length': String(polling ? 0 : body.length) };
    const proxy = proxyRequest({ hostname: '127.0.0.1', port: classifierPort, path: targetPath, method: polling ? 'GET' : request.method, headers }, (upstream) => {
      const responseChunks = [];
      upstream.on('data', (chunk) => responseChunks.push(chunk));
      upstream.on('end', () => {
        try {
          const payload = JSON.parse(Buffer.concat(responseChunks).toString('utf8'));
          const publicPayload = localPublicCheckResponse(payload, claim);
          response.writeHead(upstream.statusCode || 502, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
          response.end(JSON.stringify(publicPayload));
        } catch { response.writeHead(502); response.end(); }
      });
    });
    proxy.on('error', () => { if (!response.headersSent) response.writeHead(503); response.end(); });
    proxy.end(polling ? undefined : body);
  });
};

createServer((request, response) => {
  if (request.url === '/api/health') {
    const proxy = proxyRequest({ hostname: '127.0.0.1', port: classifierPort, path: '/healthz', method: 'GET' }, (upstream) => {
      let body = '';
      upstream.on('data', (chunk) => { if (body.length < 64 * 1024) body += chunk; });
      upstream.on('end', () => {
        let safe;
        try { safe = safeHealthEnvelope(JSON.parse(body)); } catch { /* Report degraded below. */ }
        response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
        response.end(JSON.stringify({ status: safe ? 'ok' : 'degraded', deterministic: true, dynamic: safe?.dynamic === true, inputs: safe?.inputs }));
      });
    });
    proxy.on('error', () => { response.writeHead(503); response.end(); });
    proxy.end();
    return;
  }
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
