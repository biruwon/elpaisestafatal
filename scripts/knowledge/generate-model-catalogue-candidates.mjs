import { mkdir, readFile, writeFile } from 'node:fs/promises';

const endpoint = process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434';
const model = process.env.OLLAMA_CATALOGUE_MODEL || 'qwen2.5:14b-instruct-q4_K_M';
const fallbackModel = process.env.OLLAMA_CATALOGUE_FALLBACK_MODEL || 'qwen2.5:7b';
const output = process.env.CATALOGUE_CANDIDATES_OUTPUT || '.local/catalogue-model-candidates.json';
const checkpointPath = process.env.CATALOGUE_CHECKPOINT || `${output}.checkpoint.json`;
const promptVersion = 'catalogue-neutral-v2';
const targetCandidates = Math.max(1, Number(process.env.CATALOGUE_TARGET || 2_000));
const generationTarget = Math.ceil(targetCandidates * 1.25);
const claimsPerTopic = Math.max(5, Math.min(30, Number(process.env.CATALOGUE_CLAIMS_PER_BATCH || 20)));
const batchesPerTopic = Math.max(1, Number(process.env.CATALOGUE_BATCHES_PER_TOPIC || 5));
const topics = [
  'quejas sobre el precio del alquiler, subidas, sueldo que no alcanza, fianzas, gastos y acceso a vivienda', 'empleo, paro y salarios', 'inmigración y demografía',
  'seguridad y delincuencia', 'sanidad y listas de espera', 'educación y juventud',
  'impuestos y gasto público', 'pensiones y protección social', 'pobreza y desigualdad',
  'economía, inflación y crecimiento', 'energía y coste de vida', 'instituciones y justicia',
  'medio ambiente e incendios', 'transporte e infraestructuras', 'turismo y agricultura',
  'derechos laborales y conciliación', 'corrupción y contratación pública', 'España y la Unión Europea',
  'ciencia, tecnología y vivienda digital', 'territorio y diferencias regionales',
];
const normalise = (value) => String(value).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
const candidates = [];
const selectedTopics = topics.slice(0, Number(process.env.CATALOGUE_TOPIC_LIMIT || topics.length));
const timeoutMs = Math.max(15_000, Number(process.env.CATALOGUE_MODEL_TIMEOUT_MS || 90_000));
const concurrency = Math.max(1, Math.min(4, Number(process.env.CATALOGUE_MODEL_CONCURRENCY || 3)));
const polarityFor = (claim) => /\b(?:no|nunca|falso|mito|menos|baja|cae|disminuye|peor|destru[yi])\b/i.test(claim) ? 'negative' : /\b(?:sí|siempre|verdad|más|sube|aumenta|mejor|récord)\b/i.test(claim) ? 'positive' : 'neutral';
const readCheckpoint = async () => { try { return JSON.parse(await readFile(new URL(`../../${checkpointPath.replace(/^\.\//, '')}`, import.meta.url), 'utf8')); } catch { return { completed: [] }; } };
const writeCheckpoint = async (state) => { const path = new URL(`../../${checkpointPath.replace(/^\.\//, '')}`, import.meta.url).pathname; await mkdir(path.replace(/\/[^/]+$/, ''), { recursive: true }); await writeFile(path, JSON.stringify(state, null, 2)); };
const writeCandidateArtifact = async () => { const path = new URL(`../../${output.replace(/^\.\//, '')}`, import.meta.url).pathname; await mkdir(path.replace(/\/[^/]+$/, ''), { recursive: true }); await writeFile(path, JSON.stringify({ generatedAt: new Date().toISOString(), model, fallbackModel, promptVersion, targetCandidates, generationTarget, candidates: candidates.slice(0, generationTarget) }, null, 2)); };
const aliasesFor = (claim) => [...new Set([
  claim, claim.replace(/^¿|\?$/g, ''), `¿Es cierto que ${claim.replace(/^¿|\?$/g, '')}?`,
  `¿Qué datos permiten comprobar si ${claim.replace(/^¿|\?$/g, '')}?`,
  `Quiero saber si ${claim.replace(/^¿|\?$/g, '')}`, `¿Cómo se puede verificar ${claim.replace(/^¿|\?$/g, '')}?`,
  `¿Hay evidencia sobre si ${claim.replace(/^¿|\?$/g, '')}?`, `¿Es verdad que ${claim.replace(/^¿|\?$/g, '')}?`,
  `¿Qué sabemos de ${claim.replace(/^¿|\?$/g, '')}?`, `¿Se sostiene la afirmación de que ${claim.replace(/^¿|\?$/g, '')}?`,
].map((value) => value.trim()).filter((value) => value.length >= 12))].slice(0, 20);
const appendCandidates = (found) => {
  for (const candidate of found) {
    if (/https?:\/\/|www\.|\b(?:según|estudio|informe|fuente|datos de|ha anunciado|ha implementado|se quejan|algunos ciudadanos|piensan|generalmente|inaccesible|efectividad|debatida|solución|principal problema|el mayor problema|puede ser|suelen|debido a|en algunas zonas|en ciertas zonas|ley de|zonas verdes|último año|ultimo ano|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|veinte|cien|mil)\b|\d|\b(?:mayor[ií]a|superior a|inferior a)\b/i.test(candidate.claim)) continue;
    const aliasFingerprints = candidate.aliases.map(normalise);
    const conflictKey = (value) => normalise(value).replace(/\b(?:mas caro|mas barata|mas barato|mas caras|mas caros|menos caro|menos barata|menos barato|menos caras|menos caros|aumentado|aumentaron|subido|subieron|disminuido|bajado|bajaron|mayor|menor|superior|inferior)\b/g, '').replace(/\s+/g, ' ').trim();
    if (candidates.some((existing) => existing.fingerprint === candidate.fingerprint || aliasFingerprints.includes(existing.fingerprint) || existing.aliases.some((alias) => candidate.fingerprint === normalise(alias)) || conflictKey(existing.claim) === conflictKey(candidate.claim))) continue;
    candidates.push(candidate);
  }
};

async function generateTopic(topic, batchNumber, requestedModel = model) {
  try {
    const response = await fetch(`${endpoint}/api/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({ model: requestedModel, stream: false, format: 'json', options: { temperature: 0.7 }, messages: [{
      role: 'user',
      content: `Genera ${claimsPerTopic} preguntas o afirmaciones públicas, comprobables y distintas sobre España relacionadas con ${topic}. Esta es la tanda ${batchNumber + 1}; evita repetir formulaciones habituales. Prioriza el lenguaje de una queja o preocupación cotidiana de una persona, no comparaciones académicas genéricas. Cada claim debe tener entre 10 y 20 alias naturales en español. Prefiere formulaciones coloquiales, negativas, positivas y políticamente cargadas. No inventes cifras, fuentes, estudios, leyes, comparaciones territoriales ni causas. Si una cuestión necesita datos, formula la pregunta sin fijar un número. Devuelve exclusivamente JSON con esta forma: {"claims":[{"claim":"...","aliases":["...","..."]}]}.`,
    }] }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
  let parsed;
  try { parsed = JSON.parse(payload.message?.content || '{}'); } catch { parsed = {}; }
    const found = [];
    for (const item of Array.isArray(parsed.claims) ? parsed.claims : []) {
    const claim = String(item.claim || '').trim();
    if (claim.length < 20 || claim.length > 220) continue;
    // Candidate wording must describe a researchable question, never smuggle in
    // a model-invented statistic, citation, or unsupported comparison.
    const fingerprint = normalise(claim);
      if (!fingerprint) continue;
      const aliases = [...new Set([...(Array.isArray(item.aliases) ? item.aliases : []), ...aliasesFor(claim)].map((alias) => String(alias).trim()).filter((alias) => alias.length >= 12).slice(0, 20))];
      if (aliases.length < 10) continue;
      const claimTokens = new Set(normalise(claim).split(' ').filter((token) => token.length > 3));
      const specificAliases = aliases.filter((alias) => normalise(alias).split(' ').filter((token) => token.length > 3 && claimTokens.has(token)).length >= 2);
      if (specificAliases.length < 6) continue;
      found.push({ claim, aliases, topic, polarity: polarityFor(claim), formulationTypes: ['neutral', 'colloquial'], basis: 'model', visibility: 'searchable', model: requestedModel, promptVersion, fingerprint });
    }
    return found;
  } catch (error) {
    console.warn(`${topic} [${requestedModel}]: skipped (${error?.message || 'model unavailable'})`);
    return [];
  }
}

const checkpoint = await readCheckpoint();
if (Array.isArray(checkpoint.candidates)) appendCandidates(checkpoint.candidates);
const completed = new Set(checkpoint.completed || []);
for (let offset = 0; offset < selectedTopics.length && candidates.length < generationTarget; offset += concurrency) {
  const batchTopics = selectedTopics.slice(offset, offset + concurrency);
  for (let batchNumber = 0; batchNumber < batchesPerTopic && candidates.length < generationTarget; batchNumber += 1) {
    const work = batchTopics.filter((topic) => !completed.has(`${topic}:${batchNumber}`));
    const batch = await Promise.all(work.map(async (topic) => {
      const found = await generateTopic(topic, batchNumber, model);
      if (found.length === 0 && fallbackModel !== model) return generateTopic(topic, batchNumber, fallbackModel);
      return found;
    }));
    work.forEach((topic) => completed.add(`${topic}:${batchNumber}`));
    batch.flat().forEach((found) => appendCandidates([found]));
    await writeCheckpoint({ model, fallbackModel, promptVersion, completed: [...completed], candidates });
    await writeCandidateArtifact();
    console.log(`Processed ${completed.size}/${selectedTopics.length * batchesPerTopic} topic batches: ${candidates.length}/${generationTarget} candidates`);
  }
}

const outputPath = new URL(`../../${output.replace(/^\.\//, '')}`, import.meta.url).pathname;
await mkdir(outputPath.replace(/\/[^/]+$/, ''), { recursive: true });
await writeFile(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), model, fallbackModel, promptVersion, targetCandidates, generationTarget, candidates: candidates.slice(0, generationTarget) }, null, 2));
console.log(`Model catalogue candidates written: ${Math.min(candidates.length, generationTarget)} -> ${outputPath}`);
