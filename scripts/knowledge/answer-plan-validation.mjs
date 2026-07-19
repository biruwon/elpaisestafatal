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
      if (!arrayOfStrings(block.evidenceIds)) errors.push(`block ${index} (${block.type}) has no evidence IDs`);
      for (const id of Array.isArray(block.evidenceIds) ? block.evidenceIds : []) {
        if (!evidenceIds.has(id)) errors.push(`block ${index} references evidence outside plan: ${id}`);
      }
    }
    if (block.type === 'key_number' && (!block.evidenceId || !evidenceIds.has(block.evidenceId))) errors.push(`block ${index} key number is untraceable`);
    if ((block.type === 'line_chart' || block.type === 'bar_chart' || block.type === 'comparison_chart') && typeof block.visualId !== 'string') errors.push(`block ${index} chart has no visual ID`);
    if (block.type === 'conversation_reply' && (typeof block.text !== 'string' || !block.text.trim())) errors.push(`block ${index} reply is empty`);
  }

  for (const [index, source] of (Array.isArray(plan.sourceLinks) ? plan.sourceLinks : []).entries()) {
    if (!source || typeof source !== 'object' || typeof source.url !== 'string' || !/^https:\/\//i.test(source.url) || typeof source.title !== 'string' || !source.title.trim()) errors.push(`source link ${index} is not attributable`);
  }
  return { ok: errors.length === 0, errors };
};

