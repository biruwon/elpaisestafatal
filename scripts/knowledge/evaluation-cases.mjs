const knownSeeds = [
  ['inmigracion-delincuencia', 'causal', 'Los inmigrantes crean inseguridad'],
  ['inmigrantes-ayudas', 'group_comparison', 'Los inmigrantes vienen a España a vivir de ayudas'],
  ['inmigrantes-patera', 'quantity', 'La mayoría de inmigrantes llega en patera'],
  ['viviendas-vacias', 'causal', 'Hay millones de viviendas vacías, así que no hace falta construir'],
  ['airbnb-vivienda', 'causal', 'Los pisos turísticos han causado la crisis de vivienda'],
  ['empleo-record', 'trend', 'España tiene más empleo que nunca'],
  ['fijos-discontinuos', 'definition', 'Los fijos discontinuos son parados ocultos'],
  ['smi-destruye-empleo', 'causal', 'El salario mínimo destruye empleo'],
  ['espana-impuestos-europa', 'ranking', 'España es el país que más impuestos cobra de Europa'],
  ['sanidad-colapsada', 'definition', 'La sanidad española está colapsada'],
  ['politicos-corruptos', 'quantity', 'Todos los políticos son corruptos'],
  ['espana-mas-peligrosa', 'trend', 'España es cada vez más peligrosa'],
  ['paro-historico', 'trend', 'España tiene el paro más bajo de la historia'],
  ['precio-vivienda-caera', 'prediction', 'El precio de la vivienda va a caer como en 2008'],
  ['construir-vivienda', 'normative', 'Basta con construir más vivienda'],
];

// These are deliberately present in the corpus as unpublished claims. The
// resolver must not expose planned editorial records as public answers.
const unpublishedSeeds = [
  ['desalojar-a-un-ocupante-ilegal-tarda-anos', 'legal', 'Desalojar a un ocupante ilegal tarda años'],
  ['la-ley-trans-permite-cambiar-de-sexo-sin-ningun-control', 'legal', 'La ley trans permite cambiar de sexo sin ningún control'],
  ['la-amnistia-rompe-la-igualdad-ante-la-ley', 'normative', 'La amnistía rompe la igualdad ante la ley'],
  ['la-brecha-salarial-de-genero-es-un-mito', 'group_comparison', 'La brecha salarial de género es un mito'],
  ['espana-esta-sufriendo-un-reemplazo-poblacional', 'prediction', 'España está sufriendo un reemplazo poblacional'],
];

const accentless = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');
const typo = (value) => value.replace('España', 'Espana').replace('inmigrantes', 'inmigratnes').replace('vivienda', 'vivenda');

const cases = [];
for (const [slug, category, prompt] of knownSeeds) {
  const variants = [
    prompt,
    `¿Es verdad que ${prompt.toLocaleLowerCase('es')}?`,
    `En el grupo dicen que ${prompt.toLocaleLowerCase('es')}`,
    `Mi cuñado insiste: ${prompt.toLocaleLowerCase('es')}`,
    accentless(prompt),
    typo(prompt),
    `Según los datos, ${prompt.toLocaleLowerCase('es')}`,
    `No me creo que ${prompt.toLocaleLowerCase('es')}`,
    `¿De verdad ${prompt.toLocaleLowerCase('es')}?`,
    `${prompt} y por eso todo va peor`,
    `He leído esto: “${prompt}”`,
    `¿Qué hay de cierto en que ${prompt.toLocaleLowerCase('es')}?`,
  ];
  variants.forEach((input, index) => cases.push({ id: `known-${slug}-${index + 1}`, input, expected: { status: 'known', slug }, category }));
}
for (const [slug, category, prompt] of unpublishedSeeds) {
  const variants = [
    prompt,
    `¿Es verdad que ${prompt.toLocaleLowerCase('es')}?`,
    `En el grupo dicen que ${prompt.toLocaleLowerCase('es')}`,
    `Mi cuñado insiste: ${prompt.toLocaleLowerCase('es')}`,
    accentless(prompt),
    typo(prompt),
    `Según los datos, ${prompt.toLocaleLowerCase('es')}`,
    `No me creo que ${prompt.toLocaleLowerCase('es')}`,
    `¿De verdad ${prompt.toLocaleLowerCase('es')}?`,
    `${prompt} y por eso todo va peor`,
    `He leído esto: “${prompt}”`,
    `¿Qué hay de cierto en que ${prompt.toLocaleLowerCase('es')}?`,
  ];
  variants.forEach((input, index) => cases.push({ id: `unpublished-${slug}-${index + 1}`, input, expected: { status: 'unknown' }, category }));
}

const unknownInputs = [
  'asdasdfasd',
  'España está destruida',
  'Mi vecino dice que el ayuntamiento oculta las cifras de su portal',
  'En mi calle todos los pisos sociales se los dan a extranjeros',
  'El gobierno paga a periodistas para que callen una noticia concreta',
  'Esta empresa privada despide a la gente por hablar catalán',
  'Un concejal recibió dinero en efectivo en una reunión privada',
  'La estadística secreta demuestra que todo va peor',
  'El funcionario de mi pueblo arregla expedientes a sus amigos',
  'El nuevo contrato de mi municipio está amañado',
  'Los medios esconden exactamente lo que pasó ayer en mi barrio',
  'La próxima crisis será peor que todas las anteriores',
  'El ministro sabía lo que iba a ocurrir y lo ocultó',
  'Todos los jueces de esta ciudad están comprados',
  'Nadie puede saber cuántas personas reciben esa ayuda',
  'La causa exacta de mi enfermedad es vivir cerca de una carretera',
  'El alcalde utiliza bots para ganar cada elección',
  'Un audio anónimo prueba que existe un pacto secreto',
  'La vivienda vacía de mi edificio debería estar disponible mañana',
  'Ese partido controla todas las conversaciones de internet',
  'Los datos oficiales son falsos porque lo dice un vídeo',
  'Una familia concreta recibió una ayuda ilegalmente',
  'En mi barrio ha subido la inseguridad este mes',
  'La policía no registra los delitos de mi zona',
  'La mayoría de mis compañeros votará a un partido nuevo',
  'El próximo presupuesto reducirá exactamente los salarios de mi colegio',
  'Una ley aún no publicada cambiará todos los alquileres',
  'Ese periodista inventó una cifra en una conversación privada',
  'La empresa de mi vecino recibe una subvención secreta',
  'El hospital de mi pueblo oculta la lista de espera real',
  'Un documento sin fecha prueba que el gobierno miente',
  'La causa de este apagón fue una decisión ideológica concreta',
  'Los extranjeros de mi portal reciben prioridad en el ascensor',
  'El ayuntamiento ha perdido una partida de presupuesto esta semana',
  'Una persona particular cometió un delito y nadie lo denunció',
  'El dato que circula en WhatsApp no tiene fuente',
  'La predicción de un tertuliano se cumplirá seguro',
  'Mi experiencia demuestra lo que ocurre en toda España',
  'El contrato verbal del propietario no aparece en ningún registro',
  'La supuesta encuesta solo se hizo entre mis amigos',
  'Un rumor de redes sociales confirma la intención del ministro',
  'La cifra exacta depende de un archivo que no se ha publicado',
  'La norma de mi comunidad autónoma puede haber cambiado ayer',
  'En mi municipio se reparten ayudas con criterios desconocidos',
  'Un familiar asegura que vio el documento original',
  'El dato no distingue entre residentes y visitantes',
  'La noticia no indica el periodo de la comparación',
  'No sabemos qué significa exactamente “colapso” en esta discusión',
  'La afirmación mezcla una opinión con una cifra sin contexto',
  'El resultado depende de qué población se use como denominador',
  'La causa propuesta no está demostrada por una coincidencia temporal',
  'No existe una fuente pública para esa acusación concreta',
  'El programa de ayudas puede tener requisitos distintos según el municipio',
  'La noticia confunde personas detenidas con personas condenadas',
  'La comparación usa años y definiciones diferentes',
  'No se puede saber la intención privada de una persona con este dato',
  'El vídeo muestra una cifra pero no indica quién la produjo',
  'La afirmación requiere una resolución judicial concreta',
  'El número redondeado no identifica la partida presupuestaria',
  'No hay evidencia suficiente para atribuir este cambio a una sola causa',
];
unknownInputs.forEach((input, index) => cases.push({ id: `unknown-${index + 1}`, input, expected: { status: 'unknown' }, category: index % 2 ? 'impossible' : 'local' }));

export const evaluationCases = cases;
