import { deterministicFallbackCompiler, propositionShapeFor } from './fallback-compiler.mjs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };

const causal = deterministicFallbackCompiler('Los inmigrantes crean inseguridad en España');
const equivalentCausal = deterministicFallbackCompiler('La inmigración aumenta la delincuencia en España');
assert(causal.claimType === 'causal', 'Causal claim type was not detected');
assert(causal.semanticSignature === equivalentCausal.semanticSignature, 'Equivalent causal wording did not receive the same semantic signature');
for (const paraphrase of [
  'Los migrantes hacen que aumenten los delitos en España',
  'La llegada de extranjeros vuelve inseguro a España',
  'Con más inmigración hay más delitos en España',
  'Desde que hay más inmigración, hay más delitos en España',
  'Cuanto más inmigración, más delitos en España',
  'La inmigración está detrás del aumento de la delincuencia en España',
  'La inmigración está provocando más inseguridad en España',
  'La inmigración tiene la culpa de la delincuencia en España',
  'La inmigración hace crecer la delincuencia en España',
  'Desde que llegaron más inmigrantes hay más delitos en España',
]) {
  assert(causal.semanticSignature === deterministicFallbackCompiler(paraphrase).semanticSignature, `Natural causal paraphrase did not receive the same semantic signature: ${paraphrase}`);
}
const temporalCausal = deterministicFallbackCompiler('Desde que llegaron más extranjeros hay más inseguridad');
const publishedCausal = deterministicFallbackCompiler('La inmigración es la causa del aumento de la delincuencia.');
assert(temporalCausal.semanticSignature === publishedCausal.semanticSignature, 'Temporal causal paraphrase did not preserve the same published claim family');
assert(causal.semanticSignature !== deterministicFallbackCompiler('La inmigración y la delincuencia están relacionadas').semanticSignature, 'Association wording was incorrectly collapsed into a causal family');
assert(causal.entities.includes('inmigración') && causal.geography === 'España', 'Causal entities/geography were not detected');
const local = deterministicFallbackCompiler('En Málaga los alquileres están expulsando a los vecinos');
assert(local.geography === 'malaga', 'Province/city geography was not detected for a local claim');
assert(causal.population === 'personas inmigrantes o extranjeras', 'Causal population was not detected');
assert(causal.propositions.some((item) => item.explicit === false && item.type === 'causal'), 'Causal implication was not created');
assert(causal.explicitPropositions.length === 1 && causal.impliedPropositions.length === 1, 'Explicit/implied proposition groups were not created');

const association = deterministicFallbackCompiler('La inmigración y la delincuencia están relacionadas en España');
const reversedAssociation = deterministicFallbackCompiler('Existe una relación entre la delincuencia y la inmigración en España');
const informalAssociation = deterministicFallbackCompiler('La inmigración se relaciona con la delincuencia en España');
assert(association.claimType === 'causal', 'Association wording lost the evidence-focused causal guidance path');
assert(association.explicitPropositions[0].predicate === 'associated_with', 'Association relation was not extracted');
assert(association.semanticSignature === reversedAssociation.semanticSignature, 'Symmetric association wording did not share a semantic family');
assert(association.semanticSignature === informalAssociation.semanticSignature, 'Informal association wording did not share a semantic family');
assert(association.semanticSignature !== causal.semanticSignature, 'Association and causal relations collapsed into the same semantic family');

const comparison = deterministicFallbackCompiler('España cobra más impuestos que Europa en 2025');
assert(comparison.claimType === 'comparative' && comparison.period === '2025', 'Comparative claim or period was not detected');
const relativePeriod = deterministicFallbackCompiler('El paro bajó el año pasado');
assert(relativePeriod.period === 'el ano pasado', 'Relative year period was not detected');
const quarterPeriod = deterministicFallbackCompiler('El empleo subió en el segundo trimestre de 2025');
assert(quarterPeriod.period === 'trimestre 2 2025', 'Quarter period was not detected');
assert(comparison.numbers.length === 0, 'Year was incorrectly treated as a numeric amount');
assert(comparison.explicitPropositions[0].predicate === 'more_than', 'Comparative relation direction was not extracted');
assert(comparison.explicitPropositions[0].subject.includes('espana') && comparison.explicitPropositions[0].object.includes('europa'), 'Comparative subject/object were not extracted');
const reversedComparison = deterministicFallbackCompiler('Europa cobra más impuestos que España');
assert(reversedComparison.claimType === 'comparative', 'A comparison mentioning España was misclassified as a definition');
assert(comparison.semanticSignature !== reversedComparison.semanticSignature, 'Reversed comparison collapsed into the same semantic family');

const causalShape = propositionShapeFor('La inmigración aumenta la delincuencia en España');
assert(causalShape.predicate === 'causes' && causalShape.subject === 'immigration' && causalShape.object === 'crime', 'Causal subject, relation, or object was not normalized');

const growthAndCost = deterministicFallbackCompiler('La economía crece, pero eso no significa que el coste de vida haya bajado');
assert(growthAndCost.claimType !== 'definition', 'A negated “significa” phrase must not be classified as a definition question');
assert(growthAndCost.explicitPropositions.length === 2, 'Contrast clauses were not decomposed into two explicit propositions');
assert(growthAndCost.explicitPropositions.every((item) => item.type === 'trend'), 'Contrast clauses did not retain their individual claim types');

const semicolon = deterministicFallbackCompiler('Hay más empleo; el paro sigue alto');
assert(semicolon.explicitPropositions.length === 2, 'Semicolon clauses were not decomposed');

const nounList = deterministicFallbackCompiler('Empleo, vivienda y sanidad');
assert(nounList.explicitPropositions.length === 1, 'A noun list was incorrectly split into multiple claims');

const normative = deterministicFallbackCompiler('Los españoles deberían tener prioridad en las ayudas');
assert(normative.claimType === 'normative' && normative.propositions.some((item) => !item.explicit), 'Normative implication was not created');
assert(deterministicFallbackCompiler('Primero los españoles').claimType === 'normative', 'Terse priority wording was not classified as normative');
assert(deterministicFallbackCompiler('Los españoles antes que los extranjeros').claimType === 'normative', 'Informal priority wording was not classified as normative');

const groupComparison = deterministicFallbackCompiler('Los extranjeros reciben más ayudas que los españoles');
assert(groupComparison.claimType === 'comparative' && groupComparison.explicitPropositions[0].predicate === 'more_than', 'Directional group comparison was not extracted');
assert(groupComparison.semanticSignature !== deterministicFallbackCompiler('Los inmigrantes reciben todas las ayudas').semanticSignature, 'Directional group comparison collapsed with a broad benefits claim');

const budget = deterministicFallbackCompiler('El Gobierno transfiere 310 millones de Educación a Presidencia');
assert(budget.numbers[0] === '310' && budget.entities.includes('educación') && budget.entities.includes('gobierno de España'), 'Budget entities or amount were not extracted');
assert(budget.propositions.some((item) => item.explicit === false && item.type === 'mixed'), 'Budget implication was not created');

const writtenAmount = deterministicFallbackCompiler('España tiene tres millones de habitantes');
assert(writtenAmount.numbers.includes('tres millones'), 'Written Spanish amounts were not retained in the compiler output');
const writtenPercentage = deterministicFallbackCompiler('El paro bajó al treinta por ciento');
assert(writtenPercentage.numbers.includes('treinta por ciento'), 'Written Spanish percentages were not retained in the compiler output');

const benefits = deterministicFallbackCompiler('¿Cuántas personas beneficiarias reciben ayudas en España?');
assert(benefits.population === 'personas beneficiarias', 'Benefit population was not detected');

const definition = deterministicFallbackCompiler('Los fijos discontinuos son parados ocultos');
assert(definition.claimType === 'definition', 'Definition claim type was not detected');

const trend = deterministicFallbackCompiler('La vivienda sube cada vez más');
assert(trend.claimType === 'trend', 'Trend claim type was not detected');

const risingTrend = deterministicFallbackCompiler('Cada vez hay más empleo en España');
const equivalentRisingTrend = deterministicFallbackCompiler('El empleo sube en España');
const pastRisingTrend = deterministicFallbackCompiler('El empleo ha subido en España');
const fallingTrend = deterministicFallbackCompiler('Cada vez hay menos empleo en España');
assert(risingTrend.semanticSignature === equivalentRisingTrend.semanticSignature, 'Natural rising-trend paraphrases did not receive the same semantic signature');
assert(risingTrend.semanticSignature === pastRisingTrend.semanticSignature, 'Past-tense rising-trend paraphrase did not receive the same semantic signature');
assert(risingTrend.semanticSignature !== fallingTrend.semanticSignature, 'Opposing trend directions collapsed into the same semantic family');
assert(deterministicFallbackCompiler('El empleo va a peor en España').claimType === 'trend', 'A worsening trend was incorrectly classified as a prediction');
const pluralWorseningTrend = deterministicFallbackCompiler('La economía y el empleo van a peor');
assert(pluralWorseningTrend.claimType === 'trend', 'Plural worsening trend was not detected');
assert(pluralWorseningTrend.semanticSignature.includes('trend:worsening'), 'Plural worsening trend did not preserve its direction');
const causalConnector = deterministicFallbackCompiler('Los alquileres suben porque faltan viviendas');
assert(causalConnector.claimType === 'causal', 'Porque connector was not detected as causal');
assert(causalConnector.explicitPropositions.length === 2, 'Porque connector did not preserve both explicit clauses');
assert(causalConnector.semanticSignature.includes('causes'), 'Porque connector did not preserve its causal relation');
const encarecimiento = deterministicFallbackCompiler('La vivienda sigue encareciéndose');
const persistentRise = deterministicFallbackCompiler('Los precios no dejan de subir');
assert(encarecimiento.semanticSignature === deterministicFallbackCompiler('La vivienda sube').semanticSignature, 'Inflected rising-price wording did not receive the same semantic signature');
assert(persistentRise.claimType === 'trend' && persistentRise.semanticSignature === deterministicFallbackCompiler('Los precios suben').semanticSignature, 'Idiomatic persistent-rise wording was not treated as a positive trend');
assert(persistentRise.semanticSignature !== deterministicFallbackCompiler('Los precios bajan').semanticSignature, 'Persistent-rise wording collapsed with the opposing trend');

const positionalComparison = deterministicFallbackCompiler('España está por encima de Europa en impuestos');
const reversedPositionalComparison = deterministicFallbackCompiler('Europa está por encima de España en impuestos');
assert(positionalComparison.claimType === 'comparative', 'Positional comparison was not detected');
assert(positionalComparison.explicitPropositions[0].predicate === 'more_than' && positionalComparison.explicitPropositions[0].metric === 'taxes', 'Positional comparison direction or metric was not extracted');
assert(positionalComparison.semanticSignature !== reversedPositionalComparison.semanticSignature, 'Reversed positional comparisons collapsed into the same semantic family');

const highestRanking = deterministicFallbackCompiler('España tiene el paro más alto de Europa');
const equivalentHighestRanking = deterministicFallbackCompiler('España es el país con más paro de Europa');
const compressedHighestRanking = deterministicFallbackCompiler('España es el país con más paro');
const lowestRanking = deterministicFallbackCompiler('España tiene el paro más bajo de Europa');
assert(highestRanking.claimType === 'comparative', 'Highest-ranking claim was not detected');
assert(highestRanking.semanticSignature === equivalentHighestRanking.semanticSignature, 'Equivalent highest-ranking wording did not receive the same semantic signature');
assert(highestRanking.semanticSignature === compressedHighestRanking.semanticSignature, 'Compressed highest-ranking wording did not receive the same semantic signature');
assert(highestRanking.semanticSignature !== lowestRanking.semanticSignature, 'Highest and lowest ranking claims collapsed into the same semantic family');
for (const wording of ['España lidera el paro en Europa', 'España encabeza el desempleo europeo', 'España está a la cabeza del paro en Europa']) {
  assert(highestRanking.semanticSignature === deterministicFallbackCompiler(wording).semanticSignature, `Natural highest-ranking wording did not receive the same semantic signature: ${wording}`);
}

const worseComparison = deterministicFallbackCompiler('España está peor que hace diez años');
const betterComparison = deterministicFallbackCompiler('España está mejor que hace diez años');
assert(worseComparison.claimType === 'comparative', 'Relative “peor que” comparison was not detected');
assert(worseComparison.explicitPropositions[0].predicate === 'worse_than', 'Relative comparison direction was not extracted');
assert(worseComparison.period === 'hace diez anos', 'Written relative period was not extracted');
assert(worseComparison.semanticSignature !== betterComparison.semanticSignature, 'Better and worse relative comparisons collapsed into the same semantic family');

const broad = deterministicFallbackCompiler('España está destruida');
const negatedBroad = deterministicFallbackCompiler('España no está destruida');
assert(broad.claimType === 'descriptive' && broad.impliedPropositions.some((item) => item.type === 'definition'), 'Broad evaluative claim was not marked for definition/context clarification');
assert(broad.clarificationRequired === true, 'Broad evaluative claim did not require clarification');
assert(broad.semanticSignature !== causal.semanticSignature, 'Broad evaluative wording collapsed into an unrelated causal family');
assert(broad.semanticSignature !== negatedBroad.semanticSignature, 'Opposing claim polarity collapsed into the same semantic family');
for (const wording of ['España va cuesta abajo', 'El país se va a la ruina', 'España es un desastre']) {
  const result = deterministicFallbackCompiler(wording);
  assert(result.clarificationRequired === true, `Broad political complaint did not require clarification: ${wording}`);
  assert(result.impliedPropositions.some((item) => item.type === 'definition'), `Broad political complaint was not marked as evaluative context: ${wording}`);
}

const costOfLiving = deterministicFallbackCompiler('Cada vez cuesta más llegar a fin de mes en España');
const equivalentCostOfLiving = deterministicFallbackCompiler('La vida se ha encarecido en España');
assert(costOfLiving.semanticSignature === equivalentCostOfLiving.semanticSignature, 'Cost-of-living paraphrases did not share a semantic family');

const publicDebt = deterministicFallbackCompiler('La deuda pública de España crece');
const equivalentPublicDebt = deterministicFallbackCompiler('España está cada vez más endeudada');
assert(publicDebt.semanticSignature === equivalentPublicDebt.semanticSignature, 'Public-finance paraphrases did not share a semantic family');

const healthAccess = deterministicFallbackCompiler('Las listas de espera sanitarias están colapsadas');
const healthSpending = deterministicFallbackCompiler('España gasta más por habitante en sanidad');
const neet = deterministicFallbackCompiler('La tasa de ninis ha bajado en España');
const equivalentNeet = deterministicFallbackCompiler('Cada vez hay menos jóvenes que ni estudian ni trabajan en España');
const youthUnemployment = deterministicFallbackCompiler('El paro juvenil ha bajado en España');
assert(healthAccess.semanticSignature !== healthSpending.semanticSignature, 'Health-access and health-spending families were merged');
assert(neet.semanticSignature === equivalentNeet.semanticSignature, 'NEET paraphrases did not share a semantic family');
assert(neet.semanticSignature !== youthUnemployment.semanticSignature, 'NEET and youth unemployment families were merged');
assert(costOfLiving.semanticSignature !== publicDebt.semanticSignature, 'Cost-of-living and public-finance families were merged');
assert(costOfLiving.claimType === 'trend', 'Cost-of-living pressure was not detected as a trend');
assert(deterministicFallbackCompiler('Cada vez cuesta más llegar a fin de mes en España').claimType !== 'comparative', 'Cost-of-living pressure was misclassified as a ranking/comparison');

console.log('Fallback compiler validation passed: structured fields and implications are deterministic.');
