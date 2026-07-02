/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — COMMAND DNA ENGINE                                    ║
 * ║  dna.js — Lógica da tela DNA Comercial                       ║
 * ║  SPR-004 · KR7 Command DNA                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

'use strict';

/* ── Estado ── */
let dnaDados    = [];
let dnaFiltrados = [];
let dnaCalcEm   = null;

/* ─────────────────────────────────────────────
   PONTO DE ENTRADA
───────────────────────────────────────────── */
async function initCommandDNA() {
  dnaMostrarEstado('loading');
  try {
    const dados = await DNAService.obterDNA();
    dnaAplicarDados(dados);
  } catch (err) {
    console.error('[DNA] init error:', err);
    dnaMostrarEstado('error', err?.message || String(err));
  }
}

/* ── Botão calcular ── */
async function dnaCalcular() {
  const btn = document.getElementById('dna-btn-calcular');
  if (btn) { btn.disabled=true; btn.innerHTML=`<span class="dna-spinner" style="width:13px;height:13px;border-width:2px"></span> Analisando…`; }
  dnaMostrarEstado('loading');
  try {
    const dados = await DNAService.reprocessar();
    dnaAplicarDados(dados);
    showToast(`🧬 DNA atualizado — ${dados.length} consultores analisados`, 'success');
  } catch (err) {
    dnaMostrarEstado('error', err?.message || String(err));
    showToast('Erro na análise: ' + err?.message || String(err), 'error');
  } finally {
    if (btn) {
      btn.disabled=false;
      btn.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg> Analisar DNA`;
    }
  }
}

/* ─────────────────────────────────────────────
   APLICAR DADOS
───────────────────────────────────────────── */
function dnaAplicarDados(dados) {
  dnaDados     = dados;
  dnaFiltrados = dados;
  dnaCalcEm    = new Date().toISOString();
  if (dados.length === 0) { dnaMostrarEstado('empty'); return; }
  dnaMostrarEstado(null);
  dnaPopularFiltros(dados);
  dnaRenderGrid(dados);
  dnaAtualizarMeta(dados.length);
}

/* ─────────────────────────────────────────────
   FILTROS
───────────────────────────────────────────── */
function dnaPopularFiltros(dados) {
  const tipos = [...new Set(
    dados.map(d => d.especialidades?.tipoImovel?.valor).filter(Boolean)
  )].sort();
  const sel = document.getElementById('dna-f-tipo');
  if (!sel) return;
  while (sel.options.length > 1) sel.remove(1);
  tipos.forEach(t => { const o = document.createElement('option'); o.value=t; o.textContent=t; sel.appendChild(o); });
}

function dnaAplicarFiltros() {
  const tipo   = document.getElementById('dna-f-tipo')?.value || '';
  const convMn = parseInt(document.getElementById('dna-f-conv')?.value || '') || null;
  const busca  = (document.getElementById('dna-f-busca')?.value || '').trim();
  dnaFiltrados = DNAService.aplicarFiltros(dnaDados, {
    tipo          : tipo || undefined,
    conversaoMin  : convMn,
    busca         : busca || undefined,
  });
  dnaRenderGrid(dnaFiltrados);
}

function dnaLimparFiltros() {
  ['dna-f-tipo','dna-f-conv'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  const b=document.getElementById('dna-f-busca'); if(b) b.value='';
  dnaFiltrados = dnaDados;
  dnaRenderGrid(dnaDados);
}

/* ─────────────────────────────────────────────
   RENDER GRID
───────────────────────────────────────────── */
function dnaRenderGrid(dados) {
  const grid  = document.getElementById('dna-grid');
  const count = document.getElementById('dna-result-count');
  if (count) count.textContent = `${dados.length} consultor${dados.length!==1?'es':''}`;
  if (!grid) return;

  if (dados.length === 0) {
    grid.innerHTML = `<div class="dna-state" style="grid-column:1/-1"><div class="dna-state-icon">🔍</div><div class="dna-state-title">Nenhum resultado.</div></div>`;
    return;
  }
  grid.innerHTML = dados.map(d => dnaRenderCard(d)).join('');
}

function dnaRenderCard(d) {
  const initials = d.corretor.nome.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const esp = d.espPrincipal || '—';
  const scoreInfo = _dnaGetScoreInfo(d.corretor.nome);

  return `
    <div class="dna-card" onclick="dnaAbrirDetalhe('${dnaEsc(d.corretor.nome)}')">
      ${scoreInfo ? `<div class="dna-score-badge" style="background:${scoreInfo.bg};color:${scoreInfo.color};border:1px solid ${scoreInfo.border}">${scoreInfo.emoji} ${scoreInfo.score}</div>` : ''}
      <div class="dna-card-top">
        <div class="dna-avatar">${initials}</div>
        <div class="dna-card-info">
          <div class="dna-card-nome">${dnaEsc(d.corretor.nome)}</div>
          <div class="dna-card-cargo">${dnaEsc(d.corretor.cargo || 'Corretor')}</div>
        </div>
        <div class="dna-conv-wrap">
          <div class="dna-conv-val">${d.fmt.taxaConversao}</div>
          <div class="dna-conv-lbl">conversão</div>
        </div>
      </div>

      <div class="dna-esp-badge">🎯 ${dnaEsc(esp)}</div>

      <div class="dna-metrics-row">
        <div class="dna-metric"><div class="dna-metric-val" style="color:#22C55E">${d.metricas.vendas}</div><div class="dna-metric-lbl">Vendas</div></div>
        <div class="dna-metric"><div class="dna-metric-val">${d.metricas.total}</div><div class="dna-metric-lbl">Leads</div></div>
        <div class="dna-metric"><div class="dna-metric-val" style="color:#14B8A6">${d.fmt.tempoResposta}</div><div class="dna-metric-lbl">Resposta</div></div>
        <div class="dna-metric"><div class="dna-metric-val">${d.fmt.regiaoDestaque !== '—' ? dnaEsc(d.fmt.regiaoDestaque.slice(0,8)) : '—'}</div><div class="dna-metric-lbl">Região</div></div>
      </div>

      <div class="dna-perfil">${dnaEsc(d.perfil)}</div>
    </div>`;
}

/** Busca info do score do SPR-003 para mostrar no card (integração) */
function _dnaGetScoreInfo(nome) {
  try {
    if (typeof SCORE_LEVEL_CFG === 'undefined') return null;
    const n = (nome || '').trim().toLowerCase();
    // Tenta via ManagerService cache em memória
    if (typeof mgScores !== 'undefined' && mgScores.length > 0) {
      const s = mgScores.find(x => x.corretor.nome.trim().toLowerCase() === n);
      if (s) return { score: s.score, emoji: s.cfg.emoji, color: s.cfg.color, bg: s.cfg.bg, border: s.cfg.border };
    }
    return null;
  } catch { return null; }
}

/* ─────────────────────────────────────────────
   PAINEL DE DETALHAMENTO
───────────────────────────────────────────── */
async function dnaAbrirDetalhe(nome) {
  const dados = dnaDados.length > 0 ? dnaDados : await DNAService.obterDNA();
  const d = dados.find(x => x.corretor.nome === nome);
  if (!d) return;

  const initials = d.corretor.nome.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  const overlay = document.createElement('div');
  overlay.className = 'dna-overlay';
  overlay.id        = 'dna-overlay';
  overlay.onclick   = e => { if (e.target === overlay) dnaFecharDetalhe(); };

  overlay.innerHTML = `
    <div class="dna-panel" id="dna-panel">
      <div class="dna-panel-header">
        <div class="dna-avatar" style="width:40px;height:40px;border-radius:12px;font-size:14px">${initials}</div>
        <div>
          <div style="font-size:14px;font-weight:600;color:#F0FDF4;letter-spacing:-0.02em">${dnaEsc(d.corretor.nome)}</div>
          <div style="font-size:10px;color:#64748B">${dnaEsc(d.corretor.cargo||'Corretor')} · DNA Comercial</div>
        </div>
        <button class="dna-panel-close" onclick="dnaFecharDetalhe()">✕</button>
      </div>

      <div class="dna-panel-body">

        <!-- Perfil textual -->
        <div>
          <div class="dna-section-title">🧬 Perfil do COMMAND</div>
          <div class="dna-perfil-box">${dnaEsc(d.perfil)}</div>
        </div>

        <!-- Métricas principais -->
        <div>
          <div class="dna-section-title">📊 Métricas comerciais</div>
          <div class="dna-metrics-grid">
            ${[
              { val: d.fmt.taxaConversao,  lbl: 'Conversão'    },
              { val: d.metricas.vendas,    lbl: 'Vendas'       },
              { val: d.metricas.total,     lbl: 'Total leads'  },
              { val: d.fmt.tempoResposta,  lbl: 'T. resposta'  },
              { val: d.fmt.tempoVenda,     lbl: 'Ciclo venda'  },
              { val: d.metricas.totalFollowUps, lbl: 'Follow-ups' },
              { val: d.metricas.propostas, lbl: 'Propostas'    },
              { val: d.metricas.visitas,   lbl: 'Visitas'      },
              { val: d.fmt.ticketMedio,    lbl: 'Ticket médio' },
            ].map(m => `
              <div class="dna-metric-box">
                <div class="dna-metric-box-val">${dnaEsc(String(m.val))}</div>
                <div class="dna-metric-box-lbl">${m.lbl}</div>
              </div>`).join('')}
          </div>
        </div>

        <!-- Gráfico evolução últimos 6 meses -->
        <div>
          <div class="dna-section-title">📈 Evolução (6 meses)</div>
          ${dnaRenderGrafico(d.evolucao)}
        </div>

        <!-- Especialidades -->
        ${d.especialidades.suficiente ? `
        <div>
          <div class="dna-section-title">🎯 Especialidades identificadas</div>
          <div class="dna-esp-grid">
            ${dnaEspBox('Tipo de imóvel', d.especialidades.tipoImovel)}
            ${dnaEspBox('Região destaque', d.especialidades.bairro)}
            ${dnaEspBox('Faixa de preço', d.especialidades.faixaPreco)}
            ${dnaEspBox('Origem dos leads', d.especialidades.origem)}
            ${d.especialidades.melhorHorario ? `<div class="dna-esp-box"><div class="dna-esp-box-label">Melhor horário</div><div class="dna-esp-box-val">🕐 ${dnaEsc(d.especialidades.melhorHorario)}</div></div>` : ''}
            ${d.especialidades.melhorDia ? `<div class="dna-esp-box"><div class="dna-esp-box-label">Melhor dia</div><div class="dna-esp-box-val">📅 ${dnaEsc(d.especialidades.melhorDia)}</div></div>` : ''}
          </div>
          ${d.especialidades.topBairros?.length > 1 ? `
          <div style="margin-top:10px">
            <div style="font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:0.07em;font-family:'DM Mono',monospace;margin-bottom:6px">Top regiões</div>
            ${d.especialidades.topBairros.map(g => `
              <div class="dna-top-item">
                <span class="dna-top-nome">${dnaEsc(g.valor)}</span>
                <span style="display:flex;gap:8px;align-items:center">
                  <span class="dna-top-count">${g.fechados}/${g.total} leads</span>
                  <span class="dna-top-conv">${g.conv}%</span>
                </span>
              </div>`).join('')}
          </div>` : ''}
        </div>` : `
        <div style="background:var(--bg-input);border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:20px;margin-bottom:6px;opacity:.4">🔬</div>
          <div style="font-size:12px;color:#475569">${dnaEsc(d.especialidades.mensagem)}</div>
        </div>`}

        <!-- Forças -->
        ${d.forcas.length > 0 ? `
        <div>
          <div class="dna-section-title">✅ Forças identificadas</div>
          <div class="dna-point-list">
            ${d.forcas.map(f => `<div class="dna-point dna-point-pos"><span>${f.icone}</span><span>${dnaEsc(f.texto)}</span></div>`).join('')}
          </div>
        </div>` : ''}

        <!-- Pontos de melhoria -->
        ${d.melhorias.length > 0 ? `
        <div>
          <div class="dna-section-title">⚠️ Pontos de melhoria</div>
          <div class="dna-point-list">
            ${d.melhorias.map(m => `<div class="dna-point dna-point-neg"><span>${m.icone}</span><span>${dnaEsc(m.texto)}</span></div>`).join('')}
          </div>
        </div>` : ''}

        <!-- Sugestões -->
        <div>
          <div class="dna-section-title">💡 Sugestões do COMMAND</div>
          <div class="dna-point-list">
            ${d.sugestoes.map(s => `<div class="dna-sug"><span>→</span><span>${dnaEsc(s)}</span></div>`).join('')}
          </div>
        </div>

        <!-- VGV -->
        ${d.metricas.vgvTotal > 0 ? `
        <div style="background:rgba(34,197,94,0.05);border:1px solid rgba(34,197,94,0.12);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:10px;color:#64748B;font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px">VGV Total Gerado</div>
          <div style="font-size:24px;font-weight:700;color:#22C55E;letter-spacing:-0.04em">${dnaEsc(d.fmt.vgvTotal)}</div>
        </div>` : ''}

        <!-- Histórico -->
        <div>
          <div class="dna-section-title">📅 Histórico de análises</div>
          <div id="dna-hist-${dnaEsc(d.corretor.nome).replace(/\s/g,'_')}">
            <div style="font-size:11px;color:#374151">Carregando…</div>
          </div>
        </div>

      </div>
    </div>`;

  document.body.appendChild(overlay);
  dnaCarregarHistorico(d.corretor.nome);
  document.addEventListener('keydown', dnaEscKey);
}

/* ── Gráfico de evolução ── */
function dnaRenderGrafico(evolucao) {
  if (!evolucao || evolucao.length === 0) return '<div style="color:#374151;font-size:11px">Sem dados.</div>';
  const maxLeads = Math.max(...evolucao.map(m => m.leads), 1);
  const maxFU    = Math.max(...evolucao.map(m => m.followups), 1);

  return `
    <div style="display:flex;gap:4px">
      <div style="flex:1">
        <div style="font-size:9px;color:#475569;font-family:'DM Mono',monospace;margin-bottom:6px">Leads + Follow-ups</div>
        <div class="dna-chart">
          ${evolucao.map(m => `
            <div class="dna-bar-wrap">
              <div class="dna-bar-val">${m.leads}</div>
              <div class="dna-bar-bg">
                <div class="dna-bar-fill" style="height:${Math.round((m.leads/maxLeads)*100)}%;background:rgba(20,184,166,0.6)"></div>
              </div>
              <div class="dna-bar-lbl">${m.mes}</div>
            </div>`).join('')}
        </div>
      </div>
      <div style="flex:1">
        <div style="font-size:9px;color:#475569;font-family:'DM Mono',monospace;margin-bottom:6px">Vendas</div>
        <div class="dna-chart">
          ${evolucao.map(m => `
            <div class="dna-bar-wrap">
              <div class="dna-bar-val" style="color:#22C55E">${m.vendas}</div>
              <div class="dna-bar-bg">
                <div class="dna-bar-fill" style="height:${m.vendas>0?Math.max(15,Math.round((m.vendas/Math.max(...evolucao.map(x=>x.vendas),1))*100)):0}%;background:rgba(34,197,94,0.6)"></div>
              </div>
              <div class="dna-bar-lbl">${m.mes}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
}

/* ── Especialidade box ── */
function dnaEspBox(label, grupo) {
  if (!grupo) return `<div class="dna-esp-box"><div class="dna-esp-box-label">${dnaEsc(label)}</div><div class="dna-esp-box-val" style="color:#374151">—</div></div>`;
  return `
    <div class="dna-esp-box">
      <div class="dna-esp-box-label">${dnaEsc(label)}</div>
      <div class="dna-esp-box-val">${dnaEsc(grupo.valor)}</div>
      <div class="dna-esp-box-conv">${grupo.conv}% conversão · ${grupo.total} leads</div>
    </div>`;
}

/* ── Histórico ── */
async function dnaCarregarHistorico(nome) {
  const id = `dna-hist-${nome.replace(/\s/g,'_')}`;
  const wrap = document.getElementById(id);
  if (!wrap) return;
  try {
    const eventos = await DNARepository.findDNAHistory(nome, 6);
    if (!eventos || eventos.length === 0) {
      wrap.innerHTML = `<div class="dna-hist-item"><span style="font-size:11px;color:#374151">Nenhum histórico — analise o DNA para registrar.</span></div>`;
      return;
    }
    wrap.innerHTML = eventos.map(ev => `
      <div class="dna-hist-item">
        <div class="dna-hist-ts">${dnaFmtTs(ev.timestamp)}</div>
        <div class="dna-hist-desc">${dnaEsc(ev.descricao)}</div>
      </div>`).join('');
  } catch {
    wrap.innerHTML = `<div class="dna-hist-item"><span style="color:#374151;font-size:11px">Histórico indisponível.</span></div>`;
  }
}

function dnaFecharDetalhe() {
  const o = document.getElementById('dna-overlay'); if (o) o.remove();
  document.removeEventListener('keydown', dnaEscKey);
}
function dnaEscKey(e) { if (e.key === 'Escape') dnaFecharDetalhe(); }

/* ─────────────────────────────────────────────
   ESTADOS / HELPERS
───────────────────────────────────────────── */
function dnaMostrarEstado(estado, msg) {
  ['dna-state-loading','dna-state-empty','dna-state-error'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display='none';
  });
  const c = document.getElementById('dna-conteudo');
  if (c) c.style.display = estado ? 'none' : 'block';
  if (estado === 'loading') { const el=document.getElementById('dna-state-loading'); if(el) el.style.display='flex'; }
  else if (estado === 'empty')  { const el=document.getElementById('dna-state-empty');  if(el) el.style.display='flex'; }
  else if (estado === 'error') {
    const el=document.getElementById('dna-state-error'); if(el) el.style.display='flex';
    const me=document.getElementById('dna-error-msg');   if(me&&msg) me.textContent=msg;
  }
}

function dnaAtualizarMeta(total) {
  const el = document.getElementById('dna-header-meta');
  if (el) el.textContent = `${total} consultor${total!==1?'es':''} · ${dnaFmtTs(dnaCalcEm)}`;
}

function dnaFmtTs(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  } catch { return ts; }
}

function dnaEsc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
