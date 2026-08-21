import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { discoverOfficialDocuments } from './official-discovery.mjs';
import { approvedSourceHosts, sourceForHost } from './source-registry.mjs';

const root = new URL('../../', import.meta.url).pathname;
const args = new Map(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), values[index + 1] && !values[index + 1].startsWith('--') ? values[index + 1] : 'true']);
  return pairs;
}, []));
const input = args.get('input') || join(root, '.local/coverage-audit.json');
const output = args.get('output') || join(root, '.local/research-job.json');
const limit = Math.max(1, Number(args.get('limit') || 25));
const concurrency = Math.max(1, Number(args.get('concurrency') || 3));
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const domainTerms = {
  immigration_benefits: 'programa prestación elegibilidad beneficiarios nacionalidad denominador',
  immigration_crime: 'delitos condenas nacionalidad población denominador etapa jurídica',
  public_housing_allocation: 'adjudicación vivienda pública solicitantes nacionalidad programa',
};
const domainTargets = {
  immigration_benefits: 'Ministerio Inclusion IMV microdatos INE nacionalidad residencia administradores regionales programa beneficiarios denominador',
  immigration_crime: 'Interior estadisticas criminalidad INE condenas población nacionalidad territorio edad sexo etapa juridica',
  public_housing_allocation: 'MIVAU vivienda protegida registro solicitantes adjudicatarios nacionalidad AVS Excel 1 Excel 3 comunidad autonoma ayuntamiento',
};
const localTerms = 'ayuntamiento policía local registro municipal boletín oficial provincia comunidad autónoma municipio territorio concreto';
const queryFor = (item) => [item.canonicalText, domainTerms[item.domain] || '', domainTargets[item.domain] || '', item.auditClass === 'unsupported_scope' ? localTerms : '', ...(item.requiredDimensions || []).slice(0, 8)].filter(Boolean).join(' ').slice(0, 700);
const officialOnly = (results) => (results || []).filter((item) => {
  try { return approvedSourceHosts.some((host) => new URL(item.url || '').hostname === host || new URL(item.url || '').hostname.endsWith(`.${host}`)) && sourceForHost(new URL(item.url).hostname)?.trustTier === 'primary'; } catch { return false; }
});
const audit = await readJson(input);
const candidates = (audit.sourceWorkItems || []).filter((item) => ['true_research_gap', 'partial_domain_evidence', 'unsupported_scope'].includes(item.auditClass)).slice(0, limit);
const results = [];
let cursor = 0;
const worker = async () => {
  while (cursor < candidates.length) {
    const index = cursor++;
    const item = candidates[index];
    const query = queryFor(item);
    try {
      const discovered = officialOnly(await discoverOfficialDocuments(query, 5));
      results[index] = { id: item.id, clusterId: item.clusterId || null, auditClass: item.auditClass, domain: item.domain || null, query, requiredDimensions: item.requiredDimensions || [], status: discovered.length ? 'source_leads_found' : 'no_primary_source_found', leads: discovered.map((source) => ({ id: source.id, title: source.title, url: source.url, publisher: source.publisher, publishedAt: source.publishedAt, matchedTerms: source.matchedTerms })) };
    } catch (error) {
      results[index] = { id: item.id, clusterId: item.clusterId || null, auditClass: item.auditClass, domain: item.domain || null, query, requiredDimensions: item.requiredDimensions || [], status: 'research_error', error: error instanceof Error ? error.message : String(error), leads: [] };
    }
  }
};
await Promise.all(Array.from({ length: Math.min(concurrency, candidates.length) }, worker));
await mkdir(join(output, '..'), { recursive: true });
const report = { schemaVersion: '1', generatedAt: new Date().toISOString(), input, requested: candidates.length, sourceLeadsFound: results.filter((item) => item.status === 'source_leads_found').length, noPrimarySourceFound: results.filter((item) => item.status === 'no_primary_source_found').length, results };
await writeFile(output, JSON.stringify(report, null, 2));
console.log(`Research job completed: ${report.sourceLeadsFound}/${report.requested} gaps produced primary-source leads; ${report.noPrimarySourceFound} need a source or more specific claim dimensions. Output: ${output}`);
