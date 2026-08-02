import { claims, type ClaimVerification } from './claims';

const popularSlugs = [
  'viviendas-vacias',
  'inmigrantes-ayudas',
  'empleo-record',
  'sanidad-colapsada',
  'espana-mas-peligrosa',
  'espana-impuestos-europa',
  'politicos-corruptos',
  'demasiados-graduados',
  'inmigrantes-patera',
  'airbnb-vivienda',
  'fijos-discontinuos',
  'paro-historico',
  'paro-epa-registro',
  'juventud-emancipacion',
  'economia-crece-coste-vida',
  'precio-vivienda-sube',
  'cibercriminalidad-crece',
  'esperanza-vida-alta',
  'electricidad-hogares-sube',
];

export const popularClaims: ClaimVerification[] = popularSlugs
  .map((slug) => claims.find((claim) => claim.slug === slug))
  .filter((claim): claim is ClaimVerification => Boolean(claim));
