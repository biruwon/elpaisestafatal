import { claimFocusFor, hasSpecificMetricReference } from './claim-focus.mjs';

const normalize = (text) => String(text || '')
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const measurementDefinitionQuestion = /\b(?:que mide|que significa|que quiere decir|como se calcula|como se mide|cual es la definicion|definicion de|que diferencia hay entre|cual es la diferencia entre|diferencia entre|cual es el denominador|que denominador tiene|cual es el numerador|que numerador tiene)\b/;
const standaloneMeasurementDefinition = /^\s*(?:denominador|numerador|definicion)\b/;
const measurementComparison = /\b(?:no es lo mismo|no es la|no es el|no son la|no son el|no equivale|equivale|equivalente|diferenc\w*|distint\w*)\b/;

export const asksForMeasurementMeaning = (text) => {
  const value = normalize(text);
  return measurementDefinitionQuestion.test(value) || standaloneMeasurementDefinition.test(value);
};

export const asksForMeasurementComparison = (text) => measurementComparison.test(normalize(text));

// Claims that state a comparison, cause, attribution, or qualitative threshold
// need evidence scoped to that relationship. Topic-level indicators alone are
// not enough to answer them.
const specificRelationshipPatterns = [
  /\b(?:mas que|mas\b[\w\s]{0,45}\bque|menos que|menos\b[\w\s]{0,45}\bque|mejor(?:es)?|peor(?:es)?|mayor que|menor que|superior\w*|inferior\w*|por encima de|por debajo de|frente a|a diferencia de|respecto a|versus|compar\w*|equival\w*|distint\w*)\b/,
  /\b(?:no garantiza|no permite|no es lo mismo|depende\w*|a costa de|provoc\w*|caus\w*|gener\w*|oblig\w*|expuls\w*|desplaz\w*|frena\w*|limita\w*|reduc\w*|aument\w*|aceler\w*|influye|influenc\w*|hace que|lleva a|da lugar a|por culpa de|debido a|porque|destru\w*|perjudic\w*|imped\w*|obstacul\w*)\b/,
  /\b(?:se percibe|percibid\w*|percib\w*|sienten? que|creen? que|consider\w* que|sensaci[oó]n de|mied\w*|temor\w*|prefier\w*|benefici\w*|transfer\w*|redistribu\w*|repart\w*|distribu\w*|proporcional\w*|encarec\w*|escond\w*|ocult\w*|disimul\w*|compiten?\b|atrae\w*|atractiv\w*|sustituy\w*|reemplaz\w*|traslad\w*|elimin\w*|mezcl\w*|confund\w*|reflej\w*|sobredimension\w*|duplic\w*|sobrecualific\w*|soluci[oó]n|sosten\w*|contribuy\w*|compens\w*)\b/,
  /\b(?:dif[ií]cil|dificult\w*|imposible|demasiad\w*|excesiv\w*|poc\w*|muchos|muchas|numeros\w*|algunos|algunas|varios|varias|la mayor[ií]a|cada vez|parte de|excepcional\w*|desperdici\w*|se quema\w*|quemad\w*|aunque|antes|despu[eé]s|mientras|no pueden?\b|no pueden pagar|no pueden ahorrar|no pueden comprar|no encuentra\w* suficiente|no hay suficiente|no requiere\w*|no requieren|no refleja|hacia abajo|normal para|sera normal|seran? habitual\w*|por falta de|falta de|retrasa\w*|atrasa\w*|dedic\w*|comprim\w*|ya tienen|ya posee|ya constan|necesit\w*|patrimoni\w*|generaciones? (?:anteriores|posteriores)|generacion\w* siguientes|no tendran)\b/,
];

const asksForSpecificRelationship = (text) => specificRelationshipPatterns.some((pattern) => pattern.test(text));

export const needsScopedMeasurement = (text) => {
  const value = normalize(text);
  return asksForMeasurementMeaning(value)
    || Boolean(claimFocusFor(text))
    || hasSpecificMetricReference(text)
    || /\b(?:tasa|porcentaje|indice|media|ratio|recuento)\b/.test(value) && /\d|\b(?:juvenil|mujeres|hombres|mayores|menores|provincia|municipio)\b/.test(value)
    || asksForSpecificRelationship(value);
};
