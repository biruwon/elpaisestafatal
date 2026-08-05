import { isSpecificSemanticSignature, semanticFamilyKeys } from './claim-family-routing.mjs';

const immigration = 'causal|polarity:positive|entity:crime|entity:immigration|causal:crime+immigration:causes:immigration:crime';
const housingTrend = 'trend|polarity:positive|entity:housing|geo:espana|period:2015|trend:housing:trend:rising';
const fixed = 'definition|polarity:positive|entity:employment|definition:employment';
const unrelated = 'descriptive|polarity:positive|entity:taxes|descriptive:taxes';

if (!isSpecificSemanticSignature(immigration) || !semanticFamilyKeys(immigration).length) throw new Error('causal family key missing');
if (!isSpecificSemanticSignature(housingTrend) || !semanticFamilyKeys(housingTrend).some((key) => key.includes('|trend:housing:trend:rising'))) throw new Error('trend family key missing');
if (!isSpecificSemanticSignature(fixed) || !semanticFamilyKeys(fixed).length) throw new Error('definition family key missing');
if (isSpecificSemanticSignature(unrelated)) throw new Error('broad unrelated signature was treated as a family');

const rent = 'trend|polarity:positive|entity:housing|geo:espana|trend:housing:trend:rising';
const prices = 'trend|polarity:positive|entity:housing|geo:espana|trend:housing+prices:trend:rising';
if (semanticFamilyKeys(rent).some((key) => semanticFamilyKeys(prices).includes(key))) throw new Error('Distinct housing metrics shared a family key');

console.log('Claim-family routing contract passed.');
