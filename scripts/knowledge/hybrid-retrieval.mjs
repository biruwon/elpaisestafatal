const boundedScore = (value) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(1, Number(value))) : 0;

export const validateEmbedding = (embedding, dimensions = 1024) => Array.isArray(embedding)
  && embedding.length === dimensions
  && embedding.every((value) => Number.isFinite(value));

const metricsConflict = (left, right) => Boolean(left?.id && right?.id && (
  left.notEquivalentTo?.includes(right.id) || right.notEquivalentTo?.includes(left.id)
));

export const resolveMetricConflict = (lexical = [], semantic = [], { semanticThreshold = 0.42, semanticMargin = 0.02 } = {}) => {
  const lexicalTop = lexical[0];
  const semanticTop = semantic[0];
  if (!metricsConflict(lexicalTop, semanticTop)) return { lexical, semantic, winner: null, preferredId: null };
  const margin = Number(semanticTop.score || 0) - Number(semantic[1]?.score || 0);
  if (Number(semanticTop.score || 0) >= semanticThreshold && margin >= semanticMargin) {
    return { lexical: lexical.filter((item) => item.id !== lexicalTop.id), semantic, winner: 'semantic', preferredId: semanticTop.id };
  }
  return { lexical, semantic: semantic.filter((item) => item.id !== semanticTop.id), winner: 'lexical', preferredId: lexicalTop.id };
};

export const reciprocalRankFusion = (lexical = [], semantic = [], { limit = 12, rankConstant = 60, semanticWeight = 1.05, preferredId = null } = {}) => {
  const fused = new Map();
  const add = (item, rank, channel) => {
    if (!item?.id) return;
    const current = fused.get(item.id) || { ...item, lexicalScore: 0, semanticScore: 0, fusionScore: 0, retrievalChannels: [] };
    current.fusionScore += (channel === 'semantic' ? semanticWeight : 1) / (rankConstant + rank + 1);
    current[`${channel}Score`] = Math.max(current[`${channel}Score`] || 0, boundedScore(item.score));
    if (!current.retrievalChannels.includes(channel)) current.retrievalChannels.push(channel);
    // Prefer the richer lexical row when both channels return the same item.
    fused.set(item.id, { ...item, ...current });
  };
  lexical.forEach((item, index) => add(item, index, 'lexical'));
  semantic.forEach((item, index) => add(item, index, 'semantic'));
  return [...fused.values()]
    .filter((item) => item.lexicalScore >= 0.34 || item.semanticScore >= 0.42)
    .sort((left, right) => Number(right.id === preferredId) - Number(left.id === preferredId) || right.fusionScore - left.fusionScore || right.lexicalScore - left.lexicalScore || right.semanticScore - left.semanticScore)
    .slice(0, Math.max(1, limit))
    .map((item) => ({
      ...item,
      score: Math.max(item.lexicalScore, item.semanticScore),
      evidenceFit: item.lexicalScore >= 0.67 || item.semanticScore >= 0.55
        ? 'direct'
        : item.lexicalScore >= 0.5 || item.semanticScore >= 0.42 ? 'qualified' : 'weak',
    }));
};
