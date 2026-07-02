/**
 * CDP — COMMAND COORDENADOR VIEW
 * Release 5.0 · Interface COMMAND para Coordenador
 *
 * Coordenador vê: sua carteira pessoal + equipe sob sua supervisão.
 * NÃO vê: dados de outros coordenadores, relatórios financeiros, configurações.
 */

'use strict';

async function initCoordenadorView() {
  const page = document.getElementById('page-command-coordenador');
  if (!page) return;
  try {
    const dados = CommandEngine.analisarCompleto();
    coordRender(page, dados);
  } catch(err) {
    console.error('[CoordenadorView] init error:', err?.message || err);
  }
}

function coordRender(page, dados) {
  const u    = typeof currentUser !== 'undefined' ? currentUser : {};
  const inic = (u.nome||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const rank = dados.ranking || [];

  page.innerHTML = `
    <div class="cv-wrap">
      <!-- Header -->
      <div class="cv-header">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:44px;height:44px;border-radius:13px;background:rgba(99,102,241,0.1);border:2px solid rgba(99,102,241,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#6366F1;font-family:'DM Mono',monospace">${inic}</div>
          <div>
            <div class="cv-nome">${cvEsc(u.nome||'Coordenador')}</div>
            <div style="display:flex;gap:6px;align-items:center;margin-top:3px">
              <span style="font-size:9px;padding:3px 9px;border-radius:6px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.25);color:#A5B4FC;font-family:'DM Mono',monospace;letter-spacing:0.06em">COORDENADOR</span>
              <span style="font-size:10px;color:${dados.saude.cor}">${dados.saude.emoji} ${dados.saude.label}</span>
            </div>
          </div>
        </div>
        <button onclick="initCoordenadorView()" style="padding:7px 14px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:8px;color:#A5B4FC;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif">🔄 Atualizar</button>
      </div>

      <!-- KPIs da equipe -->
      <div class="cv-kpis">
        <div class="cv-kpi"><div class="cv-kpi-val" style="color:#22C55E">${dados.leads.ativos}</div><div class="cv-kpi-lbl">Leads Ativos</div></div>
        <div class="cv-kpi"><div class="cv-kpi-val" style="color:#22C55E">${dados.leads.vendasMes}</div><div class="cv-kpi-lbl">Vendas/Mês</div></div>
        <div class="cv-kpi"><div class="cv-kpi-val" style="color:${dados.leads.criticos>0?'#EF4444':'#22C55E'}">${dados.leads.criticos}</div><div class="cv-kpi-lbl">Críticos</div></div>
        <div class="cv-kpi"><div class="cv-kpi-val" style="color:#14B8A6">${dados.leads.conv}%</div><div class="cv-kpi-lbl">Conversão</div></div>
        <div class="cv-kpi"><div class="cv-kpi-val" style="color:#8B5CF6">${dados.leads.visitasHoje}</div><div class="cv-kpi-lbl">Visitas Hoje</div></div>
        <div class="cv-kpi"><div class="cv-kpi-val" style="color:#F97316">${dados.leads.semCorretor}</div><div class="cv-kpi-lbl">Sem Corretor</div></div>
      </div>

      <!-- Recomendações -->
      <div class="cv-sec">
        <div class="cv-sec-title">🎯 Ações Prioritárias</div>
        ${dados.recomendacoes.length
          ? dados.recomendacoes.map(r=>`<div class="cv-rec-item"><div class="cv-rec-icon">${r.icone}</div><div><div class="cv-rec-titulo">${cvEsc(r.titulo)}</div><div class="cv-rec-motivo">${cvEsc(r.motivo)}</div></div></div>`).join('')
          : '<div style="font-size:12px;color:#374151">✅ Nenhuma ação crítica.</div>'}
      </div>

      <!-- Ranking da equipe -->
      ${rank.length ? `
      <div class="cv-sec">
        <div class="cv-sec-title">🏆 Ranking da Equipe</div>
        ${rank.map((r,i)=>{
          const ic = (r.corretor.nome||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
          return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
            <div style="width:20px;font-size:11px;color:${i===0?'#FFD700':'#475569'};font-family:'DM Mono',monospace;font-weight:600">${i+1}</div>
            <div style="width:32px;height:32px;border-radius:9px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#A5B4FC;font-family:'DM Mono',monospace">${ic}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:500;color:#F0FDF4">${cvEsc(r.corretor.nome)}</div>
              <div style="font-size:10px;color:#475569">${r.vendasMes} vendas/mês · ${r.ativos} ativos · ${r.conv}% conv.</div>
            </div>
            <div style="font-size:18px;font-weight:700;color:#A5B4FC;font-family:'DM Sans',sans-serif;letter-spacing:-0.04em">${r.score}</div>
          </div>`;
        }).join('')}
      </div>` : ''}

      <!-- Timeline da equipe -->
      <div class="cv-sec">
        <div class="cv-sec-title">📋 Movimentações Recentes</div>
        ${dados.timeline.slice(0,12).map(t=>`
          <div class="cv-tl-item">
            <div class="cv-tl-dot" style="background:${t.cor}"></div>
            <div class="cv-tl-desc">${cvEsc(t.desc)}</div>
            <div class="cv-tl-time">${cvEsc(t.tempo)}</div>
          </div>`).join('') || '<div style="font-size:12px;color:#374151">Sem movimentações.</div>'}
      </div>
    </div>`;
}
