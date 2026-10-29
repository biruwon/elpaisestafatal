import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { zipSync, strToU8 } from 'fflate';
import { extractDocument, extractSubmission, extractVideo, resolveExtractedSubmission } from './lib/submission-extraction.mjs';
import { attachExtraction, extractedClaim, publicExtraction } from '../src/lib/knowledge/submission.mjs';
import { localPublicCheckResponse } from './lib/local-public-check-response.mjs';
import { publicResolveResponse } from '../src/lib/knowledge/public-response.mjs';
import { INPUT_LIMITS, inputTypeForFile, validateInputMetadata } from '../src/lib/knowledge/input-contract.mjs';
import { safeHealthEnvelope } from '../src/lib/knowledge/safe-health.mjs';
import { boundedRequest, RequestTooLargeError } from '../src/lib/knowledge/bounded-request.mjs';

const media = (text, mime = 'text/plain') => ({ base64: Buffer.from(text).toString('base64'), mime });
const text = 'El paro juvenil no es la tasa de paro total.';
const document = await extractDocument(media(text));
assert.equal(document.text, text);
assert.equal(document.status, 'complete');
const long = await extractDocument(media('a'.repeat(INPUT_LIMITS.maxExtractedCharacters + 1)));
assert.equal(long.status, 'partial');
assert.equal(long.text.length, INPUT_LIMITS.maxExtractedCharacters);
assert.ok(long.warnings.length);
await assert.rejects(extractDocument(media('\u0000binary')));
const docx = zipSync({ 'word/document.xml': strToU8('<w:document><w:p><w:r><w:t>Paro &amp; empleo</w:t></w:r></w:p><w:p><w:r><w:t>12,5 %</w:t></w:r></w:p></w:document>') });
const word = await extractDocument({ base64: Buffer.from(docx).toString('base64'), mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
assert.match(word.text, /Paro & empleo\n12,5 %/);
assert.equal(word.status, 'partial', 'Embedded material must not be claimed as read');

// A small real PDF exercises the actual PDF parser without a network fixture.
const stream = 'BT /F1 12 Tf 20 100 Td (Employment is not unemployment.) Tj ET';
const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
let pdf = '%PDF-1.4\n';
const offsets = [0];
objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
const startXref = Buffer.byteLength(pdf);
pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;
const parsedPdf = await extractDocument(media(pdf, 'application/pdf'));
assert.match(parsedPdf.text, /Employment is not unemployment/);

for (const [type, mime] of [['document', 'application/pdf'], ['video', 'video/mp4']]) {
  assert.equal(inputTypeForFile(mime), type);
  assert.equal(validateInputMetadata({ inputType: type, hasFile: true, mimeType: mime, fileSize: 5 }).ok, true);
}
assert.equal(inputTypeForFile('', 'informe.docx'), 'document');
assert.equal(inputTypeForFile('application/octet-stream', 'informe.docx'), undefined, 'A declared binary MIME must not be overridden');
assert.equal(validateInputMetadata({ inputType: 'image', hasFile: true, mimeType: 'image/png', fileSize: NaN }).ok, false);
assert.equal(validateInputMetadata({ inputType: 'document', hasFile: true, mimeType: 'text/plain', fileSize: 0 }).ok, false);

const adapters = { inspectImage: async () => text, transcribeAudio: async () => { throw new Error('unavailable'); }, readPage: async () => text,
  classify: async (claim) => { assert.match(claim, /paro/); return {}; }, resolve: async (claim) => ({ status: 'complete', result: { claim } }) };
const caption = 'Comprueba el mensaje';
const image = await resolveExtractedSubmission({ text: caption, inputType: 'image', media: {} }, adapters, 'image-job');
assert.equal(image.claim, `${caption}\n\n${text}`);
assert.equal(image.extraction.text, text);
assert.equal(publicExtraction(image.extraction).inputType, 'image');
const failed = await extractSubmission({ text: 'La tasa de paro', inputType: 'audio', media: {} }, adapters);
assert.equal(failed.status, 'failed');
assert.equal(extractedClaim(failed), 'La tasa de paro');
const qualified = attachExtraction({ state: 'supported', result: { limitations: [], assessment: 'true' } }, failed);
assert.equal(qualified.state, 'limited');
assert.equal(qualified.result.assessment, undefined);
assert.match(qualified.result.answer, /archivo sigue sin comprobar/, 'Copied answers must preserve extraction failures');
assert.match(qualified.result.limitations[0], /archivo sigue sin comprobar/);
const noCaption = await resolveExtractedSubmission({ inputType: 'audio', media: {} }, adapters, 'failed-job');
assert.equal(noCaption.status, 'unavailable');
assert.equal(localPublicCheckResponse(noCaption).message, noCaption.extraction.warnings[0]);
const page = await resolveExtractedSubmission({ text: 'https://example.com/claim', inputType: 'url' }, adapters, 'url-job');
assert.equal(page.claim, text, 'The URL itself must not replace the extracted claim');
assert.equal(publicResolveResponse({ status: 'unavailable', extraction: { ...failed, text: 1 } }), undefined);
assert.equal(publicResolveResponse({ status: 'unavailable', extraction: failed }).extraction.status, 'failed');
assert.equal(safeHealthEnvelope({ status: 'ok', deterministic: true, dynamic: false, inputs: { audio: 'unavailable', document: 'available', token: 'secret' } }).inputs.token, undefined);

const streamRequest = new Request('https://example.com/check', { method: 'POST', body: new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(6)); controller.enqueue(new Uint8Array(6)); controller.close(); } }), duplex: 'half' });
await assert.rejects(boundedRequest(streamRequest, 10), RequestTooLargeError);

// Exercise real frame decoding when ffmpeg is installed (included in Docker).
const execute = promisify(execFile);
let videoAvailable = false;
try { await execute('ffmpeg', ['-version']); videoAvailable = true; } catch { /* Optional on bare development hosts. */ }
if (videoAvailable) {
  const directory = await mkdtemp(join(tmpdir(), 'claim-video-test-'));
  try {
    const path = join(directory, 'clip.mp4');
    await execute('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=160x90:d=1', '-c:v', 'mpeg4', '-y', path]);
    let frames = 0;
    const video = await extractVideo({ base64: (await readFile(path)).toString('base64') }, { inspectImage: async (frame) => { frames += 1; assert.equal(Buffer.from(frame.base64, 'base64')[0], 255); return 'Mensaje del vídeo'; } });
    assert.equal(frames, 4);
    assert.equal(video.status, 'partial');
    assert.match(video.warnings.join(' '), /audio.*no se ha transcrito/);
  } finally { await rm(directory, { recursive: true, force: true }); }
}
console.log(`Submission pipeline passed: real PDF/DOCX/text extraction, ${videoAvailable ? 'real video decoding' : 'video runtime unavailable on this host'}, partial/failure disclosure, original claim preservation, bounded bodies and safe public metadata.`);
