import { domainProfileFor } from './domain-handlers.mjs';

const cases = [
  ['Los inmigrantes reciben más ayudas que los españoles', 'immigration_benefits'],
  ['Los extranjeros cometen más delitos que los españoles', 'immigration_crime'],
  ['Los marroquíes reciben vivienda pública antes que los españoles', 'public_housing_allocation'],
  ['¿Puede la policía sacar a alguien que ocupa una vivienda ajena?', 'illegal_occupation'],
  ['Tras la ley de libertad sexual hubo rebajas de penas; ¿demuestra eso un empeoramiento general de la protección?', 'sexual_consent_law_effects'],
  ['¿Se aplica la misma presunción de inocencia a hombres acusados de violencia machista?', 'gender_law_evidence_standard'],
  ['¿Qué impacto puede tener el calendario nuclear en el coste y la fiabilidad del suministro?', 'nuclear_phaseout'],
  ['¿Cuánto dinero se ahorraría realmente si se transfirieran las competencias autonómicas al Estado?', 'autonomous_competence_savings'],
  ['¿La acogida de menores migrantes cuesta 4.000 euros mensuales por cabeza?', 'migrant_minor_accommodation_cost'],
  ['¿Es inconstitucional la amnistía del procés por dar un trato desigual?', 'amnesty_constitution'],
  ['¿Las familias sin nacionalidad española tienen preferencia en las listas de vivienda protegida?', 'public_housing_allocation'],
];

for (const [input, expected] of cases) {
  const profile = domainProfileFor(input);
  if (profile?.id !== expected) throw new Error(`Domain handler mismatch for ${input}: ${profile?.id || 'none'}`);
  if (profile.needs.length < 4 || profile.sources.length < 2) throw new Error(`Domain handler is underspecified for ${expected}`);
}
if (domainProfileFor('España tiene más habitantes que Portugal')) throw new Error('Unrelated demographic comparison received an immigration domain profile');
for (const [input, excluded] of [
  ['¿Aumentaron las condenas por delitos sexuales el año pasado?', 'sexual_consent_law_effects'],
  ['¿Cuál es la presunción de inocencia de cualquier persona acusada?', 'gender_law_evidence_standard'],
  ['¿Qué precio tiene la electricidad generada con energía nuclear?', 'nuclear_phaseout'],
  ['¿Cuánto cuesta en total la Administración pública?', 'autonomous_competence_savings'],
]) {
  if (domainProfileFor(input)?.id === excluded) throw new Error(`Unrelated wording cross-routed to ${excluded}: ${input}`);
}
console.log(`Domain handler validation passed: ${cases.length} evidence profiles and four near-neighbor routing controls.`);
