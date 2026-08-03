import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';

const ports = {
  gateway: Number(process.env.LOCAL_GATEWAY_PORT || 4321),
  astro: Number(process.env.LOCAL_ASTRO_PORT || 4322),
  classifier: Number(process.env.LOCAL_CLASSIFIER_PORT || 8789),
};

const isPortInUse = (port) => new Promise((resolve) => {
  const socket = createConnection({ host: '127.0.0.1', port });
  socket.once('connect', () => { socket.destroy(); resolve(true); });
  socket.once('error', () => { socket.destroy(); resolve(false); });
});

const occupied = [];
for (const [name, port] of Object.entries(ports)) {
  if (await isPortInUse(port)) occupied.push(`${name}=${port}`);
}
if (occupied.length) {
  console.error(`Local AI stack cannot start because these ports are already in use: ${occupied.join(', ')}.`);
  console.error('Stop the existing local stack or set LOCAL_GATEWAY_PORT, LOCAL_ASTRO_PORT, and LOCAL_CLASSIFIER_PORT to free ports before retrying.');
  process.exit(1);
}

const children = [
  spawn(process.execPath, ['scripts/local-claim-service.mjs'], { stdio: 'inherit', env: process.env }),
  spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', process.env.LOCAL_ASTRO_PORT || '4322'], { stdio: 'inherit', env: process.env }),
  spawn(process.execPath, ['scripts/local-dev-gateway.mjs'], { stdio: 'inherit', env: process.env }),
];

const stop = () => children.forEach((child) => child.kill('SIGTERM'));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
children.forEach((child) => child.on('exit', (code) => { if (code && code !== 143) process.exitCode = code; }));
