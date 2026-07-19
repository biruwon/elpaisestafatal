const base = (process.env.SMOKE_RESOLVE_BASE_URL || 'http://127.0.0.1:4321').replace(/\/$/, '');
const failures = [];

const resolve = async (text, inputType = 'text') => {
  const response = await fetch(`${base}/api/v1/resolve`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, inputType }), signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`POST returned ${response.status}`);
  let result = await response.json();
  for (let attempt = 0; attempt < 30 && result.status === 'processing'; attempt += 1) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 350));
    const pending = await fetch(`${base}/api/v1/resolve/${encodeURIComponent(result.requestId)}`, { signal: AbortSignal.timeout(5000) });
    result = await pending.json();
  }
  return result;
};

const cases = [
  { text: 'España cobra demasiados impuestos', status: 'complete', slug: 'espana-impuestos-europa' },
  { text: 'España está destruida', status: 'uncovered', slug: null },
];
for (const item of cases) {
  try {
    const result = await resolve(item.text);
    if (result.status !== item.status) failures.push(`${item.text}: expected ${item.status}, received ${result.status}`);
    if (item.slug && result.relatedClaims?.[0]?.slug !== item.slug) failures.push(`${item.text}: expected primary ${item.slug}`);
    if (!item.slug && result.relatedClaims?.length) failures.push(`${item.text}: unrelated alternatives returned (${result.relatedClaims.map((claim) => claim.slug).join(', ')})`);
  } catch (error) { failures.push(`${item.text}: ${error.message}`); }
}

if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Local resolver smoke passed: ${cases.length} cases at ${base}`);
