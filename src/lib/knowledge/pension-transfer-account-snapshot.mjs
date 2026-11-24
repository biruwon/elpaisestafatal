// Spain's 2024 General Account reports both State transfers and the balance
// for the consolidated management entities and common services. These figures
// do not measure intent to conceal or the consolidated balance of all public
// administrations.
const accountMemorySource = {
  id: 'social-security-general-account-memory-2024',
  title: 'Cuenta General de la Seguridad Social · Memoria 2024',
  publisher: 'Intervención General de la Seguridad Social',
  url: 'https://www.seg-social.es/wps/wcm/connect/wss/93f96bf2-0f29-4298-bbc1-800620165015/02_TOMO%2BII_Memoria_CGSS_2024.pdf?MOD=AJPERES',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

export const PENSION_TRANSFER_ACCOUNT_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-24',
  asOf: '2026-11-24',
  expiresAt: '2027-05-31',
  validationStatus: 'reviewed',
  refreshCommand: 'Re-check the latest Cuenta General de la Seguridad Social and its account perimeter, transfer sources and destinations, and current and total budget balances.',
  supportedScope: 'Spain; 2024 current transfers and budget results for the consolidated Social Security management entities and common services',
  unsupportedScope: 'intent to conceal a deficit; the consolidated general-government balance; a pension-only balance before State transfers; other years or territories',
  source: accountMemorySource,
  dimensions: {
    subject: 'current transfers and budget results of the consolidated Social Security management entities and common services',
    population: 'Social Security management entities and common services within the Cuenta General perimeter',
    period: '2024',
    geography: 'España',
    denominator: 'budget rights and recognized net obligations; aggregated amounts',
    unit: 'millones de euros',
  },
  facts: [
    'La Memoria de la Cuenta General de la Seguridad Social de España registra 48.151,75 millones de euros en transferencias corrientes en 2024: 43.082,32 millones procedían de la Administración del Estado y 5.017,62 millones de otras entidades de la Seguridad Social.',
    'En 2024, el desglose de transferencias reconocidas del Estado incluía 7.928,50 millones para complementos a mínimos, 3.447,78 millones para pensiones no contributivas de jubilación e invalidez y 21.380,00 millones para cumplir la primera recomendación del Pacto de Toledo de 2020.',
    'Para el perímetro consolidado de las entidades gestoras y servicios comunes, los ingresos corrientes fueron 195.891,23 millones y los gastos corrientes 205.201,38 millones; el saldo de operaciones corrientes fue −9.310,15 millones en 2024.',
    'La misma memoria informa un resultado no financiero de −9.099,07 millones y un resultado presupuestario total de −2.900,90 millones en 2024, después de sumar 6.198,17 millones de resultado positivo por operaciones financieras. Son saldos presupuestarios distintos.',
  ],
  factDimensions: [
    {
      subject: 'transferencias corrientes por administración de origen',
      population: 'entidades gestoras y servicios comunes de la Seguridad Social',
      period: '2024', geography: 'España',
      denominator: 'derechos reconocidos netos; total del capítulo 4', unit: 'millones de euros',
    },
    {
      subject: 'transferencias reconocidas de la Administración del Estado por destino',
      population: 'prestaciones y actividades financiadas por el Estado dentro de la Seguridad Social',
      period: '2024', geography: 'España',
      denominator: 'derechos reconocidos netos por subconcepto', unit: 'millones de euros',
    },
    {
      subject: 'resultado de operaciones corrientes',
      population: 'entidades gestoras y servicios comunes de la Seguridad Social',
      period: '2024', geography: 'España',
      denominator: 'ingresos corrientes menos obligaciones corrientes reconocidas', unit: 'millones de euros',
    },
    {
      subject: 'resultados presupuestarios no financieros, financieros y total',
      population: 'entidades gestoras y servicios comunes de la Seguridad Social',
      period: '2024', geography: 'España',
      denominator: 'agregación de derechos reconocidos y obligaciones reconocidas por tipo de operación', unit: 'millones de euros',
    },
  ],
});
