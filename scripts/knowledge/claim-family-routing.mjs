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
    || propositionParts.some((part) => /^(?:trend|descriptive):/.test(part) && (part.includes('+') || hasDimension || /:[^:]*_[^:]*(?::trend:[^:]+)?$/.test(part)))
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
  // Multi-word registry concepts are the compiler's structured evidence
  // vocabulary. Project them without maintaining a second allowlist; broad
  // one-word topic concepts remain confined to their full compound key.
  for (const part of propositionParts) {
    const match = part.match(/^([^:]+):([^:]+)$/);
    if (!match || !match[2].includes('+')) continue;
    for (const concept of match[2].split('+').filter((value) => /^[a-z]+_[a-z_]+$/.test(value))) {
      keys.push(`${type}|${polarity}||${match[1]}:${concept}`);
    }
  }
  // A metric can be expressed as a description or as a comparison without
  // changing the evidence contract (for example “la presión fiscal es alta”
  // versus “pagamos más impuestos”). Keep a type-neutral key for that narrow
  // case. The resolver still requires a unique/dominant published family, so
  // this cannot turn a broad topic into an arbitrary strong answer.
  for (const part of propositionParts) {
    const match = part.match(/^(descriptive|comparative):([^:]+)$/);
    if (match && ['descriptive', 'comparative', 'trend'].includes(match[1])) {
      // Entity extraction is intentionally omitted here: one surface form
      // may identify the metric as an entity while another only names it in
      // the proposition. The metric payload remains the required anchor.
      keys.push(`metric-family|${polarity}|${match[2]}`);
    }
  }
  // Comparative wording often changes the compared subject (“nadie”,
  // “Europa”, “otros países”) while preserving the metric family. Keep a
  // dimensioned metric key in addition to the full comparison key; uniqueness
  // and dominance checks still prevent unrelated rankings from becoming a
  // strong match.
  for (const part of propositionParts) {
    const match = part.match(/^comparative:([^:]+)/);
    if (match) keys.push(`${type}|${polarity}|${entities}|comparative:${match[1]}`);
    const trendMatch = part.match(/^trend:([^:]+):trend:(rising|falling|improving|worsening)$/);
    if (trendMatch && (trendMatch[1].includes('+') || trendMatch[1].includes('_'))) {
      keys.push(`metric-family|${polarity}|${trendMatch[1]}`);
    }
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
  // Do not emit one-key-per-concept fallbacks for compound metrics. They
  // collapse distinct evidence contracts such as rent and purchase prices
  // into the broad “housing” topic. A compound proposition must either
  // match its complete payload or remain related guidance.
  // A published family may contain one distinctive proposition while the
  // query adds another concept or omits a geography/period. Emit a
  // dimension-free key for structured multi-word payloads as well as explicit
  // compound payloads. The uniqueness guard still decides whether it can
  // authorize a strong match.
  for (const part of propositionParts) {
    const match = part.match(/^(descriptive|trend|comparative):([^:]+)(?::.*)?$/);
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

// Family keys with an explicit dimension-free contract are safe to use as
// reusable evidence-family anchors. The key shape is deliberately structural:
// callers do not need to maintain a second list of claim concepts every time
// a new reviewed family is added to the compiler registry.
export const isReusableSemanticFamilyKey = (key) => {
  const value = String(key || '');
  if (value.includes('||')) {
    const payload = value.split('|').at(-1) || '';
    // Dimension-free keys are reusable only when the proposition carries a
    // compound or explicitly structured payload. “trend:housing” is topic
    // context, not evidence for a housing-price claim.
    if (/^(?:descriptive|trend):[^:]+(?::trend:[^:]+)?$/.test(payload) && !payload.includes('+') && !payload.includes('_')) return false;
    return payload.includes('+') || payload.includes('_') || /^(?:causal|comparative|relation|legal|normative|predictive):/.test(payload);
  }
  if (!value.startsWith('metric-family|')) return false;
  // A metric-family key is reusable only when its payload names a compound
  // or explicitly structured concept. Generic one-word keys such as
  // “crime” and “immigration” are topic context, not evidence contracts.
  const payload = value.split('|').at(-1) || '';
  return payload.includes('+') || payload.includes('_');
};
