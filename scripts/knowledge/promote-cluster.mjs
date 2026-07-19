import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, readFile } from 'node:fs/promises';
import { buildPromotionSql, validatePromotionRequest } from './cluster-promotion-lib.mjs';

const execFileAsync = promisify(execFile);
const args = new Map(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), values[index + 1] && !values[index + 1].startsWith('--') ? values[index + 1] : 'true']);
  return pairs;
}, []));
const database = args.get('database') || 'elpaisestafatal-ops';
const selector = args.get('id') ? { id: args.get('id') } : args.get('signature') ? { signature: args.get('signature') } : null;
const canonical = String(args.get('canonical') || '').trim();
const slug = String(args.get('slug') || '').trim();
const approved = args.get('approved') === 'true';

const claimsDirectory = new URL('../../content/claims/', import.meta.url).pathname;
const findClaim = async (wantedSlug) => {
  let files;
  try { files = await readdir(claimsDirectory); } catch { return null; }
  for (const file of files.filter((entry) => entry.endsWith('.md'))) {
    const raw = await readFile(`${claimsDirectory}${file}`, 'utf8');
    const frontmatter = raw.match(/^---\s*\n([\s\S]*?)\n---/m)?.[1] || '';
    const record = {
      slug: frontmatter.match(/^slug:\s*["']?([^"'\n]+)["']?$/m)?.[1]?.trim() || file.replace(/\.md$/, ''),
      status: frontmatter.match(/^status:\s*["']?([^"'\n]+)["']?$/m)?.[1]?.trim() || '',
    };
    if (record.slug === wantedSlug) return record;
  }
  return null;
};

if (args.has('help') || !selector || !canonical || !slug) {
  console.error('Usage: npm run knowledge:promote-cluster -- --id cluster-id --canonical "Neutral question" --slug published-claim --approved');
  console.error('Use --signature instead of --id when promoting by canonical signature.');
  process.exit(1);
}

const claim = await findClaim(slug);
const errors = validatePromotionRequest({ selector, canonical, slug, approved, claim });
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

const sql = buildPromotionSql({ selector, canonical, slug });
try {
  const { stdout } = await execFileAsync('npx', ['--no-install', 'wrangler', 'd1', 'execute', database, '--remote', '--command', sql, '--json'], { maxBuffer: 2 * 1024 * 1024 });
  console.log(stdout.trim() || `Promoted cluster to the public popularity feed: ${slug}`);
} catch (error) {
  console.error(error?.stderr || error?.message || String(error));
  process.exit(1);
}
