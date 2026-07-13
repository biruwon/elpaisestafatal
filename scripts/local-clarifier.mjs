import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const input = process.argv.slice(2).join(' ').trim();
if (!input) {
  console.error('Usage: npm run clarify:local -- "claim text"');
  console.error('   or: npm run clarify:local -- https://example.com/article');
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
if (isUrl) {
  url = input;
  try { extractedText = await pageText(input); } catch (error) { console.error(`No se pudo extraer el enlace: ${error.message}`); }
}

let classification = { slug: 'none', reason: 'No se ejecutó Ollama', model: null };
try {
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(120000),
    body: JSON.stringify({ model: process.env.OLLAMA_MODEL || 'qwen3.6:latest', stream: false, format: { type: 'object', properties: { slug: { type: 'string' }, reason: { type: 'string' } }, required: ['slug', 'reason'] }, messages: [
      { role: 'system', content: 'Clasifica el texto en una afirmación aprobada o none. Devuelve solo JSON. No inventes hechos ni respondas la afirmación.' },
      { role: 'user', content: JSON.stringify({ text: extractedText, approved }) },
    ] }),
  });
  if (response.ok) {
    const body = await response.json();
    const parsed = JSON.parse(body.message?.content || '{}');
    classification = { slug: approved.some((item) => item.slug === parsed.slug) ? parsed.slug : 'none', reason: parsed.reason || '', model: process.env.OLLAMA_MODEL || 'qwen3.6:latest' };
  }
} catch (error) {
  classification.reason = `Ollama no disponible: ${error.message}`;
}

const record = { createdAt: new Date().toISOString(), inputType: isUrl ? 'url' : 'text', input, url, extractedText, classification };
await mkdir(join(root, '.local'), { recursive: true });
await appendFile(join(root, '.local/knowledge-gaps.jsonl'), `${JSON.stringify(record)}\n`);
console.log(JSON.stringify(record, null, 2));
console.log('\nSaved locally to .local/knowledge-gaps.jsonl');
