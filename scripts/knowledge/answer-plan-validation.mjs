const evidenceBearingBlocks = new Set([
  'key_number',
  'line_chart',
  'bar_chart',
  'comparison_chart',
  'money_flow',
  'data_finding',
  'source_excerpt',
  'confirmed',
  'cannot_conclude',
  'conversation_reply',
]);

const arrayOfStrings = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0);
const nonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const structuredItems = (value, allowedStatuses) => Array.isArray(value) && value.length > 0 && value.every((item) => item && typeof item === 'object' && nonEmptyString(item.label) && nonEmptyString(item.detail) && allowedStatuses.has(item.status));

export const validateAnswerPlan = (plan, { provisional = false } = {}) => {
  const errors = [];
  if (!plan || typeof plan !== 'object') return { ok: false, errors: ['answer plan is not an object'] };
  if (plan.schemaVersion !== '1') errors.push('unsupported schema version');
  if (typeof plan.headline !== 'string' || !plan.headline.trim()) errors.push('missing headline');
  if (typeof plan.summary !== 'string' || !plan.summary.trim()) errors.push('missing summary');
  if (!Array.isArray(plan.blocks)) errors.push('missing blocks');
  if (!arrayOfStrings(plan.evidenceIds)) errors.push('evidenceIds must be a string array');
  if (!arrayOfStrings(plan.sourceIds)) errors.push('sourceIds must be a string array');
  if (provisional && (!Array.isArray(plan.sourceLinks) || plan.sourceLinks.length === 0)) errors.push('provisional plan has no attributable source link');

  const evidenceIds = new Set(Array.isArray(plan.evidenceIds) ? plan.evidenceIds : []);
  for (const [index, block] of (Array.isArray(plan.blocks) ? plan.blocks : []).entries()) {
    if (!block || typeof block !== 'object' || typeof block.type !== 'string') {
      errors.push(`block ${index} is malformed`);
      continue;
    }
    if (evidenceBearingBlocks.has(block.type)) {
      const blockEvidenceIds = block.type === 'key_number' && !Array.isArray(block.evidenceIds) && typeof block.evidenceId === 'string'
        ? [block.evidenceId]
        : block.evidenceIds;
      if (!arrayOfStrings(blockEvidenceIds)) errors.push(`block ${index} (${block.type}) has no evidence IDs`);
      for (const id of Array.isArray(blockEvidenceIds) ? blockEvidenceIds : []) {
        if (!evidenceIds.has(id)) errors.push(`block ${index} references evidence outside plan: ${id}`);
      }
    }
    if (block.type === 'key_number' && (!block.evidenceId || !evidenceIds.has(block.evidenceId))) errors.push(`block ${index} key number is untraceable`);
    if ((block.type === 'line_chart' || block.type === 'bar_chart' || block.type === 'comparison_chart') && typeof block.visualId !== 'string') errors.push(`block ${index} chart has no visual ID`);
    if (block.type === 'conversation_reply' && (typeof block.text !== 'string' || !block.text.trim())) errors.push(`block ${index} reply is empty`);
    if (block.type === 'source_excerpt' && (!nonEmptyString(block.title) || !nonEmptyString(block.excerpt) || block.excerpt.length > 1200)) errors.push(`block ${index} source excerpt is malformed or too long`);
    if (block.type === 'strongest_valid_concern' && !nonEmptyString(block.text)) errors.push(`block ${index} concern is empty`);
    if (block.type === 'evidence_ladder' && !structuredItems(block.steps, new Set(['available', 'context', 'missing']))) errors.push(`block ${index} evidence ladder is malformed`);
    if (block.type === 'legal_decision_tree' && !structuredItems(block.items, new Set(['known', 'missing']))) errors.push(`block ${index} legal decision tree is malformed`);
    if (block.type === 'group_comparison_requirements' && !structuredItems(block.items, new Set(['available', 'check', 'missing']))) errors.push(`block ${index} group comparison is malformed`);
    if (block.type === 'prediction_conditions' && (!Array.isArray(block.items) || !block.items.length || !block.items.every((item) => item && nonEmptyString(item.label) && nonEmptyString(item.value) && ['specified', 'missing'].includes(item.status)))) errors.push(`block ${index} prediction conditions are malformed`);
    if (block.type === 'trade_offs' && (!nonEmptyString(block.principle) || !Array.isArray(block.alternatives) || block.alternatives.length < 2 || !block.alternatives.every((item) => item && nonEmptyString(item.label) && nonEmptyString(item.consequence)))) errors.push(`block ${index} trade-offs are malformed`);
  }

  for (const [index, source] of (Array.isArray(plan.sourceLinks) ? plan.sourceLinks : []).entries()) {
    if (!source || typeof source !== 'object' || typeof source.url !== 'string' || !/^https:\/\//i.test(source.url) || typeof source.title !== 'string' || !source.title.trim()) errors.push(`source link ${index} is not attributable`);
  }
  return { ok: errors.length === 0, errors };
};
