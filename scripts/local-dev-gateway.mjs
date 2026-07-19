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

createServer((request, response) => {
  if (request.url === '/healthz') {
    forward(request, response, classifierPort, '/healthz');
    return;
  }
  if (request.url?.startsWith('/api/classify') || request.url?.startsWith('/api/resolve') || request.url?.startsWith('/api/v1/resolve')) {
    const targetPath = request.url.startsWith('/api/v1/resolve') ? request.url.replace(/^\/api\/v1\/resolve/, '/v1/resolve') : request.url.startsWith('/api/resolve') ? request.url.replace(/^\/api\/resolve/, '/v1/resolve') : request.url;
    forward(request, response, classifierPort, targetPath);
    return;
  }
  forward(request, response, astroPort);
}).listen(port, '127.0.0.1', () => console.log(`Local dev gateway listening on 127.0.0.1:${port}`));
