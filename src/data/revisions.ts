export type RevisionEntry={date:string;title:string;detail:string;pages:string[];commit:string};
export const revisions:RevisionEntry[]=[
  {date:'12 jul. 2026',title:'Comparación de preocupaciones rehecha desde microdatos',detail:'Se separaron primera mención, cualquier mención y áreas agrupadas. La unión de extremismos y crispación se corrigió de 12,9% a 11,4%.',pages:['Inicio','Política','Empleo','Extremismos'],commit:'ae9c7d8'},
  {date:'12 jul. 2026',title:'Etiquetas sobre la naturaleza de la evidencia',detail:'Se añadieron etiquetas visibles para hechos, cálculos, interpretaciones, propuestas y evidencia insuficiente.',pages:['Las 14 preocupaciones'],commit:'e75cee8'},
  {date:'12 jul. 2026',title:'Respuestas breves y verificaciones',detail:'Se publicaron respuestas de 60 segundos para 14 preocupaciones y 20 verificaciones independientes.',pages:['Las 14 preocupaciones','Verificaciones'],commit:'73dfe89'},
];
