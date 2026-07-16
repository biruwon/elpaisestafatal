import { spawn } from 'node:child_process';

const children = [
  spawn(process.execPath, ['scripts/local-claim-service.mjs'], { stdio: 'inherit', env: process.env }),
  spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4322'], { stdio: 'inherit', env: process.env }),
  spawn(process.execPath, ['scripts/local-dev-gateway.mjs'], { stdio: 'inherit', env: process.env }),
];

const stop = () => children.forEach((child) => child.kill('SIGTERM'));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
children.forEach((child) => child.on('exit', (code) => { if (code && code !== 143) process.exitCode = code; }));
