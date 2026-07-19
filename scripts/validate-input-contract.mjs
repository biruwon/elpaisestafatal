import { INPUT_LIMITS, validateInputMetadata } from '../src/lib/knowledge/input-contract.mjs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(validateInputMetadata({ text: 'Una afirmación', inputType: 'text' }).ok, 'valid text was rejected');
assert(validateInputMetadata({ text: 'https://ine.es/datos', inputType: 'url' }).ok, 'valid URL was rejected');
assert(validateInputMetadata({ inputType: 'image', hasFile: true, fileSize: 1024, mimeType: 'image/png' }).ok, 'valid image was rejected');
assert(validateInputMetadata({ inputType: 'audio', hasFile: true, fileSize: 1024, mimeType: 'audio/wav' }).ok, 'valid audio was rejected');
assert(!validateInputMetadata({ inputType: 'image', hasFile: true, fileSize: 1024, mimeType: 'image/svg+xml' }).ok, 'SVG was accepted as a screenshot');
assert(!validateInputMetadata({ inputType: 'audio', hasFile: true, fileSize: 1024, mimeType: 'application/octet-stream' }).ok, 'generic binary was accepted as audio');
assert(validateInputMetadata({ inputType: 'image', hasFile: true, fileSize: INPUT_LIMITS.maxFileBytes + 1, mimeType: 'image/png' }).code === 'file_too_large', 'oversized media was not rejected');
assert(validateInputMetadata({ text: 'x'.repeat(INPUT_LIMITS.maxTextCharacters + 1), inputType: 'text' }).code === 'text_too_large', 'oversized text was not rejected');
assert(!validateInputMetadata({ text: 'caption', inputType: 'text', hasFile: true, fileSize: 1, mimeType: 'image/png' }).ok, 'text plus file was accepted');
assert(!validateInputMetadata({ text: 'http://example.com', inputType: 'url' }).ok, 'HTTP URL was accepted');
console.log('Input contract validation passed: text, URL, screenshot, audio, size, and MIME gates are enforced.');
