import { parentPort, workerData } from 'node:worker_threads';
import { INPUT_LIMITS } from '../../src/lib/knowledge/input-contract.mjs';

const bytes = new Uint8Array(workerData.bytes);
const warnings = [];
let text;
if (workerData.mime === 'application/pdf') {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: bytes, isEvalSupported: false });
  try {
    const result = await parser.getText({ first: INPUT_LIMITS.maxDocumentPages });
    text = result.pages.map((page) => `[Página ${page.num}]\n${page.text}`).join('\n\n');
    if (result.total > INPUT_LIMITS.maxDocumentPages) warnings.push(`Solo se han leído las primeras ${INPUT_LIMITS.maxDocumentPages} páginas del documento.`);
  } finally { await parser.destroy(); }
} else if (workerData.mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
  const { unzipSync, strFromU8 } = await import('fflate');
  const parts = unzipSync(bytes, { filter: (file) => file.name === 'word/document.xml' && file.originalSize <= 4 * 1024 * 1024 });
  if (!parts['word/document.xml']) throw new Error('Missing or oversized document body');
  const xml = strFromU8(parts['word/document.xml']);
  // Read only body text, in document order. No relationships or external
  // resources are opened. Preserve table/paragraph boundaries and entities.
  text = xml.replace(/<w:tab\b[^>]*\/>/g, '\t').replace(/<w:br\b[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n').replace(/<\/w:tc>/g, '\t').replace(/<\/w:tr>/g, '\n')
    .replace(/<[^>]+>/g, '').replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => {
      const value = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
      return value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : '';
    }).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  warnings.push('Se ha leído el texto del documento; las imágenes, notas y elementos incrustados no se han comprobado.');
} else {
  text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (text.includes('\u0000')) throw new Error('Binary content is not text');
}
text = String(text || '').trim();
if (text.length > INPUT_LIMITS.maxExtractedCharacters) warnings.push('El contenido supera los 12.000 caracteres: solo se ha leído el inicio. Selecciona un fragmento para comprobar el resto.');
if (!text) throw new Error('No readable text. A scanned PDF requires OCR.');
parentPort.postMessage({ text: text.slice(0, INPUT_LIMITS.maxExtractedCharacters), warnings, status: warnings.length ? 'partial' : 'complete' });
