const boundedScore = (value) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(1, Number(value))) : 0;

export const validateEmbedding = (embedding, dimensions = 1024) => Array.isArray(embedding)
  && embedding.length === dimensions
  && embedding.every((value) => Number.isFinite(value));

export const reciprocalRankFusion = (lexical = [], semantic = [], { limit = 12, rankConstant = 60 } = {}) => {
  const fused = new Map();
  const add = (item, rank, channel) => {
    if (!item?.id) return;
    const current = fused.get(item.id) || { ...item, lexicalScore: 0, semanticScore: 0, fusionScore: 0, retrievalChannels: [] };
    current.fusionScore += 1 / (rankConstant + rank + 1);
    current[`${channel}Score`] = Math.max(current[`${channel}Score`] || 0, boundedScore(item.score));
    if (!current.retrievalChannels.includes(channel)) current.retrievalChannels.push(channel);
    // Prefer the richer lexical row when both channels return the same item.
    fused.set(item.id, { ...item, ...current });
  };
  lexical.forEach((item, index) => add(item, index, 'lexical'));
  semantic.forEach((item, index) => add(item, index, 'semantic'));
  return [...fused.values()]
    .filter((item) => item.lexicalScore >= 0.34 || item.semanticScore >= 0.72)
    .sort((left, right) => right.fusionScore - left.fusionScore || right.lexicalScore - left.lexicalScore || right.semanticScore - left.semanticScore)
    .slice(0, Math.max(1, limit))
    .map((item) => ({
      ...item,
      score: Math.max(item.lexicalScore, item.semanticScore),
      evidenceFit: item.lexicalScore >= 0.67 || item.semanticScore >= 0.82
        ? 'direct'
        : item.lexicalScore >= 0.5 || item.semanticScore >= 0.72 ? 'qualified' : 'weak',
    }));
};
