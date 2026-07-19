import { discoverOfficialDocuments, extractRelevantExcerpt, parseBoeSearchResults, parseBudgetTransferExcerpt, parseMoncloaRssItems } from './official-discovery.mjs';

const fixture = `<li class="resultado-busqueda"><p>Ministerio de Educación</p><p>BOE 10 de 10/01/2026 - I. Disposiciones generales</p><p>Resolución sobre educación y Presidencia.</p><a href="../buscar/doc.php?id=BOE-A-2026-10" title="Ref. BOE-A-2026-10">Más...</a></li>`;
const results = parseBoeSearchResults(fixture, 'educación presidencia', 2);
if (results.length !== 1) throw new Error('BOE discovery parser did not extract a matching result');
if (results[0].id !== 'BOE-A-2026-10' || !results[0].url.endsWith('BOE-A-2026-10')) throw new Error('BOE discovery parser produced an invalid source URL');
if (!results[0].matchedTerms.includes('educacion') || !results[0].matchedTerms.includes('presidencia')) throw new Error('BOE discovery parser lost matched terms');
if (parseBoeSearchResults(fixture, 'educación', 2).length !== 0) throw new Error('BOE discovery should require at least two meaningful terms');
const rssFixture = `<rss><channel><item><title><![CDATA[Referencia del Consejo de Ministros]]></title><link><![CDATA[https://www.lamoncloa.gob.es/consejodeministros/referencias/Paginas/2026/20260714-referencia.aspx]]></link><pubDate><![CDATA[Tue, 14 Jul 2026 00:00:00 +0200]]></pubDate></item></channel></rss>`;
const rssItems = parseMoncloaRssItems(rssFixture, 2);
if (rssItems.length !== 1 || !rssItems[0].link.includes('lamoncloa.gob.es') || !rssItems[0].publishedAt.startsWith('2026-07-13')) throw new Error('La Moncloa RSS parser did not produce a valid official item');
const excerpt = extractRelevantExcerpt('El Gobierno aprobó una transferencia de crédito para gastos de personal. La medida afecta a varias administraciones públicas.', ['transferencia', 'personal']);
if (!excerpt || excerpt.length > 420 || !excerpt.includes('transferencia')) throw new Error('Official discovery excerpt extraction is not bounded or relevant');
const transfer = parseBudgetTransferExcerpt('ACUERDO por el que se autoriza una transferencia de crédito, por importe de 309.840.377,20 euros, desde el Ministerio de Educación, Formación Profesional y Deportes, al Ministerio de la Presidencia, Justicia y Relaciones con las Cortes para financiar insuficiencias en el capítulo 1 "Gastos de personal".');
if (!transfer || transfer.amount !== 309840377.2 || !transfer.originEntity.includes('Educación') || !transfer.destinationEntity.includes('Presidencia')) throw new Error('Budget transfer extraction did not preserve the official fields');
if ((await discoverOfficialDocuments('España está destruida')).length !== 0) throw new Error('Low-signal claims should not trigger official-source discovery');
console.log('Official discovery validation passed: attributable BOE and La Moncloa results are parsed safely.');
