import { sourcesForEvidenceIds } from './evidence-source-ids.mjs';

const stringArray = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string');
const argumentVerdicts = new Set(['supported', 'contradicted', 'mixed', 'insufficient', 'not_verifiable']);
export const publicClaimQualification = 'La evidencia no basta para confirmar toda la afirmación.';

export const requiresPublicClaimQualification = (plan, argumentsList) => {
  const breakdown = (Array.isArray(plan?.blocks) ? plan.blocks : []).find((block) => block?.type === 'claim_breakdown');
  const items = Array.isArray(breakdown?.items) ? breakdown.items : [];
  const explicit = items.flatMap((item, index) => item?.explicit === false ? [] : [breakdown.propositionIds?.[index] || `argument-${index + 1}`]);
  if (!explicit.length) return false;
  const publicById = new Map((argumentsList || []).map((argument) => [argument.id, argument]));
  if (explicit.some((id) => !publicById.has(id))) return true;
  return explicit.some((id) => {
    const argument = publicById.get(id);
    return argument.verdict !== 'supported' || !argument.evidenceIds.length || !argument.sourceIds.length;
  });
};

export const publicEvidenceLevelForArguments = (level, plan, argumentsList) => level === 'supported'
  && requiresPublicClaimQualification(plan, argumentsList)
  ? 'limited'
  : level;

const assertsUnsupportedCausalPart = (text, argumentsList) => {
  if (!(argumentsList || []).some((argument) => argument.kind === 'causal' && argument.verdict !== 'supported')) return false;
  const unqualified = text
    .replace(/\b(?:(?:no|ni|tampoco) (?:se puede|podemos|permite|permiten|mide|miden|indica|indican|demuestra|demuestran|acredita|acreditan|prueba|prueban|establece|establecen|identifica|identifican)\b|sin (?:datos|evidencia|una medici[oó]n)\b)[^.!?;,:]*(?:[.!?;,:]|$)/gi, ' ')
    .replace(/\b(?:para (?:comprobar|saber|valorar|establecer|demostrar|probar)|hace falta|faltan|se necesita|necesitamos|hay que)\b[^.!?]*(?:[.!?]|$)/gi, ' ');
  // Normalize accents before matching conjugations so Spanish forms ending in
  // accented vowels still have reliable word boundaries. Avoid broad stems:
  // “causal”, “explicación” and “problema” are not causal assertions.
  const normalizedUnqualified = unqualified.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const explicitCausalVerb = /(?:^|[^a-z])(?:caus(?:a|an|o|aron|aba|aban|aria|arian|ar|ado|ada|ados|adas|e|en)|provoc(?:a|an|o|aron|aba|aban|aria|arian|ar|ado|ada|ados|adas|e|en)|oblig(?:a|an|o|aron|aba|aban|aria|arian|ar|ado|ada|ados|adas)|empuj(?:a|an|o|aron|aba|aban|aria|arian|ar|ado|ada|ados|adas)|llev(?:a|an|o|aron|aba|aban|aria|arian|ar|ado|ada|ados|adas)\s+a|gener(?:a|an|o|aron|aba|aban|aria|arian|ar|ado|ada|ados|adas)|determin(?:a|an|o|aron|aba|aban|aria|arian|ar|ado|ada|ados|adas)|explic(?:a|an|o|aron|aba|aban|aria|arian|ar|ado|ada|ados|adas)|demostr(?:a|an|o|aron|aba|aban|aria|arian|ar|ado|ada|ados|adas)|confirm(?:a|an|o|aron|aba|aban|aria|arian|ar|ado|ada|ados|adas)|(?:prueba|prueban|probo|probaron|probaba|probaban|probaria|probarian|probar|probado|probada))(?=$|[^a-z])/i.test(normalizedUnqualified);
  const movementVerbLinkedToOutcome = /(?:^|[^a-z])(?:reduc(?:e|en|io|ieron|ia|ian|iria|irian|ir|ido|ida|idos|idas)|reduj(?:o|eron)|aument(?:a|an|o|aron|aba|aban|aria|arian|ar|ado|ada|ados|adas)|increment(?:a|an|o|aron|aba|aban|aria|arian|ar|ado|ada|ados|adas)|disminu(?:ye|yen|yo|yeron|ia|ian|iria|irian|ir|ido|ida|idos|idas)|elev(?:a|an|o|aron|aba|aban|aria|arian|ar|ado|ada|ados|adas))(?=$|[^a-z])[^.!?]{0,40}(?:ahorr\w*|pobrez\w*|paro|desemple\w*|natalidad|oferta|demanda|bienestar|emancip\w*|abandono|mortalidad|delincuenc\w*|acoso|vulnerabilidad)(?=$|[^a-z])/i.test(normalizedUnqualified);
  return explicitCausalVerb || movementVerbLinkedToOutcome;
};

export const qualifyPublicClaimReply = (reply, argumentsList = []) => {
  const text = String(reply || '').trim();
  if (!text) return publicClaimQualification;
  const directlyContradicted = argumentsList[0]?.verdict === 'contradicted'
    && argumentsList[0].evidenceIds?.length > 0
    && argumentsList[0].sourceIds?.length > 0;
  if (directlyContradicted) {
    const finding = String(argumentsList[0].finding || '').trim();
    const replyText = text.replace(/\s+/g, ' ').trim();
    const findingText = finding.replace(/\s+/g, ' ').trim();
    const sourceMeasuresAlsoShown = [...findingText.matchAll(/\b\d+(?:[,.]\d+)?\s*%/g)]
      .some(([measure]) => replyText.includes(measure));
    const measuredFinding = findingText && !replyText.includes(findingText) && !sourceMeasuresAlsoShown ? `${finding}\n\n` : '';
    return `La fuente contradice la afirmación.\n\n${measuredFinding}${text}`;
  }
  const explicitCausalLimit = /\bno (?:demuestra|demuestran|acredita|acreditan|prueba|prueban|establece|establecen) que\b[^.!?]{0,180}\b(?:caus\w*|provoqu\w*|oblig\w*|empuj\w*|lleve?\w*|gener\w*|determin\w*|explique\w*)\b/i.test(text)
    || /\bno mide\b[^.!?]{0,120}\bsi\b[^.!?]{0,100}\b(?:caus\w*|provoqu\w*|oblig\w*|empuj\w*|lleve?\w*|gener\w*|urgencias?)\b/i.test(text);
  if (explicitCausalLimit) return text;
  const coordinatedCausalLimit = /\b(?:ni|tampoco) (?:demuestra|demuestran|acredita|acreditan|prueba|prueban|establece|establecen) que\b[^.!?]{0,180}\b(?:caus\w*|provoqu\w*|oblig\w*|empuj\w*|lleve?\w*|gener\w*|determin\w*|explique\w*)\b/i.test(text);
  if (coordinatedCausalLimit) return `${publicClaimQualification}\n\n${text}`;
  if (assertsUnsupportedCausalPart(text, argumentsList)) return publicClaimQualification;
  const alreadyStatesNonConclusion = /\bno (?:se puede|permite|permiten|podemos|alcanza a)\s+(?:confirmar|descartar|demostrar|sostener|afirmar|concluir|determinar|medir|calcular|contar|comparar|establecer|atribuir|saber|evaluar)\b/i.test(text);
  const sourcedLegalExceptionAlreadyExplained = argumentsList.length === 1
    && argumentsList[0].kind === 'legal'
    && argumentsList[0].verdict === 'mixed'
    && argumentsList[0].evidenceIds?.length > 0
    && argumentsList[0].sourceIds?.length > 0
    && /\b(?:ley|norma)\b[^.!?]{0,180}\b(?:voluntari\w*|no obliga|no establece|no exige)\b/i.test(text)
    && /\b(?:convenio|excepci[oó]n|salvo que)\b/i.test(text);
  const missingEvidenceAlreadyExplained = /\b(?:no se ha localizado|no hemos localizado|no hemos encontrado)\b[^.!?]{0,120}\b(?:medici[oó]n|evidencia|datos?|fuente|respaldo)\b[^.!?]{0,120}\b(?:no demuestra|no permite|no se puede|no podemos|no alcanza|falta|pendiente)\b/i.test(text)
    || /\b(?:no se ha localizado|no hemos localizado|no hemos encontrado)\b[^.!?]{0,160}\b(?:medici[oó]n|evidencia|datos?|fuente|respaldo)\b[^.!?]*[.!?]\s*(?:esto\s+)?no demuestra que la afirmaci[oó]n sea falsa\b/i.test(text)
    || /\bpara comprobar\b[^.!?]{0,100}\b(?:hay que indicar|hace falta|se necesita)\b[^.!?]{0,120}\b(?:periodo|periodos|a[nñ]o|serie|dato|medida)\b/i.test(text);
  const explicitlyBoundsWholeClaim = /\b(?:no (?:permite|basta para) confirmar toda la afirmaci[oó]n|no demuestra toda la afirmaci[oó]n)\b/i.test(text)
    || /\b(?:la afirmaci[oó]n|la predicci[oó]n)\b[^.!?]{0,100}\bno (?:queda|est[aá]) (?:demostrad\w*|acreditad\w*|confirmad\w*)\b/i.test(text)
    || /\bno significa que (?:todas las personas|todo el mundo)\b/i.test(text);
  const contextualLimit = /\bno (?:confirma|confirman|demuestra|demuestran|prueba|prueban|mide|miden|indica|indican|informa|informan|muestra|muestran|publica|publican|compara|comparan|cuenta|identifica|identifican|incluye|desglosa|estima|representa|establece|define|separa|separan)\b|\bsolo (?:incluye|cubre|abarca)\b|\bexcluye\b|\bexcluyen\b|\bno (?:los|las|el|la)\b[^.!?]{0,80}\b(?:requisit\w*|ajuste|campo de estudios|vacantes?|denominador|evoluci[oó]n)\b/i.test(text)
    || /\bno (?:define|fija|establece)\b[^.!?]{0,100}\b(?:umbral|criterio|regla|est[aá]ndar|una tendencia)\b/i.test(text)
    || /\bsolo (?:es|son|resulta|resultan) comparables? si\b/i.test(text)
    || /\bno demuestra\b[^.!?]{0,120}\b(?:universal|a todas las personas|para todo el mundo)\b/i.test(text);
  if (alreadyStatesNonConclusion || sourcedLegalExceptionAlreadyExplained || missingEvidenceAlreadyExplained || explicitCausalLimit || explicitlyBoundsWholeClaim) return text;
  if (contextualLimit) return `${publicClaimQualification}\n\n${text}`;
  return publicClaimQualification;
};

// Keep proposition evidence and its public source attribution consistent in
// the Pages response and the local preview response. A list of clauses alone
// is not a per-clause assessment; each item needs a finding, verdict or
// explicitly linked observation before it can be shown as a fact-check.
export const publicArgumentsFromPlan = (plan) => {
  const blocks = Array.isArray(plan?.blocks) ? plan.blocks : [];
  // A claim-part reference is usable only when its evidence belongs to this
  // plan and its source can be opened from the public source list.
  const planEvidenceIds = new Set(stringArray(plan?.evidenceIds) ? plan.evidenceIds : []);
  const linkedSourceIds = new Set((Array.isArray(plan?.sourceLinks) ? plan.sourceLinks : [])
    .map((source) => source?.id).filter((id) => typeof id === 'string'));
  const planSourceIds = new Set((stringArray(plan?.sourceIds) ? plan.sourceIds : []).filter((id) => linkedSourceIds.has(id)));
  const breakdown = blocks.find((block) => block?.type === 'claim_breakdown');
  if (!Array.isArray(breakdown?.items) || !breakdown.items.length
    || !breakdown.items.every((item) => item && typeof item.text === 'string' && item.text.trim())) return [];
  const evidenceBlocks = blocks.filter((block) => block?.type === 'data_finding' || block?.type === 'confirmed');
  const evidenceByItem = breakdown.items.map((item, index) => {
    const propositionId = breakdown.propositionIds?.[index];
    const explicitEvidenceIds = stringArray(item.evidenceIds) ? item.evidenceIds.filter((id) => planEvidenceIds.has(id)) : [];
    return explicitEvidenceIds.length ? explicitEvidenceIds : evidenceBlocks
      .filter((block) => stringArray(block.propositionIds) && block.propositionIds.includes(propositionId))
      .flatMap((block) => stringArray(block.evidenceIds) ? block.evidenceIds.filter((id) => planEvidenceIds.has(id)) : []);
  });
  const everyItemHasAssessment = breakdown.items.every((item, index) => Boolean(item.verdict
    || typeof item.finding === 'string' && item.finding.trim()
    || evidenceByItem[index].length));
  if (!everyItemHasAssessment) return [];

  return breakdown.items.map((item, index) => {
    const evidenceIds = evidenceByItem[index];
    const contextSourceIds = stringArray(item.contextSourceIds)
      ? [...new Set(item.contextSourceIds.filter((id) => planSourceIds.has(id)))]
      : [];
    const relatedFamilySourceIds = (plan.evidenceSummary?.families || [])
      .filter((family) => stringArray(family.evidenceIds) && family.evidenceIds.some((id) => evidenceIds.includes(id)))
      .flatMap((family) => stringArray(family.sourceIds) ? family.sourceIds : []);
    const evidenceSourceIds = sourcesForEvidenceIds(plan, evidenceIds);
    const sourceIds = evidenceIds.length ? [...planSourceIds].filter((sourceId) => (stringArray(item.sourceIds) && item.sourceIds.includes(sourceId))
      || evidenceIds.includes(sourceId) || relatedFamilySourceIds.includes(sourceId) || evidenceSourceIds.includes(sourceId)) : [];
    const proposedVerdict = item.verdict === undefined
      ? evidenceIds.length
        ? plan.evidenceLevel === 'supported' ? 'supported' : plan.evidenceLevel === 'limited' ? 'mixed' : 'insufficient'
        : 'insufficient'
      : argumentVerdicts.has(item.verdict) ? item.verdict : 'insufficient';
    const hasTraceableEvidence = evidenceIds.length > 0 && sourceIds.length > 0;
    const verdict = !hasTraceableEvidence && ['supported', 'contradicted', 'mixed'].includes(proposedVerdict)
      ? 'insufficient'
      : proposedVerdict;
    const matchingBlock = evidenceBlocks.find((block) => stringArray(block.evidenceIds) && evidenceIds.some((id) => block.evidenceIds.includes(id)));
    const finding = hasTraceableEvidence
      ? item.finding || (matchingBlock && Array.isArray(matchingBlock.points) && matchingBlock.points.length
        ? matchingBlock.points.join(' ')
        : plan.summary || plan.headline)
      : contextSourceIds.length && typeof item.contextFinding === 'string' && item.contextFinding.trim()
        ? item.contextFinding
        : 'No se ha vinculado evidencia directa con una fuente consultable a esta parte.';

    return {
      id: breakdown.propositionIds?.[index] || `argument-${index + 1}`,
      claim: item.text,
      kind: typeof item.type === 'string' ? item.type : typeof plan.claimType === 'string' ? plan.claimType : 'specific_fact',
      verdict,
      evidenceLevel: !hasTraceableEvidence && verdict === 'insufficient'
        ? 'none'
        : item.evidenceLevel || (verdict === 'supported' ? 'strong' : verdict === 'mixed' ? 'limited' : 'none'),
      finding,
      evidenceIds,
      sourceIds,
      contextSourceIds,
      limitations: hasTraceableEvidence || contextSourceIds.length
        ? typeof plan.limitation === 'string' && plan.limitation ? [plan.limitation] : []
        : ['No hay una fuente consultable vinculada a esta parte.'],
    };
  });
};
