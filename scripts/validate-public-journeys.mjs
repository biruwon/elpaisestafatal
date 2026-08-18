import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const failures = [];
const requireText = (label, content, snippets) => {
  for (const snippet of snippets) {
    if (!content.includes(snippet)) failures.push(`${label} is missing ${snippet}`);
  }
};

const [searchPage, searchSource, inputSource, investigationsPage, sourcesPage, affirmationPage] = await Promise.all([
  read('dist/buscar/index.html'),
  read('src/pages/buscar.astro'),
  read('src/scripts/claim-checker.ts'),
  read('dist/investigaciones/index.html'),
  read('dist/fuentes/index.html'),
  read('dist/afirmaciones/inmigrantes-ayudas/index.html'),
]);

requireText('Legacy search redirect', searchPage, ['url=/#comprobar', 'Redirigiendo al comprobador']);
requireText('Legacy search source', searchSource, ['window.location.replace', 'href="/#comprobar"']);
requireText('Claim checker handoff', inputSource, ['URLSearchParams(window.location.search)', 'requestSubmit()']);
requireText('Investigation index', investigationsPage, ['investigation-index-actions', 'primary-index-action', 'planned-disclosure', '<details']);
requireText('Sources page', sourcesPage, ['source-search', 'source-status', 'source-list', 'data-source-card']);
requireText('Canonical affirmation page', affirmationPage, ['claim-answer', 'claim-data', 'claim-evidence', 'claim-sources']);

const publishedLinks = (investigationsPage.match(/href="\/preocupaciones\//g) || []).length;
if (publishedLinks < 10) failures.push(`Investigation index exposes only ${publishedLinks} published topics`);
const sourceCards = (sourcesPage.match(/data-source-card/g) || []).length;
if (sourceCards < 20) failures.push(`Sources index exposes only ${sourceCards} registry records`);

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`Public journey UX passed: canonical checker handoff, ${publishedLinks} published topics, ${sourceCards} source records.`);
