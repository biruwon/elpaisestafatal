// Pages Functions requires a dynamic file for /api/check/:id. Keep polling
// centralized in the canonical handler; POST carries the original UTF-8 claim
// in a JSON body so accents are not corrupted in an HTTP header.
export { onRequestGet, onRequestGet as onRequestPost } from '../check';
