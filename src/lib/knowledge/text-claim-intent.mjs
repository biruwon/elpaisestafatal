const normalize = (value) => String(value || '').toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ñ/g, 'n')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const stopWords = new Set([
  'a', 'al', 'algo', 'algunas', 'algunos', 'como', 'con', 'de', 'del', 'el', 'ella', 'ellas',
  'ello', 'ellos', 'en', 'es', 'esa', 'ese', 'eso', 'esta', 'este', 'esto', 'la', 'las', 'lo',
  'los', 'mi', 'mis', 'muchas', 'muchos', 'no', 'o', 'para', 'por', 'que', 'se', 'su', 'sus',
  'un', 'una', 'unas', 'unos', 'y',
]);

const socialMessages = new Set([
  'hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'que tal',
  'gracias', 'muchas gracias', 'vale', 'ok', 'adios', 'hasta luego',
  'hello', 'hi', 'hey', 'thanks', 'thank you', 'good morning', 'good afternoon', 'good evening',
]);
const socialWords = new Set([...socialMessages].flatMap((message) => message.split(' ')));

const genericCheckRequests = [
  /^(?:(?:quiero|quisiera|necesito|me gustaria|puedes|podrias|me puedes|me podrias|ayudame)\s+)?(?:a\s+)?(?:comprobar|verificar|revisar|contrastar|analizar|entender|saber)\s+(?:(?:si|que)\s+)?(?:algo|esto|eso|una afirmacion|un mensaje|un titular|una noticia|un texto|la verdad|si es verdad|si es cierto)$/,
  /^(?:puedes ayudarme|me puedes ayudar|podrias ayudarme|necesito ayuda|ayudame|que opinas|que opinas de esto|dime tu opinion|como estas|que tal estas)$/,
];

/**
 * Detect only inputs that contain no claim to assess, such as a greeting or a
 * request to check "something". Short statements with two content words are
 * deliberately allowed through so compact claims and allegations are not
 * discarded just because they lack a number or a known topic.
 */
export const isMissingTextClaim = (value) => {
  const text = normalize(value);
  if (!text) return false;
  if (socialMessages.has(text) || text.split(' ').every((word) => socialWords.has(word))
    || genericCheckRequests.some((pattern) => pattern.test(text))) return true;
  const contentWords = text.split(' ').filter((word) => word.length > 1 && !stopWords.has(word) && !/^\d+$/.test(word));
  const hasNumericValue = /\d/.test(text);
  return contentWords.length + Number(hasNumericValue) <= 1;
};

export const missingTextClaimResponse = (claim) => ({
  state: 'clarification',
  id: `clarify-claim-${Date.now().toString(36)}`,
  claim,
  question: 'Escribe o pega una afirmación concreta para poder contrastarla con datos.',
  options: [],
});
