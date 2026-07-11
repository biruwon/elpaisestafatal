import { claims } from './claims';

export type CuratedSearchItem = {
  question: string;
  href: string;
  topic: string;
  answer: string;
  keywords: string[];
};

export const curatedSearch: CuratedSearchItem[] = claims.map((item) => ({
  question: item.claim.replace(/[“”]/g, ''),
  href: `/verificaciones/${item.slug}`,
  topic: item.topic,
  answer: item.shareable,
  keywords: [item.topic, item.claim, ...item.keywords],
}));

const popularSlugs = [
  'viviendas-vacias',
  'inmigrantes-ayudas',
  'empleo-record',
  'sanidad-colapsada',
];

export const popularQuestions = popularSlugs
  .map((slug) => curatedSearch[claims.findIndex((item) => item.slug === slug)])
  .filter((item): item is CuratedSearchItem => Boolean(item));
