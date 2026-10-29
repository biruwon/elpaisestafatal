import { readFile } from 'node:fs/promises';
import './validate-submission-pipeline.mjs';

const compose = await readFile('docker-compose.local.yml', 'utf8');
const dockerfile = await readFile('Dockerfile.local', 'utf8');
for (const field of ['LOCAL_SPEECH_COMMAND', 'LOCAL_SPEECH_ARGS', 'LOCAL_SPEECH_TIMEOUT_MS']) {
  if (!compose.includes(field)) throw new Error(`Missing speech configuration: ${field}`);
}
if (!dockerfile.includes('COPY src ./src') || !dockerfile.includes('ffmpeg')) throw new Error('The resolver image must include its shared contracts and video decoder.');
console.log('Local media runtime contract valid.');
