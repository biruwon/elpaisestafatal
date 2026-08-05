// Shared deterministic family routing. It identifies reusable evidence
// contracts; it never determines whether a claim is true.
export const isSpecificSemanticSignature = (signature) => {
  const parts = String(signature || '').split('|');
  return parts.some((part) => part.startsWith('relation:'))
    || (parts.some((part) => part.startsWith('causal:')) && parts.filter((part) => part.startsWith('entity:')).length >= 2)
    || (parts.some((part) => part.startsWith('descriptive:')) && parts.filter((part) => part.startsWith('term:')).length >= 2)
    || (parts.some((part) => part.startsWith('descriptive:') && part.includes('+')) && parts.some((part) => part.startsWith('entity:')))
    || (parts.some((part) => part.startsWith('comparative:') && /:(more_than|less_than|ranking:(highest|lowest))/.test(part)) && parts.some((part) => part.startsWith('entity:')))
    || (parts.some((part) => part.startsWith('trend:') && /:trend:(rising|falling|stable)$/.test(part)) && parts.some((part) => part.startsWith('entity:')))
    || (parts.some((part) => part.startsWith('definition:')) && parts.some((part) => part.startsWith('entity:')))
    || parts.includes('definition:fixed_discontinuous')
    || parts.filter((part) => part.startsWith('concept:')).length >= 2
    || parts.filter((part) => part.startsWith('term:')).length >= 2;
};

export const semanticFamilyKeys = (signature) => {
  const parts = String(signature || '').split('|').filter(Boolean);
  const type = parts[0] || '';
  const polarity = parts.find((part) => part.startsWith('polarity:')) || '';
  const entities = parts.filter((part) => part.startsWith('entity:')).sort().join('+');
  const relation = parts.find((part) => /^(causal|relation):/.test(part)) || '';
  const definition = parts.find((part) => part === 'definition:fixed_discontinuous');
  if (!type || (!entities && !relation && !definition)) return [];
  const keys = [`${type}|${polarity}|${entities}|${relation.split(':')[0]}`];
  if (definition) keys.push(`${type}|${polarity}|${definition}`);
  for (const part of parts.filter((item) => /^(descriptive|trend|comparative|definition):/.test(item))) {
    const [kind, ...rest] = part.split(':');
    const value = rest.join(':');
    if (kind === 'trend') {
      const direction = value.match(/trend:(rising|falling|stable)$/)?.[1];
      if (direction) keys.push(`${type}|${polarity}|${entities}|trend:${direction}`);
    } else if (kind === 'definition') {
      keys.push(`${type}|${polarity}|${entities}|definition:${value}`);
    } else if (kind === 'comparative') {
      const direction = value.match(/ranking:(highest|lowest|more|less)|:(more_than|less_than):/)?.[1] || value.match(/:(more_than|less_than):/)?.[1];
      const concept = value.split(':')[0];
      if (concept && direction) keys.push(`${type}|${polarity}|${entities}|${kind}:${concept}:${direction}`);
    } else if (kind === 'descriptive' && value.length >= 5) {
      keys.push(`${type}|${polarity}|${entities}|descriptive:${value.split(':')[0]}`);
    }
  }
  return [...new Set(keys)];
};
