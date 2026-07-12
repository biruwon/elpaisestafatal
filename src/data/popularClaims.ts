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
];

export const popularClaims: ClaimVerification[] = popularSlugs
  .map((slug) => claims.find((claim) => claim.slug === slug))
  .filter((claim): claim is ClaimVerification => Boolean(claim));
