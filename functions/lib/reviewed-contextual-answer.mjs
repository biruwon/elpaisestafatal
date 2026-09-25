// A reviewed broad-domain answer is the deterministic contract shown during
// processing. Keep it as the terminal answer too, so optional enrichment does
// not replace the reviewed wording, scope, citations, or charts several
// seconds later with a differently composed response.
export const reviewedContextualAnswer = (model, contextual) => {
  if (model?.state === 'clarification') return undefined;
  const packetId = contextual?.result?.id;
  return typeof packetId === 'string' && packetId.startsWith('broad-') ? contextual : undefined;
};
