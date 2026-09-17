import { readFile, writeFile } from 'node:fs/promises';

const observationFile = process.argv[2] || 'data/video-pilot-observations.json';
const decisionsFile = process.argv[3] || 'data/video-pilot-review.json';
const outputFile = process.argv[4] || observationFile;
const payload = JSON.parse(await readFile(observationFile, 'utf8'));
const decisions = JSON.parse(await readFile(decisionsFile, 'utf8'));
const byId = new Map((decisions.observations || decisions).map(x => [x.id, x]));
const allowed = new Set(['occupied', 'empty', 'unobservable']);
let reviewed = 0;
for (const observation of payload.observations || []) {
  const decision = byId.get(observation.id);
  if (!decision) continue;
  if (!allowed.has(decision.value)) throw new Error(`Invalid value for ${observation.id}`);
  if (decision.value === 'occupied' && !decision.seat) throw new Error(`Occupied observation ${observation.id} needs a seat`);
  if (decision.deputyId) throw new Error(`Deputy attribution is forbidden in seat-level review: ${observation.id}`);
  Object.assign(observation, { value: decision.value, seat: decision.seat || null, evidenceId: decision.evidenceId || null, confidence: decision.confidence || 'reviewed', reviewStatus: 'reviewed', reviewer: decision.reviewer || null, reviewedAt: decision.reviewedAt || new Date().toISOString(), note: decision.note || observation.note });
  reviewed++;
}
payload.meta = { ...payload.meta, status: reviewed ? 'partially_reviewed' : payload.meta?.status || 'pilot-template', lastReviewMergeAt: new Date().toISOString(), reviewedObservations: (payload.observations || []).filter(x => x.reviewStatus === 'reviewed').length };
await writeFile(outputFile, JSON.stringify(payload, null, 2));
console.log(`merged ${reviewed} review decisions; ${payload.meta.reviewedObservations} observations are reviewed`);
