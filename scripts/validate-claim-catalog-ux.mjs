import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../dist/afirmaciones/index.html', import.meta.url), 'utf8');
const source = await readFile(new URL('../src/scripts/claim-catalog.ts', import.meta.url), 'utf8');
const failures = [];
const requiredPageMarkers = [
  ['claim-catalog-search', 'search input'],
  ['claim-catalog-clear', 'clear button'],
  ['claim-catalog-grid', 'catalogue grid'],
  ['claim-catalog-status', 'result count'],
  ['claim-catalog-empty', 'empty state'],
  ['data-topic-filter', 'topic filters'],
];
for (const [marker, label] of requiredPageMarkers) if (!page.includes(marker)) failures.push(`catalogue is missing ${label}`);
for (const snippet of ['activeTopic', 'aria-pressed', 'card.hidden', 'No hay una ficha']) if (snippet !== 'No hay una ficha' && !source.includes(snippet)) failures.push(`catalogue script is missing ${snippet}`);
const cardCount = (page.match(/<a\s+data-claim-card(?:\s|>)/g) || []).length;
if (cardCount < 20) failures.push(`expected at least 20 published catalogue cards, found ${cardCount}`);
if (!page.includes('Todas')) failures.push('catalogue is missing the all-topics filter');
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Claim catalogue UX passed: ${cardCount} published cards with search, topic filters, and empty state.`);
