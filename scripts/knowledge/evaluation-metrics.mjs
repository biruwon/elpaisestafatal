const strings = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim());
const validHttpsSource = (source) => typeof source?.id === 'string' && source.id.trim() && /^https:\/\//i.test(String(source.url || ''));
const appendArray = (target, value) => { if (Array.isArray(value)) target.push(...value.filter((item) => typeof item === 'string')); };

const planTraceability = (plan) => {
  const blocks = Array.isArray(plan.blocks) ? plan.blocks : [];
  const evidenceIds = new Set(Array.isArray(plan.evidenceIds) ? plan.evidenceIds : []);
  const sourceLinks = Array.isArray(plan.sourceLinks) ? plan.sourceLinks : [];
  const linkedSourceIds = new Set(sourceLinks.filter(validHttpsSource).map((source) => source.id));
  const planSourceIds = new Set(Array.isArray(plan.sourceIds) ? plan.sourceIds : []);
  const evidenceRefs = [];
  const sourceRefs = [];
  let hasBreakdown = false;
  let untraceableProposition = false;

  for (const block of blocks) {
    appendArray(evidenceRefs, block?.evidenceIds);
    if (typeof block?.evidenceId === 'string') evidenceRefs.push(block.evidenceId);
    appendArray(sourceRefs, block?.sourceIds);
    if (block?.type === 'claim_breakdown' && Array.isArray(block.items)) {
      hasBreakdown = true;
      for (const item of block.items) {
        if (item?.explicit === false) continue;
        appendArray(evidenceRefs, item?.evidenceIds);
        appendArray(sourceRefs, item?.sourceIds);
        if (['supported', 'contradicted', 'mixed'].includes(item?.verdict)
          && (!strings(item.evidenceIds) || item.evidenceIds.length === 0 || !strings(item.sourceIds) || item.sourceIds.length === 0)) {
          untraceableProposition = true;
        }
      }
    }
    if (block?.type === 'scorecard' && Array.isArray(block.items)) {
      for (const item of block.items) appendArray(evidenceRefs, item?.evidenceIds);
    }
    if (block?.type === 'event_status' && Array.isArray(block.propositions)) {
      for (const item of block.propositions) appendArray(evidenceRefs, item?.evidenceIds);
    }
  }

  appendArray(sourceRefs, plan.shareableSourceIds);
  for (const family of plan.evidenceSummary?.families || []) {
    appendArray(evidenceRefs, family?.evidenceIds);
    appendArray(sourceRefs, family?.sourceIds);
    for (const criterion of family?.criteria || []) {
      appendArray(evidenceRefs, criterion?.evidenceIds);
      appendArray(sourceRefs, criterion?.sourceIds);
    }
  }
  for (const visual of [plan.visual, ...(Array.isArray(plan.visuals) ? plan.visuals : [])].filter(Boolean)) {
    appendArray(evidenceRefs, visual.evidenceIds);
    if (typeof visual.sourceId === 'string') sourceRefs.push(visual.sourceId);
  }

  const supportedWithoutEvidence = plan.evidenceLevel === 'supported' && (!evidenceRefs.length || !sourceRefs.length);
  const evidenceWithoutSource = evidenceRefs.length > 0 && sourceRefs.length === 0;
  const referencesExist = evidenceRefs.every((id) => evidenceIds.has(id));
  const sourceReferencesExist = sourceRefs.every((id) => planSourceIds.has(id) && linkedSourceIds.has(id));
  const allLinksSecure = sourceLinks.every(validHttpsSource);
  const checked = evidenceRefs.length > 0 || sourceRefs.length > 0 || hasBreakdown || plan.evidenceLevel === 'supported';
  return { checked, passed: referencesExist && sourceReferencesExist && allLinksSecure && !supportedWithoutEvidence && !evidenceWithoutSource && !untraceableProposition, issues: [] };
};

const publicCheckTraceability = (response) => {
  const check = response.result;
  const sources = Array.isArray(check.sources) ? check.sources : [];
  const validSources = sources.filter(validHttpsSource);
  const sourceIds = new Set(validSources.map((source) => source.id));
  const evidenceRefs = [];
  const sourceRefs = [];
  const issues = [];

  for (const argument of check.arguments || []) {
    appendArray(evidenceRefs, argument?.evidenceIds);
    appendArray(sourceRefs, argument?.sourceIds);
    if (['supported', 'contradicted', 'mixed'].includes(argument?.verdict)
      && (!strings(argument.evidenceIds) || argument.evidenceIds.length === 0 || !strings(argument.sourceIds) || argument.sourceIds.length === 0)) {
      issues.push(`claim part ${argument?.id || 'unknown'} has a verdict without evidence and source IDs`);
    }
  }
  for (const criterion of check.criteria || []) appendArray(sourceRefs, criterion?.sourceIds);
  appendArray(sourceRefs, check.shareableSourceIds);
  for (const family of check.evidenceSummary?.families || []) {
    appendArray(evidenceRefs, family?.evidenceIds);
    appendArray(sourceRefs, family?.sourceIds);
    if (Array.isArray(family?.data) && family.data.length
      && (!strings(family.evidenceIds) || family.evidenceIds.length === 0 || !strings(family.sourceIds) || family.sourceIds.length === 0)) {
      issues.push(`evidence family ${family?.familyId || family?.label || 'unknown'} has data without evidence and source IDs`);
    }
    for (const criterion of family?.criteria || []) {
      appendArray(evidenceRefs, criterion?.evidenceIds);
      appendArray(sourceRefs, criterion?.sourceIds);
      if (Array.isArray(criterion?.data) && criterion.data.length
        && (!strings(criterion.evidenceIds) || criterion.evidenceIds.length === 0 || !strings(criterion.sourceIds) || criterion.sourceIds.length === 0)) {
        issues.push(`evidence criterion ${criterion?.id || criterion?.label || 'unknown'} has data without evidence and source IDs`);
      }
    }
  }
  for (const visual of [check.visual, ...(Array.isArray(check.visuals) ? check.visuals : [])].filter(Boolean)) {
    appendArray(evidenceRefs, visual.evidenceIds);
    if (typeof visual.sourceId === 'string') sourceRefs.push(visual.sourceId);
  }
  for (const item of check.scorecard?.items || []) {
    for (const source of item.sources || []) if (typeof source?.id === 'string') sourceRefs.push(source.id);
  }

  if (sources.some((source) => !validHttpsSource(source))) issues.push('a source link is missing an ID or HTTPS URL');
  if (sourceRefs.some((id) => !sourceIds.has(id))) issues.push('a cited source ID has no matching secure source link');
  if (evidenceRefs.length > 0 && sourceRefs.length === 0) issues.push('evidence IDs are present without a cited source');
  if ((response.state === 'supported' || check.evidenceLevel === 'supported') && sourceRefs.length === 0) issues.push('a supported answer has no cited source');
  const checked = ['supported', 'limited', 'insufficient'].includes(response.state)
    || evidenceRefs.length > 0 || sourceRefs.length > 0;
  return { checked, passed: issues.length === 0, issues };
};

export const traceabilityFor = (response) => {
  const payload = response?.result;
  if (payload && Array.isArray(payload.blocks)) return planTraceability(payload);
  if (payload && Array.isArray(payload.sources) && ['supported', 'limited', 'insufficient'].includes(response?.state)) {
    return publicCheckTraceability(response);
  }
  return { checked: false, passed: true, issues: [] };
};

export const evaluateOutcome = ({ item, result, latencyMs }) => {
  const claims = Array.isArray(result?.relatedClaims) ? result.relatedClaims : [];
  // The public resolver exposes the selected reviewed claim in `primary`;
  // older fixture responses used `relatedClaims`.  Evaluate the shared
  // contract, not one transport representation, so corpus results are not
  // falsely reported as misses when the browser/Pages payload is valid.
  const primarySlug = result?.primary?.slug || claims[0]?.slug;
  const known = item.expected.status === 'known';
  const safeScorecard = item.expected.status === 'unknown'
    && result?.status === 'complete'
    && result?.result?.answerMode === 'scorecard'
    && claims.length === 0;
  const safeRelatedContext = item.expected.status === 'unknown'
    && result?.status === 'related'
    && claims.length === 0
    && !result?.primary?.slug;
  const irrelevantMatch = item.expected.status === 'unknown' && (claims.length > 0 || Boolean(result?.primary?.slug));
  const knownPass = !known || primarySlug === item.expected.slug;
  const unknownPass = item.expected.status !== 'unknown' || safeScorecard || safeRelatedContext || (['uncovered', 'draft'].includes(result?.status) && !irrelevantMatch);
  const traceability = traceabilityFor(result);
  const breakdown = Array.isArray(result?.result?.blocks) && result.result.blocks.some((block) => block.type === 'claim_breakdown');
  return {
    id: item.id,
    expected: item.expected,
    status: result?.status || 'error',
    primarySlug,
    knownPass,
    unknownPass,
    irrelevantMatch,
    traceabilityChecked: traceability.checked,
    traceabilityPass: traceability.passed,
    propositionBreakdown: breakdown,
    coverage: result?.result?.coverage || result?.status || 'unknown',
    latencyMs,
  };
};
