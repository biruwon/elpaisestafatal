// Each observation is already escaped SQL emitted by our exporter. Coalesce
// consecutive compatible inserts below D1's 100 KB statement limit. This
// avoids a network import per handful of rows without buffering the warehouse.
export async function* coalesceObservationInserts(lines) {
  let prefix = '', suffix = '', tuples = [], size = 0;
  for await (const line of lines) {
    const statement = line.trim();
    if (!statement || statement.startsWith('/*')) continue;
    const match = statement.match(/^(INSERT INTO observations \([^\n]+?\) VALUES )(\(.*\))( ON CONFLICT \(id\) DO UPDATE SET .*;)$/);
    if (match && (!tuples.length || prefix === match[1] && suffix === match[3]) && size + Buffer.byteLength(match[2]) + 2 < 85_000) {
      prefix = match[1]; suffix = match[3]; tuples.push(match[2]); size += Buffer.byteLength(match[2]) + 2;
      continue;
    }
    if (tuples.length) { yield `${prefix}${tuples.join(',')}${suffix}`; tuples = []; size = 0; }
    if (match) { prefix = match[1]; suffix = match[3]; tuples.push(match[2]); size = Buffer.byteLength(match[2]); }
    else yield statement;
  }
  if (tuples.length) yield `${prefix}${tuples.join(',')}${suffix}`;
}

export async function* warehouseImportBatches(statements, { maxStatements = 1000, maxBytes = 64 * 1024 * 1024 } = {}) {
  let chunk = [], bytes = 0;
  for await (const statement of statements) {
    const size = Buffer.byteLength(statement, 'utf8') + 1;
    if (size > 100_000) throw new Error('Warehouse statement exceeds the D1 100 KB limit');
    if (chunk.length && (chunk.length >= maxStatements || bytes + size > maxBytes)) { yield chunk; chunk = []; bytes = 0; }
    chunk.push(statement); bytes += size;
  }
  if (chunk.length) yield chunk;
}
