const identifier = /^[a-z][a-z0-9_]*$/;

// Avoid charging D1 for no-op updates when a daily source refresh reproduces
// the same warehouse row. SQLite's IS NOT comparison is null-safe.
export const warehouseUpsert = ({ table, columns, values, updateColumns, conflictColumn = 'id' }) => {
  const names = [table, conflictColumn, ...columns, ...updateColumns];
  if (names.some((name) => !identifier.test(name))) throw new Error('Warehouse SQL identifiers must be static lowercase names');
  if (columns.length !== values.length || !columns.includes(conflictColumn)) throw new Error('Warehouse upsert columns and values do not match');

  const insert = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')})`;
  if (!updateColumns.length) return `${insert} ON CONFLICT (${conflictColumn}) DO NOTHING;`;

  const assignments = updateColumns.map((column) => `${column} = excluded.${column}`).join(', ');
  const changed = updateColumns.map((column) => `${table}.${column} IS NOT excluded.${column}`).join(' OR ');
  return `${insert} ON CONFLICT (${conflictColumn}) DO UPDATE SET ${assignments} WHERE ${changed};`;
};
