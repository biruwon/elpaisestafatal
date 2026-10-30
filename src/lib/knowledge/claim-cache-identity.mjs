// Only byte-for-byte equivalent user claims, after Unicode composition and
// surrounding whitespace, may share claim-specific jobs or model output.
// Semantic signatures are useful for discovery, not safe answer-cache keys.
export const claimCacheIdentity = (text) => String(text || '').normalize('NFC').trim();
