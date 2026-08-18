import { mkdir, writeFile } from 'node:fs/promises';

const endpoint = process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434';
const models = (process.env.CATALOGUE_BENCHMARK_MODELS || 'qwen2.5:7b,qwen2.5:14b-instruct-q4_K_M').split(',').map((value) => value.trim()).filter(Boolean);
const topics = ['vivienda y alquileres', 'empleo, paro y salarios', 'inmigración y demografía', 'sanidad y educación', 'economía e inflación'];
const timeoutMs = Math.max(15_000, Number(process.env.CATALOGUE_BENCHMARK_TIMEOUT_MS || 120_000));
const prompt = (topic) => `Genera 8 preguntas públicas, concretas y comprobables sobre España relacionadas con ${topic}. Escribe en español. Cada pregunta debe incluir entre 10 y 20 formulaciones alternativas naturales. No inventes cifras, fuentes, estudios, leyes, causas, comparaciones territoriales ni nombres presentados como hechos. Devuelve solo JSON: {"claims":[{"claim":"...","aliases":["..."]}]}.`;
const forbidden = /https?:\/\/|www\.|\d|\b(?:según|estudio|informe|fuente|ha anunciado|ha implementado|se quejan|piensan|debido a|principal problema)\b/i;
const normalise = (value) => String(value).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
const results = [];
for (const model of models) {
  const started = performance.now();
  let validJson = 0; let rawClaims = 0; let usable = 0; let rejected = 0; const fingerprints = new Set();
  const durations = [];
  for (const topic of topics) {
    const requestStarted = performance.now();
    try {
      const response = await fetch(`${endpoint}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(timeoutMs), body: JSON.stringify({ model, stream: false, format: 'json', options: { temperature: 0.4 }, messages: [{ role: 'user', content: prompt(topic) }] }) });
      const payload = await response.json();
      const parsed = JSON.parse(payload.message?.content || '{}');
      if (!Array.isArray(parsed.claims)) throw new Error('claims array missing');
      validJson += 1;
      for (const item of parsed.claims) {
        rawClaims += 1;
        const claim = String(item.claim || '').trim();
        const aliases = Array.isArray(item.aliases) ? item.aliases.filter((alias) => String(alias).trim().length >= 12) : [];
        const fingerprint = normalise(claim);
        if (claim.length < 20 || claim.length > 220 || aliases.length < 10 || forbidden.test(claim) || !fingerprint || fingerprints.has(fingerprint)) { rejected += 1; continue; }
        fingerprints.add(fingerprint); usable += 1;
      }
    } catch { /* request failures are timed out separately, not candidate rejections */ }
    durations.push(performance.now() - requestStarted);
  }
  const elapsedMs = Math.round(performance.now() - started);
  durations.sort((a, b) => a - b);
  const percentile = (p) => durations[Math.min(durations.length - 1, Math.floor(durations.length * p))] || 0;
  results.push({ model, topics: topics.length, validJsonRate: validJson / topics.length, rawClaims, usableCandidates: usable, usableCandidateRate: rawClaims ? usable / rawClaims : 0, duplicateOrUnsupportedRate: rawClaims ? rejected / rawClaims : 0, timedOutRequests: topics.length - validJson, medianMs: Math.round(percentile(0.5)), p95Ms: Math.round(percentile(0.95)), candidatesPerMinute: elapsedMs ? Math.round(usable * 60_000 / elapsedMs * 100) / 100 : 0 });
  console.log(`${model}: ${usable} usable candidates, ${Math.round(elapsedMs / 1000)}s`);
}
const output = new URL(`../../${(process.env.CATALOGUE_BENCHMARK_OUTPUT || '.local/catalogue-model-benchmark.json').replace(/^\.\//, '')}`, import.meta.url).pathname;
await mkdir(output.replace(/\/[^/]+$/, ''), { recursive: true });
await writeFile(output, JSON.stringify({ generatedAt: new Date().toISOString(), models: results }, null, 2));
console.log(`Catalogue model benchmark written: ${output}`);
