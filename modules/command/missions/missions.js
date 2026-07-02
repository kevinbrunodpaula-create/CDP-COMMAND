/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — SMART MISSIONS ENGINE                                 ║
 * ║  missions.js — Lógica da tela Missões                        ║
 * ║  SPR-007 · KR7 Command Operation                             ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

'use strict';

/* ── Estado ── */
let msView       = 'consultor';   // 'consultor' | 'gestor'
let msMissoes    = [];            // missões do usuário atual
let msFiltradas  = [];
let msStatsCache = null;

/* ─────────────────────────────────────────────
   PONTO DE ENTRADA
───────────────────────────────────────────── */
async function initCommandMissions() {
  msMostrarEstado('loading');
  try {
    await MissionService.obterMissoes();
    await msRenderView();
  } catch (err) {
    console.error('[Missions] init error:', err);
    msMostrarEstado('error', err?.message || String(err));
  }
}

/* ── Botão gerar ── */
async function msGerar() {
  const btn = document.getElementById('ms-btn-gerar');
  if (btn) { btn.disabled=true; btn.innerHTML=`<span class="ms-spinner" style="width:12px;height:12px;border-width:2px"></span> Gerando…`; }
  msMostrarEstado('loading');
  try {
    await MissionService.reprocessar();
    await msRenderView();
    showToast('🎯 Missões geradas para hoje!', 'success');
  } catch (err) {
    msMostrarEstado('error', err?.message || String(err));
    showToast('Erro: ' + err?.message || String(err), 'error');
  } finally {
    if (btn) { btn.disabled=false; btn.innerHTML=`<svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> Gerar Missões`; }
  }
}

/* ── Toggle de view ── */
function msSetView(view) {
  msView = view;
  document.querySelectorAll('.ms-tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
  msRenderView();
}

/* ─────────────────────────────────────────────
   RENDER PRINCIPAL
───────────────────────────────────────────── */
async function msRenderView() {
  msMostrarEstado(null);
  const isGestor = perm('verTodos');

  // Mostra/esconde tabs
  const tabsWrap = document.getElementById('ms-tabs');
  if (tabsWrap) tabsWrap.style.display = isGestor ? 'flex' : 'none';
  if (!isGestor) msView = 'consultor';

  if (msView === 'gestor') {
    await msRenderGestor();
  } else {
    await msRenderConsultor();
  }
}

/* ─────────────────────────────────────────────
   VIEW DO CONSULTOR
───────────────────────────────────────────── */
async function msRenderConsultor() {
  const nome    = currentUser?.nome || '';
  const mapa    = await MissionService.obterMissoes();
  const xpTotal = MissionRepository.getXP(nome);
  const nivel   = getNivel(xpTotal);
  const proximo = getProximoNivel(xpTotal);

  msMissoes   = mapa[nome] || [];
  msFiltradas = msMissoes;

  const pendentes   = msMissoes.filter(m => m.status === MissionStatus.PENDENTE).length;
  const concluidas  = msMissoes.filter(m => m.status === MissionStatus.CONCLUIDA).length;
  const criticas    = msMissoes.filter(m => m.prioridade === MissionPriority.CRITICA && m.status === MissionStatus.PENDENTE).length;

  const conteudo = document.getElementById('ms-conteudo');
  if (!conteudo) return;

  const pctNivel = proximo
    ? Math.round(((xpTotal - nivel.minXP) / (proximo.minXP - nivel.minXP)) * 100)
    : 100;

  conteudo.innerHTML = `
    <!-- XP Bar do consultor -->
    <div class="ms-xp-bar-wrap">
      <div class="ms-xp-avatar" style="background:${nivel.bg};border-color:${nivel.color}40">${nivel.emoji}</div>
      <div class="ms-xp-info">
        <div class="ms-xp-nome">${msEsc(nome)}</div>
        <div class="ms-xp-level" style="color:${nivel.color}">${nivel.emoji} ${nivel.nome}${proximo?` → ${proximo.emoji} ${proximo.nome}`:' (Nível máximo)'}</div>
        <div class="ms-xp-bar-bg">
          <div class="ms-xp-bar-fill" style="width:${pctNivel}%;background:${nivel.color}"></div>
        </div>
      </div>
      <div class="ms-xp-pts">
        <div class="ms-xp-pts-val" style="color:${nivel.color}">${xpTotal}</div>
        <div class="ms-xp-pts-lbl">XP total</div>
      </div>
    </div>

    <!-- KPIs do dia -->
    <div class="ms-kpis">
      <div class="ms-kpi"><div class="ms-kpi-val">${pendentes}</div><div class="ms-kpi-lbl">Pendentes</div></div>
      <div class="ms-kpi"><div class="ms-kpi-val" style="color:#22C55E">${concluidas}</div><div class="ms-kpi-lbl">Concluídas</div></div>
      <div class="ms-kpi"><div class="ms-kpi-val" style="color:#EF4444">${criticas}</div><div class="ms-kpi-lbl">Críticas</div></div>
      <div class="ms-kpi"><div class="ms-kpi-val">${msMissoes.length}</div><div class="ms-kpi-lbl">Total do dia</div></div>
    </div>

    <!-- Filtros -->
    <div class="ms-filters">
      <div class="ms-filter-group">
        <div class="ms-filter-label">Prioridade</div>
        <select class="ms-filter-select" id="ms-f-prio" onchange="msAplicarFiltros()">
          <option value="">Todas</option>
          <option value="CRITICA">🔴 Crítica</option>
          <option value="ALTA">🟠 Alta</option>
          <option value="MEDIA">🟡 Média</option>
          <option value="BAIXA">🟢 Baixa</option>
        </select>
      </div>
      <div class="ms-filter-group">
        <div class="ms-filter-label">Status</div>
        <select class="ms-filter-select" id="ms-f-status" onchange="msAplicarFiltros()">
          <option value="">Todos</option>
          <option value="PENDENTE">Pendente</option>
          <option value="CONCLUIDA">Concluída</option>
          <option value="EXPIRADA">Expirada</option>
        </select>
      </div>
      <div class="ms-filter-group" style="flex:1;min-width:150px">
        <div class="ms-filter-label">Pesquisar</div>
        <input type="text" class="ms-filter-input" id="ms-f-busca" placeholder="Lead ou missão…" oninput="msAplicarFiltros()">
      </div>
      <button class="ms-btn-limpar" onclick="msLimparFiltros()">Limpar</button>
      <span class="ms-result-count" id="ms-result-count">—</span>
    </div>

    <!-- Lista de missões -->
    <div class="ms-list" id="ms-list">
      ${msMissoes.length === 0
        ? `<div class="ms-state"><div class="ms-state-icon">🎯</div><div class="ms-state-title">Sem missões para hoje</div><div class="ms-state-sub">Clique em "Gerar Missões" para o COMMAND analisar sua carteira.</div></div>`
        : msMissoes.map(m => msRenderCard(m)).join('')
      }
    </div>

    <!-- Botão resumo diário -->
    ${concluidas > 0 ? `
    <div style="text-align:center;padding:8px">
      <button onclick="msAbrirResumoDiario()" style="padding:8px 20px;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:9px;color:#FBBF24;font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;transition:all .15s;" onmouseover="this.style.background='rgba(251,191,36,0.15)'" onmouseout="this.style.background='rgba(251,191,36,0.08)'">
        📊 Ver resumo do dia
      </button>
    </div>` : ''}
  `;

  msAtualizarContador(msMissoes);
  msAtualizarMeta();
}

/* ─────────────────────────────────────────────
   VIEW DO GESTOR
───────────────────────────────────────────── */
async function msRenderGestor() {
  const stats = await MissionService.getStatsEquipe();
  msStatsCache = stats;
  const conteudo = document.getElementById('ms-conteudo');
  if (!conteudo) return;

  const pctCls = p => p >= 70 ? '#22C55E' : p >= 40 ? '#EAB308' : '#EF4444';

  conteudo.innerHTML = `
    <!-- KPIs da equipe -->
    <div class="ms-kpis">
      <div class="ms-kpi"><div class="ms-kpi-val">${stats.totalPendentes}</div><div class="ms-kpi-lbl">Pendentes</div></div>
      <div class="ms-kpi"><div class="ms-kpi-val" style="color:#22C55E">${stats.totalConcluidas}</div><div class="ms-kpi-lbl">Concluídas</div></div>
      <div class="ms-kpi"><div class="ms-kpi-val" style="color:#EAB308">${stats.taxaGeral}%</div><div class="ms-kpi-lbl">Taxa conclusão</div></div>
      <div class="ms-kpi"><div class="ms-kpi-val" style="color:#EF4444">${stats.atrasados.length}</div><div class="ms-kpi-lbl">Atrasados</div></div>
    </div>

    <div class="ms-gestor-grid">
      <!-- Top 5 mais produtivos -->
      <div class="ms-gestor-box">
        <div class="ms-gestor-title">🏆 Top 5 do dia</div>
        ${stats.top5.length === 0
          ? `<div style="font-size:11px;color:#374151">Sem dados ainda.</div>`
          : stats.top5.map((c,i) => `
            <div class="ms-rank-item">
              <div class="ms-rank-pos">${i+1}</div>
              <div class="ms-rank-nome">${msEsc(c.nome.split(' ')[0])}</div>
              <div class="ms-taxa-bar"><div class="ms-taxa-fill" style="width:${c.taxa}%;background:${pctCls(c.taxa)}"></div></div>
              <div class="ms-rank-val" style="color:${pctCls(c.taxa)}">${c.taxa}%</div>
              <div style="font-size:9px;color:#475569;font-family:'DM Mono',monospace;width:32px;text-align:right">${c.conc}✓</div>
            </div>`).join('')}
      </div>

      <!-- Consultores atrasados -->
      <div class="ms-gestor-box">
        <div class="ms-gestor-title">⚠️ Precisam de atenção</div>
        ${stats.atrasados.length === 0
          ? `<div style="font-size:11px;color:#22C55E">Equipe em dia! ✓</div>`
          : stats.atrasados.map(c => `
            <div class="ms-rank-item">
              <div class="ms-rank-nome">${msEsc(c.nome.split(' ')[0])}</div>
              <div class="ms-rank-val" style="color:#EF4444">${c.taxa}%</div>
              <div style="font-size:9px;color:#475569;font-family:'DM Mono',monospace">${c.pend} pend.</div>
            </div>`).join('')}
      </div>

      <!-- Ranking XP completo -->
      <div class="ms-gestor-box" style="grid-column:1/-1">
        <div class="ms-gestor-title">⭐ Ranking XP da equipe</div>
        <div style="display:flex;flex-direction:column;gap:2px">
          ${stats.porConsultor.sort((a,b) => b.xp - a.xp).map((c,i) => {
            const nv = getNivel(c.xp);
            const pct = Math.min(100, Math.round((c.xp/Math.max(...stats.porConsultor.map(x=>x.xp),1))*100));
            return `
              <div class="ms-rank-item">
                <div class="ms-rank-pos">${i+1}</div>
                <div style="font-size:14px;width:20px;text-align:center;flex-shrink:0">${nv.emoji}</div>
                <div class="ms-rank-nome" style="min-width:80px">${msEsc(c.nome.split(' ')[0])}</div>
                <div style="font-size:9px;color:${nv.color};font-family:'DM Mono',monospace;width:60px;flex-shrink:0">${nv.nome}</div>
                <div class="ms-taxa-bar" style="width:100px"><div class="ms-taxa-fill" style="width:${pct}%;background:${nv.color}"></div></div>
                <div class="ms-rank-val" style="color:${nv.color}">${c.xp} XP</div>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;

  msAtualizarMeta();
}

/* ─────────────────────────────────────────────
   RENDER CARD DE MISSÃO
───────────────────────────────────────────── */
function msRenderCard(m) {
  const cfg       = m.cfg || PRIORITY_CFG[m.prioridade] || PRIORITY_CFG.MEDIA;
  const isPend    = m.status === MissionStatus.PENDENTE;
  const isConc    = m.status === MissionStatus.CONCLUIDA;
  const isExp     = m.status === MissionStatus.EXPIRADA;
  const prazoDate = new Date(m.prazo);
  const agora     = new Date();
  const hPrazo    = Math.round((prazoDate - agora) / 3_600_000);
  const prazoStr  = isConc ? 'Concluída' : isExp ? 'Expirada' : hPrazo <= 0 ? 'Vencida' : hPrazo < 2 ? `${Math.round(hPrazo*60)}min` : `${hPrazo}h`;
  const prazoUrg  = isPend && (hPrazo <= 2 || isExp);

  return `
    <div class="ms-card ${isConc?'concluida':''} ${isExp?'expirada':''}" id="ms-card-${m.id}">
      <div class="ms-card-priority" style="background:${cfg.bg};border-color:${cfg.border}">${cfg.emoji}</div>
      <div class="ms-card-body">
        <div class="ms-card-desc">${msEsc(m.descricao)}</div>
        <div class="ms-card-meta">
          <span class="ms-badge-tipo">${msEsc(m.tipo)}</span>
          <span class="ms-badge-pts">+${m.pontos} pts · +${m.xp} XP</span>
          <span class="ms-badge-prazo ${prazoUrg?'urgente':'normal'}">${msEsc(prazoStr)}</span>
          ${m.tempoEstimado?`<span style="font-size:9.5px;color:#374151;font-family:'DM Mono',monospace">~${m.tempoEstimado}min</span>`:''}
        </div>
        <div class="ms-card-motivo">${msEsc(m.motivo)}</div>
        ${m.lead?`<div style="font-size:10px;color:#475569;margin-top:3px;font-family:'DM Mono',monospace">Lead: ${msEsc(m.lead.nome)}</div>`:''}
        ${isPend ? `
        <div class="ms-card-actions">
          <button class="ms-btn-concluir" onclick="msConcluir('${msEsc(m.id)}')">✓ Concluir</button>
          <button class="ms-btn-skip" onclick="msCancelar('${msEsc(m.id)}')">Ignorar</button>
        </div>` : isConc ? `<span class="ms-badge-status-ok">✓ Concluída${m.concluidaEm?' · '+msFmtTs(m.concluidaEm):''}</span>` : isExp ? `<span class="ms-badge-status-exp">✕ Expirada</span>` : ''}
      </div>
    </div>`;
}

/* ─────────────────────────────────────────────
   AÇÕES
───────────────────────────────────────────── */
async function msConcluir(missionId) {
  const nome = currentUser?.nome || '';
  try {
    const resultado = await MissionService.concluir(nome, missionId);
    if (!resultado?.xp) return;

    // Atualiza card no DOM
    const card = document.getElementById(`ms-card-${missionId}`);
    if (card) {
      card.classList.add('concluida');
      const actions = card.querySelector('.ms-card-actions');
      if (actions) actions.outerHTML = `<span class="ms-badge-status-ok">✓ Concluída agora</span>`;
    }

    // XP popup
    msShowXPPopup(resultado.pontos, resultado.xp, resultado.nivel, resultado.xpTotal);

    // Atualiza KPIs sem re-renderizar tudo
    await msRenderConsultor();
  } catch (err) {
    showToast('Erro ao concluir: ' + err?.message || String(err), 'error');
  }
}

async function msCancelar(missionId) {
  const nome = currentUser?.nome || '';
  await MissionService.cancelar(nome, missionId);
  const card = document.getElementById(`ms-card-${missionId}`);
  if (card) card.style.display = 'none';
}

/* ─────────────────────────────────────────────
   XP POPUP
───────────────────────────────────────────── */
function msShowXPPopup(pontos, xp, nivel, xpTotal) {
  const existing = document.getElementById('ms-xp-popup');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.className = 'ms-xp-popup';
  popup.id        = 'ms-xp-popup';
  const nv = nivel || getNivel(xpTotal || 0);
  popup.innerHTML = `
    <div class="ms-xp-popup-icon">${nv.emoji}</div>
    <div>
      <div class="ms-xp-popup-pts">+${pontos} pts · +${xp} XP</div>
      <div class="ms-xp-popup-sub">Missão concluída! · ${nv.nome}</div>
    </div>`;
  document.body.appendChild(popup);
  setTimeout(() => {
    popup.style.transition = 'opacity .4s';
    popup.style.opacity    = '0';
    setTimeout(() => popup.remove(), 400);
  }, 2800);
}

/* ─────────────────────────────────────────────
   RESUMO DIÁRIO
───────────────────────────────────────────── */
function msAbrirResumoDiario() {
  const nome    = currentUser?.nome || '';
  const summary = MissionRepository.getDailySummary(nome);
  const xpTotal = MissionRepository.getXP(nome);
  const nivel   = getNivel(xpTotal);

  const overlay = document.createElement('div');
  overlay.className = 'ms-summary-overlay';
  overlay.onclick   = e => { if(e.target===overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div class="ms-summary-panel">
      <div class="ms-summary-header">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="font-size:28px">${nivel.emoji}</div>
          <div>
            <div style="font-size:15px;font-weight:600;color:#F0FDF4">Resumo do Dia</div>
            <div style="font-size:10px;color:#64748B;font-family:'DM Mono',monospace">${new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})}</div>
          </div>
        </div>
        <button onclick="this.closest('.ms-summary-overlay').remove()" style="background:transparent;border:none;color:#64748B;font-size:18px;cursor:pointer;padding:4px">✕</button>
      </div>
      <div class="ms-summary-body">
        <div class="ms-summary-stat"><span class="ms-summary-lbl">Missões concluídas</span><span class="ms-summary-val" style="color:#22C55E">${summary.concluidas}</span></div>
        <div class="ms-summary-stat"><span class="ms-summary-lbl">XP ganho hoje</span><span class="ms-summary-val" style="color:#FBBF24">+${summary.xpHoje} XP</span></div>
        <div class="ms-summary-stat"><span class="ms-summary-lbl">Pontos acumulados</span><span class="ms-summary-val">+${summary.ptsHoje}</span></div>
        <div class="ms-summary-stat"><span class="ms-summary-lbl">XP total</span><span class="ms-summary-val" style="color:${nivel.color}">${xpTotal} XP</span></div>
        <div class="ms-summary-stat"><span class="ms-summary-lbl">Nível atual</span><span class="ms-summary-val" style="color:${nivel.color}">${nivel.emoji} ${nivel.nome}</span></div>
        ${summary.concluidas > 0 ? `
        <div style="background:rgba(34,197,94,0.05);border:1px solid rgba(34,197,94,0.12);border-radius:10px;padding:12px;font-size:12px;color:#86EFAC;text-align:center;line-height:1.7">
          Ótimo trabalho hoje! Continue assim para subir de nível. 🚀
        </div>` : `
        <div style="background:rgba(251,191,36,0.04);border:1px solid rgba(251,191,36,0.12);border-radius:10px;padding:12px;font-size:12px;color:#FEF08A;text-align:center;line-height:1.7">
          Complete suas missões do dia para ganhar XP e subir de nível.
        </div>`}
      </div>
    </div>`;

  document.body.appendChild(overlay);
}

/* ─────────────────────────────────────────────
   FILTROS
───────────────────────────────────────────── */
function msAplicarFiltros() {
  const prio  = document.getElementById('ms-f-prio')?.value || '';
  const stat  = document.getElementById('ms-f-status')?.value || '';
  const busca = (document.getElementById('ms-f-busca')?.value || '').trim();

  msFiltradas = MissionService.filtrarMissoes(msMissoes, {
    prioridade: prio||undefined, status: stat||undefined, busca: busca||undefined,
  });

  const list = document.getElementById('ms-list');
  if (list) {
    list.innerHTML = msFiltradas.length === 0
      ? `<div class="ms-state"><div class="ms-state-title">Nenhuma missão encontrada.</div></div>`
      : msFiltradas.map(m => msRenderCard(m)).join('');
  }
  msAtualizarContador(msFiltradas);
}

function msLimparFiltros() {
  ['ms-f-prio','ms-f-status'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  const b=document.getElementById('ms-f-busca'); if(b) b.value='';
  msFiltradas = msMissoes;
  const list = document.getElementById('ms-list');
  if (list) list.innerHTML = msMissoes.map(m => msRenderCard(m)).join('');
  msAtualizarContador(msMissoes);
}

/* ─────────────────────────────────────────────
   ESTADOS / HELPERS
───────────────────────────────────────────── */
function msMostrarEstado(estado, msg) {
  const load = document.getElementById('ms-state-loading');
  const err  = document.getElementById('ms-state-error');
  const cont = document.getElementById('ms-conteudo');
  if (load) load.style.display = estado === 'loading' ? 'flex' : 'none';
  if (err)  { err.style.display = estado === 'error' ? 'flex' : 'none'; if(msg){ const el=document.getElementById('ms-error-msg'); if(el) el.textContent=msg; } }
  if (cont) cont.style.display = estado ? 'none' : 'block';
}

function msAtualizarContador(missoes) {
  const el = document.getElementById('ms-result-count');
  if (el) el.textContent = `${missoes.length} missão${missoes.length!==1?'ões':''}`;
}

function msAtualizarMeta() {
  const el = document.getElementById('ms-header-meta');
  const ts = MissionService.getGeradoEm();
  if (el) el.textContent = ts ? `Geradas em ${msFmtTs(ts)}` : 'Clique em "Gerar Missões" para começar.';
}

function msFmtTs(ts) {
  if(!ts) return '—';
  try {
    const d=new Date(ts);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  } catch { return ts; }
}

function msEsc(str) {
  if(!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
