import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const environment = join(root, `.local/speech-venv-${process.platform}`);
const python = join(environment, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit', shell: false });
  child.on('error', reject);
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error('Local speech setup failed')));
});
await mkdir(join(root, '.local'), { recursive: true });
await run(process.env.LOCAL_SPEECH_PYTHON || 'python3', ['-m', 'venv', environment]);
await run(python, ['-m', 'pip', 'install', '-r', 'scripts/speech-requirements.txt']);
await run(python, ['scripts/transcribe-audio.py', '--prepare']);
console.log('Local audio transcription is ready. Restart the claim resolver to enable it.');
