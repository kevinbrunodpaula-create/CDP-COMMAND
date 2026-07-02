/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — SMART LEAD DISTRIBUTION ENGINE                        ║
 * ║  distribution.js — Lógica da tela Distribuição Inteligente   ║
 * ║  SPR-006 · KR7 Command Intelligence                          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

'use strict';

/* ── Estado ── */
let diAnalises  = [];
let diFiltrados = [];

/* ─────────────────────────────────────────────
   PONTO DE ENTRADA
───────────────────────────────────────────── */
async function initCommandDistribution() {
  diMostrarEstado('loading');
  try {
    const analises = await DistributionService.obterAnalise();
    diAplicarDados(analises);
  } catch (err) {
    console.error('[Distribution] init error:', err);
    diMostrarEstado('error', err?.message || String(err));
  }
}

/* ── Botão analisar ── */
async function diAnalisar() {
  const btn = document.getElementById('di-btn-analisar');
  if (btn) { btn.disabled=true; btn.innerHTML=`<span class="di-spinner" style="width:13px;height:13px;border-width:2px"></span> Analisando…`; }
  diMostrarEstado('loading');
  try {
    const analises = await DistributionService.reprocessar();
    diAplicarDados(analises);
    showToast(`🎯 Distribuição analisada — ${analises.length} leads`, 'success');
  } catch (err) {
    diMostrarEstado('error', err?.message || String(err));
    showToast('Erro: ' + err?.message || String(err), 'error');
  } finally {
    if (btn) {
      btn.disabled=false;
      btn.innerHTML=`<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Analisar Carteira`;
    }
  }
}

/* ── Botão simular ── */
async function diSimular() {
  const btn = document.getElementById('di-btn-simular');
  if (btn) { btn.disabled=true; btn.innerHTML=`<span class="di-spinner" style="width:12px;height:12px;border-width:2px"></span> Simulando…`; }
  try {
    const sim = await DistributionService.simular();
    diAbrirSimulacao(sim);
  } catch (err) {
    showToast('Erro na simulação: ' + err?.message || String(err), 'error');
  } finally {
    if (btn) {
      btn.disabled=false;
      btn.innerHTML=`<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg> Simular Distribuição`;
    }
  }
}

/* ─────────────────────────────────────────────
   APLICAR DADOS
───────────────────────────────────────────── */
function diAplicarDados(analises) {
  diAnalises  = analises;
  diFiltrados = analises;
  if (analises.length === 0) { diMostrarEstado('empty'); return; }
  diMostrarEstado(null);
  diRenderKPIs(analises);
  diPopularFiltros(analises);
  diRenderTabela(analises);
  diAtualizarMeta(analises.length);
}

/* ─────────────────────────────────────────────
   KPIs
───────────────────────────────────────────── */
function diRenderKPIs(analises) {
  const wrap = document.getElementById('di-kpis');
  if (!wrap) return;

  const comRec    = analises.filter(a => a.recomendado).length;
  const probMedia = analises.length > 0
    ? Math.round(analises.reduce((s,a) => s+(a.recomendado?.probabilidade||0), 0) / analises.length)
    : 0;
  const alta      = analises.filter(a => (a.recomendado?.probabilidade||0) >= 70).length;
  const semCorr   = analises.filter(a => !a.lead.corretor || !a.lead.corretor.trim()).length;

  wrap.innerHTML = `
    <div class="di-kpi"><div class="di-kpi-val">${comRec}</div><div class="di-kpi-lbl">Recomendações</div><div class="di-kpi-sub">de ${analises.length} leads</div></div>
    <div class="di-kpi"><div class="di-kpi-val">${probMedia}%</div><div class="di-kpi-lbl">Prob. média</div><div class="di-kpi-sub">de conversão</div></div>
    <div class="di-kpi"><div class="di-kpi-val" style="color:#22C55E">${alta}</div><div class="di-kpi-lbl">Alta prob.</div><div class="di-kpi-sub">≥ 70%</div></div>
    <div class="di-kpi"><div class="di-kpi-val" style="color:#EAB308">${semCorr}</div><div class="di-kpi-lbl">Sem corretor</div><div class="di-kpi-sub">aguardando</div></div>`;
}

/* ─────────────────────────────────────────────
   FILTROS
───────────────────────────────────────────── */
function diPopularFiltros(analises) {
  const statuses = [...new Set(analises.map(a => a.lead.status).filter(Boolean))].sort();
  const sel = document.getElementById('di-f-status');
  if (!sel) return;
  while (sel.options.length > 1) sel.remove(1);
  statuses.forEach(s => { const o=document.createElement('option'); o.value=s; o.textContent=s; sel.appendChild(o); });
}

function diAplicarFiltros() {
  const busca    = (document.getElementById('di-f-busca')?.value || '').trim();
  const status   = document.getElementById('di-f-status')?.value || '';
  const semCorr  = document.getElementById('di-f-sem-corretor')?.checked || false;
  const probMin  = parseInt(document.getElementById('di-f-prob')?.value || '') || null;

  diFiltrados = DistributionService.aplicarFiltros(diAnalises, {
    busca: busca||undefined, status: status||undefined,
    semCorretor: semCorr||undefined, probMin,
  });
  diRenderTabela(diFiltrados);
}

function diLimparFiltros() {
  ['di-f-status','di-f-prob'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  const b=document.getElementById('di-f-busca'); if(b) b.value='';
  const c=document.getElementById('di-f-sem-corretor'); if(c) c.checked=false;
  diFiltrados = diAnalises;
  diRenderTabela(diAnalises);
}

/* ─────────────────────────────────────────────
   TABELA
───────────────────────────────────────────── */
function diRenderTabela(analises) {
  const count = document.getElementById('di-result-count');
  if (count) count.textContent = `${analises.length} lead${analises.length!==1?'s':''}`;

  // Desktop
  const tbody = document.getElementById('di-tbody');
  if (tbody) {
    if (analises.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#374151;font-size:12px">Nenhum lead encontrado.</td></tr>`;
    } else {
      tbody.innerHTML = analises.map(a => diRenderRow(a)).join('');
    }
  }

  // Mobile
  const cards = document.getElementById('di-cards-mobile');
  if (cards) {
    cards.innerHTML = analises.length === 0
      ? `<div class="di-state"><div class="di-state-title">Nenhum resultado.</div></div>`
      : analises.map(a => diRenderCard(a)).join('');
  }
}

function diRenderRow(a) {
  const prob   = a.recomendado?.probabilidade || 0;
  const probCls= prob>=70?'di-prob-alta': prob>=45?'di-prob-media':'di-prob-baixa';
  const corrAtual = a.lead.corretor?.trim() || '—';
  const recNome   = a.recomendado?.corretor?.nome || '—';
  const matchCls  = !a.lead.corretor?.trim() ? 'di-match-none'
    : corrAtual === recNome ? 'di-match-same' : 'di-match-diff';
  const matchTxt  = !a.lead.corretor?.trim() ? 'Sem corretor'
    : corrAtual === recNome ? 'Mantém' : 'Sugerir troca';

  return `
    <tr>
      <td>
        <div style="font-weight:500;color:#D1FAE5;margin-bottom:2px">${diEsc(a.lead.nome)}</div>
        <div style="font-size:10px;color:#475569">${diEsc(a.lead.status||'—')} · ${diEsc(a.lead.tipo_imovel||a.lead.interesse||'—')}</div>
      </td>
      <td style="color:#94A3B8">${diEsc(corrAtual)}</td>
      <td>
        <div style="font-weight:500;color:#FB923C">${diEsc(recNome)}</div>
        ${a.recomendado ? `<div style="font-size:9px;color:#64748B;margin-top:1px">${diEsc(a.recomendado.nivelConfianca)} confiança</div>` : ''}
      </td>
      <td><span class="di-prob ${probCls}">${prob}%</span></td>
      <td><span class="${matchCls}">${matchTxt}</span></td>
      <td><button class="di-btn-ver" onclick="diAbrirAnalise('${diEsc(a.lead.id||a.lead.nome)}')">Ver análise</button></td>
    </tr>`;
}

function diRenderCard(a) {
  const prob    = a.recomendado?.probabilidade || 0;
  const probCls = prob>=70?'di-prob-alta': prob>=45?'di-prob-media':'di-prob-baixa';
  return `
    <div class="di-lead-card">
      <div class="di-lead-card-nome">${diEsc(a.lead.nome)}</div>
      <div class="di-lead-card-meta">
        Status: ${diEsc(a.lead.status||'—')}<br>
        Corretor atual: ${diEsc(a.lead.corretor||'Sem corretor')}
      </div>
      <div class="di-lead-card-rec">
        <span style="font-size:11px;color:#64748B">Recomendado:</span>
        <span style="font-size:12px;font-weight:600;color:#FB923C">${diEsc(a.recomendado?.corretor?.nome||'—')}</span>
        <span class="di-prob ${probCls}">${prob}%</span>
        <button class="di-btn-ver" onclick="diAbrirAnalise('${diEsc(a.lead.id||a.lead.nome)}')">Análise</button>
      </div>
    </div>`;
}

/* ─────────────────────────────────────────────
   PAINEL DE ANÁLISE DETALHADA
───────────────────────────────────────────── */
function diAbrirAnalise(idOuNome) {
  const a = diAnalises.find(x => x.lead.id === idOuNome || x.lead.nome === idOuNome);
  if (!a) return;

  const overlay = document.createElement('div');
  overlay.className = 'di-overlay';
  overlay.id        = 'di-overlay';
  overlay.onclick   = e => { if(e.target===overlay) diFecharAnalise(); };

  const top5Html = (a.top5 || []).map((t, i) => {
    const cfg  = t.probabilidade>=70?{c:'#22C55E',bg:'rgba(34,197,94,0.06)'}:t.probabilidade>=45?{c:'#EAB308',bg:'rgba(234,179,8,0.06)'}:{c:'#EF4444',bg:'rgba(239,68,68,0.06)'};
    const inic = t.corretor.nome.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const motivosTxt = (t.motivos||[]).slice(0,2).join('; ');
    return `
      <div class="di-rank-item" style="${i===0?`border-color:rgba(251,146,60,0.3);background:rgba(251,146,60,0.04)`:''}">
        <div class="di-rank-pos">${i+1}</div>
        <div style="width:32px;height:32px;border-radius:10px;background:${cfg.bg};border:1px solid ${cfg.c}33;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:${cfg.c};flex-shrink:0">${inic}</div>
        <div class="di-rank-info">
          <div class="di-rank-nome">${diEsc(t.corretor.nome)}${i===0?' <span style="font-size:9px;color:#FB923C;background:rgba(251,146,60,0.1);border:1px solid rgba(251,146,60,0.2);padding:1px 6px;border-radius:4px;margin-left:4px">⭐ Recomendado</span>':''}</div>
          <div class="di-rank-motivos">${diEsc(motivosTxt||'—')}</div>
        </div>
        <span class="di-prob ${t.probabilidade>=70?'di-prob-alta':t.probabilidade>=45?'di-prob-media':'di-prob-baixa'}">${t.probabilidade}%</span>
      </div>`;
  }).join('');

  // Breakdown do recomendado
  const breakdownHtml = a.recomendado ? (a.recomendado.regras||[]).map(r => {
    const maxAbs = Math.max(Math.abs(r.max||0), Math.abs(r.pts), 1);
    const pct    = Math.round((Math.abs(r.pts)/maxAbs)*100);
    const color  = r.pts<0?'#EF4444':r.ativo?'#FB923C':'#64748B';
    return `
      <div class="di-rule-row">
        <div style="flex:1">
          <div class="di-rule-label">${diEsc(r.label)}</div>
          <div class="di-rule-motivo">${diEsc(r.motivo)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <div class="di-rule-bar"><div class="di-rule-bar-fill" style="width:${pct}%;background:${color}"></div></div>
          <div class="di-rule-pts" style="color:${color}">${r.pts>0?'+':''}${r.pts}</div>
        </div>
      </div>`;
  }).join('') : '';

  overlay.innerHTML = `
    <div class="di-panel" id="di-panel">
      <div class="di-panel-header">
        <div>
          <div style="font-size:13px;font-weight:600;color:#F0FDF4;margin-bottom:2px">${diEsc(a.lead.nome)}</div>
          <div style="font-size:10px;color:#64748B">${diEsc(a.lead.status||'—')} · ${diEsc(a.lead.tipo_imovel||a.lead.interesse||'—')} · ${diEsc(a.lead.bairro||'—')}</div>
          ${a.lead.valor?`<div style="font-size:10px;color:#475569;margin-top:2px;font-family:'DM Mono',monospace">${diEsc(a.lead.valor)}</div>`:''}
        </div>
        <button class="di-panel-close" onclick="diFecharAnalise()">✕</button>
      </div>

      <div class="di-panel-body">

        <!-- Recomendação principal -->
        <div style="background:rgba(251,146,60,0.05);border:1px solid rgba(251,146,60,0.18);border-radius:14px;padding:16px">
          <div class="di-section-title" style="color:rgba(251,146,60,0.7)">⚡ Recomendação do COMMAND</div>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <div>
              <div style="font-size:22px;font-weight:700;color:#FB923C;letter-spacing:-0.03em">${diEsc(a.recomendado?.corretor?.nome||'Sem recomendação')}</div>
              <div style="font-size:11px;color:#64748B;margin-top:2px">${diEsc(a.recomendado?.nivelConfianca||'—')} confiança · ${a.recomendado?.probabilidade||0}% conversão</div>
            </div>
            <span class="di-prob ${(a.recomendado?.probabilidade||0)>=70?'di-prob-alta':(a.recomendado?.probabilidade||0)>=45?'di-prob-media':'di-prob-baixa'}" style="font-size:14px;padding:5px 14px">${a.recomendado?.probabilidade||0}%</span>
          </div>
          <div style="font-size:11px;color:#94A3B8;margin-top:10px;line-height:1.6;font-style:italic">${diEsc(a.justificativa)}</div>
        </div>

        <!-- Ranking top 5 -->
        <div>
          <div class="di-section-title">🏆 Ranking dos consultores</div>
          ${top5Html || '<div style="color:#374151;font-size:11px">Sem consultores disponíveis.</div>'}
        </div>

        <!-- Breakdown do recomendado -->
        ${a.recomendado ? `
        <div>
          <div class="di-section-title">🔍 Fatores utilizados (${diEsc(a.recomendado.corretor.nome.split(' ')[0])})</div>
          ${breakdownHtml}
          <div class="di-rule-row" style="border-top:1px solid rgba(255,255,255,0.08);margin-top:4px">
            <div class="di-rule-label" style="font-weight:600;color:#F0FDF4">Probabilidade de conversão</div>
            <div class="di-rule-pts" style="color:#FB923C;font-size:13px;font-weight:700">${a.recomendado.probabilidade}%</div>
          </div>
        </div>` : ''}

        <!-- Pontos positivos -->
        ${(a.recomendado?.motivos||[]).length>0 ? `
        <div>
          <div class="di-section-title">✅ Motivos da recomendação</div>
          ${(a.recomendado.motivos||[]).map(m=>`<div style="display:flex;gap:7px;padding:5px 10px;background:rgba(34,197,94,0.04);border:1px solid rgba(34,197,94,0.1);border-radius:7px;margin-bottom:4px;font-size:11.5px;color:#86EFAC;line-height:1.4">✓ ${diEsc(m)}</div>`).join('')}
        </div>` : ''}

        <!-- Pontos de atenção -->
        ${(a.recomendado?.atencao||[]).length>0 ? `
        <div>
          <div class="di-section-title">⚠️ Pontos de atenção</div>
          ${(a.recomendado.atencao||[]).slice(0,3).map(m=>`<div style="display:flex;gap:7px;padding:5px 10px;background:rgba(234,179,8,0.04);border:1px solid rgba(234,179,8,0.1);border-radius:7px;margin-bottom:4px;font-size:11.5px;color:#FDE68A;line-height:1.4">→ ${diEsc(m)}</div>`).join('')}
        </div>` : ''}

        <!-- Nota -->
        <div style="background:rgba(99,102,241,0.04);border:1px solid rgba(99,102,241,0.1);border-radius:10px;padding:12px;font-size:11px;color:#A5B4FC;line-height:1.6">
          <strong>⚡ SPR-006 — Apenas recomendação.</strong> A decisão final é sempre do gestor. A distribuição automática estará disponível em uma sprint futura.
        </div>

      </div>
    </div>`;

  document.body.appendChild(overlay);
  document.addEventListener('keydown', diEscKey);
}

function diFecharAnalise() {
  const o=document.getElementById('di-overlay'); if(o) o.remove();
  document.removeEventListener('keydown', diEscKey);
}
function diEscKey(e) {
  if (e.key==='Escape') {
    diFecharAnalise();
    const s=document.getElementById('di-sim-overlay'); if(s) s.remove();
  }
}

/* ─────────────────────────────────────────────
   MODAL DE SIMULAÇÃO
───────────────────────────────────────────── */
function diAbrirSimulacao(sim) {
  const existing=document.getElementById('di-sim-overlay'); if(existing) existing.remove();

  const maxTotal = Math.max(...sim.distribuicao.map(d => d.total), 1);

  const overlay = document.createElement('div');
  overlay.className = 'di-sim-overlay';
  overlay.id        = 'di-sim-overlay';
  overlay.onclick   = e => { if(e.target===overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div class="di-sim-panel">
      <div class="di-sim-header">
        <div>
          <div style="font-size:14px;font-weight:600;color:#F0FDF4;letter-spacing:-0.02em">Simulação de Distribuição</div>
          <div style="font-size:10px;color:#64748B;font-family:'DM Mono',monospace;margin-top:2px">Como ficaria a carteira após distribuição inteligente</div>
        </div>
        <button class="di-panel-close" onclick="document.getElementById('di-sim-overlay').remove()">✕</button>
      </div>

      <div class="di-sim-body">

        <!-- KPIs da simulação -->
        <div class="di-sim-kpis">
          <div class="di-sim-kpi"><div class="di-sim-kpi-val">${sim.probGeral}%</div><div class="di-sim-kpi-lbl">Conv. prevista</div></div>
          <div class="di-sim-kpi"><div class="di-sim-kpi-val">${sim.equilibrio}%</div><div class="di-sim-kpi-lbl">Equilíbrio</div></div>
          <div class="di-sim-kpi"><div class="di-sim-kpi-val">${sim.totalLeads}</div><div class="di-sim-kpi-lbl">Leads alocados</div></div>
        </div>

        <!-- Alertas -->
        ${sim.sobrecarregados.length>0?`
        <div style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.15);border-radius:10px;padding:12px">
          <div style="font-size:10px;color:#EF4444;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">🔴 Sobrecarregados</div>
          ${sim.sobrecarregados.map(c=>`<div style="font-size:11px;color:#FCA5A5;padding:2px 0">${diEsc(c.nome)} — ${c.total} leads</div>`).join('')}
        </div>`:''}

        ${sim.disponiveis.length>0?`
        <div style="background:rgba(34,197,94,0.04);border:1px solid rgba(34,197,94,0.12);border-radius:10px;padding:12px">
          <div style="font-size:10px;color:#22C55E;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">🟢 Disponíveis</div>
          ${sim.disponiveis.map(c=>`<div style="font-size:11px;color:#86EFAC;padding:2px 0">${diEsc(c.nome)} — ${c.total} leads</div>`).join('')}
        </div>`:''}

        <!-- Distribuição por consultor -->
        <div>
          <div class="di-section-title">Distribuição por consultor</div>
          ${sim.distribuicao.filter(d=>d.total>0).map(d=>`
            <div class="di-dist-row">
              <div class="di-dist-nome">${diEsc(d.nome.split(' ')[0])}</div>
              <div class="di-dist-bar-wrap">
                <div class="di-dist-bar-bg">
                  <div class="di-dist-bar-fill" style="width:${Math.round((d.total/maxTotal)*100)}%"></div>
                </div>
              </div>
              <div class="di-dist-num">${d.atual} + <span style="color:#FB923C">${d.novos}↑</span> = ${d.total}${d.probMedia>0?` · ${d.probMedia}%`:''}</div>
            </div>`).join('')}
        </div>

        <div style="font-size:11px;color:#475569;line-height:1.6;text-align:center;padding:4px 0">
          Esta é apenas uma simulação. A distribuição real requer aprovação do gestor.<br>
          <em>Futura Sprint: distribuição automática, manual e programada.</em>
        </div>

      </div>
    </div>`;

  document.body.appendChild(overlay);
}

/* ─────────────────────────────────────────────
   ESTADOS / HELPERS
───────────────────────────────────────────── */
function diMostrarEstado(estado, msg) {
  ['di-state-loading','di-state-empty','di-state-error'].forEach(id => {
    const el=document.getElementById(id); if(el) el.style.display='none';
  });
  const c=document.getElementById('di-conteudo');
  if(c) c.style.display=estado?'none':'block';
  if(estado==='loading') { const el=document.getElementById('di-state-loading'); if(el) el.style.display='flex'; }
  else if(estado==='empty')  { const el=document.getElementById('di-state-empty');  if(el) el.style.display='flex'; }
  else if(estado==='error') {
    const el=document.getElementById('di-state-error'); if(el) el.style.display='flex';
    const me=document.getElementById('di-error-msg'); if(me&&msg) me.textContent=msg;
  }
}

function diAtualizarMeta(total) {
  const el=document.getElementById('di-header-meta');
  const ts=DistributionService.getCalcEm();
  if(el) el.textContent=`${total} leads analisados${ts?' · '+diFmtTs(ts):''}`;
}

function diFmtTs(ts) {
  if(!ts) return '—';
  try {
    const d=new Date(ts);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  } catch { return ts; }
}

function diEsc(str) {
  if(!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
