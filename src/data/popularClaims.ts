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
  'paro-juvenil-alto',
  'paro-epa-supera-10',
  'ingresos-publicos-superan-40',
  'gasto-publico-supera-45',
  'deficit-publico-baja-3',
  'deuda-publica-supera-100',
];

export const popularClaims: ClaimVerification[] = popularSlugs
  .map((slug) => claims.find((claim) => claim.slug === slug))
  .filter((claim): claim is ClaimVerification => Boolean(claim));
