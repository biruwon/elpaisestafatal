import { consolidatedQuery, isPublicReuseQuery, rankConsolidatedLaws, rankLegalRules, titleQueries } from './boe-legal-discovery.mjs';

const query = consolidatedQuery('La normativa exige condiciones para reutilizar documentos públicos');
const queryText = query ? JSON.parse(query).query?.query_string?.query : '';
if (!queryText?.startsWith('titulo:(') || !queryText.includes('*') || queryText.split(' and ').length !== 2) throw new Error('Consolidated-law query was not constrained to a bounded BOE title pair');
if (consolidatedQuery('ley') !== null) throw new Error('Low-signal legal query was accepted');

const colloquialHousingQuery = consolidatedQuery('¿Se puede echar a los okupas de una vivienda?');
const colloquialHousingText = colloquialHousingQuery ? JSON.parse(colloquialHousingQuery).query?.query_string?.query : '';
if (!colloquialHousingText.includes('desahucio*') || !colloquialHousingText.includes('arrendamie*')) throw new Error('Colloquial housing wording did not expand to bounded formal legal terms');

const colloquialEmploymentQuery = consolidatedQuery('¿Puede el jefe despedirme sin causa?');
const colloquialEmploymentText = colloquialEmploymentQuery ? JSON.parse(colloquialEmploymentQuery).query?.query_string?.query : '';
if (!colloquialEmploymentText.includes('laboral*') || !colloquialEmploymentText.includes('estatuto*')) throw new Error('Colloquial employment wording did not expand to bounded formal legal terms');

const depositQuery = consolidatedQuery('¿Puede el casero quedarse con la fianza del alquiler?');
const depositText = depositQuery ? JSON.parse(depositQuery).query?.query_string?.query : '';
if (!depositText.includes('fianza*') || !depositText.includes('arrendamie*')) throw new Error('Specific deposit wording was lost when formal legal terms were added');

const familyQuery = consolidatedQuery('¿Quién decide la custodia de los hijos?');
const familyText = familyQuery ? JSON.parse(familyQuery).query?.query_string?.query : '';
if (!familyText.includes('custodia*') || !familyText.includes('familia*')) throw new Error('Family-law wording did not retain the user term and formal expansion');

const socialSecurityQuery = consolidatedQuery('¿Puedo perder la prestación por desempleo?');
const socialSecurityText = socialSecurityQuery ? JSON.parse(socialSecurityQuery).query?.query_string?.query : '';
const socialSecurityQueries = titleQueries('¿Puedo perder la prestación por desempleo?').map((item) => JSON.parse(item).query?.query_string?.query || '');
if (!socialSecurityText.includes('prest*') || !socialSecurityQueries.some((item) => item.includes('segur*'))) throw new Error('Social-security wording did not preserve the user term and bounded formal expansion');

const laws = rankConsolidatedLaws([
  { identificador: 'BOE-A-1', titulo: 'Ley sobre documentos públicos', rango: { texto: 'Ley' }, vigencia_agotada: 'N', estado_consolidacion: { texto: 'Finalizado' }, fecha_actualizacion: '20260101' },
  { identificador: 'BOE-A-2', titulo: 'Ley derogada sobre documentos públicos', vigencia_agotada: 'S', estado_consolidacion: { texto: 'Finalizado' }, fecha_actualizacion: '20260701' },
  { identificador: 'BOE-A-3', titulo: 'Norma desactualizada sobre reutilización', vigencia_agotada: 'N', estado_consolidacion: { texto: 'Desactualizado' }, fecha_actualizacion: '20260702' },
], 'documentos públicos reutilización', 3);
if (laws.length !== 1 || laws[0].identificador !== 'BOE-A-1') throw new Error('Expired or outdated consolidated laws were not rejected');

const colloquialLaws = rankConsolidatedLaws([
  { identificador: 'BOE-A-HOUSING', titulo: 'Ley de Arrendamientos Urbanos y desahucio', rango: { texto: 'Ley' }, vigencia_agotada: 'N', estado_consolidacion: { texto: 'Finalizado' }, fecha_actualizacion: '20260101' },
  { identificador: 'BOE-A-UNRELATED', titulo: 'Ley de educación', rango: { texto: 'Ley' }, vigencia_agotada: 'N', estado_consolidacion: { texto: 'Finalizado' }, fecha_actualizacion: '20260101' },
], '¿Se puede echar a los okupas de una vivienda?', 2);
if (colloquialLaws[0]?.identificador !== 'BOE-A-HOUSING') throw new Error('Colloquial housing wording did not rank the matching formal law');

const rules = rankLegalRules([
  { id: 'old', kind: 'legal_rule', metric: 'Artículo 1', excerpt: 'Los documentos públicos pueden reutilizarse.', period: '2020-01-01', dimensions: { blockId: 'a1', currentVersion: false } },
  { id: 'current', kind: 'legal_rule', metric: 'Artículo 1', excerpt: 'Los documentos públicos pueden reutilizarse con las condiciones establecidas.', period: '2026-01-01', dimensions: { blockId: 'a1', currentVersion: true } },
  { id: 'unrelated', kind: 'legal_rule', metric: 'Artículo 9', excerpt: 'Régimen presupuestario interno.', period: '2026-01-01', dimensions: { blockId: 'a9', currentVersion: true } },
], 'reutilizar documentos públicos condiciones');
if (rules.length !== 1 || rules[0].id !== 'current' || rules[0].matchedTerms.length < 3) throw new Error('Legal discovery did not select the relevant current article');

if (!isPublicReuseQuery('¿La información pública se puede reutilizar sin condiciones?')) throw new Error('Public-information reuse wording was not recognized as a legal query');
const reuseRules = rankLegalRules([
  { id: 'annex', kind: 'legal_rule', metric: 'ANEXO', excerpt: 'Definiciones sobre cualquier información pública y reutilización.', period: '2023-05-10', dimensions: { blockId: 'annex', currentVersion: true } },
  { id: 'scope', kind: 'legal_rule', metric: 'Artículo 3', excerpt: 'La ley regula la reutilización de documentos públicos, pero no será aplicable a documentos con límites de acceso y derechos de terceros.', period: '2021-11-04', dimensions: { blockId: 'a3', currentVersion: true } },
  { id: 'conditions', kind: 'legal_rule', metric: 'Artículo 4', excerpt: 'La reutilización de documentos públicos puede hacerse sin condiciones o con condiciones objetivas y proporcionadas.', period: '2021-11-04', dimensions: { blockId: 'a4', currentVersion: true } },
  { id: 'use', kind: 'legal_rule', metric: 'Artículo 8', excerpt: 'La información pública reutilizada no se alterará, se citará la fuente y se indicará la fecha de actualización.', period: '2021-11-04', dimensions: { blockId: 'a8', currentVersion: true } },
], '¿La información pública se puede reutilizar sin condiciones?', 3);
if (reuseRules[0]?.id !== 'conditions' || reuseRules.some((item) => item.id === 'annex')) throw new Error('Public-information reuse ranking did not prioritize operative articles over annexes');

console.log('BOE legal discovery validation passed: queries are bounded and expired, outdated, old, and unrelated records are rejected.');
