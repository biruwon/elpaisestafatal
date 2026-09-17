import { readFile, writeFile } from 'node:fs/promises';

const input = process.argv[2] || 'data/video-pilot-observations.json';
const output = process.argv[3] || 'data/video-pilot-review.example.json';
const limit = Math.max(1, Number(process.argv[4] || 100));
const payload = JSON.parse(await readFile(input, 'utf8'));
const observations = (payload.observations || []).slice(0, limit).map(x => ({
  id: x.id,
  sessionId: x.sessionId,
  atSecond: x.atSecond,
  value: 'unobservable',
  seat: null,
  evidenceId: null,
  confidence: 'reviewed',
  reviewer: 'REPLACE_WITH_REVIEWER',
  note: 'Review a wide shot at this timestamp. Occupancy does not identify the deputy.'
}));
await writeFile(output, JSON.stringify({
  instructions: 'Set value to occupied, empty or unobservable. For occupied, provide the official seat identifier. Do not add deputyId.',
  source: input,
  generatedAt: new Date().toISOString(),
  observations
}, null, 2));
console.log(`wrote ${observations.length} review rows to ${output}`);
