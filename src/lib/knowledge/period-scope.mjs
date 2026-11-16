const yearPattern = '(?:19|20|21)\\d{2}';
const months = new Map([
  ['enero', '01'], ['january', '01'], ['jan', '01'], ['febrero', '02'], ['february', '02'], ['feb', '02'],
  ['marzo', '03'], ['march', '03'], ['mar', '03'], ['abril', '04'], ['april', '04'], ['apr', '04'],
  ['mayo', '05'], ['may', '05'], ['junio', '06'], ['june', '06'], ['jun', '06'],
  ['julio', '07'], ['july', '07'], ['jul', '07'], ['agosto', '08'], ['august', '08'], ['aug', '08'],
  ['septiembre', '09'], ['setiembre', '09'], ['september', '09'], ['sep', '09'], ['octubre', '10'], ['october', '10'], ['oct', '10'],
  ['noviembre', '11'], ['november', '11'], ['nov', '11'], ['diciembre', '12'], ['december', '12'], ['dec', '12'],
]);
const normalizeText = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const escaped = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const exactPeriodsIn = (text) => {
  const normalized = normalizeText(text);
  const periods = new Set();
  for (const match of text.matchAll(new RegExp(`\\b(${yearPattern})[-_/ ]?([QSO])[-_/ ]?([1-4])\\b|\\b([QSO])[-_/ ]?([1-4])[-_/ ]?(${yearPattern})\\b`, 'gi'))) {
    const year = match[1] || match[6];
    const frequency = match[2] || match[4];
    const slot = match[3] || match[5];
    periods.add(`${year}-${frequency.toUpperCase()}${slot}`);
  }
  for (const match of normalized.matchAll(new RegExp(`\\b(${yearPattern})[-/](0[1-9]|1[0-2])\\b`, 'g'))) {
    periods.add(`${match[1]}-${match[2]}`);
  }
  const monthNames = [...months.keys()].sort((a, b) => b.length - a.length).map(escaped).join('|');
  for (const match of normalized.matchAll(new RegExp(`\\b(${monthNames})(?:\\s+(?:de|of))?\\s+(${yearPattern})\\b|\\b(${yearPattern})\\s+(${monthNames})\\b`, 'g'))) {
    const month = match[1] || match[4];
    const year = match[2] || match[3];
    periods.add(`${year}-${months.get(month)}`);
  }
  for (const [slot, names] of [
    ['Q1', ['first quarter', '1st quarter', 'primer trimestre']],
    ['Q2', ['second quarter', '2nd quarter', 'segundo trimestre']],
    ['Q3', ['third quarter', '3rd quarter', 'tercer trimestre']],
    ['Q4', ['fourth quarter', '4th quarter', 'cuarto trimestre']],
  ]) {
    const phrase = names.map(escaped).join('|');
    for (const match of normalized.matchAll(new RegExp(`\\b(?:${phrase})(?:\\s+(?:of|de|in|en))?\\s+(${yearPattern})\\b`, 'g'))) periods.add(`${match[1]}-${slot}`);
  }
  for (const match of normalized.matchAll(new RegExp(`\\b(?:quarter|trimestre)\\s+([1-4])(?:\\s+(?:of|de|in|en))?\\s+(${yearPattern})\\b|\\b[Qq]([1-4])\\s+(?:of|de|in|en)\\s+(${yearPattern})\\b`, 'g'))) periods.add(`${match[2] || match[4]}-Q${match[1] || match[3]}`);

  if (!periods.size) return undefined;
  const years = [...text.matchAll(new RegExp(`\\b${yearPattern}\\b`, 'g'))].map((match) => match[0]);
  const scopedYears = new Set([...periods].map((period) => period.slice(0, 4)));
  if (years.some((year) => !scopedYears.has(year))) return { kind: 'invalid' };
  if (periods.size > 1 && /\b(?:from|between|since|desde|entre|a partir de|to|through|hasta)\b/i.test(text)) return { kind: 'invalid' };
  return { kind: 'exactPeriods', periods: [...periods] };
};

const normalizedPeriod = (value) => {
  const text = String(value || '').trim().toUpperCase().replace(/[_/ ]+/g, '-');
  const quarter = text.match(/^((?:19|20|21)\d{2})-?([QSO])-?([1-4])$/);
  if (quarter) return `${quarter[1]}-${quarter[2]}${quarter[3]}`;
  const month = text.match(/^((?:19|20|21)\d{2})-?(0[1-9]|1[0-2])$/);
  if (month) return `${month[1]}-${month[2]}`;
  return text;
};

const periodScopeFor = (value) => {
  const text = String(value || '');
  const exact = exactPeriodsIn(text);
  if (exact) return exact;
  const interval = text.match(new RegExp(`\\b(?:between|entre)\\s+(${yearPattern})\\s+(?:and|y)\\s+(${yearPattern})\\b|\\b(?:from|desde|de)\\s+(${yearPattern})\\s+(?:to|through|a|hasta)\\s+(${yearPattern})\\b|\\b(${yearPattern})\\s*[-–—]\\s*(${yearPattern})\\b|\\b(${yearPattern})\\s+(?:to|through|a|hasta)\\s+(${yearPattern})\\b`, 'i'));
  if (interval) {
    const years = interval.slice(1).filter(Boolean).map(Number);
    const [minimum, maximum] = years;
    return minimum <= maximum ? { kind: 'range', minimum, maximum } : { kind: 'invalid' };
  }

  const since = text.match(new RegExp(`\\b(?:since|from|desde(?:\\s+el)?(?:\\s+a[nñ]o)?|a partir de)\\s+(${yearPattern})\\b`, 'i'));
  if (since) return { kind: 'since', minimum: Number(since[1]) };

  const until = text.match(new RegExp(`\\b(?:until|through|up to|hasta)\\s+(${yearPattern})\\b`, 'i'));
  if (until) return { kind: 'until', maximum: Number(until[1]) };

  const years = [...text.matchAll(new RegExp(`\\b${yearPattern}\\b`, 'g'))].map((match) => Number(match[0]));
  return years.length ? { kind: 'selected', years: [...new Set(years)] } : undefined;
};

const yearForPeriod = (value) => {
  const match = String(value || '').match(new RegExp(`\\b(${yearPattern})\\b`));
  return match ? Number(match[1]) : undefined;
};

export const requestedPeriodScope = periodScopeFor;

export const periodScopeMatcherFor = (text) => {
  const scope = periodScopeFor(text);
  if (!scope) return () => true;
  if (scope.kind === 'invalid') return () => false;
  if (scope.kind === 'exactPeriods') return (item) => scope.periods.includes(normalizedPeriod(item?.period));
  if (scope.kind === 'range') return (item) => {
    const year = yearForPeriod(item?.period);
    return year !== undefined && year >= scope.minimum && year <= scope.maximum;
  };
  if (scope.kind === 'since') return (item) => yearForPeriod(item?.period) >= scope.minimum;
  if (scope.kind === 'until') return (item) => yearForPeriod(item?.period) <= scope.maximum;
  return (item) => scope.years.includes(yearForPeriod(item?.period));
};

export const observationMatchesPeriodScope = (text, item) => periodScopeMatcherFor(text)(item);
