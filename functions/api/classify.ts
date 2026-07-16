type Candidate = { kind?: 'claim' | 'topic'; slug: string; title: string; href?: string; aliases?: string[]; keywords?: string[] };
type Draft = { title: string; summary: string; questions: string[]; limitation: string };
type Classification = { status: 'match' | 'draft' | 'unknown' | 'unavailable'; claimSlug?: string; topicSlug?: string; confidence?: number; draft?: Draft };

type AiBinding = { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };
interface Env { AI?: AiBinding; CLASSIFIER_PROVIDER?: string; OLLAMA_ENDPOINT?: string; OLLAMA_MODEL?: string; OLLAMA_VISION_MODEL?: string; AI_TEXT_MODEL?: string; AI_VISION_MODEL?: string; AI_TRANSCRIPTION_MODEL?: string; TRANSCRIPTION_ENDPOINT?: string }
interface Context { request: Request; env: Env }

const MAX_TEXT_LENGTH = 4000;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const JSON_STATUS = new Set(['match', 'draft', 'unknown']);

const unavailable = (): Classification => ({ status: 'unavailable' });

const json = (payload: Classification, status = 200): Response => Response.json(payload, {
  status,
  headers: { 'Cache-Control': 'no-store' },
});

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

const parseJson = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === 'object' && 'response' in value) {
    return parseJson((value as { response: unknown }).response);
  }
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? text;
  const object = fenced.match(/\{[\s\S]*\}/)?.[0];
  if (!object) return null;
  try { return JSON.parse(object) as Record<string, unknown>; } catch { return null; }
};

const draftFrom = (value: Record<string, unknown>): Draft | undefined => {
  const draft = value.draft && typeof value.draft === 'object' ? value.draft as Record<string, unknown> : value;
  const title = typeof draft.title === 'string' ? draft.title.slice(0, 180) : '';
  const summary = typeof draft.summary === 'string' ? draft.summary.slice(0, 900) : '';
  if (!title || !summary) return undefined;
  const questions = Array.isArray(draft.questions) ? draft.questions.filter((item): item is string => typeof item === 'string').slice(0, 3).map((item) => item.slice(0, 220)) : [];
  const limitation = typeof draft.limitation === 'string' ? draft.limitation.slice(0, 400) : 'Este borrador no sustituye una investigación con fuentes.';
  return { title, summary, questions, limitation };
};

const validateClassification = (value: unknown, candidates: Candidate[]): Classification => {
  const parsed = parseJson(value);
  if (!parsed) return { status: 'unknown' };
  const status = typeof parsed.status === 'string' && JSON_STATUS.has(parsed.status) ? parsed.status as Classification['status'] : 'unknown';
  const candidateSlugs = new Set(candidates.map((candidate) => candidate.slug));
  const claimSlug = typeof parsed.claimSlug === 'string' && candidateSlugs.has(parsed.claimSlug) ? parsed.claimSlug : undefined;
  const topicSlug = typeof parsed.topicSlug === 'string' && candidateSlugs.has(parsed.topicSlug) ? parsed.topicSlug : undefined;
  const confidence = typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : undefined;
  const draft = status === 'draft' ? draftFrom(parsed) : undefined;
  if (status === 'match' && !claimSlug && !topicSlug) return { status: 'unknown' };
  if (status === 'draft' && !draft) return { status: 'unknown' };
  return { status, claimSlug, topicSlug, confidence, draft };
};

const candidatePrompt = (candidates: Candidate[]): string => candidates.slice(0, 24).map((candidate) => `${candidate.kind || 'claim'}:${candidate.slug} — ${candidate.title}`).join('\n');

const classifierPrompt = (text: string, candidates: Candidate[]): string => `Eres un clasificador editorial para una web de verificación en español.
Devuelve únicamente JSON válido con esta forma:
{"status":"match|draft|unknown","claimSlug":"slug o vacío","topicSlug":"slug o vacío","confidence":0,"draft":{"title":"","summary":"","questions":[],"limitation":""}}

Elige solo slugs de la lista. Si una afirmación publicada encaja, usa match. Si no encaja exactamente pero puedes redactar un encuadre provisional a partir de la formulación, usa draft. Nunca inventes fuentes, estadísticas ni hechos concretos. Si no puedes hacerlo, usa unknown.

Texto recibido:
${text.slice(0, MAX_TEXT_LENGTH)}

Cobertura aprobada:
${candidatePrompt(candidates)}`;

const ollamaChat = async (endpoint: string, model: string, messages: Record<string, unknown>[], format = true): Promise<unknown> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ model, stream: false, ...(format ? { format: 'json' } : {}), options: { temperature: 0, num_predict: 260 }, messages }),
    });
    if (!response.ok) throw new Error('classifier failed');
    const data = await response.json() as { message?: { content?: string } };
    return data.message?.content || '';
  } finally { clearTimeout(timeout); }
};

const classifyWithOllama = async (text: string, candidates: Candidate[], env: Env): Promise<Classification> => {
  if (!env.OLLAMA_ENDPOINT || !env.OLLAMA_MODEL) return unavailable();
  const output = await ollamaChat(env.OLLAMA_ENDPOINT, env.OLLAMA_MODEL, [
    { role: 'system', content: 'Clasifica afirmaciones aprobadas y redacta encuadres provisionales. No hagas una verificación ni inventes evidencia.' },
    { role: 'user', content: classifierPrompt(text, candidates) },
  ]);
  return validateClassification(output, candidates);
};

const classifyWithWorkersAi = async (text: string, candidates: Candidate[], env: Env): Promise<Classification> => {
  if (!env.AI) return unavailable();
  const output = await env.AI.run(env.AI_TEXT_MODEL || '@cf/meta/llama-3.1-8b-instruct', {
    prompt: classifierPrompt(text, candidates),
    temperature: 0,
    max_tokens: 300,
  });
  return validateClassification(output, candidates);
};

const transcribeAudio = async (bytes: Uint8Array, mimeType: string, env: Env): Promise<string> => {
  if (env.TRANSCRIPTION_ENDPOINT) {
    const body = new FormData();
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    body.set('file', new Blob([copy.buffer], { type: mimeType }), 'input-audio');
    const response = await fetch(env.TRANSCRIPTION_ENDPOINT, { method: 'POST', body });
    if (!response.ok) throw new Error('transcription failed');
    const data = await response.json() as { text?: string; transcript?: string };
    return String(data.text || data.transcript || '').slice(0, MAX_TEXT_LENGTH);
  }
  if (!env.AI) return '';
  const output = await env.AI.run(env.AI_TRANSCRIPTION_MODEL || '@cf/openai/whisper-large-v3-turbo', { audio: bytes });
  const parsed = parseJson(output);
  if (parsed?.text && typeof parsed.text === 'string') return parsed.text.slice(0, MAX_TEXT_LENGTH);
  if (typeof output === 'string') return output.slice(0, MAX_TEXT_LENGTH);
  if (output && typeof output === 'object' && 'text' in output) return String((output as { text: unknown }).text).slice(0, MAX_TEXT_LENGTH);
  return '';
};

const describeImage = async (bytes: Uint8Array, mimeType: string, env: Env): Promise<string> => {
  const image = `data:${mimeType};base64,${toBase64(bytes)}`;
  if (env.OLLAMA_ENDPOINT && env.OLLAMA_VISION_MODEL) {
    const output = await ollamaChat(env.OLLAMA_ENDPOINT, env.OLLAMA_VISION_MODEL, [
      { role: 'system', content: 'Extrae el texto y la afirmación principal de esta imagen. Devuelve solo texto breve, sin verificarla.' },
      { role: 'user', content: 'Identifica la afirmación principal de la imagen.', images: [image] },
    ], false);
    return typeof output === 'string' ? output.slice(0, MAX_TEXT_LENGTH) : '';
  }
  if (!env.AI) return '';
  const output = await env.AI.run(env.AI_VISION_MODEL || '@cf/llava-hf/llava-1.5-7b-hf', { prompt: 'Extrae el texto y la afirmación principal de esta imagen. Devuelve solo texto breve.', image: [...bytes] });
  if (typeof output === 'string') return output.slice(0, MAX_TEXT_LENGTH);
  if (output && typeof output === 'object' && 'response' in output) return String((output as { response: unknown }).response).slice(0, MAX_TEXT_LENGTH);
  return '';
};

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  if (request.headers.get('content-type')?.includes('multipart/form-data') !== true) return json(unavailable(), 415);
  try {
    const form = await request.formData();
    const inputType = String(form.get('inputType') || 'text');
    const candidatesRaw = String(form.get('candidates') || '[]');
    let candidates: Candidate[] = [];
    try {
      const parsed = JSON.parse(candidatesRaw) as unknown;
      if (Array.isArray(parsed)) candidates = parsed.filter((item): item is Candidate => Boolean(item && typeof item === 'object' && typeof (item as Candidate).slug === 'string' && typeof (item as Candidate).title === 'string'));
    } catch { candidates = []; }
    if (!candidates.length) return json({ status: 'unknown' });

    let text = String(form.get('text') || '').trim().slice(0, MAX_TEXT_LENGTH);
    const file = form.get('file');
    if (file instanceof File) {
      if (file.size <= 0 || file.size > MAX_FILE_BYTES) return json(unavailable(), 413);
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (inputType === 'audio') text = await transcribeAudio(bytes, file.type || 'audio/mpeg', env);
      if (inputType === 'image') text = await describeImage(bytes, file.type || 'image/jpeg', env);
      text = text.trim().slice(0, MAX_TEXT_LENGTH);
    }
    if (!text) return json({ status: 'unknown' });

    const provider = env.CLASSIFIER_PROVIDER || (env.OLLAMA_ENDPOINT ? 'ollama' : env.AI ? 'workers-ai' : 'none');
    if (provider === 'ollama') return json(await classifyWithOllama(text, candidates, env));
    if (provider === 'workers-ai') return json(await classifyWithWorkersAi(text, candidates, env));
    return json(unavailable());
  } catch {
    return json(unavailable());
  }
};
