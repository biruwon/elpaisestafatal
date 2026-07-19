export const INPUT_LIMITS = Object.freeze({
  maxTextCharacters: 12_000,
  maxRequestBytes: 9 * 1024 * 1024,
  maxFileBytes: 8 * 1024 * 1024,
  imageMimeTypes: Object.freeze(['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  audioMimeTypes: Object.freeze(['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/flac', 'audio/x-m4a']),
});

export const validateInputMetadata = ({ text = '', inputType = 'text', hasFile = false, fileSize = 0, mimeType = '' } = {}) => {
  const value = String(text || '').trim();
  const type = String(inputType || 'text').toLowerCase();
  const mime = String(mimeType || '').toLowerCase();
  if (!['text', 'image', 'audio', 'url'].includes(type)) return { ok: false, code: 'invalid_type' };
  if (!value && !hasFile) return { ok: false, code: 'empty' };
  if (value.length > INPUT_LIMITS.maxTextCharacters) return { ok: false, code: 'text_too_large' };
  if (type === 'url' && !/^https:\/\//i.test(value)) return { ok: false, code: 'invalid_url' };
  if (type === 'text' && hasFile) return { ok: false, code: 'unexpected_file' };
  if (type === 'image' && (!hasFile || !INPUT_LIMITS.imageMimeTypes.includes(mime))) return { ok: false, code: 'invalid_image' };
  if (type === 'audio' && (!hasFile || !INPUT_LIMITS.audioMimeTypes.includes(mime))) return { ok: false, code: 'invalid_audio' };
  if (hasFile && Number(fileSize) > INPUT_LIMITS.maxFileBytes) return { ok: false, code: 'file_too_large' };
  if (hasFile && !['image', 'audio'].includes(type)) return { ok: false, code: 'unexpected_file' };
  return { ok: true, code: 'ok' };
};
