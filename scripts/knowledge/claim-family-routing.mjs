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
    || parts.some((part) => /^(legal|normative|predictive):/.test(part))
    || parts.filter((part) => part.startsWith('term:')).length >= 2;
};

export const semanticFamilyKeys = (signature) => {
  const parts = String(signature || '').split('|').filter(Boolean);
  const type = parts[0] || '';
  const polarity = parts.find((part) => part.startsWith('polarity:')) || '';
  const entities = parts.filter((part) => part.startsWith('entity:')).sort().join('+');
  const fixedDiscontinuous = parts.some((part) => part.includes('fixed_discontinuous'));
  const definition = parts.find((part) => part === 'definition:fixed_discontinuous');
  const propositionParts = parts.filter((part) => /^(causal|relation|descriptive|trend|comparative|definition|legal|normative|predictive):/.test(part));
  const terms = parts.filter((part) => part.startsWith('term:')).sort();
  if (!type || (!entities && !propositionParts.length && !definition && !fixedDiscontinuous && terms.length < 2)) return [];
  // A family key must retain the proposition's normalized concept and
  // direction. Entity-only keys are unsafe: rent, purchase prices, and
  // housing-cost burden can all otherwise collapse into “housing + rising”.
  const keys = propositionParts.map((part) => `${type}|${polarity}|${entities}|${part}`);
  if (!propositionParts.length && terms.length >= 2) keys.push(`${type}|${polarity}|${terms.join('|')}`);
  if (fixedDiscontinuous) keys.push(`${type}|${polarity}|definition:fixed_discontinuous`);
  if (definition) keys.push(`${type}|${polarity}|${definition}`);
  return [...new Set(keys)];
};
