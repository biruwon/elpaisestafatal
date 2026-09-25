import { createServer, request as proxyRequest } from 'node:http';
import { localPublicCheckResponse } from './lib/local-public-check-response.mjs';

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
          const publicPayload = localPublicCheckResponse(payload, claim);
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
