export const selectCurrentLegalRule = (records) => records
  .filter((item) => item?.kind === 'legal_rule')
  .sort((left, right) => Number(Boolean(right.dimensions?.currentVersion)) - Number(Boolean(left.dimensions?.currentVersion))
    || Number(right.topicScore || 0) - Number(left.topicScore || 0)
    || Number(right.score || 0) - Number(left.score || 0)
    || String(right.period || '').localeCompare(String(left.period || '')))[0];
