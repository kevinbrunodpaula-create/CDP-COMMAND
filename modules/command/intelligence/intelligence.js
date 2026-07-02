/**
 * CDP — COMMAND INTELLIGENCE
 * intelligence.js
 * Release 2.9 · KR7 Command Intelligence
 */

'use strict';

/* ── Estado ── */
let inTab = 'predictor';
let inData = { pred:[], coach:[], perf:[], auto:{ regras:[], resumo:{} } };

/* ─────────────────────────────────────────────
   PONTO DE ENTRADA
───────────────────────────────────────────── */
async function initCommandIntelligence() {
  inMostrarEstado('loading');
  try {
    await inCarregarAba(inTab);
  } catch(err) {
    console.error('[Intelligence] init error:', err?.message || err, err?.stack || '');
    inMostrarEstado('error', err?.message || String(err) || 'Erro desconhecido');
  }
}

/* ── Botão atualizar ── */
async function inAtualizar() {
  const btn = document.getElementById('in-btn-atualizar');
  if (btn) { btn.disabled=true; btn.innerHTML=`<span class="in-spinner" style="width:12px;height:12px;border-width:2px"></span> Atualizando…`; }
  inMostrarEstado('loading');
  try {
    await inCarregarAba(inTab, true);
    showToast('🧠 Intelligence atualizada!', 'success');
  } catch(err) {
    inMostrarEstado('error', err.message);
  } finally {
    if(btn) { btn.disabled=false; btn.innerHTML=`<svg viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Atualizar`; }
  }
}

function inSetTab(tab) {
  inTab = tab;
  document.querySelectorAll('.in-tab').forEach(t => t.classList.toggle('active', t.dataset.tab===tab));
  inCarregarAba(tab);
}

async function inCarregarAba(tab, forcar=false) {
  inMostrarEstado('loading');
  try {
    if (tab==='predictor') {
      if (!inData.pred.length || forcar) inData.pred = await IntelligenceService.gerarPredicoes(!forcar);
      inRenderPredictor(inData.pred);
    } else if (tab==='coach') {
      if (!inData.coach.length || forcar) inData.coach = await IntelligenceService.gerarCoachEquipeS(!forcar);
      inRenderCoach(inData.coach);
    } else if (tab==='performance') {
      if (!inData.perf.length || forcar) inData.perf = await IntelligenceService.gerarPerformanceS(!forcar);
      inRenderPerformance(inData.perf);
    } else if (tab==='automation') {
      if (!inData.auto.regras?.length || forcar) inData.auto = await IntelligenceService.avaliarAutomacoes(!forcar);
      inRenderAutomation(inData.auto);
    }
    inMostrarEstado(null);
    inAtualizarMeta();
  } catch(err) {
    inMostrarEstado('error', err.message);
  }
}

/* ─────────────────────────────────────────────
   TAB 1 — PREDICTOR
───────────────────────────────────────────── */
function inRenderPredictor(pred) {
  const conteudo = document.getElementById('in-conteudo');
  if (!conteudo) return;

  if (pred.length === 0) {
    conteudo.innerHTML=`<div class="in-state"><div class="in-state-icon">🔮</div><div class="in-state-title">Sem leads para analisar</div><div class="in-state-sub">Cadastre leads ativos para o Predictor calcular probabilidades.</div></div>`;
    return;
  }

  const totalAlta = pred.filter(p=>(p.predicoes.find(x=>x.tipo==='Venda')?.pct||0)>=60).length;
  const mediaVenda = Math.round(pred.reduce((a,p)=>a+(p.predicoes.find(x=>x.tipo==='Venda')?.pct||0),0)/pred.length);

  conteudo.innerHTML = `
    <div class="in-kpis" style="margin-bottom:10px">
      <div class="in-kpi"><div class="in-kpi-val">${pred.length}</div><div class="in-kpi-lbl">Leads analisados</div></div>
      <div class="in-kpi"><div class="in-kpi-val" style="color:#22C55E">${totalAlta}</div><div class="in-kpi-lbl">Alta prob. venda</div></div>
      <div class="in-kpi"><div class="in-kpi-val">${mediaVenda}%</div><div class="in-kpi-lbl">Prob. média</div></div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
      <input type="text" id="in-f-busca" placeholder="Pesquisar lead…" oninput="inFiltrarPred()" style="flex:1;min-width:160px;padding:7px 10px;background:var(--bg-input);border:1px solid rgba(99,102,241,0.1);border-radius:8px;color:#F0FDF4;font-family:'DM Sans',sans-serif;font-size:12px;outline:none">
      <select id="in-f-prob" onchange="inFiltrarPred()" style="padding:7px 10px;background:var(--bg-input);border:1px solid rgba(99,102,241,0.1);border-radius:8px;color:#F0FDF4;font-family:'DM Sans',sans-serif;font-size:12px;outline:none;appearance:none;-webkit-appearance:none;cursor:pointer">
        <option value="">Qualquer prob.</option>
        <option value="60">Alta (60%+)</option>
        <option value="40">Média (40%+)</option>
      </select>
    </div>
    <div id="in-pred-list">
      ${pred.map((p,i) => inRenderPredCard(p, i)).join('')}
    </div>`;
}

function inRenderPredCard(p, idx) {
  const venda  = p.predicoes.find(x=>x.tipo==='Venda');
  const proposta=p.predicoes.find(x=>x.tipo==='Proposta');
  const desist = p.predicoes.find(x=>x.tipo==='Desistência');
  const stars  = '★'.repeat(venda?.estrelas||1)+'☆'.repeat(5-(venda?.estrelas||1));

  return `
    <div class="in-pred-card" onclick="inAbrirPredDetail(${idx})">
      <div class="in-pred-card-top">
        <div>
          <div class="in-pred-nome">${inEsc(p.lead.nome)}</div>
          <div class="in-pred-meta">${inEsc(p.lead.status||'—')} · ${inEsc(p.lead.tipo_imovel||'—')}</div>
          <div class="in-pred-corretor">${inEsc(p.lead.corretor||'Sem corretor')}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:22px;font-weight:700;color:#22C55E;letter-spacing:-0.04em">${venda?.pct||0}%</div>
          <div class="in-stars" style="color:#FBBF24">${stars}</div>
          <div style="font-size:9px;color:#475569;font-family:'DM Mono',monospace">venda</div>
        </div>
      </div>
      <div class="in-pred-grid">
        ${p.predicoes.slice(0,6).map(pred => `
          <div class="in-pred-item">
            <div class="in-pred-item-tipo">${inEsc(pred.tipo)}</div>
            <div class="in-pred-item-val" style="color:${pred.cor}">${pred.pct}%</div>
          </div>`).join('')}
      </div>
    </div>`;
}

function inFiltrarPred() {
  const busca   = (document.getElementById('in-f-busca')?.value||'').toLowerCase();
  const probMin = parseInt(document.getElementById('in-f-prob')?.value||'')||null;
  const filtrado= IntelligenceService.filtrarPredicoes(inData.pred, { busca:busca||undefined, probMin });
  const list = document.getElementById('in-pred-list');
  if (list) list.innerHTML = filtrado.map((p,i)=>inRenderPredCard(p,i)).join('');
}

function inAbrirPredDetail(idx) {
  const p = inData.pred[idx]; if (!p) return;
  const overlay = document.createElement('div');
  overlay.className='in-detail-overlay'; overlay.id='in-detail-overlay';
  overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div class="in-detail-panel">
      <div class="in-detail-header">
        <div>
          <div style="font-size:14px;font-weight:600;color:#F0FDF4">${inEsc(p.lead.nome)}</div>
          <div style="font-size:10px;color:#64748B">${inEsc(p.lead.status||'—')} · ${inEsc(p.lead.tipo_imovel||'—')}</div>
        </div>
        <button class="in-detail-close" onclick="document.getElementById('in-detail-overlay').remove()">✕</button>
      </div>
      <div class="in-detail-body">
        ${p.predicoes.map(pred=>`
          <div style="background:var(--bg-input);border:1px solid ${pred.cor}22;border-radius:12px;padding:14px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <div style="font-size:12px;font-weight:600;color:${pred.cor}">${inEsc(pred.tipo)}</div>
              <div style="display:flex;align-items:center;gap:8px">
                <span style="color:#FBBF24;font-size:11px">${'★'.repeat(pred.estrelas||1)}${'☆'.repeat(5-(pred.estrelas||1))}</span>
                <span style="font-size:20px;font-weight:700;color:${pred.cor};font-family:'DM Sans',sans-serif">${pred.pct}%</span>
              </div>
            </div>
            <div style="height:4px;background:rgba(255,255,255,0.04);border-radius:2px;overflow:hidden;margin-bottom:8px">
              <div style="width:${pred.pct}%;height:100%;border-radius:2px;background:${pred.cor};transition:width .6s ease"></div>
            </div>
            ${pred.motivos?.map(m=>`<div style="font-size:11px;color:#64748B;padding:2px 0;line-height:1.5">→ ${inEsc(m)}</div>`).join('')||''}
          </div>`).join('')}
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.addEventListener('keydown', inEscKey);
}

/* ─────────────────────────────────────────────
   TAB 2 — COACH
───────────────────────────────────────────── */
function inRenderCoach(coach) {
  const conteudo = document.getElementById('in-conteudo');
  if (!conteudo) return;
  if (coach.length===0) {
    conteudo.innerHTML=`<div class="in-state"><div class="in-state-icon">🎓</div><div class="in-state-title">Sem consultores cadastrados</div></div>`;
    return;
  }

  // Seletor de consultor
  const nomes = coach.map(c=>c.corretor.nome);
  let selecionado = coach[0]?.corretor?.nome;

  conteudo.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
      <select id="in-coach-sel" onchange="inVerCoach(this.value)" style="flex:1;padding:8px 12px;background:var(--bg-input);border:1px solid rgba(20,184,166,0.15);border-radius:9px;color:#F0FDF4;font-family:'DM Sans',sans-serif;font-size:12px;outline:none;appearance:none;-webkit-appearance:none;cursor:pointer">
        ${nomes.map(n=>`<option value="${inEsc(n)}">${inEsc(n)}</option>`).join('')}
      </select>
    </div>
    <div id="in-coach-detalhe"></div>`;

  inVerCoach(selecionado);
}

function inVerCoach(nome) {
  const c = inData.coach.find(x=>x.corretor.nome===nome); if (!c) return;
  const inic = c.corretor.nome.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const det = document.getElementById('in-coach-detalhe'); if (!det) return;

  det.innerHTML = `
    <div class="in-coach-card" style="cursor:default">
      <div class="in-coach-card-top">
        <div class="in-coach-avatar">${inic}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600;color:#F0FDF4">${inEsc(c.corretor.nome)}</div>
          <div style="font-size:10px;color:#64748B;margin-top:1px">Maturidade comercial</div>
          <div class="in-coach-maturidade-bar">
            <div style="display:flex;justify-content:space-between">
              <span style="font-size:9px;color:#475569;font-family:'DM Mono',monospace">${c.maturidade}%</span>
              <span style="font-size:9px;color:#14B8A6;font-family:'DM Mono',monospace">${c.maturidade>=80?'Avançado':c.maturidade>=60?'Intermediário':'Em desenvolvimento'}</span>
            </div>
            <div class="in-coach-maturidade-bg"><div class="in-coach-maturidade-fill" style="width:${c.maturidade}%"></div></div>
          </div>
        </div>
      </div>

      ${c.sugestoes.length>0?`
      <div style="margin-bottom:12px">
        <div class="in-sec-title">💬 Mensagem do Coach</div>
        ${c.sugestoes.map(s=>`<div class="in-coach-sug"><span>💡</span><span>${inEsc(s)}</span></div>`).join('')}
      </div>`:''}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div>
          <div class="in-sec-title">✅ Pontos fortes</div>
          ${c.fortes.map(f=>`<div class="in-coach-ponto in-coach-pos"><span>${f.icone}</span><span>${inEsc(f.texto)}</span></div>`).join('')}
        </div>
        <div>
          <div class="in-sec-title">⚠️ Pontos de atenção</div>
          ${c.fracos.map(f=>`<div class="in-coach-ponto in-coach-neg"><span>${f.icone}</span><span>${inEsc(f.texto)}</span></div>`).join('')}
        </div>
      </div>

      <div style="margin-bottom:12px">
        <div class="in-sec-title">📋 Plano de evolução</div>
        ${c.plano.map(a=>`
          <div class="in-coach-plano-item">
            <div class="in-coach-plano-prazo">${inEsc(a.prazo)}</div>
            <div>
              <div style="font-size:12px;color:#D1FAE5;margin-bottom:2px">${inEsc(a.acao)}</div>
              <div style="font-size:10px;color:#475569">Meta: ${inEsc(a.meta)}</div>
            </div>
          </div>`).join('')}
      </div>

      <div>
        <div class="in-sec-title">📚 Treinamentos recomendados</div>
        ${c.treinamentos.map(t=>`
          <div class="in-coach-tr">
            <span style="font-size:16px">${t.icone}</span>
            <div><div style="font-size:12px;color:#94A3B8">${inEsc(t.nome)}</div><div style="font-size:10px;color:#475569">${inEsc(t.foco)}</div></div>
          </div>`).join('')}
      </div>
    </div>`;
}

/* ─────────────────────────────────────────────
   TAB 3 — PERFORMANCE
───────────────────────────────────────────── */
function inRenderPerformance(perf) {
  const conteudo = document.getElementById('in-conteudo');
  if (!conteudo) return;
  if (perf.length===0) {
    conteudo.innerHTML=`<div class="in-state"><div class="in-state-icon">📊</div><div class="in-state-title">Sem dados de performance</div></div>`;
    return;
  }
  // Seletor para metas/detalhe
  const nomes = perf.map(p=>p.corretor.nome);
  conteudo.innerHTML = `
    <div class="in-sec-title">🏆 Ranking da equipe</div>
    <div class="in-perf-rank" style="margin-bottom:14px">
      ${perf.map((p,i)=>{
        const inic=p.corretor.nome.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
        const posCls = i===0 ? 'in-perf-rank-pos gold' : 'in-perf-rank-pos';
        return `
          <div class="in-perf-rank-item" onclick="inVerPerf('${inEsc(p.corretor.nome)}')">
            <div class="${posCls}">${i+1}</div>
            <div class="in-perf-rank-avatar">${inic}</div>
            <div class="in-perf-rank-info">
              <div class="in-perf-rank-nome">${inEsc(p.corretor.nome)}</div>
              <div class="in-perf-rank-meta">${p.mensal.vendas} vendas · ${p.mensal.taxaConv}% conv. · ${p.leads} leads</div>
            </div>
            <div class="in-perf-rank-score">${p.score}</div>
          </div>`;
      }).join('')}
    </div>
    <div>
      <div class="in-sec-title" style="margin-bottom:8px">📈 Detalhar consultor</div>
      <select id="in-perf-sel" onchange="inVerPerf(this.value)" style="width:100%;padding:8px 12px;background:var(--bg-input);border:1px solid rgba(167,139,250,0.12);border-radius:9px;color:#F0FDF4;font-family:'DM Sans',sans-serif;font-size:12px;outline:none;appearance:none;-webkit-appearance:none;cursor:pointer;margin-bottom:10px">
        ${nomes.map(n=>`<option value="${inEsc(n)}">${inEsc(n)}</option>`).join('')}
      </select>
      <div id="in-perf-detalhe"></div>
    </div>`;
  inVerPerf(perf[0]?.corretor?.nome);
}

function inVerPerf(nome) {
  const p = inData.perf.find(x=>x.corretor.nome===nome); if (!p) return;
  const det = document.getElementById('in-perf-detalhe'); if (!det) return;
  const maxVendas = Math.max(...(p.evolucao||[]).map(s=>s.vendas),1);

  det.innerHTML = `
    <div class="in-perf-metas-grid" style="margin-bottom:12px">
      ${[
        {label:'Meta diária',   meta:p.metas?.diaria,   periodo:'Hoje'},
        {label:'Meta semanal',  meta:p.metas?.semanal,  periodo:'Esta semana'},
        {label:'Meta mensal',   meta:p.metas?.mensal,   periodo:'Este mês'},
        {label:'Meta anual',    meta:p.metas?.anual,    periodo:'Este ano'},
      ].map(m=>{
        const pct = m.meta?.meta>0 ? Math.min(100,Math.round((m.meta.atual/m.meta.meta)*100)) : 0;
        const cor = pct>=100?'#22C55E':pct>=70?'#EAB308':'#A78BFA';
        return `<div class="in-perf-meta-box">
          <div class="in-perf-meta-label">${m.label}</div>
          <div class="in-perf-meta-val" style="color:${cor}">${m.meta?.atual||0}</div>
          <div class="in-perf-meta-sub">Meta: ${m.meta?.meta||0} ${m.meta?.label||''}</div>
          <div class="in-perf-meta-bar-bg"><div class="in-perf-meta-bar-fill" style="width:${pct}%;background:${cor}"></div></div>
        </div>`;
      }).join('')}
    </div>
    ${p.evolucao?.length>0?`
    <div class="in-sec-title">📅 Evolução (6 semanas)</div>
    <div class="in-perf-chart">
      ${p.evolucao.map(s=>`
        <div class="in-perf-bar-wrap">
          <div class="in-perf-bar-val">${s.vendas}</div>
          <div class="in-perf-bar-bg">
            <div class="in-perf-bar-fill" style="height:${s.vendas>0?Math.max(8,Math.round((s.vendas/maxVendas)*100)):0}%;background:rgba(167,139,250,0.6)"></div>
          </div>
          <div class="in-perf-bar-lbl">${s.label}</div>
        </div>`).join('')}
    </div>`:''}`
}

/* ─────────────────────────────────────────────
   TAB 4 — AUTOMATION
───────────────────────────────────────────── */
let inAutoRegras = [];

function inRenderAutomation(auto) {
  inAutoRegras = [...(auto.regras||[])];
  const conteudo = document.getElementById('in-conteudo');
  if (!conteudo) return;
  const r = auto.resumo||{};

  conteudo.innerHTML = `
    <div class="in-kpis" style="margin-bottom:12px">
      <div class="in-kpi"><div class="in-kpi-val">${r.total||0}</div><div class="in-kpi-lbl">Regras ativas</div></div>
      <div class="in-kpi"><div class="in-kpi-val" style="color:#EF4444">${r.criticas||0}</div><div class="in-kpi-lbl">Críticas</div></div>
      <div class="in-kpi"><div class="in-kpi-val" style="color:#F97316">${r.altas||0}</div><div class="in-kpi-lbl">Altas</div></div>
      <div class="in-kpi"><div class="in-kpi-val" style="color:#EAB308">${r.medias||0}</div><div class="in-kpi-lbl">Médias</div></div>
    </div>
    <div style="font-size:11px;color:#475569;background:rgba(99,102,241,0.04);border:1px solid rgba(99,102,241,0.1);border-radius:9px;padding:10px 12px;margin-bottom:10px;line-height:1.6">
      <strong style="color:#A5B4FC">⚡ Motor de Regras</strong> — Nenhuma ação é executada automaticamente. O gestor revisa e aprova cada sugestão.
    </div>
    <div id="in-auto-list">
      ${inAutoRegras.map((reg,i)=>inRenderAutoCard(reg,i)).join('')||`<div class="in-state"><div class="in-state-icon">✅</div><div class="in-state-title">Nenhuma regra disparada</div><div class="in-state-sub">Todas as condições estão dentro do esperado.</div></div>`}
    </div>`;
}

function inRenderAutoCard(reg, idx) {
  const statusCls = `in-auto-${(reg.status||'PENDENTE').toLowerCase()}`;
  const isPend = (reg.status||'PENDENTE')==='PENDENTE';
  return `
    <div class="in-auto-card" id="in-auto-card-${idx}">
      <div class="in-auto-icon">${reg.cfg?.icone||'⚙️'}</div>
      <div class="in-auto-body">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:4px">
          <div class="in-auto-titulo">${inEsc(reg.titulo)}</div>
          <div style="display:flex;gap:4px;flex-shrink:0">
            <span class="in-auto-prio in-auto-prio-${reg.cfg?.prioridade||'MEDIA'}">${reg.cfg?.prioridade||'MÉDIA'}</span>
            <span class="in-auto-status-badge ${statusCls}">${reg.status||'PENDENTE'}</span>
          </div>
        </div>
        <div class="in-auto-desc">${inEsc(reg.descricao)}</div>
        ${reg.cfg?.acoes?.length?`
        <div class="in-auto-acoes">
          ${reg.cfg.acoes.map(a=>`<span class="in-auto-acao-badge">→ ${inEsc(a)}</span>`).join('')}
        </div>`:''}
        ${isPend?`
        <div class="in-auto-btns">
          <button class="in-auto-btn-ap" onclick="inAprovarAuto(${idx})">✓ Aprovar</button>
          <button class="in-auto-btn-rj" onclick="inRejeitarAuto(${idx})">Rejeitar</button>
        </div>`:''}
      </div>
    </div>`;
}

function inAprovarAuto(idx) {
  inAutoRegras = atualizarStatus(inAutoRegras, idx, 'APROVADA');
  const card = document.getElementById(`in-auto-card-${idx}`);
  if (card) card.outerHTML = inRenderAutoCard(inAutoRegras[idx], idx);
  CommandEventService.recordAutomationExecuted(inAutoRegras[idx]?.titulo||'—','APROVADA').catch(()=>{});
  showToast('Ação aprovada ✓', 'success');
}
function inRejeitarAuto(idx) {
  inAutoRegras = atualizarStatus(inAutoRegras, idx, 'REJEITADA');
  const card = document.getElementById(`in-auto-card-${idx}`);
  if (card) card.outerHTML = inRenderAutoCard(inAutoRegras[idx], idx);
}

/* ─────────────────────────────────────────────
   ESTADOS / HELPERS
───────────────────────────────────────────── */
function inMostrarEstado(estado, msg) {
  const load = document.getElementById('in-state-loading');
  const err  = document.getElementById('in-state-error');
  const cont = document.getElementById('in-conteudo');
  if (load) load.style.display = estado==='loading'?'flex':'none';
  if (err)  { err.style.display=estado==='error'?'flex':'none'; if(msg){const el=document.getElementById('in-error-msg');if(el)el.textContent=msg;} }
  if (cont) cont.style.display = estado?'none':'block';
}

function inAtualizarMeta() {
  const el = document.getElementById('in-header-meta');
  if (el) el.textContent=`${new Date().toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}`;
}

function inEscKey(e) {
  if (e.key==='Escape') {
    const o=document.getElementById('in-detail-overlay'); if(o){o.remove();document.removeEventListener('keydown',inEscKey);}
  }
}
function inEsc(str) {
  if(!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
