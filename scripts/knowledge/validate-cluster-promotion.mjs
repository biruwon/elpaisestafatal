import { buildPromotionSql, sqlQuote, validatePromotionRequest } from './cluster-promotion-lib.mjs';

const claim = { slug: 'empleo-record', status: 'published' };
const valid = validatePromotionRequest({ selector: { id: 'cluster-1' }, canonical: '¿Hay más empleo que nunca?', slug: 'empleo-record', approved: true, claim });
if (valid.length) throw new Error(`Valid promotion was rejected: ${valid.join('; ')}`);

const unsafe = validatePromotionRequest({ selector: { id: 'cluster-1' }, canonical: 'Raw insult', slug: 'empleo-record', approved: false, claim: { slug: 'empleo-record', status: 'planned' } });
if (unsafe.length < 2) throw new Error('Promotion did not enforce approval and published-claim gates');

const sql = buildPromotionSql({ selector: { signature: "foo'bar" }, canonical: '¿Qué muestran los datos?', slug: 'empleo-record' });
if (!sql.includes("canonical_signature = 'foo''bar'") || !sql.includes("review_status = 'published'") || !sql.includes("coverage_status IN ('complete', 'covered')")) throw new Error('Promotion SQL did not preserve safe selector and coverage gates');
if (sqlQuote("O'Reilly") !== "'O''Reilly'") throw new Error('SQL quoting is unsafe');
console.log('Cluster promotion validation passed: approval, neutral wording, published-claim, and coverage gates are enforced.');
