import { detectCurrentEvent, classifyEventSources } from './current-events.mjs';
import { makeScorecard } from './scorecard.mjs';

const event = detectCurrentEvent('con la invasion de Ceuta están violando a las mujeres');
if (!event || event.propositions.length !== 3 || !event.propositions.some((item) => item.id === 'attribution')) throw new Error('Ceuta input was not decomposed into event, allegation, and attribution');
for (const variant of ['invasión Ceuta mujeres agredidas', 'Ceuta: ¿se han denunciado agresiones?', 'con la entrada fronteriza en ceuta hubo violaciones']) if (!detectCurrentEvent(variant)) throw new Error(`event variant not detected: ${variant}`);
const deduped = classifyEventSources([{ id: 'a', url: 'https://www.efe.com/a', publisher: 'EFE', originPublisher: 'EFE' }, { id: 'b', url: 'https://www.rtve.es/b', publisher: 'RTVE' }]);
if (deduped.status !== 'corroborated_report' || deduped.sources.length !== 2) throw new Error('independent event sources were not corroborated');
const scorecard = makeScorecard([]);
if (scorecard.items.length !== 6 || scorecard.items.some((item) => item.direction !== 'unavailable')) throw new Error('scorecard registry did not fail closed on unavailable metrics');
console.log('Resolution mode validation passed: broad scorecards and current-event propositions remain structured and evidence-honest.');
