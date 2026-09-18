const API = '/api/congreso/v1';
const main = document.getElementById('main');
const nav = document.querySelector('.main-nav');
const menuButton = document.getElementById('menuButton');
const state = { overview: null, coverage: null, deputies: null, sessions: null, votes: null };

const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (value) => Number(value || 0).toLocaleString('es-ES');
const pct = (a, b) => b ? (Math.round((a / b) * 1000) / 10) + '%' : '—';
const get = async (path) => {
  const response = await fetch(API + path, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('No se pudo cargar ' + path);
  return response.json();
};
const getAll = async (path) => {
  const joiner = path.includes('?') ? '&' : '?';
  const first = await get(path + joiner + 'page=1&pageSize=1000');
  const all = first.data || [];
  const pages = first.pagination && first.pagination.pages || 1;
  for (let page = 2; page <= pages; page += 1) {
    const next = await get(path + joiner + 'page=' + page + '&pageSize=1000');
    all.push(...(next.data || []));
  }
  return all;
};
const setLoading = () => { main.innerHTML = '<div class="spinner" aria-label="Cargando"></div>'; };
const setError = (error) => { main.innerHTML = '<div class="error"><b>No se pudo cargar esta vista.</b><br>' + esc(error.message || error) + '<br><a href="#/">Volver al resumen</a></div>'; };
const card = (label, value, note) => '<article class="card metric"><span class="metric-label">' + label + '</span><strong class="metric-value">' + value + '</strong><span class="metric-note">' + (note || '') + '</span></article>';
const sectionHead = (title, copy) => '<div class="section-head"><div><h2>' + title + '</h2>' + (copy ? '<p>' + copy + '</p>' : '') + '</div></div>';
const bars = (values, limit) => {
  const rows = Object.entries(values || {}).sort((a,b) => b[1] - a[1]).slice(0, limit || 12);
  const max = Math.max(1, ...(rows.map((x) => x[1])));
  if (!rows.length) return '<div class="empty">Sin datos disponibles</div>';
  return '<div class="bars">' + rows.map((row) => '<div class="bar-row"><span class="bar-label" title="' + esc(row[0]) + '">' + esc(row[0]) + '</span><span class="bar-track"><span class="bar-fill" style="width:' + Math.round(row[1] / max * 100) + '%"></span></span><span class="bar-value">' + fmt(row[1]) + '</span></div>').join('') + '</div>';
};
const pill = (text, tone) => '<span class="pill ' + (tone || '') + '">' + esc(text) + '</span>';
const empty = (text) => '<div class="empty">' + esc(text || 'Sin resultados') + '</div>';
const setActiveNav = (name) => document.querySelectorAll('[data-nav]').forEach((el) => el.classList.toggle('active', el.dataset.nav === name));

async function renderHome() {
  const data = state.overview || (state.overview = await get('/overview'));
  const coverage = state.coverage || (state.coverage = await get('/coverage'));
  const c = data.counts, statuses = data.dailyStatuses || {};
  const totalDaily = Object.values(statuses).reduce((a,b) => a + b, 0);
  main.innerHTML = '<div class="hero"><div><p class="eyebrow">XV Legislatura · datos oficiales</p><h1>Cómo participa el Congreso</h1><p class="hero-copy">Una vista clara de quién interviene, sobre qué asuntos, cómo vota y qué evidencia pública existe sobre su presencia. Cada cifra mantiene su fuente y sus límites.</p></div><div class="hero-actions"><a class="button" href="#/deputies">Explorar diputados →</a><a class="button secondary" href="#/coverage">Ver cobertura</a></div></div>' +
    '<div class="grid grid-4">' + card('Diputados', fmt(c.deputies), 'con servicio en la XV') + card('Intervenciones', fmt(c.attributedInterventions), 'atribuidas a diputados · ' + pct(c.attributedInterventions, c.interventions)) + card('Iniciativas', fmt(c.initiatives), 'expedientes vinculados') + card('Votaciones', fmt(c.ballots), 'balotas del archivo completo') + '</div>' +
    '<div class="notice" style="margin-top:16px">La presencia física completa no está publicada. El observatorio combina intervenciones temporizadas, votos, documentos oficiales y observaciones revisadas. “Desconocido” nunca significa ausencia.</div>' +
    sectionHead('Actividad parlamentaria', 'Distribución de grupos y temas en los registros importados') +
    '<div class="grid grid-2"><section class="card chart-card"><h3>Diputados por grupo</h3>' + bars(data.groups, 12) + '</section><section class="card chart-card"><h3>Temas de las intervenciones</h3>' + bars(data.topics, 12) + '</section></div>' +
    sectionHead('Evidencia diaria', 'Cada fila corresponde a un diputado y una fecha de sesión dentro de su servicio') +
    '<div class="grid grid-2"><section class="card"><div class="coverage-card"><div><span class="subtle">Filas diputado-día</span><div class="coverage-number">' + fmt(c.dailyRows) + '</div></div><div style="min-width:180px"><div class="status-strip"><span class="observed" style="width:' + (statuses.observed || 0) / totalDaily * 100 + '%"></span><span class="event-only" style="width:' + (statuses.event_only || 0) / totalDaily * 100 + '%"></span><span class="unknown" style="width:' + (statuses.unknown || 0) / totalDaily * 100 + '%"></span></div><div class="legend"><span><i class="observed"></i>Observada ' + fmt(statuses.observed) + '</span><span><i class="event-only"></i>Evento ' + fmt(statuses.event_only) + '</span><span><i class="unknown"></i>Desconocida ' + fmt(statuses.unknown) + '</span></div></div></div></section><section class="card"><h3>Sesiones y agenda</h3><p class="hero-copy">De ' + fmt(data.sessionCoverage.dates) + ' fechas con agenda, ' + fmt(data.sessionCoverage.actual) + ' tienen intervención o índice audiovisual. ' + fmt(data.sessionCoverage.plannedOnly) + ' quedan como agenda planificada sin prueba de celebración.</p><a class="button secondary" href="#/sessions">Ver sesiones y cobertura →</a></section></div>' +
    '<div class="callout" style="margin-top:16px">Actualización: ' + esc(coverage.generatedAt || data.meta.generatedAt || '—') + '. La atribución y la publicación de fuentes se pueden revisar en Cobertura.</div>';
}

async function renderDeputies() {
  const rows = state.deputies || (state.deputies = (await get('/deputy-metrics')).data);
  const query = new URLSearchParams(location.hash.split('?')[1] || '').get('q') || '';
  const q = query.toLocaleLowerCase('es');
  const filtered = rows.filter((d) => !q || (d.name + ' ' + d.group + ' ' + d.constituency).toLocaleLowerCase('es').includes(q));
  main.innerHTML = '<div class="hero"><div><p class="eyebrow">Personas</p><h1>Diputados</h1><p class="hero-copy">Busca entre quienes han servido en la XV Legislatura. Las métricas describen actividad publicada y evidencia disponible, no una puntuación de trabajo.</p></div></div>' +
    '<div class="toolbar"><input class="input" id="deputySearch" value="' + esc(query) + '" placeholder="Nombre, grupo o circunscripción" aria-label="Buscar diputados"><span class="subtle" style="align-self:center">' + fmt(filtered.length) + ' resultados</span></div>' +
    '<div class="table-wrap"><table><thead><tr><th>Diputado</th><th>Grupo</th><th>Servicio</th><th>Intervenciones</th><th>Días</th><th>Minutos temporizados</th><th>Votos</th><th>Días desconocidos</th></tr></thead><tbody>' +
    (filtered.length ? filtered.map((d) => '<tr><td><a class="deputy-name" href="#/deputy/' + encodeURIComponent(d.deputyId) + '">' + esc(d.name) + '</a><br><span class="subtle">' + esc(d.constituency) + '</span></td><td>' + esc(d.group) + '</td><td>' + esc((d.service || {}).from || '—') + ' — ' + esc((d.service || {}).to || 'actualidad') + '</td><td>' + fmt(d.speechTurns) + '</td><td>' + fmt(d.speakingDays) + '</td><td>' + fmt(d.evidencedMinutes) + '</td><td>' + fmt(d.votesCast) + '</td><td>' + fmt(d.unknownDailyRows) + '</td></tr>').join('') : '<tr><td colspan="8">' + empty('No hay diputados que coincidan') + '</td></tr>') +
    '</tbody></table></div>';
  document.getElementById('deputySearch').addEventListener('input', (e) => { location.hash = '#/deputies?q=' + encodeURIComponent(e.target.value); });
}

const dailyTimeline = (rows) => {
  const recent = rows.slice().sort((a,b) => String(a.date).localeCompare(String(b.date))).slice(-60);
  const max = Math.max(1, ...recent.map((x) => Number(x.evidenceSpanSeconds || 0)));
  return '<div class="timeline">' + recent.map((x) => '<div class="timeline-col" title="' + esc(x.date + ': ' + (x.status || 'unknown')) + '"><div class="timeline-bar ' + (x.status === 'unknown' ? 'unknown' : x.status === 'event_only' ? 'event-only' : '') + '" style="height:' + (x.evidenceSpanSeconds ? Math.max(4, x.evidenceSpanSeconds / max * 100) : 3) + '%"></div><span class="timeline-label">' + esc(String(x.date).slice(5)) + '</span></div>').join('') + '</div>';
};

async function renderDeputy(id) {
  const bundle = await get('/deputies/' + encodeURIComponent(id));
  const interventions = (await get('/interventions?deputyId=' + encodeURIComponent(id) + '&pageSize=1000')).data;
  const topics = {};
  interventions.forEach((x) => (x.topicLabels || [x.topic || 'procedimiento']).forEach((t) => { topics[t] = (topics[t] || 0) + 1; }));
  const d = bundle.deputy, m = bundle.metrics, daily = bundle.dailyPresence || [];
  main.innerHTML = '<a class="back" href="#/deputies">← Todos los diputados</a><div class="profile-head"><div><p class="eyebrow">' + esc(d.group) + ' · ' + esc(d.constituency) + '</p><h1>' + esc(d.name) + '</h1><p class="profile-meta">Servicio: ' + esc((d.service || {}).from || '—') + ' — ' + esc((d.service || {}).to || 'actualidad') + ' · <a href="' + esc(d.profileUrl || d.sourceUrl) + '" target="_blank" rel="noreferrer">ficha oficial ↗</a></p></div><a class="button secondary" href="#/deputy/' + encodeURIComponent(id) + '/daily">Abrir detalle diario →</a></div>' +
    '<div class="grid grid-4" style="margin-top:25px">' + card('Intervenciones', fmt(m.speechTurns), 'turnos atribuidos') + card('Días de voz', fmt(m.speakingDays), 'con al menos una intervención') + card('Tiempo hablado', fmt(m.evidencedMinutes), 'minutos temporizados') + card('Votos', fmt(m.votesCast), 'sin contar “No vota”') + '</div>' +
    '<div class="grid grid-2" style="margin-top:16px"><section class="card"><h3>Temas</h3>' + (Object.keys(topics).length ? '<div class="topic-list">' + Object.entries(topics).sort((a,b) => b[1]-a[1]).map((x) => '<a class="topic-chip" href="#/topics?q=' + encodeURIComponent(x[0]) + '">' + esc(x[0]) + ' <b>' + fmt(x[1]) + '</b></a>').join('') + '</div>' : empty('Sin temas atribuidos')) + '</section><section class="card"><h3>Evidencia de presencia</h3><div class="mini-grid"><div class="mini-metric"><strong>' + fmt(m.presenceEvidence) + '</strong><span>eventos nominales</span></div><div class="mini-metric"><strong>' + fmt(m.remoteVotes) + '</strong><span>votos remotos</span></div><div class="mini-metric"><strong>' + fmt(daily.filter((x) => x.status === 'unknown').length) + '</strong><span>días desconocidos</span></div></div><p class="subtle">Los eventos son señales publicadas; no equivalen a horas de presencia física.</p></section></div>' +
    sectionHead('Evidencia diaria', 'El alto de cada barra es el intervalo entre primera y última señal; los huecos siguen siendo desconocidos') +
    '<section class="card">' + dailyTimeline(daily) + '<div class="legend"><span><i class="observed"></i>Señales temporales</span><span><i class="event-only"></i>Evento sin intervalo</span><span><i class="unknown"></i>Sin evidencia suficiente</span></div><p><a class="button secondary" href="#/deputy/' + encodeURIComponent(id) + '/daily">Ver tabla completa →</a></p></section>' +
    sectionHead('Últimas intervenciones', 'Texto y vídeo permanecen enlazados a las fuentes oficiales') +
    '<div class="table-wrap"><table><thead><tr><th>Fecha / sesión</th><th>Asunto</th><th>Tema</th><th>Hora</th><th>Fuentes</th></tr></thead><tbody>' + (interventions.slice(0,80).map((x) => '<tr><td>' + esc(x.sessionId) + '</td><td>' + esc(x.title || '—') + '</td><td>' + (x.topicLabels || [x.topic || '—']).map((t) => pill(t)).join('') + '</td><td>' + esc((x.start || '—') + ' — ' + (x.end || '—')) + '</td><td>' + (x.textUrl ? '<a href="' + esc(x.textUrl) + '" target="_blank">diario</a> ' : '') + (x.clipUrl ? '<a href="' + esc(x.clipUrl) + '" target="_blank">vídeo</a>' : '') + '</td></tr>').join('') || '<tr><td colspan="5">' + empty('Sin intervenciones') + '</td></tr>') + '</tbody></table></div>';
}

async function renderDeputyDaily(id) {
  const bundle = await get('/deputies/' + encodeURIComponent(id));
  const d = bundle.deputy, rows = bundle.dailyPresence || [];
  main.innerHTML = '<a class="back" href="#/deputy/' + encodeURIComponent(id) + '">← Ficha de ' + esc(d.name) + '</a><div class="hero"><div><p class="eyebrow">Presencia basada en evidencia</p><h1>Un día cada vez</h1><p class="hero-copy">El intervalo mostrado es tiempo entre señales públicas. No es una reconstrucción continua de permanencia en el hemiciclo.</p></div></div><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Estado</th><th>Eventos</th><th>Minutos hablados</th><th>Intervalo de evidencia</th><th>Primera señal</th><th>Última señal</th><th>Votos / remotos</th></tr></thead><tbody>' + rows.slice().sort((a,b) => String(b.date).localeCompare(String(a.date))).map((x) => '<tr><td>' + esc(x.date) + '</td><td>' + pill(x.status || 'unknown', x.status === 'unknown' ? 'red' : x.status === 'event_only' ? 'gold' : 'green') + '</td><td>' + (x.evidenceEventCount == null ? '—' : fmt(x.evidenceEventCount)) + '</td><td>' + (x.interventionSeconds == null ? '—' : Math.round(x.interventionSeconds / 60 * 10) / 10) + '</td><td>' + (x.evidenceSpanSeconds == null ? '—' : Math.round(x.evidenceSpanSeconds / 60 * 10) / 10 + ' min') + '</td><td>' + esc(x.firstEvidenceTime || '—') + '</td><td>' + esc(x.lastEvidenceTime || '—') + '</td><td>' + (x.nominalVoteEvents == null ? '—' : fmt(x.nominalVoteEvents)) + ' / ' + (x.remoteVoteEvents == null ? '—' : fmt(x.remoteVoteEvents)) + '</td></tr>').join('') + '</tbody></table></div>';
}

async function renderSessions() {
  const rows = state.sessions || (state.sessions = (await get('/session-coverage')).data);
  const query = new URLSearchParams(location.hash.split('?')[1] || '').get('q') || '';
  const filtered = rows.filter((x) => !query || (x.date + ' ' + x.statusEvidence + ' ' + x.cancellationStatus).toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')));
  main.innerHTML = '<div class="hero"><div><p class="eyebrow">Calendario y evidencia</p><h1>Sesiones</h1><p class="hero-copy">Comparamos lo que la agenda planificó con lo que tiene una intervención oficial o un índice audiovisual. Una agenda sin registro no demuestra que la sesión se celebrara.</p></div><a class="button secondary" href="/export/session-coverage.csv">Descargar CSV ↗</a></div><div class="toolbar"><input class="input" id="sessionSearch" value="' + esc(query) + '" placeholder="Fecha o estado"><span class="subtle" style="align-self:center">' + fmt(filtered.length) + ' fechas</span></div><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Agenda</th><th>Registro</th><th>Intervenciones</th><th>Audiovisual</th><th>Estado</th><th>Cancelación / reanudación</th></tr></thead><tbody>' + filtered.map((x) => '<tr><td><b>' + esc(x.date) + '</b></td><td>' + fmt(x.plannedAgendaItems) + '</td><td>' + fmt(x.actualSessions) + '</td><td>' + fmt(x.interventions) + '</td><td>' + fmt(x.audiovisualSessions) + '</td><td>' + pill(x.statusEvidence, x.status === 'actual_recorded' ? 'green' : 'gold') + '</td><td class="subtle">' + esc(x.cancellationStatus) + '</td></tr>').join('') + '</tbody></table></div>';
  document.getElementById('sessionSearch').addEventListener('input', (e) => { location.hash = '#/sessions?q=' + encodeURIComponent(e.target.value); });
}

async function renderVotes() {
  const payload = state.votes || (state.votes = await getAll('/votes'));
  main.innerHTML = '<div class="hero"><div><p class="eyebrow">Decisiones nominales</p><h1>Votaciones</h1><p class="hero-copy">Resultados publicados y filas individuales. La participación telemática permanece separada de la presencia física.</p></div><a class="button secondary" href="/export/votes.csv">Descargar CSV ↗</a></div><div class="grid grid-3">' + card('Balotas', fmt(payload.length), 'archivo descargado') + card('Fechas', fmt(new Set(payload.map((x) => x.payload && x.payload.informacion && x.payload.informacion.fecha)).size), 'días con votación') + card('Fuente', 'Oficial', 'totales y filas reconciliados') + '</div><div class="table-wrap" style="margin-top:20px"><table><thead><tr><th>Fecha</th><th>Sesión</th><th>Número</th><th>Presentes publicados</th><th>A favor</th><th>En contra</th><th>Abstenciones</th></tr></thead><tbody>' + payload.slice().reverse().slice(0,500).map((v) => { const i = v.payload && v.payload.informacion || {}, t = v.payload && v.payload.totales || {}; return '<tr><td>' + esc(i.fecha || '—') + '</td><td>' + esc(i.sesion || '—') + '</td><td>' + esc(i.numeroVotacion || v.id) + '</td><td>' + (t.presentes == null ? '—' : t.presentes) + '</td><td>' + (t.afavor == null ? '—' : t.afavor) + '</td><td>' + (t.enContra == null ? '—' : t.enContra) + '</td><td>' + (t.abstenciones == null ? '—' : t.abstenciones) + '</td></tr>'; }).join('') + '</tbody></table></div>';
}

async function renderTopics() {
  const data = state.overview || (state.overview = await get('/overview'));
  const query = new URLSearchParams(location.hash.split('?')[1] || '').get('q') || '';
  const rows = Object.entries(data.topics || {}).filter((x) => !query || x[0].toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))).sort((a,b) => b[1]-a[1]);
  main.innerHTML = '<div class="hero"><div><p class="eyebrow">Contenido</p><h1>Temas</h1><p class="hero-copy">Clasificación de descubrimiento sobre intervenciones y pasajes oficiales. Las etiquetas son multi-tema y conservan evidencia de apoyo.</p></div></div><div class="toolbar"><input class="input" id="topicSearch" value="' + esc(query) + '" placeholder="Buscar tema"><span class="subtle" style="align-self:center">' + fmt(rows.length) + ' temas</span></div><div class="grid grid-3">' + rows.map((x) => '<a class="card" href="#/topics?q=' + encodeURIComponent(x[0]) + '"><span class="metric-label">Tema</span><strong style="display:block;font-size:22px;color:var(--navy);margin:12px 0">' + esc(x[0]) + '</strong><span class="subtle">' + fmt(x[1]) + ' intervenciones etiquetadas</span></a>').join('') + '</div><div class="notice" style="margin-top:18px">Cada etiqueta tiene pasajes de apoyo en el recurso <a href="' + API + '/topic-evidence" target="_blank">topic-evidence</a>. No es una clasificación editorial ni una medida de posición política.</div>';
  document.getElementById('topicSearch').addEventListener('input', (e) => { location.hash = '#/topics?q=' + encodeURIComponent(e.target.value); });
}

async function renderCoverage() {
  const data = state.coverage || (state.coverage = await get('/coverage'));
  const a = data.attribution || {};
  main.innerHTML = '<div class="hero"><div><p class="eyebrow">Transparencia</p><h1>Cobertura y fuentes</h1><p class="hero-copy">Qué se descargó, cuándo se capturó, qué hash tiene cada artefacto y qué huecos permanecen abiertos.</p></div><a class="button secondary" href="' + API + '/coverage" target="_blank">JSON completo ↗</a></div>' +
    '<div class="grid grid-3">' + card('Atribución', pct(a.interventionsWithDeputyId, a.interventionsTotal), fmt(a.interventionsWithDeputyId) + ' de ' + fmt(a.interventionsTotal) + ' intervenciones') + card('Comisiones', '2.323', 'asignaciones importadas') + card('Vídeo revisado', '3 frames', 'muestra manual · sin identificación facial') + '</div>' +
    '<div class="callout" style="margin-top:16px">La ausencia de un registro no se convierte en cero actividad. No hay un registro oficial completo de asistencia física; la métrica diaria debe leerse como evidencia publicada.</div>' +
    sectionHead('Huecos declarados', 'Límites que permanecen visibles en lugar de ocultarse') + '<div class="grid grid-2">' + (data.gaps || []).map((x) => '<div class="card"><span class="pill gold">Gap</span><p>' + esc(x) + '</p></div>').join('') + '</div>' +
    sectionHead('Documentos normalizados', 'Cada fuente conserva URL, captura, parser, tamaño y hash') + '<div class="card source-list">' + (data.sources || []).map((x) => '<div class="source-row"><div><b>' + esc(x.id) + '</b><br><span class="subtle">' + fmt(x.recordCount) + ' registros · ' + esc(x.parserVersion || '—') + '</span></div><div style="text-align:right"><span class="subtle">' + esc(x.retrievedAt || '—') + '</span><br><code>' + esc((x.sha256 || 'sin hash').slice(0,18)) + '…</code></div></div>').join('') + '</div>';
}

async function route() {
  setLoading();
  nav.classList.remove('open');
  const raw = location.hash.replace(/^#\/?/, '');
  const path = raw.split('?')[0];
  try {
    if (!path) { setActiveNav('home'); return await renderHome(); }
    if (path === 'deputies') { setActiveNav('deputies'); return await renderDeputies(); }
    if (path.startsWith('deputy/')) { setActiveNav('deputies'); const parts = path.split('/'); return parts[2] === 'daily' ? await renderDeputyDaily(parts[1]) : await renderDeputy(parts[1]); }
    if (path === 'sessions') { setActiveNav('sessions'); return await renderSessions(); }
    if (path === 'votes') { setActiveNav('votes'); return await renderVotes(); }
    if (path === 'topics') { setActiveNav('topics'); return await renderTopics(); }
    if (path === 'coverage') { setActiveNav('coverage'); return await renderCoverage(); }
    location.hash = '#/';
  } catch (error) { setError(error); }
}
menuButton.addEventListener('click', () => nav.classList.toggle('open'));
window.addEventListener('hashchange', route);
route();
