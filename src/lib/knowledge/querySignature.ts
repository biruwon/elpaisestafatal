const stopWords = new Set([
  'como', 'esta', 'este', 'para', 'pero', 'que', 'sus', 'tiene', 'una', 'uno',
  'unas', 'unos', 'en', 'el', 'la', 'los', 'las', 'un', 'del', 'de', 'y', 'o',
  'a', 'por', 'con', 'segun', 'dicen', 'hay', 'todo', 'todos', 'toda', 'cada',
  'vez', 'mi', 'mis', 'tu', 'tus', 'me', 'se', 'le', 'les', 'es', 'son', 'ser',
]);

const normalize = (value: string): string => value.toLocaleLowerCase('es').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();

export const canonicalQuerySignature = (value: string): string => [...new Set(
  normalize(value).split(' ').filter((token) => token.length > 2 && !stopWords.has(token)),
)].sort().join(' ').slice(0, 12000);
