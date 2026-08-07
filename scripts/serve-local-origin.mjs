import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';

const port = Number(process.env.LOCAL_CLASSIFIER_PORT || 8789);
const host = process.env.LOCAL_CLASSIFIER_BIND_HOST || '127.0.0.1';
const restartDelay = Number(process.env.LOCAL_ORIGIN_RESTART_DELAY_MS || 3000);
const resolverArgs = ['scripts/local-claim-service.mjs'];
let child;
let stopping = false;

const request = (path) => new Promise((resolve) => {
  const socket = createConnection({ host: '127.0.0.1', port }, () => socket.write(`GET ${path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`));
  let body = '';
  socket.setTimeout(2000, () => { socket.destroy(); resolve(null); });
  socket.on('data', (chunk) => { body += chunk.toString(); });
  socket.on('end', () => resolve(body));
  socket.on('error', () => resolve(null));
});

const healthy = async () => {
  const response = await request('/healthz');
  return Boolean(response && /\s200\s/.test(response) && /"dynamic":true/.test(response));
};

const waitForHealthy = async () => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await healthy()) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
};

const waitForExisting = async () => {
  if (!await healthy()) return false;
  console.log(`Local origin already healthy on 127.0.0.1:${port}; supervising it without starting a duplicate.`);
  while (!stopping) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    if (!await healthy()) {
      console.error('The supervised local origin stopped responding; starting a replacement resolver.');
      return false;
    }
  }
  return true;
};

const start = async () => {
  if (await waitForExisting()) return;
  child = spawn(process.execPath, resolverArgs, { stdio: 'inherit', env: process.env });
  child.once('exit', async (code, signal) => {
    child = undefined;
    if (stopping) return;
    console.error(`Local resolver exited (${signal || code}); restarting after ${restartDelay}ms.`);
    await new Promise((resolve) => setTimeout(resolve, restartDelay));
    start();
  });
  if (!await waitForHealthy()) {
    console.error('Local resolver did not become healthy within 30 seconds; it will be restarted if it exits.');
  } else {
    console.log(`Local origin healthy on 127.0.0.1:${port}; tunnel can forward traffic.`);
  }
};

const stop = () => {
  stopping = true;
  if (child) child.kill('SIGTERM');
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
start();
