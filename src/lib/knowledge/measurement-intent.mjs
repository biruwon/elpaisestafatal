const normalize = (text) => String(text || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export const asksForMeasurementMeaning = (text) => /\b(?:es lo mismo|son lo mismo|no es la|no es el|no son la|no son el|equival\w*|diferencia\w*|distint\w*|significa\w*|defini\w*|que mide|como se calcula|como se mide|se calcula|divid[ea]\w*|denominador)\b/.test(normalize(text));
export const needsScopedMeasurement = (text) => asksForMeasurementMeaning(text)
  || /\b(?:tasa|porcentaje|indice|media|ratio|recuento)\b/.test(normalize(text)) && /\d|\b(?:juvenil|mujeres|hombres|mayores|menores|provincia|municipio)\b/.test(normalize(text));
