import { claims } from './claims';
import { conversationMvpClaims } from './conversationMvp';
import { concerns } from './concerns';
import type { ClaimIndexEntry } from './claimIndex';

const topicVocabulary: Record<string, string[]> = {
  politica: [
    'pedro sanchez', 'sanchez', 'presidente', 'gobierno', 'moncloa', 'psoe', 'pp', 'vox', 'sumar',
    'partidos', 'politicos', 'politica', 'corrupcion politica', 'destruye espana', 'destruyendo espana',
    'ruina de espana', 'pais esta fatal', 'gestion del gobierno',
  ],
  economia: ['coste de vida', 'precios', 'inflacion', 'salarios', 'economia', 'pobreza', 'crisis economica'],
  vivienda: ['alquiler', 'casa', 'casas', 'piso', 'pisos', 'hipoteca', 'vivienda', 'precio de la vivienda'],
  empleo: ['trabajo', 'trabajar', 'paro', 'desempleo', 'ocupados', 'salario', 'sueldos', 'empleo'],
  inmigracion: ['migrantes', 'inmigrantes', 'extranjeros', 'pateras', 'frontera', 'asilo', 'refugiados'],
  seguridad: ['delito', 'delitos', 'crimen', 'criminalidad', 'inseguridad', 'peligrosa', 'robos', 'estafas'],
  corrupcion: ['corruptos', 'corrupcion', 'sobornos', 'malversacion', 'fraude politico'],
  sanidad: ['salud', 'hospital', 'hospitales', 'medico', 'medicos', 'listas de espera', 'sanidad publica'],
  impuestos: ['hacienda', 'impuestos', 'tributos', 'presion fiscal', 'fiscalidad'],
  juventud: ['jovenes', 'juventud', 'emancipacion', 'universitarios'],
  desigualdad: ['desigualdad', 'pobreza', 'renta', 'exclusion', 'riqueza'],
};

const clean = (value: string): string => value.replace(/[“”]/g, '').trim();

const conversationAliases = new Map(conversationMvpClaims.map((claim) => [claim.slug, [claim.prompt, ...claim.aliases]]));
const scalableAliases: Record<string, string[]> = {
  'airbnb-vivienda': ['pisos turísticos han causado la crisis de vivienda', 'los pisos turísticos causan la crisis de vivienda', 'alquiler turístico crisis vivienda'],
  'paro-historico': ['paro más bajo de la historia', 'paro mínimo histórico', 'España tiene el paro más bajo de la historia'],
  'empleo-record': ['España tiene más empleo que nunca', 'más empleo que nunca', 'récord de empleo en España', 'nunca ha habido tanta gente trabajando'],
  'espana-mas-peligrosa': ['España es cada vez más peligrosa', 'España se está volviendo mucho más peligrosa', 'cada vez hay más delincuencia en España'],
};

export const claimIndexEntries: ClaimIndexEntry[] = [
  ...claims.filter((claim) => claim.published).map((claim) => ({
    kind: 'claim' as const,
    slug: claim.slug,
    title: clean(claim.claim),
    href: `/afirmaciones/${claim.slug}`,
    aliases: [...(conversationAliases.get(claim.slug) ?? []), ...claim.aliases, ...(scalableAliases[claim.slug] ?? []), claim.topic],
    keywords: [...claim.keywords, ...claim.topicSlugs],
    assessment: claim.assessment,
    answer: claim.shareable,
    topic: claim.topic,
    claimType: claim.claimType,
    evidenceStrength: claim.evidenceStrength,
    evidenceIds: claim.evidenceIds,
    sourceRefs: claim.sourceRefs,
    relatedSlugs: claim.relatedSlugs,
    whatIsTrue: claim.whatIsTrue,
    whatIsMissing: claim.whatIsMissing,
    cannotProve: claim.cannotProve,
    scale: claim.scale,
  })),
  ...concerns.map((concern) => ({
    kind: 'topic' as const,
    slug: concern.slug,
    title: concern.title,
    href: `/preocupaciones/${concern.slug}`,
    aliases: [concern.short, ...(topicVocabulary[concern.slug] ?? [])],
    keywords: [concern.slug, concern.title, ...(topicVocabulary[concern.slug] ?? [])],
    answer: concern.quickAnswer.sentence,
    topic: concern.slug,
  })),
];
