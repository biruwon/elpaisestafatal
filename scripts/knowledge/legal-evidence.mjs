const textOf = (item) => `${item?.metric || ''} ${item?.excerpt || ''} ${JSON.stringify(item?.dimensions || {})}`.toLocaleLowerCase('es');

export const legalEvidenceProfile = (records = []) => {
  const rules = records.filter((item) => item?.kind === 'legal_rule');
  const current = rules.some((item) => item.dimensions?.currentVersion === true || item.dimensions?.currentVersion === 'true');
  const effectiveDate = rules.some((item) => item.dimensions?.effectiveFrom || item.period);
  const procedure = records.some((item) => /procedimiento|plazo|autoridad|solicitud|juicio|registro|tribunal/i.test(textOf(item)));
  const exceptions = records.some((item) => /excepci[oó]n|salvo|excepto|l[ií]mite|transitoria|recurso/i.test(textOf(item)));
  return { hasRule: rules.length > 0, current, effectiveDate, procedure, exceptions, sufficientForGeneralRule: rules.length > 0 && current };
};

export const legalEvidenceSteps = (profile) => [
  { label: 'Norma aplicable', status: profile.hasRule ? 'known' : 'missing' },
  { label: 'Vigencia y fecha', status: profile.current && profile.effectiveDate ? 'known' : 'missing' },
  { label: 'Procedimiento y autoridad', status: profile.procedure ? 'known' : 'missing' },
  { label: 'Excepciones y recursos', status: profile.exceptions ? 'known' : 'missing' },
  { label: 'Aplicación al caso', status: 'missing' },
];
