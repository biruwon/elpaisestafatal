const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const validatePromotionRequest = ({ selector, canonical, slug, approved, claim }) => {
  const errors = [];
  if (!selector || (selector.id && selector.signature) || (!selector.id && !selector.signature)) errors.push('Provide exactly one cluster selector: id or signature.');
  if (!canonical || canonical.trim().length < 8) errors.push('A neutral canonical wording of at least 8 characters is required.');
  if (canonical && canonical.length > 240) errors.push('Canonical wording must be 240 characters or fewer.');
  if (!slugPattern.test(slug || '')) errors.push('Claim slug must contain only lowercase letters, numbers, and hyphens.');
  if (approved !== true) errors.push('Promotion requires explicit --approved.');
  if (!claim) errors.push('The linked claim was not found.');
  if (claim && (claim.slug !== slug || claim.status !== 'published')) errors.push('The linked claim must exist and be published.');
  return errors;
};

export const sqlQuote = (value) => `'${String(value).replaceAll("'", "''")}'`;

export const buildPromotionSql = ({ selector, canonical, slug }) => {
  const where = selector.id ? `id = ${sqlQuote(selector.id)}` : `canonical_signature = ${sqlQuote(selector.signature)}`;
  return `UPDATE query_clusters SET canonical_text = ${sqlQuote(canonical.trim())}, linked_claim_slug = ${sqlQuote(slug)}, coverage_status = 'covered', review_status = 'published' WHERE ${where} AND coverage_status IN ('complete', 'covered');`;
};
