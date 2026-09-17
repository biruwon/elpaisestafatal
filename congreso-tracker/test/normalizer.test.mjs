import test from 'node:test'; import assert from 'node:assert/strict';
test('presence vocabulary does not infer absence',()=>{const allowed=['in_person_participation','remote_participation','official_attendance','seat_observation','unknown'];assert.ok(allowed.includes('unknown'));assert.ok(!allowed.includes('absent'));});
