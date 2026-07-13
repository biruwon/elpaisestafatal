import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const args = process.argv.slice(2);
const imageIndex = args.indexOf('--image');
const audioIndex = args.indexOf('--audio');
const imagePath = imageIndex >= 0 ? args[imageIndex + 1] : null;
const audioPath = audioIndex >= 0 ? args[audioIndex + 1] : null;
const input = args.filter((arg, index) => !['--image', '--audio'].includes(arg) && index !== imageIndex + 1 && index !== audioIndex + 1).join(' ').trim();
if (!input) {
  console.error('Usage: npm run clarify:local -- "claim text"');
  console.error('   or: npm run clarify:local -- https://example.com/article');
  console.error('   or: npm run clarify:local -- --image /path/to/screenshot.png');
  console.error('   or: npm run clarify:local -- --audio /path/to/recording.m4a');
  process.exit(1);
}

const approved = [
  { slug: 'inmigracion-delincuencia', prompt: 'Los inmigrantes crean inseguridad' },
  { slug: 'viviendas-vacias', prompt: 'Hay millones de viviendas vacías, así que no hace falta construir' },
  { slug: 'empleo-record', prompt: 'España tiene más empleo que nunca, así que el trabajo va bien' },
];

async function pageText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`URL respondió ${response.status}`);
  const html = await response.text();
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 20000);
}

const isUrl = /^https?:\/\//i.test(input);
let extractedText = input;
let url = null;
let inputType = isUrl ? 'url' : 'text';
let imageBase64 = null;
if (imagePath) { inputType = 'image'; imageBase64 = (await readFile(imagePath)).toString('base64'); extractedText = 'Screenshot attached; extract visible claims and classify them.'; }
if (audioPath) { inputType = 'audio'; extractedText = 'Audio transcription is not available because no local transcription runtime is installed.'; }
if (isUrl) {
  url = input;
  try { extractedText = await pageText(input); } catch (error) { console.error(`No se pudo extraer el enlace: ${error.message}`); }
}

let classification = { slug: 'none', reason: 'No se ejecutó Ollama', model: null };
try {
  const model = process.env.OLLAMA_MODEL || (inputType === 'image' ? 'qwen3-vl:8b' : 'qwen3.6:latest');
  const response = await fetch(process.env.OLLAMA_ENDPOINT || 'http://localhost:11434/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(120000),
    body: JSON.stringify({ model, stream: false, format: { type: 'object', properties: { slug: { type: 'string' }, reason: { type: 'string' } }, required: ['slug', 'reason'] }, messages: [
      { role: 'system', content: 'Clasifica el texto en una afirmación aprobada o none. Devuelve solo JSON. No inventes hechos ni respondas la afirmación.' },
      imageBase64 ? { role: 'user', content: JSON.stringify({ text: extractedText, approved }), images: [imageBase64] } : { role: 'user', content: JSON.stringify({ text: extractedText, approved }) },
    ] }),
  });
  if (response.ok) {
    const body = await response.json();
    const parsed = JSON.parse(body.message?.content || '{}');
    classification = { slug: approved.some((item) => item.slug === parsed.slug) ? parsed.slug : 'none', reason: parsed.reason || '', model };
  }
} catch (error) {
  classification.reason = `Ollama no disponible: ${error.message}`;
}

if (inputType === 'audio') classification.reason = 'Audio input requires a local transcription runtime such as whisper.cpp or mlx_whisper before it can enter the claim compiler.';
const record = { createdAt: new Date().toISOString(), inputType, input: input || audioPath || imagePath, url, extractedText, classification };
await mkdir(join(root, '.local'), { recursive: true });
await appendFile(join(root, '.local/knowledge-gaps.jsonl'), `${JSON.stringify(record)}\n`);
console.log(JSON.stringify(record, null, 2));
console.log('\nSaved locally to .local/knowledge-gaps.jsonl');
