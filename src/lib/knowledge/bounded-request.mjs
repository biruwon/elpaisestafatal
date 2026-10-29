export class RequestTooLargeError extends Error {}

export const boundedRequest = async (request, maximumBytes) => {
  if (Number(request.headers.get('content-length') || 0) > maximumBytes) throw new RequestTooLargeError();
  if (!request.body) return request;
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximumBytes) { await reader.cancel(); throw new RequestTooLargeError(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new Request(request.url, { method: request.method, headers: request.headers, body: bytes });
};
