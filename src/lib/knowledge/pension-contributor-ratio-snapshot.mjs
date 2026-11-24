// Reviewed ratio series published by the Spanish Social Security administration.
// The current 2026 point is the October 2026 release; this is a headcount ratio,
// not a projection or a complete assessment of pension-system sustainability.
const source = {
  id: 'social-security-affiliation-source',
  title: 'Afiliación a la Seguridad Social · ratio cotizante/pensionista, octubre de 2026',
  publisher: 'Ministerio de Inclusión, Seguridad Social y Migraciones',
  url: 'https://bibliovirtual.inclusion.gob.es/documents/20121/0/202610%2BAfiliaci%C3%B3n%2Boct-26.pdf/427aa2e0-10cd-41c0-2815-84423e8f782c',
  publishedAt: '2026-11-04',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const payAsYouGoSource = {
  id: 'social-security-pay-as-you-go',
  title: 'Financiación de la Seguridad Social: reparto y solidaridad',
  publisher: 'Seguridad Social',
  url: 'https://www.seg-social.es/wps/portal/wss/internet/PortalEducativo/Profesores/Unidad5/PESS501/PESS503',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

export const PENSION_CONTRIBUTOR_RATIO_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-24',
  expiresAt: '2026-12-31',
  refreshCommand: 'Review the next monthly Social Security affiliation release and refresh the published contributor-to-pensioner ratio series.',
  validationStatus: 'reviewed',
  asOf: '2026-11-24',
  supportedScope: 'Spain; official contributor-to-pensioner ratio series for 2014–2026, with the latest point from October 2026',
  unsupportedScope: 'raw numerator and denominator counts, regional or subgroup ratios, causal attribution to ageing, a threshold for sufficiency, actuarial sustainability, or future projections',
  source,
  payAsYouGoSource,
  observations: [
    { year: 2014, ratio: 2.24 },
    { year: 2015, ratio: 2.25 },
    { year: 2016, ratio: 2.28 },
    { year: 2017, ratio: 2.24 },
    { year: 2018, ratio: 2.28 },
    { year: 2019, ratio: 2.32 },
    { year: 2020, ratio: 2.28 },
    { year: 2021, ratio: 2.34 },
    { year: 2022, ratio: 2.39 },
    { year: 2023, ratio: 2.42 },
    { year: 2024, ratio: 2.43 },
    { year: 2025, ratio: 2.45 },
    { year: 2026, ratio: 2.51 },
  ],
});
