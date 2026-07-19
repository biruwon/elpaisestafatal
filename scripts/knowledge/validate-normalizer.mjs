import { normalizeJsonPayload } from './normalize-json.mjs';
import { normalizeXmlPayload } from './normalize-xml.mjs';
import { selectCurrentLegalRule } from './legal-rules.mjs';

const source = { id: 'source-ine-fixture', title: 'INE fixture' };
const payload = [
  {
    COD: 'IPC251852',
    Nombre: 'Nacional. Índice general. Índice.',
    FK_Unidad: 133,
    FK_Escala: 1,
    Data: [
      { Anyo: 2025, FK_Periodo: 12, FK_TipoDato: 1, Valor: 119.942 },
      { Anyo: 2025, FK_Periodo: 11, FK_TipoDato: 1, Valor: 119.532 },
    ],
  },
];

const records = normalizeJsonPayload(payload, source);
if (records.length !== 2) throw new Error(`Expected 2 INE observations, received ${records.length}`);
if (records.some((record) => record.metric !== 'Nacional. Índice general. Índice.' || record.value <= 0)) throw new Error('INE observations lost their series or value');
if (records[0].period !== '2025-12' || records[1].period !== '2025-11') throw new Error('INE periods were not normalized');
if (records.some((record) => record.metric === 'FK_Unidad' || record.metric === 'FK_Escala')) throw new Error('INE implementation fields were emitted as metrics');

const boeRecords = normalizeJsonPayload({
  data: { sumario: { metadatos: { fecha_publicacion: '20260718' }, diario: [{ seccion: [{ nombre: 'I. Disposiciones generales', departamento: [{ nombre: 'MINISTERIO DE PRUEBA', epigrafe: [{ nombre: 'Normas', item: { identificador: 'BOE-A-1', titulo: 'Una disposición de prueba', url_html: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-1' } }] }] }] }] } },
}, { id: 'source-boe-fixture', title: 'BOE fixture' });
if (boeRecords.length !== 1 || boeRecords[0].kind !== 'official_publication' || boeRecords[0].value !== null || boeRecords[0].url?.includes('BOE-A-1') !== true) throw new Error('BOE publication record was not normalized');
const legalRecords = normalizeJsonPayload({ status: { code: '200' }, data: [{ fecha_actualizacion: '20260718T120000Z', identificador: 'BOE-A-2026-10', ambito: { texto: 'Estatal' }, departamento: { texto: 'Jefatura del Estado' }, rango: { texto: 'Ley' }, numero_oficial: '1/2026', titulo: 'Ley de prueba sobre vivienda', fecha_publicacion: '20260110', fecha_vigencia: '20260111', estatus_derogacion: 'N', estatus_anulacion: 'N', estado_consolidacion: { texto: 'Finalizado' }, url_html_consolidada: 'https://www.boe.es/buscar/act.php?id=BOE-A-2026-10' }] }, { id: 'source-boe-law', title: 'BOE legislación consolidada' });
if (legalRecords.length !== 1 || legalRecords[0].kind !== 'legal_document' || legalRecords[0].dimensions.jurisdiction !== 'Estatal' || legalRecords[0].dimensions.effectiveFrom !== '20260111' || legalRecords[0].url?.includes('BOE-A-2026-10') !== true) throw new Error('BOE consolidated-law metadata was not normalized');
const legalBlockRecords = normalizeXmlPayload(`<?xml version="1.0"?><response><data><bloque id="a1" tipo="precepto" titulo="Artículo 1"><version id_norma="BOE-A-2000-1" fecha_publicacion="20000101" fecha_vigencia="20000102"><p class="articulo">Artículo 1.</p><p>Texto anterior.</p></version><version id_norma="BOE-A-2026-2" fecha_publicacion="20260101" fecha_vigencia="20260102"><p class="articulo">Artículo 1.</p><p>Texto vigente con &amp; condición.</p><blockquote><p>Nota editorial.</p></blockquote></version></bloque></data></response>`, { id: 'source-boe-block', title: 'Ley de prueba', url: 'https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/BOE-A-2000-1/texto/bloque/a1' });
if (legalBlockRecords.length !== 2 || legalBlockRecords[0].dimensions.validTo !== '2026-01-02' || legalBlockRecords[1].dimensions.currentVersion !== true || !legalBlockRecords[1].excerpt.includes('Texto vigente con & condición') || legalBlockRecords[1].excerpt.includes('Nota editorial')) throw new Error('BOE consolidated article versions were not normalized safely');
if (selectCurrentLegalRule([...legalBlockRecords].reverse())?.period !== '2026-01-02') throw new Error('Legal rule selection did not prefer the explicitly current version');
console.log('Warehouse normalizer validation passed: statistical observations, BOE publications, legal metadata, and versioned article text are preserved.');
