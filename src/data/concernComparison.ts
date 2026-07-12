export type ComparisonRow = { label: string; value: number; href: string };
export type ComparisonMode = 'first' | 'any' | 'grouped';

export const comparisonModes: Record<ComparisonMode, { label: string; description: string; rows: ComparisonRow[] }> = {
  first: {
    label: 'Primer problema mencionado',
    description: 'Porcentaje ponderado que dio esa respuesta en primer lugar. Las categorías son las respuestas oficiales del CIS y son comparables entre sí.',
    rows: [
      ['Vivienda',25.08,'vivienda'],['Gobierno o políticos concretos',8.72,'politica'],['Problemas políticos en general',7.95,'politica'],['Economía',7.34,'economia'],['Calidad del empleo',4.96,'empleo'],['Mal comportamiento político',4.59,'politica'],['Inmigración',4.57,'inmigracion'],['Paro',4.47,'empleo'],['Corrupción y fraude',3.85,'corrupcion'],['Extremismos',3.43,'extremismos'],['Juventud y oportunidades',2.70,'juventud'],['Inseguridad ciudadana',2.15,'seguridad'],['Actividad de los partidos',1.99,'politica'],['Impuestos',1.52,'impuestos'],
    ].map(([label,value,slug])=>({label:String(label),value:Number(value),href:`/preocupaciones/${slug}`})),
  },
  any: {
    label: 'Mencionado en cualquier respuesta',
    description: 'Porcentaje ponderado que citó la categoría en al menos una de sus tres respuestas. Cada persona cuenta una vez por categoría.',
    rows: [
      ['Vivienda',41.25,'vivienda'],['Economía',24.92,'economia'],['Calidad del empleo',19.17,'empleo'],['Inmigración',15.78,'inmigracion'],['Paro',14.34,'empleo'],['Problemas políticos en general',13.91,'politica'],['Sanidad',12.80,'sanidad'],['Gobierno o políticos concretos',11.26,'politica'],['Mal comportamiento político',9.59,'politica'],['Juventud y oportunidades',9.00,'juventud'],['Corrupción y fraude',8.91,'corrupcion'],['Extremismos',8.57,'extremismos'],['Inseguridad ciudadana',8.53,'seguridad'],['Problemas sociales',4.84,'problemas-sociales'],
    ].map(([label,value,slug])=>({label:String(label),value:Number(value),href:`/preocupaciones/${slug}`})),
  },
  grouped: {
    label: 'Áreas temáticas agrupadas',
    description: 'Uniones editoriales de categorías relacionadas en cualquiera de las tres respuestas. Evitan duplicar personas, pero no forman un ranking ordinal oficial.',
    rows: [
      ['Vivienda',41.25,'vivienda'],['Política, políticos y partidos',37.48,'politica'],['Empleo y paro',31.80,'empleo'],['Economía y coste de la vida',24.92,'economia'],['Inmigración',15.78,'inmigracion'],['Sanidad',12.80,'sanidad'],['Extremismos y crispación',11.40,'extremismos'],['Juventud y oportunidades',9.00,'juventud'],['Corrupción y fraude',8.91,'corrupcion'],['Inseguridad ciudadana',8.53,'seguridad'],['Problemas sociales',4.84,'problemas-sociales'],['Desigualdades y pobreza',4.80,'desigualdad'],['Crisis de valores',4.55,'crisis-valores'],['Impuestos',3.93,'impuestos'],
    ].map(([label,value,slug])=>({label:String(label),value:Number(value),href:`/preocupaciones/${slug}`})),
  },
};

export const comparisonMeta = {
  study: 'CIS 3557 · abril de 2026',
  sample: 4020,
  weight: 'PESO',
  inputUrl: 'https://www.cis.es/documents/20117/13932083/MD3557.zip/b06ffee0-bd18-6b3f-cb75-4b674616aa2a?version=1.0&t=1779881033257',
  outputUrl: '/datos/preocupaciones-cis-3557.csv',
};
