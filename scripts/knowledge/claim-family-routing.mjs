// Shared deterministic family routing. It identifies reusable evidence
// contracts; it never determines whether a claim is true.
export const isSpecificSemanticSignature = (signature) => {
  const parts = String(signature || '').split('|');
  const propositionParts = parts.filter((part) => /^(causal|relation|descriptive|trend|comparative|definition|legal|normative|predictive):/.test(part));
  const hasDimension = parts.some((part) => part.startsWith('entity:') || part.startsWith('geo:'));
  return parts.some((part) => part.startsWith('relation:'))
    || (parts.some((part) => part.startsWith('causal:')) && parts.filter((part) => part.startsWith('entity:')).length >= 2)
    || (parts.some((part) => part.startsWith('descriptive:')) && parts.filter((part) => part.startsWith('term:')).length >= 2)
    || (parts.some((part) => part.startsWith('descriptive:') && part.includes('+')) && parts.some((part) => part.startsWith('entity:')))
    || (parts.some((part) => part.startsWith('comparative:') && /:(more_than|less_than|ranking:(highest|lowest))/.test(part)) && parts.some((part) => part.startsWith('entity:')))
    // Registry concepts such as employment_record and health_access are
    // already structured metric families even when they contain one concept.
    // The underscore is the compiler's bounded marker for those multi-word
    // concepts; allow it without treating generic “trend:housing” as a
    // proposition contract.
    || propositionParts.some((part) => /^(?:trend|descriptive):/.test(part) && (part.includes('+') || hasDimension || /:[^:]*_[^:]*$/.test(part)))
    || propositionParts.some((part) => part.startsWith('comparative:') && hasDimension)
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
  // Comparative wording often changes the compared subject (“nadie”,
  // “Europa”, “otros países”) while preserving the metric family. Keep a
  // dimensioned metric key in addition to the full comparison key; uniqueness
  // and dominance checks still prevent unrelated rankings from becoming a
  // strong match.
  for (const part of propositionParts) {
    const match = part.match(/^comparative:([^:]+)/);
    if (match) keys.push(`${type}|${polarity}|${entities}|comparative:${match[1]}`);
  }
  // Preserve a proposition-specific subset for paraphrases that expose one
  // extra concept (for example “housing prices” versus simply “housing”).
  // These keys remain subject to the uniqueness guard in the callers, so a
  // broad topic cannot silently become a strong claim match.
  if (entities.includes('+') && propositionParts.length) {
    for (const entity of entities.split('+')) {
      for (const part of propositionParts) keys.push(`${type}|${polarity}|${entity}|${part}`);
    }
  }
  // Compound claims often add a second modifier (“compra votos con ayudas”)
  // while preserving a recognizable core proposition. Emit a core
  // proposition key for descriptive/trend payloads; uniqueness still gates
  // whether it can ever become a strong match.
  for (const part of propositionParts) {
    const match = part.match(/^(descriptive|trend):([^:]+)(?::.*)?$/);
    if (!match || !match[2].includes('+')) continue;
    for (const concept of match[2].split('+')) keys.push(`${type}|${polarity}||${match[1]}:${concept}`);
  }
  // A published family may contain one distinctive proposition while the
  // query adds another concept or omits a geography/period. Emit a
  // dimension-free key for structured multi-word payloads as well as explicit
  // compound payloads. The uniqueness guard still decides whether it can
  // authorize a strong match.
  for (const part of propositionParts) {
    const match = part.match(/^(descriptive|trend):([^:]+)(?::.*)?$/);
    if (!match) continue;
    const payloadParts = match[2].split(/[+_-]/).filter((value) => value.length >= 3);
    if (payloadParts.length >= 2 || match[2].includes('_') || part.includes(':trend:')) {
      // Keep the directional suffix in the dimension-free key. A rising
      // population family must not collide with its falling counterpart.
      keys.push(`${type}|${polarity}||${part}`);
    }
  }
  if (!propositionParts.length && terms.length >= 2) keys.push(`${type}|${polarity}|${terms.join('|')}`);
  if (fixedDiscontinuous) keys.push(`${type}|${polarity}|definition:fixed_discontinuous`);
  if (definition) keys.push(`${type}|${polarity}|${definition}`);
  return [...new Set(keys)];
};
