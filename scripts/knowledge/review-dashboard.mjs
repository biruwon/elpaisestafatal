import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url).pathname;
const args = new Map(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), values[index + 1] && !values[index + 1].startsWith('--') ? values[index + 1] : 'true']);
  return pairs;
}, []));
const inputPath = args.get('input') || join(root, '.local/review-queue.json');
const outputPath = args.get('output') || join(root, '.local/review-dashboard.html');
const escapeHtml = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const asArray = (value) => Array.isArray(value) ? value : [];
const commandFor = (candidate) => candidate?.suggestedSlug
  ? `npm run knowledge:promote-cluster -- --id ${candidate.clusterId} --canonical "${String(candidate.canonicalText || '').replaceAll('"', '\\"')}" --slug ${candidate.suggestedSlug} --approved`
  : '';
const evidenceLabel = (candidate) => {
  if (candidate.researchOnly) return candidate.sourceAvailability === 'none' ? 'No direct source' : candidate.sourceAvailability === 'discovery_only' ? 'Discovery lead only' : 'Needs research';
  if (candidate.newlyCovered) return 'Newly covered';
  if (['complete', 'covered'].includes(candidate.coverageStatus)) return 'Evidence ready for review';
  if (candidate.coverageStatus === 'partial') return 'Partial evidence';
  return 'Uncovered';
};
const card = (candidate, kind) => {
  const ready = kind === 'candidate' && !candidate.newlyCovered && ['complete', 'covered'].includes(candidate.coverageStatus) && Boolean(candidate.suggestedSlug);
  const command = commandFor(candidate);
  return `<article class="card" data-kind="${kind}" data-search="${escapeHtml([candidate.canonicalText, candidate.nextAction, candidate.reason, evidenceLabel(candidate)].join(' '))}">
    <div class="card-top"><span class="rank">#${escapeHtml(candidate.rank)}</span><span class="status ${ready ? 'ready' : ''}">${escapeHtml(evidenceLabel(candidate))}</span></div>
    <h2>${escapeHtml(candidate.canonicalText)}</h2>
    <div class="stats"><span><b>${escapeHtml(candidate.queryCount)}</b> queries</span><span><b>${escapeHtml(candidate.count7d)}</b> last 7 days</span><span><b>${escapeHtml(candidate.priorityScore)}</b> priority</span></div>
    <p class="reason">${escapeHtml(candidate.reason || 'No additional reason recorded.')}</p>
    <div class="next"><strong>Next action</strong><p>${escapeHtml(candidate.nextAction || 'Review the evidence and define the next step.')}</p></div>
    <p class="muted">Audit: <strong>${escapeHtml(candidate.auditClass || 'unclassified')}</strong> · ${escapeHtml(candidate.auditAction || 'human_review')} · ${escapeHtml(candidate.evidenceStatus || 'not_ready')}</p>
    ${candidate.rankScore != null ? `<p class="muted">Priority: ${escapeHtml(candidate.rankScore)} · harm ${escapeHtml(candidate.harmScore)} · urgency ${escapeHtml(candidate.urgencyScore)} · evidence readiness ${escapeHtml(candidate.evidenceReadiness)}</p>` : ''}
    ${candidate.matchedMetricIds?.length ? `<p class="muted">Matched metric: ${escapeHtml(candidate.matchedMetricIds.join(' · '))}</p>` : ''}
    ${candidate.sourceIds?.length ? `<details><summary>Source references (${candidate.sourceIds.length})</summary><code>${escapeHtml(candidate.sourceIds.join(' · '))}</code></details>` : '<p class="muted">No source references attached.</p>'}
    ${candidate.requiredDimensions?.length ? `<details><summary>Required evidence dimensions</summary><p class="muted">${escapeHtml(candidate.requiredDimensions.join(' · '))}</p></details>` : ''}
    ${ready ? `<details class="promotion"><summary>Promotion command</summary><pre>${escapeHtml(command)}</pre><button type="button" data-copy="${escapeHtml(command)}">Copy command</button><p class="muted">Run only after the reviewed claim is present, the build passes, and the original wording has been verified.</p></details>` : ''}
  </article>`;
};

export const renderReviewDashboard = (queue) => {
  const candidates = asArray(queue?.candidates);
  const research = asArray(queue?.researchCandidates);
  const sourceWork = asArray(queue?.sourceWork);
  const summary = queue?.summary || {};
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Knowledge-gap review queue</title><style>
:root{--paper:#f4f0e7;--ink:#25221e;--muted:#746d63;--line:#d7d0c4;--red:#b23a2e;--green:#2f6b4f;--card:#fffdf8}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1180px;margin:auto;padding:42px 24px 80px}header{display:flex;justify-content:space-between;gap:24px;align-items:end;border-bottom:1px solid var(--line);padding-bottom:28px;margin-bottom:28px}h1{font:600 clamp(2rem,5vw,4rem)/.95 Georgia,serif;letter-spacing:-.04em;margin:0;max-width:700px}h2{font:600 1.2rem/1.2 Georgia,serif;margin:12px 0 10px}p{margin:8px 0}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:.7rem;color:var(--red);font-weight:700}.muted,.reason{color:var(--muted)}.notice{border:1px solid #d7b6a7;background:#fff7ef;padding:14px 16px;margin-bottom:24px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:24px 0}.metric,.card{background:var(--card);border:1px solid var(--line);border-radius:8px}.metric{padding:16px}.metric b{display:block;font:600 2rem Georgia,serif}.metric span{color:var(--muted);font-size:.8rem}.toolbar{display:flex;gap:10px;align-items:center;margin:22px 0;flex-wrap:wrap}.toolbar input{flex:1;min-width:240px;border:1px solid var(--line);padding:12px 14px;border-radius:5px;background:#fffdf8;font:inherit}.tabs button,.card button{border:1px solid var(--line);background:transparent;border-radius:5px;padding:9px 12px;font:inherit;cursor:pointer}.tabs button[aria-pressed=true]{background:var(--ink);color:var(--paper)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}.card{padding:18px}.card-top{display:flex;justify-content:space-between;align-items:center;gap:10px}.rank{font:600 .8rem ui-monospace,monospace;color:var(--muted)}.status{font-size:.72rem;border:1px solid var(--line);border-radius:999px;padding:4px 8px;color:var(--muted)}.status.ready{color:var(--green);border-color:#9bc5ad}.stats{display:flex;gap:10px;flex-wrap:wrap;color:var(--muted);font-size:.78rem;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:9px 0}.stats b{color:var(--ink)}.next{border-left:3px solid var(--red);padding-left:12px;margin:16px 0}.next strong{font-size:.75rem;text-transform:uppercase;letter-spacing:.08em}.next p{color:var(--ink)}details{border-top:1px solid var(--line);padding-top:10px;margin-top:12px;font-size:.85rem}summary{cursor:pointer;font-weight:600}code,pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f0ece3;border-radius:4px;padding:8px;display:block;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}pre{margin:10px 0}.promotion button{background:var(--ink);color:var(--paper);border-color:var(--ink)}.empty{padding:32px;border:1px dashed var(--line);color:var(--muted)}@media(max-width:700px){main{padding:28px 16px 60px}header{display:block}.metrics{grid-template-columns:repeat(2,1fr)}.metric b{font-size:1.6rem}}
</style></head><body><main><header><div><p class="eyebrow">Private maintainer tool</p><h1>Knowledge gaps worth resolving.</h1><p class="muted">Generated locally from the review queue. This file is never part of the public Astro build.</p></div><p class="muted">${escapeHtml(queue?.generatedAt || 'not yet')}</p></header><div class="notice"><strong>Publication gate:</strong> popularity never publishes a claim. Review direct sources, proposition boundaries, limitations, and the build before using a promotion command.</div><section class="metrics"><div class="metric"><b>${escapeHtml(summary.candidates || 0)}</b><span>review candidates</span></div><div class="metric"><b>${escapeHtml(summary.unresolved || 0)}</b><span>unresolved</span></div><div class="metric"><b>${escapeHtml(summary.researchCandidates || 0)}</b><span>research-only gaps</span></div><div class="metric"><b>${escapeHtml(summary.sourceWorkItems ?? sourceWork.length)}</b><span>audit work items</span></div><div class="metric"><b>${escapeHtml(summary.newlyCoveredAuditItems || 0)}</b><span>newly covered</span></div></section><div class="toolbar"><input id="filter" type="search" placeholder="Filter claims, reasons, or next actions…" aria-label="Filter knowledge gaps"><div class="tabs" role="group" aria-label="Queue type"><button type="button" data-tab="all" aria-pressed="true">All</button><button type="button" data-tab="candidate" aria-pressed="false">Review</button><button type="button" data-tab="research" aria-pressed="false">Research</button></div><span id="count" class="muted"></span></div><section id="cards" class="grid">${candidates.map((item) => card(item, 'candidate')).join('')}${research.map((item) => card(item, 'research')).join('')}${sourceWork.map((item) => card(item, 'research')).join('') || (!candidates.length ? '<p class="empty">No candidates in this queue. Run <code>npm run knowledge:triage</code> first.</p>' : '')}</section></main><script>
const cards=[...document.querySelectorAll('.card')],filter=document.querySelector('#filter'),count=document.querySelector('#count');let tab='all';function refresh(){const q=filter.value.toLocaleLowerCase();let visible=0;for(const card of cards){const shown=(tab==='all'||card.dataset.kind===tab)&&(!q||card.dataset.search.toLocaleLowerCase().includes(q));card.hidden=!shown;if(shown)visible++}count.textContent=visible+' visible'}for(const button of document.querySelectorAll('[data-tab]'))button.addEventListener('click',()=>{tab=button.dataset.tab;for(const item of document.querySelectorAll('[data-tab]'))item.setAttribute('aria-pressed',String(item===button));refresh()});filter.addEventListener('input',refresh);for(const button of document.querySelectorAll('[data-copy]'))button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(button.dataset.copy);button.textContent='Copied'}catch{button.textContent='Copy failed'}});refresh();</script></body></html>`;
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let queue;
  try { queue = JSON.parse(await readFile(inputPath, 'utf8')); } catch { console.error(`Review queue not found at ${inputPath}. Run npm run knowledge:triage first.`); process.exit(1); }
  await writeFile(outputPath, renderReviewDashboard(queue));
  console.log(`Private knowledge review dashboard written to ${outputPath}`);
}
