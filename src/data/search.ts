export type CuratedSearchItem = {
  question: string;
  href: string;
  topic: string;
  answer: string;
  keywords: string[];
};

export const curatedSearch: CuratedSearchItem[] = [
  { question:'¿Por qué sube tanto la vivienda?',href:'/preocupaciones/vivienda',topic:'Vivienda',answer:'La oferta asequible no crece al ritmo de los hogares en las zonas con más empleo y población.',keywords:['piso','alquiler','casa','precio','comprar','airbnb'] },
  { question:'¿Hay millones de viviendas vacías utilizables?',href:'/preocupaciones/vivienda#stock',topic:'Vivienda',answer:'Hay muchas viviendas vacías, pero gran parte no está disponible ni situada donde se concentra la demanda.',keywords:['vacías','vacias','stock','3,8 millones'] },
  { question:'¿Los fondos de inversión causan la crisis de vivienda?',href:'/preocupaciones/vivienda#propietarios',topic:'Vivienda',answer:'Pueden influir localmente, pero las personas físicas poseen la gran mayoría del alquiler residencial.',keywords:['fondos buitre','blackstone','caseros','propietarios'] },
  { question:'¿Los inmigrantes viven de ayudas?',href:'/preocupaciones/inmigracion#bienestar',topic:'Inmigración',answer:'Es una generalización engañosa: el acceso depende de renta, residencia, familia y cotizaciones, no solo de nacionalidad.',keywords:['paguitas','subsidios','prestaciones','extranjeros'] },
  { question:'¿La mayoría de inmigrantes llega en patera?',href:'/preocupaciones/inmigracion#pateras',topic:'Inmigración',answer:'No. Las llegadas irregulares visibles son una minoría frente al conjunto de residentes nacidos fuera.',keywords:['barco','canarias','irregulares','frontera'] },
  { question:'¿La inmigración aumenta la delincuencia?',href:'/preocupaciones/seguridad#nacionalidad',topic:'Seguridad',answer:'Las tasas brutas difieren, pero no aíslan edad, sexo, renta ni territorio y no justifican culpa colectiva.',keywords:['inmigrantes','crimen','delitos','extranjeros'] },
  { question:'¿Hay más delincuencia que antes?',href:'/preocupaciones/seguridad#convencional',topic:'Seguridad',answer:'La delincuencia convencional permanece contenida; el gran crecimiento está en el fraude digital.',keywords:['inseguridad','robos','violencia','criminalidad'] },
  { question:'¿España cobra demasiados impuestos?',href:'/preocupaciones/impuestos#comparacion',topic:'Impuestos',answer:'No lidera Europa, pero grava con fuerza el empleo formal y mantiene muchas excepciones.',keywords:['presión fiscal','irpf','iva','cuña','europa'] },
  { question:'¿Se está creando empleo de calidad?',href:'/preocupaciones/empleo#reforma',topic:'Empleo',answer:'Se crea mucho empleo y cayó la temporalidad, pero salario, horas y continuidad siguen siendo desiguales.',keywords:['trabajo','paro','indefinido','precariedad'] },
  { question:'¿Los fijos discontinuos son parados ocultos?',href:'/preocupaciones/empleo#fijos-discontinuos',topic:'Empleo',answer:'No son automáticamente desempleados, aunque hacen falta mejores datos sobre actividad e ingreso anual.',keywords:['fijo discontinuo','maquillaje','contrato'] },
  { question:'¿El salario mínimo destruyó empleo?',href:'/preocupaciones/empleo#smi',topic:'Empleo',answer:'No hubo un colapso agregado; los efectos concretos varían por sector, edad y productividad.',keywords:['smi','salario','desempleo'] },
  { question:'¿La sanidad pública está colapsada?',href:'/preocupaciones/sanidad#espera',topic:'Sanidad',answer:'Conserva grandes resultados clínicos, pero el acceso y las esperas se deterioran de forma desigual.',keywords:['médico','listas de espera','hospital','salud'] },
  { question:'¿España es uno de los países más desiguales?',href:'/preocupaciones/desigualdad#europa',topic:'Desigualdad',answer:'Es más desigual que buena parte de Europa occidental, pero no una excepción mundial.',keywords:['pobreza','gini','ricos','reparto'] },
  { question:'¿Todos los políticos son corruptos?',href:'/preocupaciones/corrupcion#mitos',topic:'Corrupción',answer:'No. Los casos afectan a una minoría, aunque revelan riesgos recurrentes en contratos, partidos y urbanismo.',keywords:['corrupción','partidos','sobornos','fraude'] },
];

export const popularQuestions = curatedSearch.slice(0, 4);
