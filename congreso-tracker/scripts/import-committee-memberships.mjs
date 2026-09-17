import { readFile, writeFile } from 'node:fs/promises';

const catalogue = JSON.parse(await readFile('data/committee-catalogue.json', 'utf8')).bodies || [];
const endpoint = code => `https://www.congreso.es:443/es/organos/composicion-en-la-legislatura?p_p_id=organos&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=searchOrgano&p_p_cacheability=cacheLevelPage&_organos_selectedLegislatura=XV&_organos_selectedOrganoSup=1&_organos_selectedSuborgano=${encodeURIComponent(code)}`;
const rows = [], sources = [];
for (const item of catalogue) {
  const body = new URLSearchParams({ _organos_selectedLegislatura: 'XV', _organos_compoHistorica: 'false', _organos_selectedOrganoSup: '1', _organos_selectedSuborgano: String(item.code) });
  try {
    const response = await fetch(endpoint(item.code), { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-requested-with': 'XMLHttpRequest', 'user-agent': 'congreso-tracker/0.1 research contact' }, body, signal: AbortSignal.timeout(20000) });
    const payload = await response.json();
    const members = Array.isArray(payload.data) ? payload.data : [];
    sources.push({ code: item.code, name: item.name, httpStatus: response.status, memberCount: members.length, constitutionDate: payload.fechaConstitucion?.fechaConstitucion || null });
    for (const member of members) rows.push({ bodyId: `commission-${item.code}`, bodyCode: String(item.code), bodyName: item.name, deputyName: member.apellidosNombre, role: member.descCargo, group: member.siglas, from: member.fechaAltaFormat || null, to: member.fechaBajaFormat || null, officialDeputyUrl: member.urlFichaDiputado ? new URL(member.urlFichaDiputado, 'https://www.congreso.es').href : null, evidenceType: 'formal_composition_export', validationStatus: response.ok ? 'official_response' : `http_${response.status}`, sourceUrl: endpoint(item.code) });
  } catch (error) { sources.push({ code: item.code, name: item.name, error: String(error) }); }
}
const unique = [...new Map(rows.map(row => [`${row.bodyCode}|${row.deputyName}|${row.role}|${row.from}|${row.to}`, row])).values()];
await writeFile('data/committee-memberships.json', JSON.stringify({ meta: { legislature: 'XV', generatedAt: new Date().toISOString(), source: 'official composition endpoint', sourceCount: sources.length, populatedSourceCount: sources.filter(x => x.memberCount > 0).length, memberCount: unique.length }, sources, memberships: unique }, null, 2));
console.log(`imported ${unique.length} committee membership rows from ${sources.filter(x => x.memberCount > 0).length}/${sources.length} commissions`);
