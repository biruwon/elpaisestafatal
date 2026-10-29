export const INPUT_LIMITS = Object.freeze({
  maxTextCharacters: 12_000,
  maxRequestBytes: 9 * 1024 * 1024,
  maxFileBytes: 8 * 1024 * 1024,
  imageMimeTypes: Object.freeze(['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  audioMimeTypes: Object.freeze(['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/flac', 'audio/x-m4a']),
  documentMimeTypes: Object.freeze(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/csv', 'text/markdown', 'application/json']),
  videoMimeTypes: Object.freeze(['video/mp4', 'video/webm', 'video/quicktime']),
  maxExtractedCharacters: 12_000,
  maxDocumentPages: 20,
  maxVideoSeconds: 120,
  maxAudioSeconds: 120,
});

const documentExtensions = Object.freeze({ pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', txt: 'text/plain', csv: 'text/csv', md: 'text/markdown', json: 'application/json' });
export const fileMimeType = (mimeType = '', fileName = '') => String(mimeType || '').toLowerCase().split(';')[0].trim()
  || documentExtensions[String(fileName).split('.').at(-1)?.toLowerCase()] || '';
export const inputTypeForFile = (mimeType = '', fileName = '') => {
  const mime = fileMimeType(mimeType, fileName);
  return ['image', 'audio', 'document', 'video'].find((type) => INPUT_LIMITS[`${type}MimeTypes`].includes(mime));
};

export const inputErrorMessage = (code) => ({
  empty: 'Escribe una afirmación o adjunta un archivo.',
  text_too_large: 'El texto supera los 12.000 caracteres. Selecciona la parte que quieres comprobar.',
  file_too_large: 'El archivo supera los 8 MB. Envía un archivo más pequeño.',
  invalid_url: 'Pega un enlace HTTPS completo y sin credenciales.',
  invalid_image: 'Usa una imagen PNG, JPEG, WebP o GIF.',
  invalid_audio: 'Usa audio WAV, MP3, M4A, OGG, WebM o FLAC.',
  invalid_document: 'Usa un PDF, DOCX o archivo de texto, CSV, Markdown o JSON.',
  invalid_video: 'Usa un vídeo MP4, WebM o MOV de hasta 2 minutos.',
  invalid_file_size: 'El archivo está vacío o no se puede leer.',
  unexpected_file: 'Selecciona el tipo de archivo que quieres comprobar.',
  invalid_type: 'Este formato no se puede leer. Envía el texto o un archivo compatible.',
}[code] || 'No hemos podido leer esta entrada. Envía el texto o un archivo compatible.');

export const validateInputMetadata = ({ text = '', inputType = 'text', hasFile = false, fileSize = 0, mimeType = '', fileName = '' } = {}) => {
  const value = String(text || '').trim();
  const type = String(inputType || 'text').toLowerCase();
  const mime = fileMimeType(mimeType, fileName);
  if (!['text', 'image', 'audio', 'document', 'video', 'url'].includes(type)) return { ok: false, code: 'invalid_type' };
  if (!value && !hasFile) return { ok: false, code: 'empty' };
  if (value.length > INPUT_LIMITS.maxTextCharacters) return { ok: false, code: 'text_too_large' };
  if (type === 'url') {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return { ok: false, code: 'invalid_url' };
    } catch { return { ok: false, code: 'invalid_url' }; }
  }
  if (type === 'text' && hasFile) return { ok: false, code: 'unexpected_file' };
  for (const format of ['image', 'audio', 'document', 'video']) {
    if (type === format && (!hasFile || !INPUT_LIMITS[`${format}MimeTypes`].includes(mime))) return { ok: false, code: `invalid_${format}` };
  }
  if (hasFile && (!Number.isFinite(fileSize) || fileSize <= 0)) return { ok: false, code: 'invalid_file_size' };
  if (hasFile && Number(fileSize) > INPUT_LIMITS.maxFileBytes) return { ok: false, code: 'file_too_large' };
  if (hasFile && !['image', 'audio', 'document', 'video'].includes(type)) return { ok: false, code: 'unexpected_file' };
  return { ok: true, code: 'ok' };
};
