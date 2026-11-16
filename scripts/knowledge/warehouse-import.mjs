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

const snapshotKey = (sourceId, sha256) => JSON.stringify([sourceId, sha256]);

export const warehouseSourceMarker = (boundary, sourceId, sha256) => {
  if (!['data', 'end'].includes(boundary)) throw new Error(`Unknown warehouse source boundary: ${boundary}`);
  const encoded = Buffer.from(JSON.stringify([sourceId, sha256])).toString('base64url');
  return `/* warehouse-source-${boundary}:${encoded} */`;
};

const parseSourceMarker = (statement, boundary) => {
  const match = statement.match(new RegExp(`^/\\* warehouse-source-${boundary}:([A-Za-z0-9_-]+) \\*/$`));
  if (!match) return undefined;
  let snapshot;
  try { snapshot = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8')); } catch { throw new Error(`Invalid warehouse source ${boundary} marker`); }
  if (!Array.isArray(snapshot) || snapshot.length !== 2 || typeof snapshot[0] !== 'string' || typeof snapshot[1] !== 'string') {
    throw new Error(`Invalid warehouse source ${boundary} marker payload`);
  }
  return snapshot;
};

export async function* skipUnchangedSourceData(lines, completedSnapshots, skippedSourceIds = new Set()) {
  let activeSnapshot;
  let skipActiveSource = false;
  for await (const line of lines) {
    const statement = line.trim();
    const start = parseSourceMarker(statement, 'data');
    const end = parseSourceMarker(statement, 'end');
    if (start) {
      if (activeSnapshot) throw new Error(`Nested warehouse source block: ${start[0]}`);
      activeSnapshot = start;
      skipActiveSource = completedSnapshots.has(snapshotKey(...activeSnapshot));
      if (skipActiveSource) skippedSourceIds.add(activeSnapshot[0]);
      continue;
    }
    if (end) {
      if (!activeSnapshot || snapshotKey(...activeSnapshot) !== snapshotKey(...end)) throw new Error(`Mismatched warehouse source block: ${end[0]}`);
      activeSnapshot = undefined;
      skipActiveSource = false;
      continue;
    }
    if (!skipActiveSource) yield line;
  }
  if (activeSnapshot) throw new Error(`Unclosed warehouse source block: ${activeSnapshot[0]}`);
}

export const parseD1CompletedSourceSnapshots = (output) => {
  let parsed;
  try { parsed = JSON.parse(output); } catch { throw new Error('Wrangler did not return valid JSON for the source manifest query'); }
  if (!Array.isArray(parsed) || !parsed.length || parsed.some((result) => !result || !Array.isArray(result.results))) {
    throw new Error('Wrangler source manifest query returned an unexpected JSON shape');
  }
  if (parsed.some((result) => result?.success === false)) throw new Error('Wrangler source manifest query reported a D1 error');
  const rows = parsed.flatMap((result) => result.results);
  if (rows.some((row) => !row || typeof row.id !== 'string' || typeof row.source_sha256 !== 'string'
    || (row.imported_sha256 !== null && typeof row.imported_sha256 !== 'string')
    || (row.import_status !== null && !['in_progress', 'complete'].includes(row.import_status))
    || (row.imported_sha256 === null) !== (row.import_status === null))) {
    throw new Error('Wrangler source manifest query returned invalid source state');
  }
  return new Set(rows.filter((row) => row.imported_sha256 === null
    || row.imported_sha256 === row.source_sha256 && row.import_status === 'complete')
    .map((row) => snapshotKey(row.id, row.source_sha256)));
};

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
