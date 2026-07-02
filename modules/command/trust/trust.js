/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — COMMAND TRUST ENGINE                                  ║
 * ║  trust.js — Lógica da tela Índice de Confiança (ICC)         ║
 * ║  SPR-005 · KR7 Command Trust                                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

'use strict';

/* ── Estado ── */
let trDados     = [];
let trFiltrados = [];
let trCalcEm    = null;

/* ─────────────────────────────────────────────
   PONTO DE ENTRADA
───────────────────────────────────────────── */
async function initCommandTrust() {
  trMostrarEstado('loading');
  try {
    const dados = await TrustService.obterICC();
    trAplicarDados(dados);
  } catch (err) {
    console.error('[Trust] init error:', err);
    trMostrarEstado('error', err?.message || String(err));
  }
}

/* ── Botão calcular ── */
async function trCalcular() {
  const btn = document.getElementById('tr-btn-calcular');
  if (btn) { btn.disabled=true; btn.innerHTML=`<span class="tr-spinner" style="width:13px;height:13px;border-width:2px"></span> Calculando…`; }
  trMostrarEstado('loading');
  try {
    const dados = await TrustService.reprocessar();
    trAplicarDados(dados);
    showToast(`🔐 ICC calculado — ${dados.length} consultores`, 'success');
  } catch (err) {
    trMostrarEstado('error', err?.message || String(err));
    showToast('Erro: ' + err?.message || String(err), 'error');
  } finally {
    if (btn) {
      btn.disabled=false;
      btn.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Calcular ICC`;
    }
  }
}

/* ─────────────────────────────────────────────
   APLICAR DADOS
───────────────────────────────────────────── */
function trAplicarDados(dados) {
  trDados     = dados;
  trFiltrados = dados;
  trCalcEm    = new Date().toISOString();
  if (dados.length === 0) { trMostrarEstado('empty'); return; }
  trMostrarEstado(null);
  trRenderTeamBar(dados);
  trPopularFiltros(dados);
  trRenderGrid(dados);
  trAtualizarMeta(dados.length);
}

/* ─────────────────────────────────────────────
   BARRA DO TIME
───────────────────────────────────────────── */
function trRenderTeamBar(dados) {
  const media      = Math.round(dados.reduce((a,d) => a+d.icc, 0) / dados.length);
  const totalLeads = dados.reduce((a,d) => a+d.stats.totalLeads, 0);
  const totalVendas= dados.reduce((a,d) => a+d.stats.vendas, 0);
  const criticos   = dados.filter(d => d.icc < 50).length;
  const nivelMedia = getTrustLevel(media);
  const cfg        = TRUST_LEVEL_CFG[nivelMedia];

  const wrap = document.getElementById('tr-team-bar');
  if (!wrap) return;
  wrap.innerHTML = `
    <div>
      <div class="tr-team-icc-val" style="color:${cfg.color}">${media}</div>
      <div class="tr-team-icc-lbl">ICC médio</div>
    </div>
    <div class="tr-team-track">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:10px;color:#475569">Índice de Confiança da Equipe</span>
        <span style="font-size:10px;color:${cfg.color}">${cfg.emoji} ${nivelMedia}</span>
      </div>
      <div class="tr-team-bar-bg">
        <div class="tr-team-bar-fill" style="width:${media}%;background:linear-gradient(90deg,${cfg.color}88,${cfg.color})"></div>
      </div>
    </div>
    <div class="tr-team-stats">
      <div class="tr-team-stat"><div class="tr-team-stat-val">${dados.length}</div><div class="tr-team-stat-lbl">Consultores</div></div>
      <div class="tr-team-stat"><div class="tr-team-stat-val">${totalLeads}</div><div class="tr-team-stat-lbl">Leads</div></div>
      <div class="tr-team-stat"><div class="tr-team-stat-val" style="color:#22C55E">${totalVendas}</div><div class="tr-team-stat-lbl">Vendas</div></div>
      <div class="tr-team-stat"><div class="tr-team-stat-val" style="color:${criticos>0?'#EF4444':'#475569'}">${criticos}</div><div class="tr-team-stat-lbl">Críticos</div></div>
    </div>`;
}

/* ─────────────────────────────────────────────
   FILTROS
───────────────────────────────────────────── */
function trPopularFiltros(dados) {
  const niveis = [...new Set(dados.map(d => d.nivel))];
  const sel = document.getElementById('tr-f-nivel');
  if (!sel) return;
  while (sel.options.length > 1) sel.remove(1);
  niveis.forEach(n => {
    const cfg = TRUST_LEVEL_CFG[n] || {};
    const o = document.createElement('option'); o.value=n; o.textContent=`${cfg.emoji||''} ${n}`; sel.appendChild(o);
  });
}

function trAplicarFiltros() {
  const nivel    = document.getElementById('tr-f-nivel')?.value || '';
  const tendencia= document.getElementById('tr-f-tend')?.value || '';
  const busca    = (document.getElementById('tr-f-busca')?.value || '').trim();
  trFiltrados    = TrustService.aplicarFiltros(trDados, {
    nivel: nivel||undefined, tendencia: tendencia||undefined, busca: busca||undefined
  });
  trRenderGrid(trFiltrados);
}

function trLimparFiltros() {
  ['tr-f-nivel','tr-f-tend'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  const b=document.getElementById('tr-f-busca'); if(b) b.value='';
  trFiltrados = trDados;
  trRenderGrid(trDados);
}

/* ─────────────────────────────────────────────
   GAUGE SVG (arco semi-circular)
───────────────────────────────────────────── */
function trGaugeSVG(icc, color) {
  const r=26, cx=32, cy=32;
  const circ    = Math.PI * r;              // metade do arco (semi-círculo)
  const progress= (icc / 100) * circ;
  const dash    = `${progress} ${circ}`;

  return `
    <svg class="tr-gauge-svg" width="64" height="40" viewBox="0 0 64 40">
      <path d="M 6 34 A 26 26 0 0 1 58 34" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="5" stroke-linecap="round"/>
      <path d="M 6 34 A 26 26 0 0 1 58 34" fill="none" stroke="${color}" stroke-width="5"
        stroke-linecap="round" stroke-dasharray="${dash}" stroke-dashoffset="0"
        style="transform-origin:32px 34px;transform:rotate(0deg);transition:stroke-dasharray .6s ease"
        pathLength="${circ}"/>
      <text x="32" y="34" class="tr-gauge-val" fill="${color}" font-size="13">${icc}</text>
    </svg>`;
}

/* ─────────────────────────────────────────────
   RENDER GRID
───────────────────────────────────────────── */
function trRenderGrid(dados) {
  const grid  = document.getElementById('tr-grid');
  const count = document.getElementById('tr-result-count');
  if (count) count.textContent = `${dados.length} consultor${dados.length!==1?'es':''}`;
  if (!grid) return;

  if (dados.length === 0) {
    grid.innerHTML=`<div class="tr-state" style="grid-column:1/-1"><div class="tr-state-icon">🔍</div><div class="tr-state-title">Nenhum resultado.</div></div>`;
    return;
  }
  grid.innerHTML = dados.map(d => trRenderCard(d)).join('');
}

function trRenderCard(d) {
  const cfg      = d.cfg || TRUST_LEVEL_CFG[d.nivel] || TRUST_LEVEL_CFG['CRÍTICO'];
  const initials = d.corretor.nome.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const diasStr  = d.stats.ultimaAtividade ? trDiasStr(d.stats.ultimaAtividade) : 'Sem atividade';
  const tendCls  = d.tendencia.dir==='↑'?'tr-tend-up':d.tendencia.dir==='↓'?'tr-tend-down':'tr-tend-stab';

  return `
    <div class="tr-card" onclick="trAbrirDetalhe('${trEsc(d.corretor.nome)}')">
      <div class="tr-card-top">
        <div class="tr-avatar" style="background:${cfg.bg};border-color:${cfg.border};color:${cfg.color}">${initials}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:#F0FDF4;letter-spacing:-0.02em;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${trEsc(d.corretor.nome)}</div>
          <div style="font-size:10px;color:#64748B;margin-bottom:5px">${trEsc(d.corretor.cargo||'Corretor')}</div>
          <span class="tr-tend ${tendCls}">${d.tendencia.dir} ${trEsc(d.tendencia.label)}</span>
        </div>
        <div class="tr-gauge-wrap">
          ${trGaugeSVG(d.icc, cfg.color)}
          <span class="tr-nivel-badge" style="color:${cfg.color};background:${cfg.badge};border-color:${cfg.border};font-size:8px">${cfg.emoji} ${trEsc(d.nivel)}</span>
        </div>
      </div>

      <div class="tr-card-stats">
        <div class="tr-stat"><div class="tr-stat-val">${d.stats.totalLeads}</div><div class="tr-stat-lbl">Leads</div></div>
        <div class="tr-stat"><div class="tr-stat-val" style="color:#22C55E">${d.stats.vendas}</div><div class="tr-stat-lbl">Vendas</div></div>
        <div class="tr-stat"><div class="tr-stat-val" style="color:#6366F1">${d.stats.tempoMedioResposta!=null?d.stats.tempoMedioResposta+'h':'—'}</div><div class="tr-stat-lbl">Resposta</div></div>
        <div class="tr-stat"><div class="tr-stat-val" style="color:${d.stats.abandonados>0?'#EF4444':'#475569'}">${d.stats.abandonados}</div><div class="tr-stat-lbl">Abandon.</div></div>
      </div>

      <div class="tr-card-footer">
        <div class="tr-card-last">⏱ ${diasStr}</div>
        ${d.iccAnterior!=null?`<span style="font-size:9px;color:#475569;font-family:'DM Mono',monospace">anterior: ${d.iccAnterior}</span>`:''}
      </div>
    </div>`;
}

/* ─────────────────────────────────────────────
   PAINEL DE DETALHAMENTO
───────────────────────────────────────────── */
async function trAbrirDetalhe(nome) {
  const dados = trDados.length>0 ? trDados : await TrustService.obterICC();
  const d = dados.find(x => x.corretor.nome === nome);
  if (!d) return;

  const cfg      = d.cfg || TRUST_LEVEL_CFG[d.nivel] || TRUST_LEVEL_CFG['CRÍTICO'];
  const initials = d.corretor.nome.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const hist     = TrustHistory.evolucaoParaGrafico(d.corretor.nome);
  const tendCls  = d.tendencia.dir==='↑'?'tr-tend-up':d.tendencia.dir==='↓'?'tr-tend-down':'tr-tend-stab';

  const overlay  = document.createElement('div');
  overlay.className = 'tr-overlay';
  overlay.id        = 'tr-overlay';
  overlay.onclick   = e => { if(e.target===overlay) trFecharDetalhe(); };

  overlay.innerHTML = `
    <div class="tr-panel" id="tr-panel">
      <div class="tr-panel-header">
        <div class="tr-avatar" style="width:40px;height:40px;border-radius:12px;font-size:14px;background:${cfg.bg};border-color:${cfg.border};border:2px solid ${cfg.border};color:${cfg.color};display:flex;align-items:center;justify-content:center">${initials}</div>
        <div>
          <div style="font-size:14px;font-weight:600;color:#F0FDF4;letter-spacing:-0.02em">${trEsc(d.corretor.nome)}</div>
          <div style="font-size:10px;color:#64748B">${trEsc(d.corretor.cargo||'Corretor')} · ICC ${d.icc}/100</div>
        </div>
        <button class="tr-panel-close" onclick="trFecharDetalhe()">✕</button>
      </div>

      <div class="tr-panel-body">

        <!-- ICC grande + tendência -->
        <div style="display:flex;align-items:center;gap:16px;padding:16px;border-radius:14px;background:${cfg.bg};border:1px solid ${cfg.border}">
          <div>
            <div style="font-size:52px;font-weight:800;color:${cfg.color};letter-spacing:-0.06em;line-height:1;font-family:'DM Sans',sans-serif">${d.icc}</div>
            <div style="font-size:10px;color:#64748B;font-family:'DM Mono',monospace">/100 · ICC</div>
          </div>
          <div style="flex:1">
            <div style="font-size:16px;font-weight:600;color:${cfg.color};margin-bottom:4px">${cfg.emoji} ${trEsc(d.nivel)}</div>
            <span class="tr-tend ${tendCls}" style="font-size:11px">${d.tendencia.dir} ${trEsc(d.tendencia.label)}</span>
            ${d.iccAnterior!=null?`<div style="font-size:10px;color:#475569;margin-top:5px;font-family:'DM Mono',monospace">anterior: ${d.iccAnterior} · delta: ${d.icc>d.iccAnterior?'+':''}${d.icc-d.iccAnterior}</div>`:''}
            <div style="margin-top:8px;height:4px;background:rgba(255,255,255,0.05);border-radius:2px;overflow:hidden">
              <div style="width:${d.icc}%;height:100%;border-radius:2px;background:${cfg.color};transition:width .6s ease"></div>
            </div>
          </div>
        </div>

        <!-- Justificativa -->
        <div>
          <div class="tr-section-title">⚡ Justificativa do COMMAND</div>
          <div class="tr-justif">${trEsc(d.justificativa)}</div>
        </div>

        <!-- Gráfico de evolução -->
        <div>
          <div class="tr-section-title">📈 Evolução do ICC</div>
          ${trRenderGrafico(hist)}
        </div>

        <!-- Breakdown por critério -->
        <div>
          <div class="tr-section-title">🔍 Critérios utilizados</div>
          <div>
            ${d.criterios.map(c => {
              const maxAbs = Math.max(Math.abs(c.max||0), Math.abs(c.min||0), Math.abs(c.pts), 1);
              const pctBar = Math.round((Math.abs(c.pts)/maxAbs)*100);
              const barColor = c.pts<0?'#EF4444': c.status==='forte'?'#22C55E': c.status==='fraco'?'#EAB308':'#6366F1';
              return `
                <div class="tr-breakdown-row">
                  <div style="flex:1">
                    <div class="tr-breakdown-label">${trEsc(c.label)}</div>
                    <div class="tr-breakdown-detalhe">${trEsc(c.detalhe)}</div>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
                    <div class="tr-breakdown-bar"><div class="tr-breakdown-bar-fill" style="width:${pctBar}%;background:${barColor}"></div></div>
                    <div class="tr-breakdown-pts" style="color:${c.pts<0?'#EF4444':c.pts>0?'#22C55E':'#475569'}">${c.pts>0?'+':''}${c.pts}${c.max?'/'+c.max:''}</div>
                  </div>
                </div>`;
            }).join('')}
            <div class="tr-breakdown-row" style="border-top:1px solid rgba(255,255,255,0.08);margin-top:4px">
              <div class="tr-breakdown-label" style="font-weight:600;color:#F0FDF4">Total ICC</div>
              <div class="tr-breakdown-pts" style="color:${cfg.color};font-size:14px;font-weight:700">${d.icc}/100</div>
            </div>
          </div>
        </div>

        <!-- Pontos fortes -->
        ${d.fortes.length>0?`
        <div>
          <div class="tr-section-title">✅ Pontos fortes</div>
          <div class="tr-point-list">
            ${d.fortes.map(c=>`<div class="tr-point tr-point-pos">✓ ${trEsc(c.detalhe)}</div>`).join('')}
          </div>
        </div>`:''}

        <!-- Pontos fracos -->
        ${d.fracos.length>0?`
        <div>
          <div class="tr-section-title">⚠️ Pontos de atenção</div>
          <div class="tr-point-list">
            ${d.fracos.map(c=>`<div class="tr-point tr-point-neg">✗ ${trEsc(c.detalhe)}</div>`).join('')}
          </div>
        </div>`:''}

        <!-- Sugestões -->
        <div>
          <div class="tr-section-title">💡 Sugestões do COMMAND</div>
          <div class="tr-point-list">
            ${d.sugestoes.map(s=>`<div class="tr-sug"><span>→</span><span>${trEsc(s)}</span></div>`).join('')}
          </div>
        </div>

        <!-- Eventos recentes -->
        <div>
          <div class="tr-section-title">📋 Eventos recentes</div>
          <div id="tr-events-${d.corretor.nome.replace(/\s/g,'_')}">
            <div style="font-size:11px;color:#374151">Carregando…</div>
          </div>
        </div>

        <!-- Distribuição Inteligente (prep SPR-006) -->
        <div style="background:rgba(99,102,241,0.04);border:1px solid rgba(99,102,241,0.1);border-radius:12px;padding:14px">
          <div class="tr-section-title" style="margin-bottom:6px">🚀 Distribuição Inteligente (SPR-006)</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <div style="font-size:11px;color:#94A3B8">Prioridade: <strong style="color:${cfg.color}">${trEsc(d.distribuicaoWeight.prioridade.toUpperCase())}</strong></div>
            <div style="font-size:11px;color:#94A3B8">Elegível: <strong style="color:${d.distribuicaoWeight.confiavel?'#22C55E':'#EF4444'}">${d.distribuicaoWeight.confiavel?'Sim':'Não'}</strong></div>
          </div>
        </div>

      </div>
    </div>`;

  document.body.appendChild(overlay);
  trCarregarEventos(d.corretor.nome);
  document.addEventListener('keydown', trEscKey);
}

/* ── Gráfico de evolução ── */
function trRenderGrafico(hist) {
  if (!hist || hist.length === 0) {
    return `<div style="font-size:11px;color:#374151;padding:8px 0">Nenhum histórico ainda — calcule o ICC para registrar.</div>`;
  }
  const maxICC = Math.max(...hist.map(h => h.icc), 1);
  return `
    <div class="tr-chart">
      ${hist.map(h => {
        const cfg = TRUST_LEVEL_CFG[h.nivel] || TRUST_LEVEL_CFG['CRÍTICO'];
        const pct = Math.round((h.icc / 100) * 100);
        return `
          <div class="tr-bar-wrap">
            <div class="tr-bar-val">${h.icc}</div>
            <div class="tr-bar-bg">
              <div class="tr-bar-fill" style="height:${pct}%;background:${cfg.color}88"></div>
            </div>
            <div class="tr-bar-lbl">${h.label}</div>
          </div>`;
      }).join('')}
    </div>`;
}

/* ── Eventos recentes ── */
async function trCarregarEventos(nome) {
  const id = `tr-events-${nome.replace(/\s/g,'_')}`;
  const wrap = document.getElementById(id);
  if (!wrap) return;
  try {
    const eventos = await TrustRepository.findTrustEvents(nome, 8);
    if (!eventos || eventos.length===0) {
      wrap.innerHTML=`<div class="tr-hist-item"><span style="font-size:11px;color:#374151">Nenhum evento ainda — calcule o ICC para registrar.</span></div>`;
      return;
    }
    wrap.innerHTML = eventos.map(ev => {
      let meta = {};
      try { meta = ev.metadata ? JSON.parse(ev.metadata) : {}; } catch {}
      return `
        <div class="tr-hist-item">
          <div class="tr-hist-ts">${trFmtTs(ev.timestamp)}</div>
          <div class="tr-hist-desc" style="flex:1">${trEsc(ev.descricao)}</div>
          ${meta.iccAtual!=null?`<div class="tr-hist-icc">${meta.iccAtual}</div>`:''}
        </div>`;
    }).join('');
  } catch {
    wrap.innerHTML=`<div style="font-size:11px;color:#374151">Histórico indisponível.</div>`;
  }
}

function trFecharDetalhe() {
  const o=document.getElementById('tr-overlay'); if(o) o.remove();
  document.removeEventListener('keydown', trEscKey);
}
function trEscKey(e) { if(e.key==='Escape') trFecharDetalhe(); }

/* ─────────────────────────────────────────────
   ESTADOS / HELPERS
───────────────────────────────────────────── */
function trMostrarEstado(estado, msg) {
  ['tr-state-loading','tr-state-empty','tr-state-error'].forEach(id => {
    const el=document.getElementById(id); if(el) el.style.display='none';
  });
  const c=document.getElementById('tr-conteudo');
  if(c) c.style.display=estado?'none':'block';
  if(estado==='loading') { const el=document.getElementById('tr-state-loading'); if(el) el.style.display='flex'; }
  else if(estado==='empty')  { const el=document.getElementById('tr-state-empty');  if(el) el.style.display='flex'; }
  else if(estado==='error') {
    const el=document.getElementById('tr-state-error'); if(el) el.style.display='flex';
    const me=document.getElementById('tr-error-msg'); if(me&&msg) me.textContent=msg;
  }
}

function trAtualizarMeta(total) {
  const el=document.getElementById('tr-header-meta');
  if(el) el.textContent=`${total} consultor${total!==1?'es':''} · ${trFmtTs(trCalcEm)}`;
}

function trDiasStr(iso) {
  if(!iso) return '—';
  const d=Math.floor((Date.now()-new Date(iso).getTime())/86_400_000);
  if(d===0) return 'Ativo hoje';
  if(d===1) return 'Ativo ontem';
  return `${d} dias atrás`;
}

function trFmtTs(ts) {
  if(!ts) return '—';
  try {
    const d=new Date(ts);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  } catch { return ts; }
}

function trEsc(str) {
  if(!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
