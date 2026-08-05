import { isSpecificSemanticSignature, semanticFamilyKeys } from './claim-family-routing.mjs';

const immigration = 'causal|polarity:positive|entity:crime|entity:immigration|causal:crime+immigration:causes:immigration:crime';
const housingTrend = 'trend|polarity:positive|entity:housing|geo:espana|period:2015|trend:housing:trend:rising';
const fixed = 'definition|polarity:positive|entity:employment|definition:employment';
const unrelated = 'descriptive|polarity:positive|entity:taxes|descriptive:taxes';

if (!isSpecificSemanticSignature(immigration) || !semanticFamilyKeys(immigration).length) throw new Error('causal family key missing');
if (!isSpecificSemanticSignature(housingTrend) || !semanticFamilyKeys(housingTrend).some((key) => key.endsWith('trend:rising'))) throw new Error('trend family key missing');
if (!isSpecificSemanticSignature(fixed) || !semanticFamilyKeys(fixed).length) throw new Error('definition family key missing');
if (isSpecificSemanticSignature(unrelated)) throw new Error('broad unrelated signature was treated as a family');

console.log('Claim-family routing contract passed.');
