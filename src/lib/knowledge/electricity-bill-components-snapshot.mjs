import { requestedGeographyScopes } from './geography-scope.mjs';

const dataSource = {
  id: 'eurostat-household-electricity-components-spain-2024-2025',
  title: 'Electricity prices components for household consumers · nrg_pc_204_c',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_pc_204_c?freq=A&geo=ES&nrg_cons=KWH2500-4999&currency=EUR&time=2024&time=2025',
  retrievedAt: '2026-11-25',
  role: 'primary',
};

const metadataSource = {
  id: 'eurostat-electricity-price-components-methodology-spain',
  title: 'Electricity prices · methodological information for Spain',
  publisher: 'Eurostat / Ministry for the Ecological Transition and the Demographic Challenge',
  url: 'https://ec.europa.eu/eurostat/cache/metadata/en/nrg_prc_e_sims_es.htm',
  retrievedAt: '2026-11-25',
  role: 'primary',
};

const cnmcSource = {
  id: 'cnmc-electricity-bill-components-and-contracts',
  title: 'Comercialización y suministro eléctrico · composición de la factura',
  publisher: 'Comisión Nacional de los Mercados y la Competencia',
  url: 'https://www.cnmc.es/ca/node/406175',
  retrievedAt: '2026-11-25',
  role: 'primary',
};

const format = (value) => new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
}).format(value);

const normalize = (value) => String(value || '').toLocaleLowerCase('es')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');

const electricityBillComponentsSnapshotFits = (claim) => {
  const text = normalize(claim);
  const years = [...text.matchAll(/\b20\d{2}\b/g)].map(([year]) => year);
  if (years.some((year) => !['2024', '2025'].includes(year))) return false;
  if (/\b(?:desde|cada vez|cada ano|ultim\w* anos|mensual\w*|horari\w*|por horas|tendencia|evoluci\w*|ha aumentado|ha crecido|ha bajado|ha caido|en el futuro)\b/.test(text)) return false;
  if (/\b(?:mi factura|mi contrato|mi hogar|hogar\w* (?:unipersonal|monoparental)|familias? (?:con|sin)|empresas?|industria\w*|pymes?|autonom\w*|pvpc|tarifa regulada|tarifa fija|precio fijo|contrato indexado)\b/.test(text)) return false;
  if (/\b(?:gas natural|butano|propano|gasolina|petroleo|diesel|gasoleo|trigo|harina|alquil\w*|viviend\w*|telefon\w*)\b/.test(text)) return false;
  return requestedGeographyScopes(claim).every(({ id }) => id === 'ES');
};

const componentComparison = `En España, el precio minorista medio por kWh para hogares de 2.500 a menos de 5.000 kWh anuales fue ${format(0.2383)} €/kWh en 2024 y ${format(0.2638)} €/kWh en 2025. La parte de energía y suministro se mantuvo en ${format(0.1108)} €/kWh; la de red pasó de ${format(0.0701)} a ${format(0.0712)}, y la de impuestos, tasas y cargos, de ${format(0.0574)} a ${format(0.0818)}.`;
const billDefinition = 'La CNMC incluye energía, costes regulados de redes, margen de comercialización e impuestos en la factura; el consumo y el horario influyen en su parte variable, salvo que un contrato libre haya fijado un precio.';

const componentDimensions = {
  subject: 'precio minorista anual de electricidad y componentes agregados: energía y suministro, costes de red, impuestos, tasas, gravámenes y cargos',
  population: 'hogares en la banda estándar DC, con consumo anual de 2.500 a menos de 5.000 kWh',
  period: 'años 2024 y 2025',
  geography: 'España',
  denominator: 'promedio ponderado por kWh dentro de una banda de consumo; no es una factura individual',
  unit: 'euros por kWh; suma de los componentes agregados publicados',
};
const billDefinitionDimensions = {
  subject: 'conceptos incluidos en la factura eléctrica y condiciones del término de energía',
  population: 'consumidores de electricidad en España',
  period: 'descripción general de la CNMC consultada el 25 de noviembre de 2026',
  geography: 'España',
  denominator: 'explicación de conceptos de facturación; no es una muestra de recibos',
  unit: 'componentes de factura y condición del contrato',
};

export const ELECTRICITY_BILL_COMPONENTS_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-25',
  asOf: '2026-11-25',
  expiresAt: '2027-10-31',
  refreshCommand: 'Actualizar nrg_pc_204_c para España y la banda DC; confirmar revisión, unidades y componentes agregados para los dos años comparados. Comprobar la metodología de precios y la explicación vigente de factura y contratos de la CNMC.',
  validationStatus: 'reviewed',
  territories: ['ES'],
  supportedScope: 'Comparación descriptiva de los componentes agregados del precio minorista anual de electricidad para la banda doméstica española de 2.500 a menos de 5.000 kWh/año, entre 2024 y 2025.',
  unsupportedScope: 'precio mayorista spot; atribución causal de un cambio del precio final a los impuestos o cargos; precio de un recibo o contrato concreto; tarifas reguladas o indexadas; comparación horaria o mensual; otros periodos, regiones, bandas de consumo, empresas o combustibles.',
  when: electricityBillComponentsSnapshotFits,
  directClaimEvidence: false,
  evidenceLabel: 'Componentes del precio doméstico de la electricidad · España, 2024–2025',
  dimensions: componentDimensions,
  facts: [componentComparison, billDefinition],
  factSourceIds: [
    [dataSource.id, metadataSource.id],
    [cnmcSource.id],
  ],
  factDimensions: [componentDimensions, billDefinitionDimensions],
  sources: [dataSource, metadataSource, cnmcSource],
});

export const electricityBillComponentsReply = ({ facts }) => [
  facts[0],
  facts[1],
  'El total minorista cambió mientras «energía y suministro» se mantuvo estable, pero «energía y suministro» no es el precio mayorista spot. Estos datos no prueban por sí solos que los cargos causaran una diferencia frente al mercado mayorista. Para comprobarlo hacen falta precios mayoristas, tarifas y facturas comparables del mismo contrato y periodo.',
].join('\n\n');
