export const selectCurrentLegalRule = (records) => records
  .filter((item) => item?.kind === 'legal_rule')
  .sort((left, right) => Number(Boolean(right.dimensions?.currentVersion)) - Number(Boolean(left.dimensions?.currentVersion)) || String(right.period || '').localeCompare(String(left.period || '')))[0];
