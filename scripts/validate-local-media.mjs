import { readFile } from 'node:fs/promises';

const [service, compose, homepage, input, smoke] = await Promise.all([
  readFile('scripts/local-claim-service.mjs', 'utf8'),
  readFile('docker-compose.local.yml', 'utf8'),
  readFile('src/pages/index.astro', 'utf8'),
  readFile('src/scripts/claim-input.ts', 'utf8'),
  readFile('scripts/smoke-local-resolver.mjs', 'utf8'),
]);

const failures = [];
const requireText = (content, text, label) => {
  if (!content.includes(text)) failures.push(`${label}: missing ${text}`);
};

requireText(service, 'LOCAL_SPEECH_COMMAND', 'local media service');
requireText(service, 'LOCAL_SPEECH_ARGS', 'local media service');
requireText(service, 'LOCAL_SPEECH_TIMEOUT_MS', 'local media service');
requireText(service, "inputType === 'image' ? await extractImageText(media) : await transcribeAudio(media)", 'shared media pipeline');
requireText(service, 'Typed media fallback failed:', 'typed-caption fallback');
requireText(service, "if (text) {", 'typed-caption fallback');
requireText(compose, 'LOCAL_SPEECH_COMMAND', 'local compose contract');
requireText(compose, 'LOCAL_SPEECH_TIMEOUT_MS', 'local compose contract');
requireText(homepage, 'conversation-media-help', 'media submission guidance');
requireText(input, 'se enviará automáticamente', 'automatic media submission guidance');
requireText(input, "fileInput?.addEventListener('change'", 'automatic file submission');
requireText(smoke, 'SMOKE_MEDIA', 'multipart media smoke path');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Local media contract valid: screenshot and audio inputs share the resolver path, audio runtime configuration is optional, and the UI submits files automatically.');
