const normalize = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const territoryAliases = [
  ['ES', 'country', ['espana', 'espanol', 'espanola', 'spain', 'spanish']],
  ['FR', 'country', ['francia', 'frances', 'francesa', 'france', 'french']],
  ['DE', 'country', ['alemania', 'aleman', 'alemana', 'germany', 'german']],
  ['IT', 'country', ['italia', 'italiano', 'italiana', 'italy', 'italian']],
  ['PT', 'country', ['portugal', 'portugues', 'portuguesa', 'portuguese']],
  ['AT', 'country', ['austria', 'austrian']], ['BE', 'country', ['belgica', 'belgium', 'belgian']],
  ['BG', 'country', ['bulgaria', 'bulgarian']], ['CY', 'country', ['chipre', 'cyprus', 'cypriot']],
  ['CZ', 'country', ['chequia', 'czechia', 'republica checa', 'czech republic', 'czech']],
  ['DK', 'country', ['dinamarca', 'denmark', 'danish']], ['EE', 'country', ['estonia', 'estonian']],
  ['FI', 'country', ['finlandia', 'finland', 'finnish']], ['EL', 'country', ['grecia', 'greece', 'greek']],
  ['HR', 'country', ['croacia', 'croatia', 'croatian']], ['HU', 'country', ['hungria', 'hungary', 'hungarian']],
  ['IE', 'country', ['irlanda', 'ireland', 'irish']], ['LT', 'country', ['lituania', 'lithuania', 'lithuanian']],
  ['LU', 'country', ['luxemburgo', 'luxembourg', 'luxembourgish']], ['LV', 'country', ['letonia', 'latvia', 'latvian']],
  ['MT', 'country', ['malta', 'maltese']], ['NL', 'country', ['paises bajos', 'holanda', 'netherlands', 'dutch']],
  ['PL', 'country', ['polonia', 'poland', 'polish']], ['RO', 'country', ['rumania', 'romania', 'romanian']],
  ['SE', 'country', ['suecia', 'sweden', 'swedish']], ['SI', 'country', ['eslovenia', 'slovenia', 'slovenian']],
  ['SK', 'country', ['eslovaquia', 'slovakia', 'slovak']],
  ['GB', 'country', ['reino unido', 'britanico', 'britanica', 'united kingdom', 'britain', 'uk']],
  ['US', 'country', ['estados unidos', 'eeuu', 'usa', 'united states', 'united states of america', 'american']],
  ['MX', 'country', ['mexico', 'mexicano', 'mexicana', 'mexican']],
  ['AR', 'country', ['argentina', 'argentino', 'argentina']],
  ['CO', 'country', ['colombia', 'colombiano', 'colombiana', 'colombian']],
  ['BR', 'country', ['brasil', 'brasileno', 'brasilena', 'brazil', 'brazilian']],
  ['CL', 'country', ['chile', 'chileno', 'chilena', 'chilean']],
  ['CN', 'country', ['china', 'chino', 'china', 'chinese']],
  ['RU', 'country', ['rusia', 'ruso', 'rusa', 'russia', 'russian']],
  ['UA', 'country', ['ucrania', 'ucraniano', 'ucraniana', 'ukraine', 'ukrainian']],
  ['IN', 'country', ['india', 'indio', 'india', 'indian']],
  ['JP', 'country', ['japon', 'japones', 'japonesa', 'japan', 'japanese']],
  ['MA', 'country', ['marruecos', 'marroqui', 'morocco', 'moroccan']],
  ['EU', 'union', ['europa', 'europe', 'ue', 'eu', 'union europea', 'european union', 'eu27']],
  ...[
    ['Andalucía', 'andalucia', ['andalucia', 'andalusia']], ['Aragón', 'aragon', ['aragon', 'aragon region']],
    ['Asturias', 'asturias', ['asturias', 'principado de asturias']], ['Baleares', 'baleares', ['baleares', 'islas baleares', 'illes balears', 'balearic islands']],
    ['Canarias', 'canarias', ['canarias', 'islas canarias', 'canary islands']], ['Cantabria', 'cantabria', ['cantabria']],
    ['Castilla y León', 'castilla y leon', ['castilla y leon', 'castile and leon']], ['Castilla-La Mancha', 'castilla la mancha', ['castilla la mancha', 'castile la mancha']],
    ['Cataluña', 'cataluna', ['cataluna', 'catalunya', 'catalonia']], ['Comunidad Valenciana', 'comunidad valenciana', ['comunidad valenciana', 'comunitat valenciana', 'valencian community']],
    ['Extremadura', 'extremadura', ['extremadura']], ['Galicia', 'galicia', ['galicia']], ['Madrid', 'madrid', ['madrid', 'comunidad de madrid', 'community of madrid']],
    ['Murcia', 'murcia', ['murcia', 'region de murcia']], ['Navarra', 'navarra', ['navarra', 'navarre']], ['País Vasco', 'pais vasco', ['pais vasco', 'euskadi', 'basque country']],
    ['La Rioja', 'la rioja', ['la rioja']], ['Ceuta', 'ceuta', ['ceuta']], ['Melilla', 'melilla', ['melilla']],
    ['Barcelona', 'barcelona', ['barcelona']], ['Valencia', 'valencia', ['valencia']], ['Sevilla', 'sevilla', ['sevilla']],
  ].map(([, id, aliases]) => [id, 'region', aliases]),
  // Provinces are subnational scopes too. Recognizing them prevents a
  // countrywide observation from being shown for a province-specific claim.
  ...[
    ['A Coruña', 'a coruna', ['a coruna', 'la coruna']], ['Albacete', 'albacete', ['albacete']],
    ['Alicante', 'alicante', ['alicante']], ['Almería', 'almeria', ['almeria']], ['Ávila', 'avila', ['avila']],
    ['Badajoz', 'badajoz', ['badajoz']], ['Burgos', 'burgos', ['burgos']], ['Cáceres', 'caceres', ['caceres']],
    ['Cádiz', 'cadiz', ['cadiz']], ['Castellón', 'castellon', ['castellon', 'castello']],
    ['Ciudad Real', 'ciudad real', ['ciudad real']], ['Córdoba', 'cordoba', ['cordoba']], ['Cuenca', 'cuenca', ['cuenca']],
    ['Girona', 'girona', ['girona', 'gerona']], ['Granada', 'granada', ['granada']], ['Guadalajara', 'guadalajara', ['guadalajara']],
    ['Guipúzcoa', 'guipuzcoa', ['guipuzcoa', 'gipuzkoa']], ['Huelva', 'huelva', ['huelva']], ['Huesca', 'huesca', ['huesca']],
    ['Jaén', 'jaen', ['jaen']], ['León', 'leon', ['leon']], ['Lleida', 'lleida', ['lleida', 'lerida']],
    ['Lugo', 'lugo', ['lugo']], ['Málaga', 'malaga', ['malaga']], ['Ourense', 'ourense', ['ourense', 'orense']],
    ['Palencia', 'palencia', ['palencia']], ['Las Palmas', 'las palmas', ['las palmas']],
    ['Pontevedra', 'pontevedra', ['pontevedra']], ['Salamanca', 'salamanca', ['salamanca']],
    ['Santa Cruz de Tenerife', 'santa cruz de tenerife', ['santa cruz de tenerife']], ['Segovia', 'segovia', ['segovia']],
    ['Soria', 'soria', ['soria']], ['Tarragona', 'tarragona', ['tarragona']], ['Teruel', 'teruel', ['teruel']],
    ['Toledo', 'toledo', ['toledo']], ['Valladolid', 'valladolid', ['valladolid']], ['Vizcaya', 'vizcaya', ['vizcaya', 'bizkaia']],
    ['Zamora', 'zamora', ['zamora']], ['Zaragoza', 'zaragoza', ['zaragoza']],
  ].map(([, id, aliases]) => [id, 'region', aliases]),
];

export const knownSubnationalGeographyIds = Object.freeze(territoryAliases
  .filter(([, type]) => type === 'region')
  .map(([id]) => id));

const regionCodes = new Map([
  ['ES11', 'galicia'], ['ES12', 'asturias'], ['ES13', 'cantabria'], ['ES21', 'pais vasco'], ['ES22', 'navarra'], ['ES23', 'la rioja'],
  ['ES24', 'aragon'], ['ES30', 'madrid'], ['ES41', 'castilla y leon'], ['ES42', 'castilla la mancha'], ['ES43', 'extremadura'],
  ['ES51', 'cataluna'], ['ES52', 'comunidad valenciana'], ['ES53', 'baleares'], ['ES61', 'andalucia'], ['ES62', 'murcia'],
  ['ES63', 'ceuta'], ['ES64', 'melilla'], ['ES70', 'canarias'],
]);
const countryCodes = new Map(territoryAliases.filter(([, type]) => type === 'country').map(([id]) => [id, id]));
countryCodes.set('UK', 'GB');
countryCodes.set('GR', 'EL');

const requestedTerritories = (value) => {
  // An EU mention can describe citizenship rather than the territory being
  // measured. Keep “EU citizens in Spain” scoped to Spain, not EU geography.
  let normalized = normalize(value).replace(/\b(?:ciudadania|nacionalidad|ciudadanos?|nacionales?|extranjeros?|citizenship|nationality|citizens?)\b[\s\S]{0,45}\b(?:union europea|european union|ue|eu27)\b|\b(?:union europea|european union|ue|eu27)\b[\s\S]{0,45}\b(?:ciudadania|nacionalidad|ciudadanos?|nacionales?|extranjeros?|citizenship|nationality|citizens?)\b/g, ' ');
  for (const [, type, aliases] of territoryAliases) if (type === 'country') for (const alias of aliases) {
    normalized = normalized.replaceAll(`banco de ${alias}`, ' ').replaceAll(`bank of ${alias}`, ' ');
  }
  const text = ` ${normalized} `;
  const aliasMatches = territoryAliases.flatMap((scope) => scope[2].flatMap((alias) => [alias, `${alias}s`, `${alias}es`].flatMap((term) => {
    const marker = ` ${term} `;
    const matches = [];
    let cursor = 0;
    while (true) {
      const index = text.indexOf(marker, cursor);
      if (index < 0) break;
      matches.push({ scope, start: index + 1, end: index + marker.length - 1 });
      cursor = index + 1;
    }
    return matches;
  })));
  // Prefer the longest matched territory phrase when one scope name contains
  // another (for example, León inside Castilla y León).
  const found = [...new Map(aliasMatches
    .filter((match) => !aliasMatches.some((other) => other.scope !== match.scope && other.start <= match.start && other.end >= match.end
      && (other.end - other.start) > (match.end - match.start)))
    .map(({ scope }) => [`${scope[0]}:${scope[1]}`, scope])).values()];
  const specificRegions = found.some(([, type]) => type === 'region');
  const comparative = /\b(?:versus|vs|compare|comparing|comparison|compared? (?:to|with)|frente a|comparad\w*|comparar|entre .{0,45} y )\b/.test(normalize(value));
  return specificRegions && !comparative ? found.filter(([, type]) => type !== 'country') : found;
};

const labelMatches = (scope, value) => {
  const text = ` ${normalize(value)} `;
  return scope[2].some((alias) => text.includes(` ${alias} `));
};

export const geographyScopeMatcherFor = (text) => {
  const requested = requestedTerritories(text);
  if (!requested.length) return () => true;
  return (item) => {
    const rawCode = String(item?.dimensions?.geo || '').trim().toUpperCase();
    const canonicalCountry = countryCodes.get(rawCode);
    if (canonicalCountry) return requested.some(([id, type]) => type === 'country' && id === canonicalCountry);
    if (/^EU(?:27(?:[_ -]?2020)?)?$/.test(rawCode)) return requested.some(([id]) => id === 'EU');
    const canonicalRegion = regionCodes.get(rawCode);
    if (canonicalRegion) return requested.some((scope) => scope[1] === 'region' && scope[0] === canonicalRegion);
    if (/^[A-Z]{2}[A-Z0-9]{2,}$/.test(rawCode)) return false;

    const label = item?.dimensionLabels?.geo;
    const geography = item?.geography;
    const dimension = item?.dimensions?.geo ?? item?.dimensions?.geography;
    return requested.some((scope) => [label, geography, dimension].some((value) => labelMatches(scope, value)));
  };
};

export const requestedGeographyScopes = (text) => requestedTerritories(text).map(([id, type]) => ({ id, type }));

export const observationMatchesGeographyScope = (text, item) => geographyScopeMatcherFor(text)(item);
