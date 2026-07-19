import { rankWarehouseObservations, warehouseEvidenceFit } from './warehouse-query.mjs';

const records = [
  { id: 'obs-1', datasetId: 'Tasa de empleo', metric: 'employment rate', value: 68.2, unit: '%', period: '2026-Q1', dimensions: { geography: 'Spain' }, source: { id: 'source-ine', publisher: 'INE', url: 'https://www.ine.es/' } },
  { id: 'obs-2', datasetId: 'Tasa de empleo', metric: 'employment rate', value: 67.4, unit: '%', period: '2025-Q1', dimensions: { geography: 'Spain' }, source: { id: 'source-ine', publisher: 'INE', url: 'https://www.ine.es/' } },
  { id: 'obs-3', datasetId: 'Foreign trade', metric: 'exports', value: 1, unit: 'EUR', period: '2026', dimensions: { geography: 'Spain' }, source: { id: 'source-ine', publisher: 'INE', url: 'https://www.ine.es/' } },
];
const result = rankWarehouseObservations('employment rate Spain', records);
if (result.length !== 2 || result[0].id !== 'obs-1') throw new Error('Warehouse query did not rank matching observations');
if (result.some((item) => item.evidenceFit !== 'direct' || !item.matchedTerms?.length)) throw new Error('Warehouse query did not preserve evidence-fit metadata');
if (rankWarehouseObservations('unknown metric', records).length) throw new Error('Warehouse query returned unrelated observations');
if (warehouseEvidenceFit(0.34) !== 'weak' || warehouseEvidenceFit(0.5) !== 'qualified' || warehouseEvidenceFit(0.8) !== 'direct') throw new Error('Warehouse evidence-fit thresholds are invalid');

const publication = rankWarehouseObservations('Banco de España tipos hipotecarios', [
  { id: 'doc-1', kind: 'official_publication', metric: 'Resolución del Banco de España sobre tipos de interés hipotecarios', value: null, period: '20260718', url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-1', dimensions: { department: 'BANCO DE ESPAÑA' }, source: { id: 'source-boe', title: 'BOE', url: 'https://www.boe.es/' } },
]);
if (publication.length !== 1 || publication[0].kind !== 'official_publication' || publication[0].url?.includes('BOE-A-1') !== true) throw new Error('Warehouse query did not preserve official publication records');

const naturalLanguageTrend = rankWarehouseObservations('España tiene menos paro que hace diez años', [
  { id: 'obs-4', datasetId: 'Unemployment by sex and age', metric: undefined, value: 10.8, unit: '%', period: '2026', dimensions: { geo: 'ES' }, source: { id: 'source-eurostat', title: 'Tasa de desempleo de España · Eurostat', aliases: ['paro', 'desempleo'], url: 'https://ec.europa.eu/eurostat/' } },
]);
if (naturalLanguageTrend.length !== 1 || naturalLanguageTrend[0].id !== 'obs-4') throw new Error('Warehouse query did not handle natural trend phrasing');
console.log('Warehouse query validation passed.');
