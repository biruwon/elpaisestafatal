const decodeXml = (value) => String(value || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replaceAll('&quot;', '"')
  .replaceAll('&apos;', "'")
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>')
  .replaceAll('&amp;', '&');

const attributes = (value) => Object.fromEntries([...String(value || '').matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [match[1], decodeXml(match[2])]));
const plainText = (value) => decodeXml(String(value || '').replace(/<blockquote[\s\S]*?<\/blockquote>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const isoDate = (value) => /^\d{8}$/.test(String(value || '')) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value || undefined;

const normalizeBlockMatch = (blockMatch, source) => {
  if (!blockMatch) return [];
  const block = attributes(blockMatch[1]);
  if (!block.id || !block.titulo) return [];
  const versions = [...blockMatch[2].matchAll(/<version\s+([^>]*)>([\s\S]*?)<\/version>/gi)].map((match) => ({ attributes: attributes(match[1]), text: plainText(match[2]) })).filter((version) => version.attributes.fecha_vigencia && version.text);
  const ordered = versions.sort((left, right) => String(left.attributes.fecha_vigencia).localeCompare(String(right.attributes.fecha_vigencia)));
  return ordered.map((version, index) => {
    const next = ordered[index + 1];
    const effectiveFrom = isoDate(version.attributes.fecha_vigencia);
    return {
      id: `${source.id}-legal-rule-${block.id}-${version.attributes.fecha_vigencia}`,
      kind: 'legal_rule',
      sourceId: source.id,
      metricId: source.metricId || 'official_publication',
      datasetId: source.title,
      metric: block.titulo,
      value: null,
      period: effectiveFrom,
      excerpt: version.text.slice(0, 6000),
      url: source.url,
      dimensions: {
        blockId: block.id,
        blockType: block.tipo,
        sourceNormId: version.attributes.id_norma,
        publishedAt: isoDate(version.attributes.fecha_publicacion),
        effectiveFrom,
        validTo: next ? isoDate(next.attributes.fecha_vigencia) : null,
        currentVersion: index === ordered.length - 1,
        consolidatedTextIsInformational: true,
      },
    };
  });
};

export const normalizeBoeLegalBlock = (xml, source) => normalizeBlockMatch(String(xml || '').match(/<bloque\s+([^>]*)>([\s\S]*?)<\/bloque>/i), source);

export const normalizeBoeLegalText = (xml, source) => [...String(xml || '').matchAll(/<bloque\s+([^>]*)>([\s\S]*?)<\/bloque>/gi)].flatMap((match) => normalizeBlockMatch(match, source));

export const normalizeXmlPayload = (xml, source) => normalizeBoeLegalText(xml, source);
