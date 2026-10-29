import { Worker } from 'node:worker_threads';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { INPUT_LIMITS } from '../../src/lib/knowledge/input-contract.mjs';
import { extractedClaim } from '../../src/lib/knowledge/submission.mjs';

const execute = promisify(execFile);
export const extractDocument = (media) => new Promise((resolve, reject) => {
  const worker = new Worker(new URL('./document-extractor-worker.mjs', import.meta.url), {
    workerData: { bytes: Buffer.from(media.base64, 'base64'), mime: media.mime },
    resourceLimits: { maxOldGenerationSizeMb: 128 },
  });
  const timer = setTimeout(() => { void worker.terminate(); reject(new Error('Document extraction timed out')); }, 20_000);
  worker.once('message', (value) => { clearTimeout(timer); resolve(value); void worker.terminate(); });
  worker.once('error', (error) => { clearTimeout(timer); reject(error); });
  worker.once('exit', (code) => { clearTimeout(timer); if (code !== 0) reject(new Error('Document extraction stopped')); });
});

export const extractVideo = async (media, { inspectImage, transcribeAudio, speechAvailable = false } = {}) => {
  const directory = await mkdtemp(join(tmpdir(), 'claim-video-'));
  const video = join(directory, 'input');
  const format = media.mime === 'video/webm' ? 'matroska' : 'mov';
  try {
    await writeFile(video, Buffer.from(media.base64, 'base64'));
    const { stdout } = await execute('ffprobe', ['-v', 'error', '-protocol_whitelist', 'file,pipe', '-f', format, '-show_entries', 'format=duration', '-of', 'json', video], { timeout: 10_000, maxBuffer: 64 * 1024 });
    const duration = Number(JSON.parse(stdout).format?.duration);
    if (!Number.isFinite(duration) || duration <= 0 || duration > INPUT_LIMITS.maxVideoSeconds) throw new Error('Video must be at most 2 minutes');
    const warnings = ['Se han leído hasta cuatro fotogramas de muestra. No se ha comprobado cada instante del vídeo ni su autenticidad.'];
    const texts = [];
    for (const fraction of [0, 0.25, 0.5, 0.75]) {
      const time = Number((duration * fraction).toFixed(2));
      const frame = join(directory, 'frame.jpg');
      await execute('ffmpeg', ['-v', 'error', '-nostdin', '-protocol_whitelist', 'file,pipe', '-ss', String(time), '-f', format, '-i', video, '-frames:v', '1', '-vf', 'scale=1024:1024:force_original_aspect_ratio=decrease', '-y', frame], { timeout: 10_000, maxBuffer: 64 * 1024 });
      const text = await inspectImage({ base64: (await readFile(frame)).toString('base64'), mime: 'image/jpeg' });
      if (text?.trim()) texts.push(`[Fotograma ${time} s]\n${text.trim()}`);
    }
    if (speechAvailable) {
      try {
        const audio = join(directory, 'audio.wav');
        await execute('ffmpeg', ['-v', 'error', '-nostdin', '-protocol_whitelist', 'file,pipe', '-f', format, '-i', video, '-vn', '-ac', '1', '-ar', '16000', '-y', audio], { timeout: 15_000, maxBuffer: 64 * 1024 });
        const transcript = await transcribeAudio({ base64: (await readFile(audio)).toString('base64'), mime: 'audio/wav' });
        if (transcript?.trim()) texts.push(`[Audio]\n${transcript.trim()}`);
        else warnings.push('No se ha podido transcribir el audio.');
      } catch { warnings.push('No se ha podido leer el audio: puede no existir o no haberse podido transcribir.'); }
    } else warnings.push('El audio del vídeo no se ha transcrito. Puedes pegar su transcripción para comprobarlo.');
    return { text: texts.join('\n\n'), warnings, status: 'partial' };
  } finally { await rm(directory, { recursive: true, force: true }); }
};

export const extractSubmission = async ({ text = '', inputType, media }, adapters) => {
  const base = { inputType, submittedText: text, text: '', warnings: [] };
  try {
    const extracted = inputType === 'document' ? await extractDocument(media)
      : inputType === 'video' ? await extractVideo(media, adapters)
        : { text: inputType === 'image' ? await adapters.inspectImage(media) : inputType === 'url' ? await adapters.readPage(text) : await adapters.transcribeAudio(media), status: 'complete', warnings: [] };
    if (!extracted.text?.trim()) throw new Error('No content extracted');
    const warnings = [...extracted.warnings];
    if (extracted.text.length > INPUT_LIMITS.maxExtractedCharacters) warnings.push('Solo se ha leído el inicio del contenido (12.000 caracteres).');
    if (inputType === 'image') warnings.push('La lectura de texto de la imagen es automática. No demuestra que la imagen sea auténtica ni dónde o cuándo se tomó.');
    if (inputType === 'audio') warnings.push('La transcripción es automática. No demuestra quién habla ni la autenticidad del audio.');
    // The URL locates the submitted claim; it is not itself a verification source.
    return { ...base, ...(inputType === 'url' ? { submittedText: '' } : {}), text: extracted.text.slice(0, INPUT_LIMITS.maxExtractedCharacters),
      status: extracted.status === 'partial' || extracted.text.length > INPUT_LIMITS.maxExtractedCharacters ? 'partial' : 'complete', warnings };
  } catch {
    const kind = { image: 'imagen', audio: 'audio', video: 'vídeo', document: 'documento', url: 'enlace' }[inputType] || 'archivo';
    return { ...base, status: 'failed', warnings: [`No hemos podido leer el ${kind}. ${text && inputType !== 'url' ? 'Solo se ha comprobado el texto que escribiste; el archivo sigue sin comprobar.' : 'Pega el texto que quieres comprobar o prueba con otro archivo compatible.'}`] };
  }
};

export const resolveExtractedSubmission = async (submission, { classify, resolve, ...adapters }, id) => {
  const extraction = await extractSubmission(submission, adapters);
  if (extraction.status === 'failed' && (!submission.text || submission.inputType === 'url')) return { status: 'unavailable', requestId: id, extraction };
  const claim = extractedClaim(extraction);
  const classified = await classify(claim);
  return { ...await resolve(claim, classified, undefined, id), claim, inputType: submission.inputType, extraction };
};
