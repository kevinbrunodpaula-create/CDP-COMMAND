/**
 * CDP — COMMAND CORRETOR VIEW
 * Release 5.0 · Interface COMMAND personalizada para Corretor
 *
 * O Corretor vê APENAS seus próprios leads e métricas.
 * NUNCA vê dados de outros corretores.
 */

'use strict';

/* ─────────────────────────────────────────────
   PONTO DE ENTRADA
───────────────────────────────────────────── */
async function initCorretorView() {
  const page = document.getElementById('page-command-corretor');
  if (!page) return;
  try {
    const dados = CommandEngine.analisarCompleto({ apenasEquipe:false });
    cvRender(page, dados);
  } catch(err) {
    console.error('[CorretorView] init error:', err?.message || err);
  }
}

/* ─────────────────────────────────────────────
   RENDER PRINCIPAL
───────────────────────────────────────────── */
function cvRender(page, dados) {
  const u    = typeof currentUser !== 'undefined' ? currentUser : {};
  const inic = (u.nome||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const meta = dados.meta || { vendas:0, meta:5, pct:0, projecao:0, diasRestantes:0 };
  const tc   = typeof TempoComercial !== 'undefined'
    ? TempoComercial.medias((typeof allLeads!=='undefined'?allLeads:[]).filter(l=>(l.corretor||'').toLowerCase().trim()===(u.nome||'').toLowerCase().trim()))
    : null;

  page.innerHTML = `
    <div class="cv-wrap">
      <!-- Header -->
      <div class="cv-header">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:44px;height:44px;border-radius:13px;background:rgba(34,197,94,0.1);border:2px solid rgba(34,197,94,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#22C55E;font-family:'DM Mono',monospace">${inic}</div>
          <div>
            <div class="cv-nome">${cvEsc(u.nome||'Corretor')}</div>
            <div style="display:flex;gap:6px;align-items:center;margin-top:3px">
              <span class="cv-cargo-badge">CORRETOR</span>
              <span style="font-size:10px;color:${dados.saude.cor}">${dados.saude.emoji} ${dados.saude.label}</span>
            </div>
          </div>
        </div>
        <button onclick="initCorretorView()" style="padding:7px 14px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:8px;color:#86EFAC;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif">🔄 Atualizar</button>
      </div>

      <!-- KPIs pessoais -->
      <div class="cv-kpis">
        <div class="cv-kpi">
          <div class="cv-kpi-val" style="color:#22C55E">${dados.leads.ativos}</div>
          <div class="cv-kpi-lbl">Leads Ativos</div>
        </div>
        <div class="cv-kpi">
          <div class="cv-kpi-val" style="color:#22C55E">${dados.leads.vendasMes}</div>
          <div class="cv-kpi-lbl">Vendas/Mês</div>
        </div>
        <div class="cv-kpi">
          <div class="cv-kpi-val" style="color:#0EA5E9">${dados.leads.propostas}</div>
          <div class="cv-kpi-lbl">Propostas</div>
        </div>
        <div class="cv-kpi">
          <div class="cv-kpi-val" style="color:${dados.leads.criticos>0?'#EF4444':'#22C55E'}">${dados.leads.criticos}</div>
          <div class="cv-kpi-lbl">Críticos</div>
        </div>
        <div class="cv-kpi">
          <div class="cv-kpi-val" style="color:#14B8A6">${dados.leads.conv}%</div>
          <div class="cv-kpi-lbl">Conversão</div>
        </div>
        <div class="cv-kpi">
          <div class="cv-kpi-val" style="color:#8B5CF6">${dados.leads.visitasHoje}</div>
          <div class="cv-kpi-lbl">Visitas Hoje</div>
        </div>
      </div>

      <!-- Meta pessoal -->
      <div class="cv-sec">
        <div class="cv-sec-title">🎯 Meta do Mês</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <div style="font-size:22px;font-weight:700;color:#F0FDF4;font-family:'DM Sans',sans-serif">${meta.vendas} <span style="font-size:12px;color:#64748B">/ ${meta.meta} vendas</span></div>
          <div style="font-size:22px;font-weight:700;color:${meta.pct>=100?'#22C55E':meta.pct>=60?'#F59E0B':'#EF4444'}">${meta.pct}%</div>
        </div>
        <div class="cv-meta-bar-bg"><div class="cv-meta-bar" style="width:${meta.pct}%;background:${meta.pct>=100?'#22C55E':meta.pct>=60?'#F59E0B':'#EF4444'}"></div></div>
        <div style="font-size:10px;color:#475569;margin-top:5px">${meta.diasRestantes}d restantes · Projeção: ${meta.projecao} venda${meta.projecao!==1?'s':''}</div>
      </div>

      <!-- Recomendações -->
      <div class="cv-sec">
        <div class="cv-sec-title">🎯 Suas Prioridades Hoje</div>
        ${dados.recomendacoes.length
          ? dados.recomendacoes.map(r=>`
            <div class="cv-rec-item">
              <div class="cv-rec-icon">${r.icone}</div>
              <div>
                <div class="cv-rec-titulo">${cvEsc(r.titulo)}</div>
                <div class="cv-rec-motivo">${cvEsc(r.motivo)}</div>
              </div>
            </div>`).join('')
          : '<div style="font-size:12px;color:#374151">✅ Nenhuma prioridade crítica no momento.</div>'
        }
      </div>

      <!-- Tempo Comercial -->
      ${tc ? `
      <div class="cv-sec">
        <div class="cv-sec-title">⏱ Seu Tempo Comercial</div>
        <div class="cv-tc-grid">
          <div class="cv-tc-item"><div class="cv-tc-lbl">1º Contato</div><div class="cv-tc-val">${tc.mContatoFmt}</div></div>
          <div class="cv-tc-item"><div class="cv-tc-lbl">Visita</div><div class="cv-tc-val">${tc.mVisitaFmt}</div></div>
          <div class="cv-tc-item"><div class="cv-tc-lbl">Proposta</div><div class="cv-tc-val">${tc.mPropostaFmt}</div></div>
          <div class="cv-tc-item"><div class="cv-tc-lbl">Venda</div><div class="cv-tc-val">${tc.mVendaFmt}</div></div>
        </div>
      </div>` : ''}

      <!-- Timeline pessoal -->
      <div class="cv-sec">
        <div class="cv-sec-title">📋 Seus Últimos Movimentos</div>
        ${dados.timeline.slice(0,10).map(t=>`
          <div class="cv-tl-item">
            <div class="cv-tl-dot" style="background:${t.cor}"></div>
            <div class="cv-tl-desc">${cvEsc(t.desc.replace(/ \([^)]+\)/,''))}</div>
            <div class="cv-tl-time">${cvEsc(t.tempo)}</div>
          </div>`).join('') || '<div style="font-size:12px;color:#374151">Nenhuma movimentação registrada.</div>'}
      </div>
    </div>`;
}

function cvEsc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
