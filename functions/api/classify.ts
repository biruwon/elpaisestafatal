// Compatibility route for the public classifier contract. Keep the existing
// /api/resolve route working while every new client can use one provider-
// neutral endpoint with the same JSON/multipart input and response behavior.
export { onRequestPost } from './resolve';
