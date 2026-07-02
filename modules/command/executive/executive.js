/**
 * CDP — MORNING BRIEFING & WAR ROOM
 * executive.js
 * SPR-008 · KR7 Command Executive
 */

'use strict';

let exBriefing = null;

/* ─────────────────────────────────────────────
   PONTO DE ENTRADA
───────────────────────────────────────────── */
async function initCommandExecutive() {
  exMostrarEstado('loading');
  try {
    exBriefing = await ExecutiveService.obterBriefing();
    exRenderTudo(exBriefing);
  } catch (err) {
    console.error('[Executive] init error:', err?.message || err, err?.stack || '');
    exMostrarEstado('error', err?.message || String(err) || 'Erro desconhecido');
  }
}

/* ── Botão atualizar ── */
async function exAtualizar() {
  const btn = document.getElementById('ex-btn-atualizar');
  if (btn) { btn.disabled=true; btn.innerHTML=`<span class="ex-spinner" style="width:12px;height:12px;border-width:2px"></span> Atualizando…`; }
  exMostrarEstado('loading');
  try {
    exBriefing = await ExecutiveService.atualizar();
    exRenderTudo(exBriefing);
    showToast('📊 Briefing atualizado!', 'success');
  } catch (err) {
    exMostrarEstado('error', err.message);
  } finally {
    if (btn) { btn.disabled=false; btn.innerHTML=`<svg viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Atualizar Briefing`; }
  }
}

/* ─────────────────────────────────────────────
   RENDER COMPLETO
───────────────────────────────────────────── */
function exRenderTudo(b) {
  exMostrarEstado(null);
  exRenderHeader(b);
  exRenderKPIs24h(b.resumo24h);
  exRenderPrevisao(b.previsao);
  exRenderAlertas(b.alertas);
  exRenderWarRoom(b.warRoom);
  exRenderPrioridades(b.warRoom.prioridades);
  exRenderInsights(b.insights);
  exRenderProdutividade(b.resumo24h);
}

/* ─────────────────────────────────────────────
   HEADER DO BRIEFING
───────────────────────────────────────────── */
function exRenderHeader(b) {
  const wrap = document.getElementById('ex-briefing-header');
  if (!wrap) return;
  const status = b.warRoom?.status || { cor:'#22C55E', label:'OPERAÇÃO NORMAL', emoji:'🟢', bg:'rgba(34,197,94,0.06)' };
  const ts     = b.geradoEm ? exFmtTs(b.geradoEm) : '—';
  const nome   = currentUser?.nome?.split(' ')[0] || 'Gestor';

  wrap.innerHTML = `
    <div class="ex-greeting">${b.saudacao}</div>
    <div class="ex-title">${exEsc(nome)}, aqui está o briefing da operação.</div>
    <div class="ex-subtitle">// KR7 COMMAND · MORNING BRIEFING · ${new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).toUpperCase()}</div>
    <div class="ex-header-meta">
      <span class="ex-status-pill" style="color:${status.cor};background:${status.bg};border-color:${status.cor}44">
        ${status.emoji} ${status.label}
      </span>
      ${b.meta.alertasCriticos > 0 ? `<span class="ex-status-pill" style="color:#EF4444;background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.25)">🔴 ${b.meta.alertasCriticos} ALERTA${b.meta.alertasCriticos>1?'S':''} CRÍTICO${b.meta.alertasCriticos>1?'S':''}</span>` : ''}
      <span class="ex-update-time">Gerado: ${ts}</span>
    </div>`;
}

/* ─────────────────────────────────────────────
   KPIs 24H
───────────────────────────────────────────── */
function exRenderKPIs24h(r) {
  const wrap = document.getElementById('ex-kpis-24h');
  if (!wrap) return;

  const kpis = [
    { val:r.novosHoje, lbl:'Leads recebidos', delta:r.deltaLeads, highlight:r.novosHoje>0 },
    { val:r.atendidosHoje, lbl:'Atendimentos', delta:null },
    { val:r.visitasHoje, lbl:'Visitas', delta:null },
    { val:r.propostasHoje, lbl:'Propostas', delta:null },
    { val:r.vendasHoje, lbl:'Vendas', delta:r.deltaVendas, highlight:r.vendasHoje>0 },
    { val:r.recuperadosHoje, lbl:'Recuperados', delta:null },
    { val:r.perdidosHoje, lbl:'Perdidos', delta:null },
    { val:r.vgvHojeFmt, lbl:'VGV hoje', delta:null, vgv:true },
  ];

  wrap.innerHTML = kpis.map(k => {
    const deltaCls = k.delta>0?'ex-kpi-up':k.delta<0?'ex-kpi-down':'ex-kpi-flat';
    const deltaStr = k.delta!=null?(k.delta>0?`↑ +${k.delta}`:k.delta<0?`↓ ${k.delta}`:'→ igual'):'';
    return `
      <div class="ex-kpi ${k.highlight?'ex-kpi-highlight':''} ${k.vgv?'ex-kpi-vgv':''}">
        <div class="ex-kpi-val">${exEsc(String(k.val))}</div>
        <div class="ex-kpi-lbl">${k.lbl}</div>
        ${deltaStr?`<div class="ex-kpi-delta ${deltaCls}">${deltaStr} vs ontem</div>`:''}
      </div>`;
  }).join('');
}

/* ─────────────────────────────────────────────
   PREVISÃO DO MÊS
───────────────────────────────────────────── */
function exRenderPrevisao(p) {
  const wrap = document.getElementById('ex-previsao');
  if (!wrap) return;

  const cor       = p.pctMeta >= 100 ? '#22C55E' : p.pctMeta >= 70 ? '#EAB308' : '#EF4444';
  const pctDisplay= p.pctMeta !== null ? p.pctMeta : '—';
  const pctBar    = p.pctMeta !== null ? Math.min(100, p.pctMeta) : 0;
  const metaMensal= ExecutiveRepository.getMetaMensal();

  wrap.innerHTML = `
    <div class="ex-meta-box">
      <div class="ex-meta-row">
        <div>
          <div class="ex-meta-label">Meta do mês</div>
          <div class="ex-meta-val">${metaMensal > 0 ? `R$ ${(metaMensal/1000).toFixed(0)}k` : 'Não definida'}</div>
        </div>
        ${p.pctMeta !== null ? `
        <div>
          <div class="ex-meta-pct" style="color:${cor}">${pctDisplay}%</div>
        </div>` : ''}
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:10px;color:#475569">Realizado: ${p.vgvMesFmt}</span>
            <span style="font-size:10px;color:${cor}">${p.tendencia}</span>
          </div>
          <div class="ex-meta-bar-bg">
            <div class="ex-meta-bar-fill" style="width:${pctBar}%;background:${cor}"></div>
          </div>
        </div>
      </div>
      <div class="ex-meta-stats">
        <div class="ex-meta-stat"><div class="ex-meta-stat-val">${p.qtdVendas}</div><div class="ex-meta-stat-lbl">Vendas no mês</div></div>
        <div class="ex-meta-stat"><div class="ex-meta-stat-val">${p.previsaoFimFmt}</div><div class="ex-meta-stat-lbl">Projeção final</div></div>
        <div class="ex-meta-stat"><div class="ex-meta-stat-val">${p.diasRestantes}d</div><div class="ex-meta-stat-lbl">Dias restantes</div></div>
      </div>
      ${p.vgvPipeline > 0 ? `
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.04);font-size:11px;color:#475569">
        Pipeline ativo: <strong style="color:#22C55E">${p.vgvPipelineFmt}</strong> em ${p.pipeline} proposta${p.pipeline>1?'s':''} abertas.
      </div>` : ''}
    </div>`;
}

/* ─────────────────────────────────────────────
   ALERTAS
───────────────────────────────────────────── */
function exRenderAlertas(alertas) {
  const wrap = document.getElementById('ex-alertas');
  if (!wrap) return;

  // Badge
  const badge = document.getElementById('ex-alertas-badge');
  if (badge) {
    badge.textContent = alertas.length;
    badge.style.background = alertas.some(a=>a.tipo==='CRITICO') ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)';
    badge.style.color      = alertas.some(a=>a.tipo==='CRITICO') ? '#FCA5A5' : '#FDE68A';
    badge.style.borderColor= alertas.some(a=>a.tipo==='CRITICO') ? 'rgba(239,68,68,0.25)' : 'rgba(234,179,8,0.25)';
  }

  if (alertas.length === 0) {
    wrap.innerHTML = `<div class="ex-insight" style="color:#22C55E;border-color:rgba(34,197,94,0.12)"><span>✅</span> Nenhum alerta crítico no momento. Operação normal.</div>`;
    return;
  }

  wrap.innerHTML = alertas.map(a => `
    <div class="ex-alert ex-alert-${a.tipo}">
      <div class="ex-alert-icon">${a.icone}</div>
      <div class="ex-alert-body">
        <div class="ex-alert-titulo">${exEsc(a.titulo)}</div>
        <div class="ex-alert-desc">${exEsc(a.descricao)}</div>
        ${a.leads?.length > 0 ? `<div class="ex-alert-leads">${a.leads.map(l=>`<span class="ex-alert-lead-tag">${exEsc(l)}</span>`).join('')}</div>` : ''}
      </div>
    </div>`).join('');
}

/* ─────────────────────────────────────────────
   WAR ROOM
───────────────────────────────────────────── */
function exRenderWarRoom(wr) {
  const wrap = document.getElementById('ex-warroom-body');
  if (!wrap) return;

  const status = wr.status || { cor:'#22C55E', label:'NORMAL', emoji:'🟢', bg:'rgba(34,197,94,0.06)' };
  const temp   = wr.temperatura || 0;
  const tempColor = temp >= 70 ? '#EF4444' : temp >= 40 ? '#EAB308' : '#22C55E';

  // Atualiza header
  const hdr = document.getElementById('ex-warroom-status');
  if (hdr) hdr.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:16px">${status.emoji}</span>
      <div>
        <div style="font-size:12px;font-weight:600;color:${status.cor}">${status.label}</div>
        <div style="font-size:9px;color:#475569;font-family:'DM Mono',monospace">SALA DE GUERRA</div>
      </div>
    </div>
    <div class="ex-temp-wrap">
      <span style="font-size:9px;color:#475569;font-family:'DM Mono',monospace">TEMP</span>
      <div class="ex-temp-bar"><div class="ex-temp-fill" style="width:${temp}%;background:${tempColor}"></div></div>
      <span class="ex-temp-val" style="color:${tempColor}">${temp}</span>
    </div>`;

  const renderItems = (items, emptyMsg) => items.length === 0
    ? `<div style="font-size:11px;color:#374151;padding:6px 0">${emptyMsg}</div>`
    : items.slice(0,5).map(item => `
      <div class="ex-warroom-item">
        <div class="ex-warroom-emoji">${item.emoji}</div>
        <div class="ex-warroom-texto">
          <div class="ex-warroom-titulo">${exEsc(item.titulo)}</div>
          <div class="ex-warroom-desc">${exEsc(item.descricao)}</div>
        </div>
      </div>`).join('');

  wrap.innerHTML = `
    <div class="ex-warroom-col">
      <div class="ex-warroom-col-title">🔴 Top Problemas</div>
      ${renderItems(wr.problemas, '✅ Nenhum problema crítico.')}
    </div>
    <div class="ex-warroom-col">
      <div class="ex-warroom-col-title">💡 Top Oportunidades</div>
      ${renderItems(wr.oportunidades, 'Gere mais leads para identificar oportunidades.')}
    </div>`;

  // Maior risco / oportunidade
  const risco = document.getElementById('ex-maior-risco');
  const oport = document.getElementById('ex-maior-oportunidade');
  if (risco) risco.innerHTML = wr.maiorRisco
    ? `<div class="ex-alert ex-alert-ALTO"><div class="ex-alert-icon">${wr.maiorRisco.emoji}</div><div class="ex-alert-body"><div class="ex-alert-titulo">${exEsc(wr.maiorRisco.titulo)}</div><div class="ex-alert-desc">${exEsc(wr.maiorRisco.descricao)}</div></div></div>`
    : `<div style="font-size:11px;color:#374151;padding:8px">Sem risco crítico no momento.</div>`;
  if (oport) oport.innerHTML = wr.maiorOportunidade
    ? `<div class="ex-insight"><span class="ex-insight-icon">${wr.maiorOportunidade.emoji}</span>${exEsc(wr.maiorOportunidade.descricao)}</div>`
    : `<div style="font-size:11px;color:#374151;padding:8px">Aguardando dados suficientes.</div>`;
}

/* ─────────────────────────────────────────────
   PRIORIDADES DO DIA
───────────────────────────────────────────── */
function exRenderPrioridades(prioridades) {
  const wrap = document.getElementById('ex-prioridades');
  if (!wrap) return;
  if (!prioridades || prioridades.length === 0) {
    wrap.innerHTML = `<div style="font-size:11px;color:#374151;padding:8px 0">Nenhuma prioridade urgente no momento.</div>`;
    return;
  }
  wrap.innerHTML = prioridades.map((p,i) => `
    <div class="ex-prioridade">
      <div class="ex-prio-num">${i+1}</div>
      <span>${exEsc(p)}</span>
    </div>`).join('');
}

/* ─────────────────────────────────────────────
   INSIGHTS
───────────────────────────────────────────── */
function exRenderInsights(insights) {
  const wrap = document.getElementById('ex-insights');
  if (!wrap) return;
  if (!insights || insights.length === 0) {
    wrap.innerHTML = `<div class="ex-insight"><span>💡</span> Cadastre mais leads para o COMMAND gerar insights automáticos.</div>`;
    return;
  }
  wrap.innerHTML = insights.map(ins => `
    <div class="ex-insight">
      <span class="ex-insight-icon">${ins.icone}</span>
      <span>${exEsc(ins.texto)}</span>
    </div>`).join('');
}

/* ─────────────────────────────────────────────
   PRODUTIVIDADE
───────────────────────────────────────────── */
function exRenderProdutividade(r) {
  const wrap = document.getElementById('ex-produtividade');
  if (!wrap) return;

  const maisAtivos  = r.maisAtivos  || [];
  const menosAtivos = r.menosAtivos || [];

  if (maisAtivos.length === 0 && menosAtivos.length === 0) {
    wrap.innerHTML = `<div style="font-size:11px;color:#374151;padding:4px 0">Aguardando dados de hoje.</div>`;
    return;
  }

  const mkAvatar = nome => nome.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  wrap.innerHTML = `
    ${maisAtivos.length>0?`
    <div style="font-size:10px;color:#64748B;font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:6px">✅ Mais ativos</div>
    ${maisAtivos.map(c=>`
      <div class="ex-prod-item">
        <div class="ex-prod-avatar">${mkAvatar(c.nome)}</div>
        <div class="ex-prod-nome">${exEsc(c.nome.split(' ')[0])}</div>
        <div class="ex-prod-val">${c.qt} atend.</div>
      </div>`).join('')}`:''}
    ${menosAtivos.length>0?`
    <div style="font-size:10px;color:#64748B;font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.07em;margin:10px 0 6px">⚠️ Sem atividade hoje</div>
    ${menosAtivos.map(c=>`
      <div class="ex-prod-item">
        <div class="ex-prod-avatar" style="background:rgba(239,68,68,0.06);border-color:rgba(239,68,68,0.15);color:#FCA5A5">${mkAvatar(c.nome)}</div>
        <div class="ex-prod-nome">${exEsc(c.nome.split(' ')[0])}</div>
        <div style="font-size:10px;color:#374151;font-family:'DM Mono',monospace">sem atendimentos</div>
      </div>`).join('')}`:''}`;
}

/* ─────────────────────────────────────────────
   MODAL DE META MENSAL
───────────────────────────────────────────── */
function exAbrirMeta() {
  const meta = ExecutiveRepository.getMetaMensal();
  const overlay = document.createElement('div');
  overlay.className = 'ex-meta-modal-overlay';
  overlay.id        = 'ex-meta-overlay';
  overlay.onclick   = e => { if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div class="ex-meta-modal">
      <h3>💰 Meta Mensal de VGV</h3>
      <p>Defina o objetivo de VGV para o mês atual. O briefing usará esse valor para calcular o % atingido.</p>
      <input type="number" class="ex-meta-input" id="ex-meta-valor" placeholder="Ex: 2000000" value="${meta||''}" min="0">
      <div class="ex-meta-btns">
        <button class="ex-meta-btn-cancel" onclick="document.getElementById('ex-meta-overlay').remove()">Cancelar</button>
        <button class="ex-meta-btn-save" onclick="exSalvarMeta()">Salvar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  setTimeout(()=>document.getElementById('ex-meta-valor')?.focus(),100);
}

function exSalvarMeta() {
  const val = parseFloat(document.getElementById('ex-meta-valor')?.value||'0');
  ExecutiveService.setMeta(val);
  document.getElementById('ex-meta-overlay')?.remove();
  showToast('Meta atualizada!', 'success');
  exAtualizar();
}

/* ─────────────────────────────────────────────
   ESTADOS / HELPERS
───────────────────────────────────────────── */
function exMostrarEstado(estado, msg) {
  const load = document.getElementById('ex-state-loading');
  const err  = document.getElementById('ex-state-error');
  const cont = document.getElementById('ex-conteudo');
  if (load) load.style.display = estado==='loading'?'flex':'none';
  if (err)  { err.style.display = estado==='error'?'flex':'none'; if(msg){const el=document.getElementById('ex-error-msg');if(el)el.textContent=msg;} }
  if (cont) cont.style.display = estado?'none':'block';
}

function exFmtTs(ts) {
  if(!ts) return '—';
  try {
    const d=new Date(ts);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  } catch { return ts; }
}

function exEsc(str) {
  if(!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
