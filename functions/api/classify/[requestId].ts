// Polling counterpart to /api/classify. It deliberately shares the exact
// provider-neutral implementation used by the legacy /api/resolve route.
export { onRequestGet } from '../resolve/[requestId]';
