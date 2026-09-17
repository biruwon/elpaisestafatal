import { spawn } from 'node:child_process';

const jobs = [
  ['collect', 'scripts/collect.mjs'],
  ['import-deputy-identities', 'scripts/import-deputy-identities.mjs'],
  ['import-substitutions', 'scripts/import-substitutions.mjs'],
  ['import-profile-documents', 'scripts/import-profile-documents.mjs'],
  ['import-committee-catalogue', 'scripts/import-committee-catalogue.mjs'],
  ['import-hemicycle', 'scripts/import-hemicycle.mjs'],
  ['import-transcripts', 'scripts/import-transcripts.mjs'],
  ['backfill-votes', 'scripts/backfill-votes.mjs'],
  ['import-agenda', 'scripts/import-agenda.mjs'],
  ['import-bodies', 'scripts/import-bodies.mjs'],
  ['build-current', 'scripts/build-current.mjs'],
  ['analyze-topics', 'scripts/analyze-topics.mjs'],
  ['validate-full-votes', 'scripts/validate-votes.mjs', 'data/votes-full.json.gz'],
];
for (const [name, script, ...args] of jobs) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { stdio: 'inherit' });
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${name} exited ${code}`)));
    child.on('error', reject);
  });
}
console.log('refresh complete; publish data/current.json and collection logs after review');
