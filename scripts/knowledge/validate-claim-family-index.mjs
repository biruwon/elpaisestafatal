import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../../dist/index.html', import.meta.url), 'utf8');
const match = html.match(/<script[^>]+id="claim-index-data"[^>]*>([\s\S]*?)<\/script>/);
const failures = [];

if (!match) {
  failures.push('built homepage is missing the claim-index-data payload');
} else {
  let entries;
  try {
    entries = JSON.parse(match[1]);
  } catch (error) {
    failures.push(`claim-index-data is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  const normalise = (value) => String(value)
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const families = [
    {
      slug: 'espana-pierde-poblacion',
      prompt: 'España está perdiendo población',
      variants: ['España pierde población', 'la población está bajando', 'España se está despoblando'],
    },
    {
      slug: 'espana-envejece',
      prompt: 'España está cada vez más envejecida',
      variants: ['España envejece', 'hay cada vez más personas mayores', 'cada vez hay más jubilados'],
    },
    {
      slug: 'alquileres-suben',
      prompt: 'Los alquileres han subido en España desde 2015',
      variants: ['el alquiler ha subido', 'los alquileres son más caros', 'el alquiler está igual que en 2015'],
    },
    {
      slug: 'airbnb-vivienda',
      prompt: 'Airbnb es la causa de toda la crisis de vivienda',
      variants: ['los pisos turísticos han causado la crisis de vivienda', 'airbnb está expulsando a los vecinos'],
    },
    {
      slug: 'fijos-discontinuos',
      prompt: 'Los fijos discontinuos son parados ocultos',
      variants: ['los fijos discontinuos son parados encubiertos', 'maquillan el paro con fijos discontinuos'],
    },
    {
      slug: 'smi-destruye-empleo',
      prompt: 'Subir el salario mínimo destruyó empleo',
      variants: ['el salario mínimo destruye puestos de trabajo', 'subir el SMI provoca paro'],
    },
    {
      slug: 'economia-crece-coste-vida',
      prompt: 'La economía crece, pero la vida sigue demasiado cara',
      variants: ['la economía crece pero no se nota', 'si la economía crece por qué todo está más caro'],
    },
    {
      slug: 'riesgo-pobreza-no-desaparece',
      prompt: 'La pobreza ha desaparecido porque baja el riesgo AROPE',
      variants: ['ya no hay pobreza en España', 'el AROPE demuestra que no hay pobreza'],
    },
    {
      slug: 'inmigrantes-pensiones',
      prompt: 'Los inmigrantes pagarán nuestras pensiones',
      variants: ['los inmigrantes nos pagarán la jubilación', 'sin inmigración no hay pensiones'],
    },
    {
      slug: 'paro-historico',
      prompt: 'España tiene el paro más bajo de la historia',
      variants: ['el desempleo está en mínimos históricos', 'el paro registrado nunca fue tan bajo'],
    },
    {
      slug: 'espera-media-baja-listas-resueltas',
      prompt: 'Si baja la espera media quirúrgica, las listas ya están resueltas',
      variants: ['baja la espera media sanidad resuelta', 'menos días de espera significa que no hay lista'],
    },
    {
      slug: 'fondos-vivienda',
      prompt: 'Los fondos de inversión causan la crisis de vivienda',
      variants: ['fondos buitre', 'Blackstone causa la crisis'],
    },
    {
      slug: 'construir-vivienda',
      prompt: 'Basta con construir más vivienda',
      variants: ['hay que construir más casas', 'más oferta de vivienda'],
    },
    {
      slug: 'empleo-record-calidad',
      prompt: 'Tener más personas ocupadas demuestra que todo el empleo es de calidad',
      variants: ['más empleo significa buen empleo', 'más ocupados mejor trabajo'],
    },
    {
      slug: 'cibercriminalidad-crece',
      prompt: 'La cibercriminalidad crece más que la delincuencia convencional',
      variants: ['delincuencia digital crece', 'fraude online aumenta'],
    },
    {
      slug: 'espana-pobreza-cuarta-parte',
      prompt: 'Uno de cada cuatro españoles vive en pobreza',
      variants: ['una de cada cuatro personas pobreza', 'AROPE una de cada cuatro'],
    },
    {
      slug: 'politica-no-es-mayoria',
      prompt: 'La política es la preocupación de la mayoría de españoles',
      variants: ['la mayoría está preocupada por la política', 'política principal problema mayoría'],
    },
    {
      slug: 'precio-vivienda-caera',
      prompt: 'La vivienda acabará cayendo como en 2008',
      variants: ['la vivienda va a caer como en 2008', 'otra burbuja inmobiliaria'],
    },
    {
      slug: 'reforma-precariedad',
      prompt: 'La reforma laboral acabó con la precariedad',
      variants: ['la reforma laboral terminó con la precariedad', 'ya no hay contratos precarios'],
    },
    {
      slug: 'record-empleo-no-resuelve-paro',
      prompt: 'Un récord de ocupación significa que el paro ya está resuelto',
      variants: ['récord de empleo significa pleno empleo', 'el paro está resuelto'],
    },
    {
      slug: 'juventud-emancipacion',
      prompt: 'Casi la mitad de las personas de 26 a 34 años sigue viviendo con sus padres',
      variants: ['jóvenes viven con sus padres', 'la mitad de los jóvenes no se emancipa'],
    },
    {
      slug: 'politicos-corruptos',
      prompt: 'Todos los políticos son corruptos',
      variants: ['todos los políticos roban', 'la política está llena de corruptos'],
    },
    {
      slug: 'recaudacion-no-factura-hogar',
      prompt: 'Si la recaudación tributaria sube un 10,4%, todos pagan un 10,4% más',
      variants: ['todos pagan un 10,4% más', 'Hacienda sube los impuestos a todos'],
    },
    {
      slug: 'arope-no-es-pobreza-absoluta',
      prompt: 'El AROPE mide pobreza absoluta',
      variants: ['AROPE es pobreza absoluta', 'AROPE significa indigencia'],
    },
    {
      slug: 'espana-recesion',
      prompt: 'España está en recesión',
      variants: ['la economía española está en recesión', 'España ya está en recesión'],
    },
    {
      slug: 'demasiados-graduados',
      prompt: 'España tiene demasiados universitarios',
      variants: ['hay demasiados universitarios', 'sobran graduados'],
    },
    {
      slug: 'subida-vivienda-no-todas-igual',
      prompt: 'Si la vivienda sube un 12,9%, todas las casas suben lo mismo',
      variants: ['todas las casas suben un 12,9%', '12,9% en cada vivienda'],
    },
    {
      slug: 'inmigracion-flujos-no-total',
      prompt: 'Las llegadas irregulares representan toda la inmigración que vive en España',
      variants: ['las pateras son toda la inmigración', 'todos los inmigrantes llegan irregularmente'],
    },
    {
      slug: 'recaudacion-tributaria-crece',
      prompt: 'La recaudación tributaria bajó en 2025',
      variants: ['Hacienda recauda menos', 'los ingresos tributarios bajaron'],
    },
  ];

  const publishedClaims = (entries || []).filter((entry) => entry.kind === 'claim');
  const exactOwners = new Map();
  for (const entry of publishedClaims) {
    for (const value of [entry.title, ...(entry.aliases || [])]) {
      const key = normalise(value);
      if (!key) continue;
      const owners = exactOwners.get(key) || [];
      if (!owners.includes(entry.slug)) owners.push(entry.slug);
      exactOwners.set(key, owners);
    }
  }

  for (const family of families) {
    const entry = publishedClaims.find((candidate) => candidate.slug === family.slug);
    if (!entry) {
      failures.push(`${family.slug}: missing published claim-index entry`);
      continue;
    }
    if (!entry.title || !entry.href || !Array.isArray(entry.aliases) || !entry.aliases.length) {
      failures.push(`${family.slug}: index entry is missing title, href, or aliases`);
    }
    const canonicalKey = normalise(family.prompt);
    const canonicalMatches = [normalise(entry.title), ...(entry.aliases || []).map(normalise)];
    if (!canonicalMatches.includes(canonicalKey)) failures.push(`${family.slug}: canonical prompt is not searchable in the built index`);
    const owners = exactOwners.get(canonicalKey) || [];
    if (owners.length !== 1 || owners[0] !== family.slug) failures.push(`${family.slug}: canonical prompt has ambiguous index ownership (${owners.join(', ') || 'none'})`);
    for (const variant of family.variants) {
      const variantKey = normalise(variant);
      const matched = [entry.title, ...(entry.aliases || [])].some((value) => {
        const key = normalise(value);
        return key === variantKey || key.includes(variantKey) || variantKey.includes(key);
      });
      if (!matched) failures.push(`${family.slug}: representative variant is not present in aliases (${variant})`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Claim-family index validation passed: representative published families have unique canonical and variant routing coverage.');
