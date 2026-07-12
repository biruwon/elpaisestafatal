export type TopicPresentation = {
  slug: string;
  label: string;
  color: string;
  icon: string;
  illustration: string;
};

const presentations: TopicPresentation[] = [
  ['politica', 'Política', '#d9442f', 'scale', '/images/topics/politica.png'],
  ['vivienda', 'Vivienda', '#c97935', 'home', '/images/topics/vivienda.png'],
  ['empleo', 'Empleo', '#477b67', 'briefcase', '/images/topics/empleo.png'],
  ['inmigracion', 'Inmigración', '#5576a8', 'route', '/images/topics/inmigracion.png'],
  ['sanidad', 'Sanidad', '#c45f68', 'cross', '/images/topics/sanidad.png'],
  ['economia', 'Economía', '#8b6a43', 'chart', '/images/topics/economia.png'],
  ['corrupcion', 'Corrupción', '#6e5b8d', 'gavel', '/images/topics/corrupcion.png'],
  ['juventud', 'Juventud', '#d18a34', 'spark', '/images/topics/juventud.png'],
  ['seguridad', 'Seguridad', '#4e6470', 'shield', '/images/topics/seguridad.png'],
  ['impuestos', 'Impuestos', '#527f73', 'receipt', '/images/topics/impuestos.png'],
  ['desigualdad', 'Desigualdad', '#965f52', 'layers', '/images/topics/desigualdad.png'],
  ['extremismos', 'Extremismos', '#8a4755', 'signal', '/images/topics/extremismos.png'],
  ['problemas-sociales', 'Problemas sociales', '#7b7568', 'people', '/images/topics/problemas-sociales.png'],
  ['crisis-valores', 'Crisis de valores', '#6f746f', 'compass', '/images/topics/crisis-valores.png'],
].map(([slug, label, color, icon, illustration]) => ({ slug, label, color, icon, illustration }));

export const topicPresentations = presentations;
export const getTopicPresentation = (slug: string) => presentations.find((item) => item.slug === slug) ?? presentations[0];
