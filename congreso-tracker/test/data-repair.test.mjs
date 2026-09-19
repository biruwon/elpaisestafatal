import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../data/current.json', import.meta.url)));

test('former deputy appearances remain official records but are excluded from deputy activity', () => {
  const rows = data.interventions.filter((x) => x.speaker === 'Grande-Marlaska Gómez, Fernando');
  assert.ok(rows.length > 0);
  assert.ok(rows.every((x) => x.deputyId === null && x.identityStatus === 'outside_service_period'));
  assert.ok(rows.every((x) => /Ministro.*Interior/i.test(x.speakerRole || '')));
});

test('parenthetical parliamentary groups do not break official deputy attribution', () => {
  for (const speaker of [
    'Sagastizabal Unzetabarrenetxea, Idoia (GV (EAJ-PNV))',
    'Legarda Uriarte, Mikel (GV (EAJ-PNV))',
    'Vaquero Montero, Maribel (GV (EAJ-PNV))'
  ]) {
    assert.ok(data.interventions.some((x) => x.speaker === speaker && x.deputyId), speaker);
  }
});

test('published topic labels do not inherit unrelated transcript-page terms', () => {
  const row = data.interventions[0];
  assert.equal(data.meta.topicAnalysisVersion, 'lexicon-es-v3');
  assert.deepEqual(row.topicLabels, ['energía']);
});

test('deduplicated interventions preserve source-row provenance and related initiatives', () => {
  const duplicate = data.interventions.find((x) => x.duplicateCount > 1);
  assert.ok(duplicate);
  assert.ok(duplicate.sourceRowIndexes.length === duplicate.duplicateCount);
  assert.ok(duplicate.initiativeIds.length >= 1);
});

test('remote vote evidence is explicit and never physical presence', () => {
  const remote = data.presenceObservations.find((x) => x.kind === 'remote_participation');
  assert.ok(remote);
  assert.equal(remote.physicalPresence, false);
  assert.equal(remote.presenceBasis, 'telematic_vote');
});
