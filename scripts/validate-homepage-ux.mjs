import { readFile } from 'node:fs/promises';

const homepage = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const catalogue = JSON.parse(await readFile(new URL('../dist/claim-catalog.json', import.meta.url), 'utf8'));
const claimInput = await readFile(new URL('../src/scripts/claim-input.ts', import.meta.url), 'utf8');
const popularScript = await readFile(new URL('../src/scripts/popular-claims.ts', import.meta.url), 'utf8');
const stylesheetPath = homepage.match(/href="(\/_astro\/[^\"]+\.css)"/)?.[1];
const styles = stylesheetPath ? await readFile(new URL(`../dist${stylesheetPath}`, import.meta.url), 'utf8').catch(() => '') : '';
const failures = [];
const requireText = (text, label) => { if (!homepage.includes(text)) failures.push(`homepage is missing ${label}`); };
const order = (first, second, label) => { if (homepage.indexOf(first) < 0 || homepage.indexOf(second) < 0 || homepage.indexOf(first) > homepage.indexOf(second)) failures.push(`homepage order is wrong for ${label}`); };

requireText('¿De qué estáis', 'the conversation-first heading');
requireText('id="conversation-form"', 'the claim form');
requireText('id="conversation-counter"', 'the input character counter');
requireText('data-media-trigger="image"', 'the explicit screenshot upload action');
requireText('data-media-trigger="audio"', 'the explicit audio upload action');
requireText('data-media-dropzone', 'the drag-and-drop media surface');
requireText('class="examples-heading"', 'the popular prompt heading');
for (const prompt of ['Los inmigrantes crean inseguridad', 'Los inmigrantes reciben todas las ayudas', 'España es el país que más impuestos cobra de Europa']) {
  requireText(`data-example="${prompt}"`, `a first-use everyday debate prompt (${prompt})`);
}
requireText('¿Tiene España más paro juvenil que la Unión Europea?', 'the visible Spain/EU youth-employment comparison prompt');
if (homepage.indexOf('data-example="Los inmigrantes crean inseguridad"') > homepage.indexOf('data-example="¿Cómo ha cambiado el precio de la luz para los hogares?"')) failures.push('everyday debate prompts should appear before warehouse indicator prompts');
requireText('data-example-filter="all"', 'the popular prompt filters');
requireText('data-example-filter="seguridad"', 'the security popular prompt filter');
requireText('data-example-more', 'the progressive popular-prompt list');
requireText('data-example-topic=', 'topic metadata for popular prompts');
requireText('data-example-source="warehouse"', 'fresh warehouse prompt entry points');
requireText('Madrid tiene más densidad que Andalucía', 'regional comparison discovery prompt');
requireText('class="warehouse-prompts"', 'fresh warehouse prompt section');
requireText('class="latest-home"', 'automatic recent-clarifications section');
requireText('data-latest-claim=', 'recent claim cards sourced from published content');
requireText('class="popular-assessment', 'assessment labels on discovery cards');
requireText('class="warehouse-home"', 'visible warehouse discovery section');
requireText('data-example-source="warehouse"', 'warehouse discovery metadata');
if ((homepage.match(/class="warehouse-highlight"/g) || []).length < 20) failures.push('homepage exposes fewer than twenty warehouse-backed discovery cards');
requireText('class="warehouse-more"', 'progressive warehouse discovery disclosure');
requireText('Ver más indicadores', 'the secondary warehouse discovery control');
if (!/<details class="warehouse-more"(?:\s[^>]*)?>/.test(homepage)) failures.push('warehouse discovery overflow must use a native details disclosure');
if (/<details class="warehouse-more"[^>]*\sopen(?:\s|=|>)/.test(homepage)) failures.push('secondary warehouse discovery must remain collapsed by default');
if (!styles.includes('.warehouse-more') || !styles.includes('.warehouse-more-grid')) failures.push('warehouse discovery disclosure is missing responsive styling');
if (!/<details class="warehouse-prompts"(?:\s[^>]*)?>/.test(homepage)) failures.push('homepage is missing collapsed secondary prompt section');
if (/<details class="warehouse-prompts"[^>]*\sopen(?:\s|=|>)/.test(homepage)) failures.push('secondary warehouse prompts must remain collapsed by default');
requireText('href="/afirmaciones"', 'the full claim catalogue link');
requireText('aria-current="page"', 'the active navigation state');
if (!claimInput.includes('Comprobar otra frase') || !claimInput.includes('data-new-check')) failures.push('claim input is missing the repeat-check action');
order('id="afirmaciones"', 'class="home-how"', 'popular prompts before methodology');
if (!homepage.includes('hero-promises')) failures.push('homepage is missing the result promise list');
if (!styles.includes('max-width:900px')) failures.push('homepage is missing the responsive checker layout');
if (!popularScript.includes('data-example-filter') || !popularScript.includes('aria-pressed') || !popularScript.includes('updateExampleVisibility')) failures.push('popular prompt filter behavior is missing');
if (!popularScript.includes('linkedClaimSlug') || !popularScript.includes('Solo preguntas con una aclaración publicada y revisada')) failures.push('dynamic popularity feed does not distinguish reviewed destinations');

const conversationPayload = homepage.match(/<script type="application\/json" id="conversation-mvp-data">([\s\S]*?)<\/script>/)?.[1];
let conversationClaims = [];
try { conversationClaims = JSON.parse(conversationPayload || '[]'); } catch { failures.push('conversation library payload is not valid JSON'); }
const publishedSlugs = catalogue.filter((entry) => entry.kind === 'claim').map((entry) => entry.slug);
const conversationSlugs = new Set(conversationClaims.map((entry) => entry.slug));
for (const slug of publishedSlugs) if (!conversationSlugs.has(slug)) failures.push(`published claim ${slug} is missing from the conversation library`);
if (conversationClaims.length < publishedSlugs.length) failures.push(`conversation library has ${conversationClaims.length} entries for ${publishedSlugs.length} published claims`);

if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Homepage UX validation passed: conversation entry, popular prompts, navigation state, and responsive checker markers are present.');
