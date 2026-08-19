export const criteriaProfiles = [
  { id: 'democratic-power', definition: 'whether a person or government exercises unchecked dictatorial or authoritarian power', kinds: ['definition', 'descriptive', 'normative'] },
  { id: 'public-corruption', definition: 'whether public or influential actors unlawfully take money or benefit from their position', kinds: ['allegation', 'descriptive', 'mixed'] },
  { id: 'specific-allegation', definition: 'whether an identified person or institution committed a concrete unlawful act', kinds: ['allegation', 'specific_fact', 'descriptive'] },
  { id: 'performance-judgment', definition: 'whether a positive or negative evaluation is supported by explicit criteria and comparable indicators', kinds: ['evaluative', 'comparative', 'mixed'] },
  { id: 'quantitative-measure', definition: 'whether a numerical claim matches a defined metric, population, period and denominator', kinds: ['quantitative', 'trend', 'comparative'] },
  { id: 'causal-effect', definition: 'whether one event, decision or condition caused an observed outcome', kinds: ['causal'] },
];

export const profileText = (profile) => `${profile.id}: ${profile.definition}`;
