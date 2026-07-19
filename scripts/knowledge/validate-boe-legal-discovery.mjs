import { consolidatedQuery, rankConsolidatedLaws, rankLegalRules } from './boe-legal-discovery.mjs';

const query = consolidatedQuery('La normativa exige condiciones para reutilizar documentos públicos');
const queryText = query ? JSON.parse(query).query?.query_string?.query : '';
if (!queryText?.startsWith('titulo:(') || !queryText.includes('*') || queryText.split(' and ').length !== 2) throw new Error('Consolidated-law query was not constrained to a bounded BOE title pair');
if (consolidatedQuery('ley') !== null) throw new Error('Low-signal legal query was accepted');

const laws = rankConsolidatedLaws([
  { identificador: 'BOE-A-1', titulo: 'Ley sobre documentos públicos', rango: { texto: 'Ley' }, vigencia_agotada: 'N', estado_consolidacion: { texto: 'Finalizado' }, fecha_actualizacion: '20260101' },
  { identificador: 'BOE-A-2', titulo: 'Ley derogada sobre documentos públicos', vigencia_agotada: 'S', estado_consolidacion: { texto: 'Finalizado' }, fecha_actualizacion: '20260701' },
  { identificador: 'BOE-A-3', titulo: 'Norma desactualizada sobre reutilización', vigencia_agotada: 'N', estado_consolidacion: { texto: 'Desactualizado' }, fecha_actualizacion: '20260702' },
], 'documentos públicos reutilización', 3);
if (laws.length !== 1 || laws[0].identificador !== 'BOE-A-1') throw new Error('Expired or outdated consolidated laws were not rejected');

const rules = rankLegalRules([
  { id: 'old', kind: 'legal_rule', metric: 'Artículo 1', excerpt: 'Los documentos públicos pueden reutilizarse.', period: '2020-01-01', dimensions: { blockId: 'a1', currentVersion: false } },
  { id: 'current', kind: 'legal_rule', metric: 'Artículo 1', excerpt: 'Los documentos públicos pueden reutilizarse con las condiciones establecidas.', period: '2026-01-01', dimensions: { blockId: 'a1', currentVersion: true } },
  { id: 'unrelated', kind: 'legal_rule', metric: 'Artículo 9', excerpt: 'Régimen presupuestario interno.', period: '2026-01-01', dimensions: { blockId: 'a9', currentVersion: true } },
], 'reutilizar documentos públicos condiciones');
if (rules.length !== 1 || rules[0].id !== 'current' || rules[0].matchedTerms.length < 3) throw new Error('Legal discovery did not select the relevant current article');

console.log('BOE legal discovery validation passed: queries are bounded and expired, outdated, old, and unrelated records are rejected.');
