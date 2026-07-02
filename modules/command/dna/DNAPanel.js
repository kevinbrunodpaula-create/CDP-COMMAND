/**
 * CDP — COMMAND DNA 2.0
 * DNAPanel.js — Tela completa do DNA 2.0
 * SPR-013 · KR7 Command DNA Inteligente
 */

'use strict';

/* ── Estado ── */
var dna2Estado = { corretorSel:null, matchLeadSel:null, dados:[], qAtual:0, qRespostas:{} };

/* ─────────────────────────────────────────────
   PONTO DE ENTRADA
───────────────────────────────────────────── */
async function initCommandDNA() {
  const wrap = document.getElementById('dna2-conteudo');
  if (!wrap) return;
  dna2SetEstado('loading');
  try {
    await dna2Calcular(true);
    dna2RenderPainel();
    // Verifica questionário para usuário atual
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.cargo === 'Corretor') {
      if (!dnaQFoiPreenchido(currentUser.nome)) {
        setTimeout(() => dna2AbrirQuestionario(currentUser.nome), 800);
      }
    }
  } catch(err) {
    console.error('[DNA2] init error:', err?.message || err, err?.stack || '');
    dna2SetEstado('error', err?.message || 'Erro desconhecido');
  }
}

/* ── Calcular ── */
async function dna2Calcular(silent=false) {
  const corretores = typeof allCorretores !== 'undefined' ? allCorretores : [];
  const leads      = typeof allLeads !== 'undefined' ? allLeads : [];

  // Carrega questionários de cada corretor
  const questionarios = {};
  corretores.forEach(c => {
    const q = dnaQExtrairPerfil(c.nome);
    if (q) questionarios[c.nome] = q;
  });

  dna2Estado.dados = calcularDNA2Equipe(corretores, leads, questionarios);

  // Integra com DNAService existente (retrocompatibilidade)
  try { await DNAService.reprocessar(); } catch {}

  // Registra eventos
  if (!silent) {
    dna2Estado.dados.forEach(d => {
      CommandEventService.record({
        modulo:'dna', tipo:'DNA_UPDATED', origem:'COMMAND',
        usuario: (typeof currentUser !== 'undefined' && currentUser?.nome) || 'Sistema',
        consultor: d.corretor.nome,
        descricao: `DNA 2.0 recalculado: ${d.corretor.nome} — Score ${d.scoreGeral}`,
        metadata: JSON.stringify({ scoreGeral:d.scoreGeral, nivel:d.nivel.label }),
      }).catch(()=>{});
    });
  }
}

/* ─────────────────────────────────────────────
   RENDER PRINCIPAL
───────────────────────────────────────────── */
function dna2RenderPainel() {
  const wrap = document.getElementById('dna2-conteudo');
  if (!wrap) return;
  if (!dna2Estado.dados.length) {
    dna2SetEstado('empty');
    return;
  }
  dna2SetEstado(null);

  if (!dna2Estado.corretorSel) dna2Estado.corretorSel = dna2Estado.dados[0]?.corretor?.nome;

  const nomes = dna2Estado.dados.map(d=>d.corretor.nome);

  wrap.innerHTML = `
    <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <select class="dna2-sel" onchange="dna2SelCorretor(this.value)" id="dna2-sel-corretor">
        ${nomes.map(n=>`<option value="${dna2Esc(n)}" ${n===dna2Estado.corretorSel?'selected':''}>${dna2Esc(n)}</option>`).join('')}
      </select>
      <select class="dna2-sel" style="max-width:200px" onchange="dna2SelMatchLead(this.value)" id="dna2-sel-lead">
        <option value="">🎯 Compatibilidade com lead…</option>
        ${(typeof allLeads!=='undefined'?allLeads:[]).filter(l=>!['Fechado','Perdido'].includes(l.status)).slice(0,50).map(l=>`<option value="${dna2Esc(l.id)}">${dna2Esc(l.nome)}</option>`).join('')}
      </select>
    </div>
    <div id="dna2-painel-body"></div>`;

  dna2RenderCorretor(dna2Estado.corretorSel);
}

function dna2SelCorretor(nome) {
  dna2Estado.corretorSel = nome;
  dna2RenderCorretor(nome);
}

function dna2SelMatchLead(leadId) {
  dna2Estado.matchLeadSel = leadId;
  if (leadId) dna2RenderMatch(leadId);
  else dna2RenderCorretor(dna2Estado.corretorSel);
}

/* ─────────────────────────────────────────────
   RENDER — PERFIL DO CORRETOR
───────────────────────────────────────────── */
function dna2RenderCorretor(nome) {
  const d = dna2Estado.dados.find(x=>x.corretor.nome===nome);
  if (!d) return;
  const body = document.getElementById('dna2-painel-body');
  if (!body) return;
  const inic = d.corretor.nome.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const maxEvol = Math.max(...(d.vivo.evolucao||[]).map(e=>e.vendas), 1);
  const temQ = dnaQFoiPreenchido(d.corretor.nome);

  body.innerHTML = `
    <div class="dna2-card">
      <!-- Hero -->
      <div class="dna2-card-hero">
        <div class="dna2-avatar">${inic}</div>
        <div style="flex:1">
          <div class="dna2-nome">${dna2Esc(d.corretor.nome)}</div>
          <div class="dna2-cargo">${dna2Esc(d.corretor.cargo||'Corretor')}</div>
          <div style="margin-top:6px;display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            <span class="dna2-nivel-badge" style="background:${d.nivel.cor}18;color:${d.nivel.cor};border:1px solid ${d.nivel.cor}40">
              ${d.nivel.emoji} ${d.nivel.label}
            </span>
            ${temQ?'<span style="font-size:9px;padding:2px 7px;background:rgba(20,184,166,0.08);border:1px solid rgba(20,184,166,0.2);border-radius:5px;color:#14B8A6;font-family:DM Mono,monospace">✓ Questionário</span>':'<button onclick="dna2AbrirQuestionario(\''+dna2Esc(d.corretor.nome)+'\')" style="font-size:9px;padding:3px 9px;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.25);border-radius:5px;color:#FCD34D;cursor:pointer;font-family:DM Sans,sans-serif">📋 Preencher questionário</button>'}
          </div>
        </div>
        <div class="dna2-score-ring">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(20,184,166,0.1)" stroke-width="7"/>
            <circle cx="40" cy="40" r="34" fill="none" stroke="${d.nivel.cor}" stroke-width="7"
              stroke-dasharray="${Math.round(2*Math.PI*34*d.scoreGeral/100)} ${Math.round(2*Math.PI*34)}"
              stroke-linecap="round"/>
          </svg>
          <div class="dna2-score-val">
            <div class="dna2-score-num" style="color:${d.nivel.cor}">${d.scoreGeral}</div>
            <div class="dna2-score-lbl">DNA</div>
          </div>
        </div>
      </div>

      <!-- 8 Scores -->
      <div class="dna2-section">
        <div class="dna2-section-title">📊 Scores Comportamentais</div>
        <div class="dna2-scores-grid">
          ${Object.entries({ Comunicação:d.scores.comunicacao, Negociação:d.scores.negociacao, 'Follow-up':d.scores.followup, Velocidade:d.scores.velocidade, Organização:d.scores.organizacao, Conversão:d.scores.conversao, Persistência:d.scores.persistencia, Relacionamento:d.scores.relacionamento }).map(([k,v])=>{
            const cor = v>=80?'#22C55E':v>=60?'#0EA5E9':v>=40?'#F59E0B':'#EF4444';
            return `<div class="dna2-score-box">
              <div class="dna2-score-box-lbl">${k}</div>
              <div class="dna2-score-box-val" style="color:${cor}">${v}</div>
              <div class="dna2-bar-bg"><div class="dna2-bar-fill" style="width:${v}%;background:${cor}"></div></div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- 8 Índices de especialidade -->
      <div class="dna2-section">
        <div class="dna2-section-title">🏅 Índices de Especialidade</div>
        <div class="dna2-indices-grid">
          ${[
            {k:'apartamentos',n:'Apartamentos',e:'🏢'},
            {k:'casas',n:'Casas',e:'🏡'},
            {k:'terrenos',n:'Terrenos',e:'🌿'},
            {k:'mcmv',n:'MCMV',e:'🏘'},
            {k:'altopadrao',n:'Alto Padrão',e:'💎'},
            {k:'investidor',n:'Investidor',e:'📈'},
            {k:'primeiroImovel',n:'1º Imóvel',e:'🔑'},
            {k:'comercial',n:'Comercial',e:'🏪'},
          ].map(({k,n,e})=>{
            const v = d.indices[k]||0;
            const cor = v>=70?'#22C55E':v>=50?'#0EA5E9':v>=30?'#F59E0B':'#64748B';
            return `<div class="dna2-idx-box">
              <div class="dna2-idx-emoji">${e}</div>
              <div class="dna2-idx-nome">${n}</div>
              <div class="dna2-idx-val" style="color:${cor}">${v}</div>
              <div class="dna2-bar-bg"><div class="dna2-bar-fill" style="width:${v}%;background:${cor}"></div></div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- DNA Vivo -->
      <div class="dna2-section">
        <div class="dna2-section-title">🧬 DNA Vivo — Aprendizado Automático</div>
        <div class="dna2-vivo-grid">
          ${[
            {i:'⏰',l:'Melhor horário',v:d.vivo.melhorHorario||'—'},
            {i:'📅',l:'Melhor dia',v:d.vivo.melhorDia||'—'},
            {i:'💰',l:'Faixa predominante',v:d.vivo.faixaPredo||'—'},
            {i:'📍',l:'Origem favorita',v:d.vivo.melhorOrigem||'—'},
            {i:'⏱',l:'Tempo médio até venda',v:d.vivo.tempoMedioVenda?d.vivo.tempoMedioVenda+' dias':'—'},
            {i:'🎯',l:'Ticket médio',v:d.vivo.ticketMedio>0?d.vivo.ticketMedio.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}):'—'},
          ].map(({i,l,v})=>`<div class="dna2-vivo-item"><div class="dna2-vivo-icon">${i}</div><div><div class="dna2-vivo-lbl">${l}</div><div class="dna2-vivo-val">${dna2Esc(v)}</div></div></div>`).join('')}
        </div>
      </div>

      <!-- Evolução -->
      <div class="dna2-section">
        <div class="dna2-section-title">📈 Evolução (6 meses)</div>
        <div class="dna2-chart">
          ${(d.vivo.evolucao||[]).map(e=>`
            <div class="dna2-chart-col">
              <div class="dna2-chart-val">${e.vendas}</div>
              <div class="dna2-chart-bar-bg">
                <div class="dna2-chart-bar" style="height:${e.vendas>0?Math.max(8,Math.round(e.vendas/maxEvol*100)):0}%"></div>
              </div>
              <div class="dna2-chart-lbl">${e.mes}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
}

/* ─────────────────────────────────────────────
   RENDER — COMPATIBILIDADE
───────────────────────────────────────────── */
function dna2RenderMatch(leadId) {
  const leads = typeof allLeads !== 'undefined' ? allLeads : [];
  const lead  = leads.find(l=>l.id===leadId);
  if (!lead) return;
  const body = document.getElementById('dna2-painel-body');
  if (!body) return;

  const matches = rankearParaLead(lead, dna2Estado.dados);

  body.innerHTML = `
    <div style="background:var(--bg-input);border:1px solid rgba(20,184,166,0.1);border-radius:14px;padding:14px 16px;margin-bottom:12px">
      <div style="font-size:11px;color:#64748B;margin-bottom:2px;font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.06em">Compatibilidade para</div>
      <div style="font-size:15px;font-weight:600;color:#F0FDF4">${dna2Esc(lead.nome)}</div>
      <div style="font-size:11px;color:#475569;margin-top:2px">${dna2Esc(lead.tipo_imovel||'—')} · ${dna2Esc(lead.bairro||'—')} · ${lead.valor?Number(String(lead.valor).replace(/[^\d]/g,'')).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}):'Valor não informado'}</div>
    </div>
    <div class="dna2-match-list">
      ${matches.map((m,i)=>`
        <div class="dna2-match-item">
          <div class="dna2-match-pos">${i+1}</div>
          <div style="flex:1;min-width:0">
            <div class="dna2-match-nome">${dna2Esc(m.corretor.nome)}</div>
            <div style="font-size:10px;color:#475569">${dna2Esc(m.recomendacao)}</div>
            ${m.motivos.length?`<div class="dna2-match-motivos">${m.motivos.map(mt=>`<span class="dna2-match-motivo">${dna2Esc(mt)}</span>`).join('')}</div>`:''}
          </div>
          <div>
            <div class="dna2-match-pct" style="color:${m.corRec}">${m.pct}%</div>
            <div class="dna2-match-stars">${'★'.repeat(m.estrelas)}${'☆'.repeat(5-m.estrelas)}</div>
          </div>
        </div>`).join('')}
    </div>`;
}

/* ─────────────────────────────────────────────
   QUESTIONÁRIO
───────────────────────────────────────────── */
function dna2AbrirQuestionario(nomeCorretor) {
  dna2Estado.qAtual = 0;
  dna2Estado.qRespostas = {};
  const overlay = document.createElement('div');
  overlay.id = 'dna2-q-overlay';
  overlay.className = 'dna2-q-overlay';
  document.body.appendChild(overlay);
  dna2RenderPergunta(nomeCorretor);
}

function dna2RenderPergunta(nomeCorretor) {
  const overlay = document.getElementById('dna2-q-overlay');
  if (!overlay) return;
  const idx = dna2Estado.qAtual;
  const total = DNA_PERGUNTAS.length;
  const p = DNA_PERGUNTAS[idx];
  const sel = dna2Estado.qRespostas[p.id];
  const prog = Math.round(((idx)/total)*100);

  overlay.innerHTML = `
    <div class="dna2-q-modal">
      <div class="dna2-q-header">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="font-size:18px">${p.icon}</span>
          <div class="dna2-q-cat">${p.cat}</div>
        </div>
        <div class="dna2-q-titulo">Perfil Comercial — ${dna2Esc(nomeCorretor)}</div>
        <div class="dna2-q-sub">Responda para que o COMMAND aprenda seu DNA automaticamente.</div>
        <div class="dna2-q-progress-bg">
          <div class="dna2-q-progress-fill" style="width:${prog}%"></div>
        </div>
      </div>
      <div class="dna2-q-body">
        <div class="dna2-q-pergunta">${idx+1}. ${p.texto}</div>
        ${p.opcoes.map((o,i)=>`
          <button class="dna2-q-opcao${sel===i?' selected':''}" onclick="dna2SelOpcao('${p.id}',${i},'${dna2Esc(nomeCorretor)}')">
            ${o}
          </button>`).join('')}
      </div>
      <div class="dna2-q-footer">
        <div class="dna2-q-info">${idx+1} / ${total}</div>
        <div style="display:flex;gap:8px">
          ${idx>0?`<button class="dna2-q-btn dna2-q-btn-sec" onclick="dna2QAnterior('${dna2Esc(nomeCorretor)}')">← Anterior</button>`:''}
          <button class="dna2-q-btn dna2-q-btn-prim" onclick="dna2QProximo('${dna2Esc(nomeCorretor)}')" ${sel===undefined?'disabled':''}>
            ${idx===total-1?'✓ Finalizar':'Próxima →'}
          </button>
        </div>
      </div>
    </div>`;
}

function dna2SelOpcao(perguntaId, opcaoIdx, nomeCorretor) {
  dna2Estado.qRespostas[perguntaId] = opcaoIdx;
  dna2RenderPergunta(nomeCorretor);
}

function dna2QProximo(nomeCorretor) {
  const idx = dna2Estado.qAtual;
  const p = DNA_PERGUNTAS[idx];
  if (dna2Estado.qRespostas[p.id] === undefined) return;

  if (idx === DNA_PERGUNTAS.length - 1) {
    // Finalizar
    dnaQSalvar(nomeCorretor, dna2Estado.qRespostas);
    document.getElementById('dna2-q-overlay')?.remove();
    showToast('✅ DNA preenchido! Recalculando…', 'success');
    setTimeout(() => dna2Calcular(false).then(() => dna2RenderPainel()), 500);
    // Registra evento
    CommandEventService.record({
      modulo:'dna', tipo:'DNA_CREATED', origem:'COMMAND',
      usuario: (typeof currentUser!=='undefined'&&currentUser?.nome)||'Sistema',
      consultor: nomeCorretor,
      descricao: `Questionário DNA preenchido: ${nomeCorretor}`,
    }).catch(()=>{});
  } else {
    dna2Estado.qAtual++;
    dna2RenderPergunta(nomeCorretor);
  }
}

function dna2QAnterior(nomeCorretor) {
  if (dna2Estado.qAtual > 0) {
    dna2Estado.qAtual--;
    dna2RenderPergunta(nomeCorretor);
  }
}

/* ─────────────────────────────────────────────
   BOTÃO CALCULAR
───────────────────────────────────────────── */
async function dna2Atualizar() {
  const btn = document.getElementById('dna2-btn-calc');
  if (btn) { btn.disabled=true; btn.textContent='⏳ Calculando…'; }
  try {
    await dna2Calcular(false);
    dna2RenderPainel();
    showToast('🧬 DNA 2.0 atualizado!', 'success');
  } catch(err) {
    showToast('Erro ao calcular DNA', 'error');
  } finally {
    if (btn) { btn.disabled=false; btn.innerHTML='🔄 Atualizar DNA'; }
  }
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function dna2SetEstado(estado, msg) {
  const load = document.getElementById('dna2-state-loading');
  const err  = document.getElementById('dna2-state-error');
  const emp  = document.getElementById('dna2-state-empty');
  const cont = document.getElementById('dna2-conteudo');
  if (load) load.style.display = estado==='loading'?'flex':'none';
  if (err)  { err.style.display=estado==='error'?'flex':'none'; if(msg){const el=document.getElementById('dna2-error-msg');if(el)el.textContent=msg;} }
  if (emp)  emp.style.display = estado==='empty'?'flex':'none';
  if (cont) cont.style.display = estado?'none':'block';
}

function dna2Esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
