import { claims } from './claimCatalog';
import { concerns } from './concerns';
import type { ClaimIndexEntry } from './claimIndex';
import { claimAliases } from './claimAliases';
import { getSource } from './registry';
import { semanticFamilyKeys, semanticQuerySignature } from '../lib/knowledge/querySignature';

const topicVocabulary: Record<string, string[]> = {
  politica: [
    'pedro sanchez', 'sanchez', 'presidente', 'gobierno', 'moncloa', 'psoe', 'pp', 'vox', 'sumar',
    'partidos', 'politicos', 'politica', 'corrupcion politica', 'destruye espana', 'destruyendo espana',
    'pedro sanchez esta destruyendo espana', 'sanchez destruye espana', 'espana esta destruida', 'espana destruida',
    'ruina de espana', 'pais esta fatal', 'todo va fatal', 'espana va mal', 'gestion del gobierno',
    'espana va cuesta abajo', 'el pais se va a la ruina', 'espana es un desastre', 'el gobierno se carga espana',
    'sanchez se carga espana', 'todo es un desastre politico', 'el pais va cuesta abajo',
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
    aliases: [...claim.aliases, ...(claimAliases[claim.slug] ?? []), ...(scalableAliases[claim.slug] ?? [])],
    semanticSignatures: [...new Map([
      clean(claim.claim),
      ...claim.aliases,
      ...(claimAliases[claim.slug] ?? []),
      ...(scalableAliases[claim.slug] ?? []),
    ].map((phrase) => [semanticQuerySignature(phrase), clean(phrase)] as const).filter(([signature]) => Boolean(signature)))].map(([signature, phrase]) => ({ signature, phrase })).slice(0, 32),
    semanticFamilyKeys: [...new Set([
      clean(claim.claim),
      ...claim.aliases,
      ...(claimAliases[claim.slug] ?? []),
      ...(scalableAliases[claim.slug] ?? []),
    ].flatMap((phrase) => semanticFamilyKeys(semanticQuerySignature(phrase))))],
    keywords: [...claim.keywords, ...claim.topicSlugs],
    assessment: claim.assessment,
    answer: claim.shareable,
    topic: claim.topic,
    claimType: claim.claimType,
    evidenceStrength: claim.evidenceStrength,
    evidenceIds: claim.evidenceIds,
    propositionIds: claim.propositionIds,
    sourceRefs: claim.sourceRefs,
    sourceLinks: claim.sourceRefs.map((id) => getSource(id)).filter((source): source is NonNullable<typeof source> => Boolean(source)).map((source) => ({ id: source.id, title: source.title, url: source.url })),
    relatedSlugs: claim.relatedSlugs,
    whatIsTrue: claim.whatIsTrue,
    whatIsMissing: claim.whatIsMissing,
    cannotProve: claim.cannotProve,
    scale: claim.scale,
    visual: claim.visualType === 'comparison' && claim.visualComparisonLabels?.length
      ? {
          comparison: {
            labels: claim.visualComparisonLabels,
            values: (claim.visualComparisonValues ?? []).map(Number).filter(Number.isFinite),
            label: claim.visualComparisonUnit || 'Comparación documentada',
            unit: claim.visualComparisonUnit || '',
          },
        }
      : claim.visualType === 'money_flow' && claim.visualAmount
        ? { key: { value: claim.visualAmount, label: claim.visualDestination || 'Transferencia documentada', period: claim.period || '' } }
        : undefined,
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
