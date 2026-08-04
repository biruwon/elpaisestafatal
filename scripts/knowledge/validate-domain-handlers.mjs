import { domainProfileFor } from './domain-handlers.mjs';

const cases = [
  ['Los inmigrantes reciben más ayudas que los españoles', 'immigration_benefits'],
  ['Los extranjeros cometen más delitos que los españoles', 'immigration_crime'],
  ['Los marroquíes reciben vivienda pública antes que los españoles', 'public_housing_allocation'],
];

for (const [input, expected] of cases) {
  const profile = domainProfileFor(input);
  if (profile?.id !== expected) throw new Error(`Domain handler mismatch for ${input}: ${profile?.id || 'none'}`);
  if (profile.needs.length < 4 || profile.sources.length < 3) throw new Error(`Domain handler is underspecified for ${expected}`);
}
if (domainProfileFor('España tiene más habitantes que Portugal')) throw new Error('Unrelated demographic comparison received an immigration domain profile');
console.log('Domain handler validation passed: immigration benefits, crime, and public-housing comparisons have explicit evidence contracts.');
