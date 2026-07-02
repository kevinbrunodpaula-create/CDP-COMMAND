/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — COMMAND SCORE ENGINE                                  ║
 * ║  manager.js — Lógica da tela Consultores                     ║
 * ║  SPR-003 · KR7 Command Manager                               ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

'use strict';

/* ─────────────────────────────────────────────
   ESTADO LOCAL
───────────────────────────────────────────── */
let mgScores     = [];   // ScoreResult[] completo
let mgFiltrados  = [];   // após filtros aplicados
let mgCalcEm     = null;

/* ─────────────────────────────────────────────
   PONTO DE ENTRADA
───────────────────────────────────────────── */
async function initCommandManager() {
  mgMostrarEstado('loading');
  try {
    const scores = await ManagerService.obterScores();
    mgAplicarResultados(scores);
  } catch (err) {
    console.error('[Manager] init error:', err);
    mgMostrarEstado('error', err?.message || String(err));
  }
}

/* ─────────────────────────────────────────────
   CALCULAR (botão)
───────────────────────────────────────────── */
async function mgCalcular() {
  const btn = document.getElementById('mg-btn-calcular');
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="mg-spinner" style="width:13px;height:13px;border-width:2px"></span> Calculando...`; }
  mgMostrarEstado('loading');
  try {
    const scores = await ManagerService.reprocessar();
    mgAplicarResultados(scores);
    showToast(`✅ Score calculado — ${scores.length} consultores`, 'success');
  } catch (err) {
    mgMostrarEstado('error', err?.message || String(err));
    showToast('Erro no cálculo: ' + err?.message || String(err), 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg> Calcular Scores`;
    }
  }
}

/* ─────────────────────────────────────────────
   APLICAR RESULTADOS
───────────────────────────────────────────── */
function mgAplicarResultados(scores) {
  mgScores    = scores;
  mgFiltrados = scores;
  mgCalcEm    = new Date().toISOString();

  if (scores.length === 0) { mgMostrarEstado('empty'); return; }

  mgMostrarEstado(null);
  mgRenderTeamBar(scores);
  mgPopularFiltros(scores);
  mgRenderGrid(scores);
  mgAtualizarMeta(scores.length);
}

/* ─────────────────────────────────────────────
   BARRA DO TIME
───────────────────────────────────────────── */
function mgRenderTeamBar(scores) {
  const media    = Math.round(scores.reduce((a,s) => a+s.score, 0) / scores.length);
  const totalLeads = scores.reduce((a,s) => a+s.stats.totalLeads, 0);
  const totalVendas = scores.reduce((a,s) => a+s.stats.vendas, 0);
  const totalCriticos = scores.reduce((a,s) => a+s.stats.criticos, 0);
  const nivelMedia = getScoreLevel(media);
  const cfg = SCORE_LEVEL_CFG[nivelMedia] || SCORE_LEVEL_CFG['Bom'];

  const wrap = document.getElementById('mg-team-bar');
  if (!wrap) return;
  wrap.innerHTML = `
    <div>
      <div class="mg-team-score-val" style="color:${cfg.color}">${media}</div>
      <div class="mg-team-score-lbl">Score médio</div>
    </div>
    <div class="mg-team-bar-track">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:10px;color:#475569">Performance da equipe</span>
        <span style="font-size:10px;color:${cfg.color}">${nivelMedia}</span>
      </div>
      <div class="mg-team-bar-bg">
        <div class="mg-team-bar-fill" style="width:${media}%;background:linear-gradient(90deg,${cfg.color}88,${cfg.color})"></div>
      </div>
    </div>
    <div class="mg-team-stats">
      <div class="mg-team-stat"><div class="mg-team-stat-val">${scores.length}</div><div class="mg-team-stat-lbl">Consultores</div></div>
      <div class="mg-team-stat"><div class="mg-team-stat-val">${totalLeads}</div><div class="mg-team-stat-lbl">Leads</div></div>
      <div class="mg-team-stat"><div class="mg-team-stat-val">${totalVendas}</div><div class="mg-team-stat-lbl">Vendas</div></div>
      <div class="mg-team-stat" style="color:#EF4444"><div class="mg-team-stat-val" style="color:#EF4444">${totalCriticos}</div><div class="mg-team-stat-lbl">Críticos</div></div>
    </div>`;
}

/* ─────────────────────────────────────────────
   FILTROS
───────────────────────────────────────────── */
function mgPopularFiltros(scores) {
  const niveis = [...new Set(scores.map(s => s.nivel))];
  const sel = document.getElementById('mg-f-nivel');
  if (!sel) return;
  while (sel.options.length > 1) sel.remove(1);
  niveis.forEach(n => { const o = document.createElement('option'); o.value=n; o.textContent=`${SCORE_LEVEL_CFG[n]?.emoji||''} ${n}`; sel.appendChild(o); });
}

function mgAplicarFiltros() {
  const nivel = document.getElementById('mg-f-nivel')?.value || '';
  const busca = (document.getElementById('mg-f-busca')?.value || '').trim();
  mgFiltrados = ManagerService.aplicarFiltros(mgScores, { nivel: nivel||undefined, busca: busca||undefined });
  mgRenderGrid(mgFiltrados);
}

function mgLimparFiltros() {
  const n = document.getElementById('mg-f-nivel'); if (n) n.value='';
  const b = document.getElementById('mg-f-busca'); if (b) b.value='';
  mgFiltrados = mgScores;
  mgRenderGrid(mgScores);
}

/* ─────────────────────────────────────────────
   GRID DE CARDS
───────────────────────────────────────────── */
function mgRenderGrid(scores) {
  const grid = document.getElementById('mg-grid');
  const count = document.getElementById('mg-result-count');
  if (count) count.textContent = `${scores.length} consultor${scores.length!==1?'es':''}`;
  if (!grid) return;

  if (scores.length === 0) {
    grid.innerHTML = `<div class="mg-state" style="grid-column:1/-1"><div class="mg-state-icon">🔍</div><div class="mg-state-title">Nenhum consultor encontrado.</div></div>`;
    return;
  }

  grid.innerHTML = scores.map(s => mgRenderCard(s)).join('');
}

function mgRenderCard(s) {
  const cfg       = s.cfg || SCORE_LEVEL_CFG[s.nivel] || SCORE_LEVEL_CFG['Bom'];
  const initials  = s.corretor.nome.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const diasStr   = s.stats.ultimaAtividade ? mgDiasStr(s.stats.ultimaAtividade) : 'Sem atividade';
  const nivelCls  = 'mg-' + s.nivel.replace('ã','a').replace('ç','c');

  return `
    <div class="mg-card ${nivelCls}" onclick="mgAbrirDetalhe('${escMg(s.corretor.nome)}')">
      <div class="mg-card-top">
        <div class="mg-avatar" style="background:${cfg.bg};border-color:${cfg.border};color:${cfg.color}">${initials}</div>
        <div class="mg-card-info">
          <div class="mg-card-nome">${escMg(s.corretor.nome)}</div>
          <div class="mg-card-cargo">${escMg(s.corretor.cargo||'Corretor')}</div>
        </div>
        <div class="mg-score-wrap">
          <div class="mg-score-val" style="color:${cfg.color}">${s.score}</div>
          <div class="mg-score-label" style="color:${cfg.color}">/100</div>
        </div>
      </div>

      <div class="mg-score-bar">
        <div class="mg-score-bar-bg">
          <div class="mg-score-bar-fill" style="width:${s.score}%;background:${cfg.color}"></div>
        </div>
      </div>

      <div class="mg-card-stats">
        <div class="mg-stat"><div class="mg-stat-val">${s.stats.totalLeads}</div><div class="mg-stat-lbl">Leads</div></div>
        <div class="mg-stat"><div class="mg-stat-val" style="color:#22C55E">${s.stats.vendas}</div><div class="mg-stat-lbl">Vendas</div></div>
        <div class="mg-stat"><div class="mg-stat-val" style="color:${s.stats.criticos>0?'#EF4444':'#475569'}">${s.stats.criticos}</div><div class="mg-stat-lbl">Críticos</div></div>
        <div class="mg-stat"><div class="mg-stat-val" style="color:${cfg.color}">${cfg.emoji}</div><div class="mg-stat-lbl">${s.nivel}</div></div>
      </div>

      <div class="mg-card-footer">
        <div class="mg-card-last">⏱ ${diasStr}</div>
        <span class="mg-nivel-badge" style="color:${cfg.color};background:${cfg.bg};border-color:${cfg.border}">${cfg.emoji} ${s.nivel}</span>
      </div>
    </div>`;
}

/* ─────────────────────────────────────────────
   PAINEL DE DETALHAMENTO
───────────────────────────────────────────── */
async function mgAbrirDetalhe(nome) {
  // Garante scores calculados
  const scores = mgScores.length > 0 ? mgScores : await ManagerService.obterScores();
  const s = scores.find(x => x.corretor.nome === nome);
  if (!s) return;

  const cfg       = s.cfg || SCORE_LEVEL_CFG[s.nivel] || SCORE_LEVEL_CFG['Bom'];
  const initials  = s.corretor.nome.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  // Monta o painel
  const overlay   = document.createElement('div');
  overlay.className = 'mg-detail-overlay';
  overlay.id        = 'mg-detail-overlay';
  overlay.onclick   = e => { if (e.target === overlay) mgFecharDetalhe(); };

  overlay.innerHTML = `
    <div class="mg-detail-panel" id="mg-detail-panel">
      <div class="mg-detail-header">
        <div class="mg-avatar" style="width:40px;height:40px;border-radius:12px;background:${cfg.bg};border-color:${cfg.border};color:${cfg.color};font-size:14px">${initials}</div>
        <div>
          <div style="font-size:14px;font-weight:600;color:#F0FDF4;letter-spacing:-0.02em">${escMg(s.corretor.nome)}</div>
          <div style="font-size:11px;color:#64748B">${escMg(s.corretor.cargo||'Corretor')}</div>
        </div>
        <button class="mg-detail-close" onclick="mgFecharDetalhe()">✕</button>
      </div>

      <div class="mg-detail-body">

        <!-- Score grande -->
        <div class="mg-detail-score-wrap" style="background:${cfg.bg};border-color:${cfg.border}">
          <div class="mg-detail-score-big" style="color:${cfg.color}">${s.score}</div>
          <div class="mg-detail-score-info">
            <div class="mg-detail-score-nivel" style="color:${cfg.color}">${cfg.emoji} ${s.nivel}</div>
            <div class="mg-detail-score-lbl">Score COMMAND · calculado agora</div>
            <div style="margin-top:6px;height:4px;background:rgba(255,255,255,0.05);border-radius:2px;overflow:hidden">
              <div style="width:${s.score}%;height:100%;border-radius:2px;background:${cfg.color};transition:width .6s ease"></div>
            </div>
          </div>
        </div>

        <!-- Explicação textual -->
        <div style="background:var(--bg-input);border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:14px">
          <div class="mg-breakdown-title" style="margin-bottom:6px">⚡ O que o COMMAND encontrou</div>
          <div style="font-size:12px;color:#94A3B8;line-height:1.8">
            Score atual de <strong style="color:${cfg.color}">${s.score}/100</strong>. Nível <strong style="color:${cfg.color}">${s.nivel}</strong>.
            ${s.positivos.length > 0
              ? `<br>Pontos fortes: ${s.positivos.map(d=>`<em style="color:#86EFAC">${d.label.toLowerCase()}</em>`).join(', ')}.`
              : ''}
            ${s.negativos.length > 0
              ? `<br>Pontos de atenção: ${s.negativos.map(d=>`<em style="color:#FCA5A5">${d.label.toLowerCase()}</em>`).join(', ')}.`
              : ''}
          </div>
        </div>

        <!-- Breakdown por critério -->
        <div>
          <div class="mg-breakdown-title">Critérios utilizados</div>
          <table class="mg-breakdown-table">
            ${s.dimensoes.map(d => `
              <tr>
                <td>${escMg(d.label)}</td>
                <td style="color:${d.pontos>0?'#22C55E':d.pontos<0?'#EF4444':'#475569'};font-weight:600">
                  ${d.pontos>0?'+':''}${d.pontos}${d.max?' / '+d.max:''}
                </td>
                <td>${escMg(d.detalhe)}</td>
              </tr>`).join('')}
            <tr style="border-top:1px solid rgba(255,255,255,0.08)">
              <td style="font-weight:600;color:#F0FDF4">Total</td>
              <td style="color:${cfg.color};font-weight:700;font-size:13px">${s.score}/100</td>
              <td></td>
            </tr>
          </table>
        </div>

        <!-- Pontos positivos -->
        ${s.positivos.length > 0 ? `
        <div>
          <div class="mg-section-title">✅ Pontos positivos</div>
          <div class="mg-point-list">
            ${s.positivos.map(d => `<div class="mg-point-item mg-point-pos">✓ ${escMg(d.detalhe)}</div>`).join('')}
          </div>
        </div>` : ''}

        <!-- Pontos negativos -->
        ${s.negativos.length > 0 ? `
        <div>
          <div class="mg-section-title">⚠️ Pontos de atenção</div>
          <div class="mg-point-list">
            ${s.negativos.map(d => `<div class="mg-point-item mg-point-neg">✗ ${escMg(d.detalhe)}</div>`).join('')}
          </div>
        </div>` : ''}

        <!-- Sugestões do COMMAND -->
        <div>
          <div class="mg-section-title">💡 Recomendações do COMMAND</div>
          <div class="mg-point-list">
            ${s.sugestoes.map(sug => `<div class="mg-sugestao-item"><span>→</span><span>${escMg(sug)}</span></div>`).join('')}
          </div>
        </div>

        <!-- Histórico de scores -->
        <div>
          <div class="mg-section-title">📈 Histórico de scores</div>
          <div id="mg-hist-${s.corretor.nome.replace(/\s/g,'_')}">
            <div style="font-size:11px;color:#374151">Carregando histórico…</div>
          </div>
        </div>

      </div>
    </div>`;

  document.body.appendChild(overlay);

  // Carrega histórico async
  mgCarregarHistorico(s.corretor.nome);

  // Fecha com Escape
  document.addEventListener('keydown', mgEscKey);
}

async function mgCarregarHistorico(nome) {
  const histId = `mg-hist-${nome.replace(/\s/g,'_')}`;
  const wrap = document.getElementById(histId);
  if (!wrap) return;
  try {
    const eventos = await ManagerRepository.findScoreHistory(nome, 8);
    if (!eventos || eventos.length === 0) {
      wrap.innerHTML = `<div class="mg-hist-item"><span class="mg-hist-desc" style="color:#374151">Nenhum histórico ainda — calcule o score para registrar.</span></div>`;
      return;
    }
    wrap.innerHTML = eventos.map(ev => {
      let meta = {};
      try { meta = ev.metadata ? JSON.parse(ev.metadata) : {}; } catch {}
      return `<div class="mg-hist-item">
        <div class="mg-hist-ts">${mgFmtTs(ev.timestamp)}</div>
        <div class="mg-hist-desc">${escMg(ev.descricao)}</div>
      </div>`;
    }).join('');
  } catch {
    wrap.innerHTML = `<div class="mg-hist-item"><span style="color:#374151;font-size:11px">Histórico indisponível.</span></div>`;
  }
}

function mgFecharDetalhe() {
  const overlay = document.getElementById('mg-detail-overlay');
  if (overlay) overlay.remove();
  document.removeEventListener('keydown', mgEscKey);
}

function mgEscKey(e) { if (e.key === 'Escape') mgFecharDetalhe(); }

/* ─────────────────────────────────────────────
   ESTADOS
───────────────────────────────────────────── */
function mgMostrarEstado(estado, msg) {
  ['mg-state-loading','mg-state-empty','mg-state-error'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display='none';
  });
  const conteudo = document.getElementById('mg-conteudo');
  if (conteudo) conteudo.style.display = estado ? 'none' : 'block';
  if (estado === 'loading') { const el = document.getElementById('mg-state-loading'); if (el) el.style.display='flex'; }
  else if (estado === 'empty')  { const el = document.getElementById('mg-state-empty');  if (el) el.style.display='flex'; }
  else if (estado === 'error') {
    const el = document.getElementById('mg-state-error'); if (el) el.style.display='flex';
    const me = document.getElementById('mg-error-msg');   if (me && msg) me.textContent=msg;
  }
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function mgDiasStr(iso) {
  if (!iso) return 'Sem atividade';
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias === 0) return 'Ativo hoje';
  if (dias === 1) return 'Ativo ontem';
  return `${dias} dias atrás`;
}

function mgFmtTs(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  } catch { return ts; }
}

function mgAtualizarMeta(total) {
  const el = document.getElementById('mg-header-meta');
  if (el) el.textContent = `${total} consultor${total!==1?'es':''} · calculado em ${mgFmtTs(mgCalcEm)}`;
}

function escMg(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
