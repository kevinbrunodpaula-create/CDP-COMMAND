/**
 * CDP — COMMAND HOME
 * Release 4.0 · COMMAND EXPERIENCE
 *
 * Cérebro operacional do CDP.
 * Integra: Recovery · ICC · DNA · Distribution · Executive
 *          Intelligence · Missions · Events · Leads · CRM
 *
 * NÃO altera nenhum módulo existente.
 * NÃO reescreve funcionalidades prontas.
 * Apenas agrega e apresenta.
 */

'use strict';

/* ─────────────────────────────────────────────
   ESTADO
───────────────────────────────────────────── */
var chState = {
  iniciado: false,
  processando: false,
  ultimaAtualizacao: null,
  saude: null,
  recomendacoes: [],
  alertas: [],
  insights: [],
  timeline: [],
  msgHistory: [],
};

/* ─────────────────────────────────────────────
   PONTO DE ENTRADA
───────────────────────────────────────────── */
async function initCommandHome() {
  try {
    chRenderEstrutura();
    await chCarregarDados();
    chRenderTudo();
  } catch(err) {
    console.error('[COMMAND HOME] init error:', err?.message || err);
  }
}

/* ─────────────────────────────────────────────
   ESTRUTURA HTML
───────────────────────────────────────────── */
function chRenderEstrutura() {
  const page = document.getElementById('page-command-home');
  if (!page) return;

  const isCEO = typeof currentUser !== 'undefined' && ['CEO','Diretor'].includes(currentUser?.cargo);

  page.innerHTML = `
    <div class="ch-wrap">
      <!-- Top bar -->
      <div class="ch-topbar">
        <div class="ch-topbar-left">
          <div>
            <div class="ch-topbar-title">⚡ COMMAND</div>
            <div class="ch-topbar-sub">// KR7 · Central de Operações · <span id="ch-data-hora"></span></div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <div class="ch-topbar-saude" id="ch-saude-badge" style="border-color:rgba(34,197,94,0.3);color:#22C55E;background:rgba(34,197,94,0.06)">
            <span id="ch-saude-emoji">🟢</span>
            <span id="ch-saude-label">Operação Normal</span>
            <span id="ch-saude-val" style="font-size:16px;font-weight:700;font-family:'DM Sans',monospace">—</span>
          </div>
          <button class="ch-btn-iniciar" id="ch-btn-iniciar" onclick="chIniciarOperacao()">
            ▶ Iniciar Operação
          </button>
        </div>
      </div>

      <!-- Resultado do processamento -->
      <div class="ch-op-result" id="ch-op-result">
        <div class="ch-op-result-title">✅ Operação processada com sucesso</div>
        <div class="ch-op-result-stats" id="ch-op-stats"></div>
      </div>

      <!-- KPIs -->
      <div class="ch-kpis" id="ch-kpis">
        ${[0,1,2,3,4,5,6,7].map(()=>`<div class="ch-kpi"><div class="ch-kpi-val" style="color:#1F2937">—</div><div class="ch-kpi-lbl">carregando</div></div>`).join('')}
      </div>

      <!-- Barra de saúde -->
      <div class="ch-saude-bar-wrap">
        <div class="ch-saude-label">
          <div class="ch-saude-titulo">🏥 Saúde da Operação</div>
          <div class="ch-saude-score" id="ch-saude-score" style="color:#22C55E">—</div>
        </div>
        <div class="ch-saude-bg"><div class="ch-saude-fill" id="ch-saude-fill" style="width:0%;background:#22C55E"></div></div>
      </div>

      <!-- Grid principal -->
      <div class="ch-grid">
        <!-- Coluna esquerda -->
        <div class="ch-col-left">
          <!-- Recomendações -->
          <div class="ch-sec">
            <div class="ch-sec-title">🎯 Recomendações do COMMAND <span id="ch-rec-count" style="color:#22C55E"></span></div>
            <div id="ch-recs"></div>
          </div>
          <!-- Alertas -->
          <div class="ch-sec">
            <div class="ch-sec-title">🚨 Central de Alertas <span id="ch-alerta-count" style="color:#EF4444"></span></div>
            <div id="ch-alertas"></div>
          </div>
          <!-- Insights -->
          <div class="ch-sec">
            <div class="ch-sec-title">💡 Insights Automáticos</div>
            <div id="ch-insights"></div>
          </div>
          <!-- Painel CEO (só para CEO/Diretor) -->
          ${isCEO ? `
          <div class="ch-sec">
            <div class="ch-sec-title">👑 Painel CEO</div>
            <div class="ch-ceo-grid" id="ch-ceo-grid"></div>
          </div>` : ''}
        </div>

        <!-- Coluna direita -->
        <div class="ch-col-right">
          <!-- Timeline -->
          <div class="ch-sec" style="flex:1">
            <div class="ch-sec-title">📋 Timeline da Operação</div>
            <div class="ch-timeline" id="ch-timeline"></div>
          </div>
          <!-- COMMAND Assistant -->
          <div class="ch-sec" style="padding:0;border-top:1px solid rgba(255,255,255,0.05)">
            <div style="padding:12px 16px 8px">
              <div class="ch-sec-title">🤖 COMMAND Assistant</div>
            </div>
            <div class="ch-assistant">
              <div class="ch-assistant-msgs" id="ch-msgs">
                <div class="ch-msg ch-msg-bot">Olá! Sou o COMMAND Assistant. Pergunte qualquer coisa sobre a operação. Ex: "Quem devo cobrar hoje?" ou "Quem está evoluindo?"</div>
              </div>
              <div class="ch-assistant-input">
                <input type="text" class="ch-assistant-field" id="ch-assistant-field" placeholder="Digite sua pergunta…" onkeydown="if(event.key==='Enter')chEnviarMensagem()">
                <button class="ch-assistant-send" onclick="chEnviarMensagem()">➤</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  // Atualiza hora
  chAtualizarHora();
  setInterval(chAtualizarHora, 60000);
}

function chAtualizarHora() {
  const el = document.getElementById('ch-data-hora');
  if (el) el.textContent = new Date().toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

/* ─────────────────────────────────────────────
   CARREGAR DADOS
───────────────────────────────────────────── */
async function chCarregarDados() {
  const leads     = typeof allLeads !== 'undefined' ? allLeads : [];
  const corretores= typeof allCorretores !== 'undefined' ? allCorretores : [];

  // Calcula tudo internamente (sem reprocessar módulos — apenas lê dados já disponíveis)
  chState.saude        = chCalcularSaude(leads, corretores);
  chState.recomendacoes= chGerarRecomendacoes(leads, corretores);
  chState.alertas      = chGerarAlertas(leads, corretores);
  chState.insights     = chGerarInsights(leads, corretores);
  chState.timeline     = chGerarTimeline(leads);
  chState.ultimaAtualizacao = new Date();
}

/* ─────────────────────────────────────────────
   SAÚDE DA OPERAÇÃO (0-100)
───────────────────────────────────────────── */
function chCalcularSaude(leads, corretores) {
  if (!leads.length) return { score:0, tendencia:'estável', cor:'#64748B', emoji:'⚫' };

  const ativos   = leads.filter(l => !['Fechado','Perdido'].includes(l.status));
  const vendas   = leads.filter(l => l.status === 'Fechado');
  const perdidos = leads.filter(l => l.status === 'Perdido');

  // Conversão (peso 25)
  const conv = leads.length > 0 ? vendas.length / leads.length : 0;
  const pConv = Math.round(Math.min(conv * 4 * 25, 25));

  // Leads sem resposta há +7 dias (peso 20)
  const parados = ativos.filter(l => {
    const d = l.ultimo_contato || l.updated_at || l.created_at;
    return d && (Date.now() - new Date(d).getTime()) / 86400000 > 7;
  }).length;
  const pParados = Math.round(Math.max(0, 20 - (parados / Math.max(ativos.length, 1)) * 40));

  // Tempo de atendimento (peso 20)
  const tempos = leads.filter(l=>l.ultimo_contato&&l.created_at)
    .map(l=>(new Date(l.ultimo_contato)-new Date(l.created_at))/3600000)
    .filter(h=>h>=0&&h<720);
  const tmResp = tempos.length ? tempos.reduce((a,b)=>a+b,0)/tempos.length : 24;
  const pTempo = Math.round(tmResp<=4?20:tmResp<=8?16:tmResp<=12?12:tmResp<=24?7:3);

  // Recovery (peso 15) — leads críticos
  const criticos = ativos.filter(l => {
    const d = l.ultimo_contato || l.updated_at || l.created_at;
    return d && (Date.now() - new Date(d).getTime()) / 86400000 > 15;
  }).length;
  const pRecovery = Math.round(Math.max(0, 15 - (criticos / Math.max(ativos.length, 1)) * 30));

  // Sem corretor (peso 10)
  const semCorretor = ativos.filter(l => !l.corretor?.trim()).length;
  const pCorretor = Math.round(Math.max(0, 10 - (semCorretor / Math.max(ativos.length, 1)) * 20));

  // Meta (peso 10) — estimativa baseada em vendas do mês
  const iniMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const vendasMes = vendas.filter(l => (l.fechado_em || l.updated_at || '') >= iniMes).length;
  const pMeta = Math.min(10, vendasMes * 2);

  const score = pConv + pParados + pTempo + pRecovery + pCorretor + pMeta;
  const cor   = score >= 75 ? '#22C55E' : score >= 55 ? '#0EA5E9' : score >= 35 ? '#F59E0B' : '#EF4444';
  const emoji = score >= 75 ? '🟢' : score >= 55 ? '🔵' : score >= 35 ? '🟡' : '🔴';
  const label = score >= 75 ? 'Operação Saudável' : score >= 55 ? 'Operação Estável' : score >= 35 ? 'Atenção Necessária' : 'Operação Crítica';

  return { score, cor, emoji, label, detalhes: { pConv, pParados, pTempo, pRecovery, pCorretor, pMeta } };
}

/* ─────────────────────────────────────────────
   RECOMENDAÇÕES DO COMMAND
───────────────────────────────────────────── */
function chGerarRecomendacoes(leads, corretores) {
  const recs = [];
  const ativos = leads.filter(l => !['Fechado','Perdido'].includes(l.status));

  // Leads sem corretor
  const semCorretor = ativos.filter(l => !l.corretor?.trim());
  if (semCorretor.length > 0)
    recs.push({ icone:'👤', titulo:`${semCorretor.length} lead${semCorretor.length>1?'s':''} sem responsável`, motivo:'Distribua agora para não perder oportunidades de atendimento.', prio:'CRITICA', acao:'goTo("command-distribution",null)' });

  // Leads parados > 7 dias
  const parados = ativos.filter(l => { const d = l.ultimo_contato||l.updated_at||l.created_at; return d && (Date.now()-new Date(d).getTime())/86400000 > 7; });
  if (parados.length > 0)
    recs.push({ icone:'⏸', titulo:`${parados.length} lead${parados.length>1?'s':''} parado${parados.length>1?'s':''}`, motivo:`Leads sem movimentação há mais de 7 dias. Recovery recomendado.`, prio:'ALTA', acao:'goTo("command-recovery",null);initCommandRecovery()' });

  // Propostas sem resposta
  const propostas = ativos.filter(l => l.status === 'Proposta' && ((Date.now()-new Date(l.ultimo_contato||l.updated_at||l.created_at).getTime())/86400000 > 5));
  if (propostas.length > 0)
    recs.push({ icone:'📄', titulo:`${propostas.length} proposta${propostas.length>1?'s':''} sem retorno`, motivo:'Propostas aguardando resposta há mais de 5 dias. Follow-up urgente.', prio:'ALTA', acao:'goTo("leads",null)' });

  // Visitas marcadas para hoje/amanhã
  const hoje = new Date().toISOString().slice(0,10);
  const amanha = new Date(Date.now()+86400000).toISOString().slice(0,10);
  const visitasHoje = ativos.filter(l => l.visita_data === hoje || l.visita_data === amanha);
  if (visitasHoje.length > 0)
    recs.push({ icone:'🏠', titulo:`${visitasHoje.length} visita${visitasHoje.length>1?'s':''} ${visitasHoje.some(l=>l.visita_data===hoje)?'hoje':'amanhã'}`, motivo:'Confirme com os clientes e prepare os corretores.', prio:'CRITICA', acao:'goTo("agenda",null)' });

  // Corretores sem leads ativos
  const corretoresAtivos = corretores.filter(c => c.cargo === 'Corretor');
  corretoresAtivos.forEach(c => {
    const leadsCorretor = ativos.filter(l => (l.corretor||'').toLowerCase().trim() === (c.nome||'').toLowerCase().trim());
    if (leadsCorretor.length === 0)
      recs.push({ icone:'😴', titulo:`${c.nome} sem leads ativos`, motivo:'Consultor disponível — distribuir novos leads.', prio:'MEDIA', acao:'goTo("command-distribution",null)' });
  });

  // Meta mensal
  const iniMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const vendasMes = leads.filter(l => l.status === 'Fechado' && (l.fechado_em||l.updated_at||'') >= iniMes).length;
  if (vendasMes >= 5)
    recs.push({ icone:'🏆', titulo:`${vendasMes} vendas este mês!`, motivo:'Equipe batendo meta. Hora de ampliar o pipeline.', prio:'BAIXA', acao:'goTo("relatorios",null)' });

  return recs.slice(0, 6);
}

/* ─────────────────────────────────────────────
   ALERTAS
───────────────────────────────────────────── */
function chGerarAlertas(leads, corretores) {
  const alertas = [];
  const ativos = leads.filter(l => !['Fechado','Perdido'].includes(l.status));

  // Críticos
  const criticos = ativos.filter(l => { const d = l.ultimo_contato||l.updated_at||l.created_at; return d && (Date.now()-new Date(d).getTime())/86400000 > 20; });
  if (criticos.length) alertas.push({ tipo:'critico', icone:'🔴', texto:`${criticos.length} lead${criticos.length>1?'s':''} crítico${criticos.length>1?'s':''} — sem contato há mais de 20 dias` });

  // Leads de hoje
  const hoje = new Date().toISOString().slice(0,10);
  const novosHoje = leads.filter(l => (l.created_at||'').startsWith(hoje));
  if (novosHoje.length) alertas.push({ tipo:'info', icone:'🆕', texto:`${novosHoje.length} novo${novosHoje.length>1?'s':''} lead${novosHoje.length>1?'s':''} hoje` });

  // Visitas hoje
  const visitasHoje = ativos.filter(l => l.visita_data === hoje);
  if (visitasHoje.length) alertas.push({ tipo:'aviso', icone:'📅', texto:`${visitasHoje.length} visita${visitasHoje.length>1?'s':''} agendada${visitasHoje.length>1?'s':''} para hoje — confirme com os clientes` });

  // Sem telefone
  const semTel = ativos.filter(l => !l.telefone?.trim());
  if (semTel.length > 2) alertas.push({ tipo:'aviso', icone:'📵', texto:`${semTel.length} leads sem telefone cadastrado` });

  // Vendas recentes (últimas 48h)
  const ini48 = new Date(Date.now()-48*3600000).toISOString();
  const vendas48 = leads.filter(l => l.status === 'Fechado' && (l.fechado_em||l.updated_at||'') >= ini48);
  if (vendas48.length) alertas.push({ tipo:'info', icone:'🎉', texto:`${vendas48.length} venda${vendas48.length>1?'s':''} nas últimas 48h — ${vendas48.map(l=>l.nome).join(', ')}` });

  return alertas.slice(0, 6);
}

/* ─────────────────────────────────────────────
   INSIGHTS AUTOMÁTICOS
───────────────────────────────────────────── */
function chGerarInsights(leads, corretores) {
  const insights = [];
  const vendas = leads.filter(l => l.status === 'Fechado');
  if (!vendas.length) return [{ texto:'Ainda sem dados de conversão para gerar insights. Continue registrando os atendimentos.' }];

  // Tipo de imóvel com maior conversão
  const tipoMap = {};
  leads.forEach(l => {
    const t = l.tipo_imovel || 'Outro';
    if (!tipoMap[t]) tipoMap[t] = { total:0, v:0 };
    tipoMap[t].total++;
    if (l.status === 'Fechado') tipoMap[t].v++;
  });
  const melhorTipo = Object.entries(tipoMap).filter(([,v])=>v.total>=2).sort((a,b)=>(b[1].v/b[1].total)-(a[1].v/a[1].total))[0];
  if (melhorTipo) insights.push({ texto:`Maior conversão em ${melhorTipo[0]}: ${Math.round(melhorTipo[1].v/melhorTipo[1].total*100)}% de taxa.` });

  // Origem com melhor conversão
  const origemMap = {};
  leads.forEach(l => {
    const o = l.origem || 'Outro';
    if (!origemMap[o]) origemMap[o] = { total:0, v:0 };
    origemMap[o].total++;
    if (l.status === 'Fechado') origemMap[o].v++;
  });
  const melhorOrigem = Object.entries(origemMap).filter(([,v])=>v.total>=3).sort((a,b)=>(b[1].v/b[1].total)-(a[1].v/a[1].total))[0];
  if (melhorOrigem) insights.push({ texto:`${melhorOrigem[0]} converte ${Math.round(melhorOrigem[1].v/melhorOrigem[1].total*100)}% — canal mais eficiente.` });

  // Corretor com mais vendas
  const corrMap = {};
  vendas.forEach(l => { const c = l.corretor||'Sem nome'; corrMap[c] = (corrMap[c]||0)+1; });
  const topCorr = Object.entries(corrMap).sort((a,b)=>b[1]-a[1])[0];
  if (topCorr) insights.push({ texto:`${topCorr[0]} lidera com ${topCorr[1]} venda${topCorr[1]>1?'s':''} — referência da equipe.` });

  // Meta do mês
  const iniMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const vendasMes = vendas.filter(l => (l.fechado_em||l.updated_at||'') >= iniMes).length;
  const diasRestantes = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate() - new Date().getDate();
  if (vendasMes > 0 && diasRestantes > 0) {
    const ritmo = vendasMes / (new Date().getDate() || 1);
    const projecao = Math.round(vendasMes + ritmo * diasRestantes);
    insights.push({ texto:`Ritmo atual projeta ${projecao} vendas no mês (${vendasMes} confirmadas, ${diasRestantes} dias restantes).` });
  }

  // Recovery trend
  const ativos = leads.filter(l => !['Fechado','Perdido'].includes(l.status));
  const emRecovery = ativos.filter(l => { const d = l.ultimo_contato||l.updated_at||l.created_at; return d && (Date.now()-new Date(d).getTime())/86400000 > 15; });
  if (emRecovery.length > 0)
    insights.push({ texto:`${emRecovery.length} lead${emRecovery.length>1?'s':''} em zona de recuperação — ação agora pode gerar conversões adicionais.` });

  return insights.slice(0, 5);
}

/* ─────────────────────────────────────────────
   TIMELINE DA OPERAÇÃO
───────────────────────────────────────────── */
function chGerarTimeline(leads) {
  const eventos = [];
  const cores = {
    'Fechado':'#22C55E', 'Perdido':'#EF4444', 'Visita Marcada':'#8B5CF6',
    'Proposta':'#0EA5E9', 'Lead Novo':'#34D399', 'Follow-Up':'#F59E0B',
    'Documentação':'#14B8A6', 'Em Atendimento':'#F97316',
  };

  // Últimos 50 leads ordenados por atualização
  [...leads]
    .sort((a,b) => new Date(b.updated_at||b.created_at) - new Date(a.updated_at||a.created_at))
    .slice(0, 40)
    .forEach(l => {
      const ts = l.updated_at || l.created_at;
      const diff = (Date.now() - new Date(ts).getTime()) / 3600000;
      const tempo = diff < 1 ? 'Agora' : diff < 24 ? `${Math.round(diff)}h atrás` : `${Math.round(diff/24)}d atrás`;
      const status = l.status || 'Lead Novo';
      const cor = cores[status] || '#64748B';
      eventos.push({ cor, desc:`${chEsc(l.nome)} → ${chEsc(status)}${l.corretor?` (${chEsc(l.corretor)})`:' (sem corretor)'}`, tempo });
    });

  return eventos.slice(0, 30);
}

/* ─────────────────────────────────────────────
   RENDER
───────────────────────────────────────────── */
function chRenderTudo() {
  chRenderKPIs();
  chRenderSaude();
  chRenderRecomendacoes();
  chRenderAlertas();
  chRenderInsights();
  chRenderTimeline();
  chRenderCEO();
}

function chRenderKPIs() {
  const el = document.getElementById('ch-kpis');
  if (!el) return;

  const leads     = typeof allLeads !== 'undefined' ? allLeads : [];
  const corretores= typeof allCorretores !== 'undefined' ? allCorretores : [];
  const ativos    = leads.filter(l => !['Fechado','Perdido'].includes(l.status));
  const vendas    = leads.filter(l => l.status === 'Fechado');
  const iniMes    = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const vendasMes = vendas.filter(l => (l.fechado_em||l.updated_at||'') >= iniMes).length;
  const hoje      = new Date().toISOString().slice(0,10);
  const visitasHoje = ativos.filter(l => l.visita_data === hoje).length;
  const propostas = ativos.filter(l => l.status === 'Proposta').length;
  const criticos  = ativos.filter(l => { const d = l.ultimo_contato||l.updated_at||l.created_at; return d && (Date.now()-new Date(d).getTime())/86400000 > 15; }).length;
  const corrAtivos = corretores.filter(c => c.ativo !== false && c.cargo === 'Corretor').length;
  const conv      = leads.length > 0 ? Math.round(vendas.length/leads.length*100) : 0;
  const semCorretor = ativos.filter(l => !l.corretor?.trim()).length;

  const kpis = [
    { val:ativos.length, lbl:'Leads Ativos', cor:'#22C55E' },
    { val:vendasMes, lbl:'Vendas no Mês', cor:'#22C55E' },
    { val:propostas, lbl:'Propostas', cor:'#0EA5E9' },
    { val:visitasHoje, lbl:'Visitas Hoje', cor:'#8B5CF6' },
    { val:criticos, lbl:'Leads Críticos', cor:criticos>0?'#EF4444':'#22C55E' },
    { val:corrAtivos, lbl:'Consultores', cor:'#F59E0B' },
    { val:conv+'%', lbl:'Conversão', cor:'#14B8A6' },
    { val:semCorretor, lbl:'Sem Corretor', cor:semCorretor>0?'#F97316':'#22C55E' },
  ];

  el.innerHTML = kpis.map(k => `
    <div class="ch-kpi">
      <div class="ch-kpi-val" style="color:${k.cor}">${k.val}</div>
      <div class="ch-kpi-lbl">${k.lbl}</div>
    </div>`).join('');
}

function chRenderSaude() {
  const s = chState.saude;
  if (!s) return;
  const el = document.getElementById('ch-saude-fill');
  const sc = document.getElementById('ch-saude-score');
  const badge = document.getElementById('ch-saude-badge');
  const emoji = document.getElementById('ch-saude-emoji');
  const label = document.getElementById('ch-saude-label');
  const val   = document.getElementById('ch-saude-val');
  if (el)  { el.style.width=s.score+'%'; el.style.background=s.cor; }
  if (sc)  { sc.textContent=s.score+'/100'; sc.style.color=s.cor; }
  if (badge){ badge.style.borderColor=s.cor+'60'; badge.style.color=s.cor; badge.style.background=s.cor+'10'; }
  if (emoji) emoji.textContent = s.emoji;
  if (label) label.textContent = s.label;
  if (val)   { val.textContent=s.score; }
}

function chRenderRecomendacoes() {
  const el = document.getElementById('ch-recs');
  const count = document.getElementById('ch-rec-count');
  if (!el) return;
  if (count) count.textContent = chState.recomendacoes.length ? `(${chState.recomendacoes.length})` : '';
  if (!chState.recomendacoes.length) {
    el.innerHTML = '<div style="font-size:12px;color:#374151;padding:8px 0">✅ Nenhuma recomendação crítica no momento.</div>';
    return;
  }
  el.innerHTML = chState.recomendacoes.map(r => `
    <div class="ch-rec-item" onclick="${r.acao||''}">
      <div class="ch-rec-icon">${r.icone}</div>
      <div class="ch-rec-body">
        <div class="ch-rec-titulo">${chEsc(r.titulo)}</div>
        <div class="ch-rec-motivo">${chEsc(r.motivo)}</div>
      </div>
      <div class="ch-rec-prio ch-prio-${(r.prio||'MEDIA').toLowerCase()}">${r.prio||'MÉDIA'}</div>
    </div>`).join('');
}

function chRenderAlertas() {
  const el = document.getElementById('ch-alertas');
  const count = document.getElementById('ch-alerta-count');
  if (!el) return;
  const criticos = chState.alertas.filter(a=>a.tipo==='critico').length;
  if (count) count.textContent = criticos ? `(${criticos} crítico${criticos>1?'s':''})` : '';
  if (!chState.alertas.length) {
    el.innerHTML = '<div style="font-size:12px;color:#374151;padding:8px 0">✅ Sem alertas no momento.</div>';
    return;
  }
  el.innerHTML = chState.alertas.map(a => `
    <div class="ch-alerta ch-alerta-${a.tipo}">
      <span>${a.icone}</span><span>${chEsc(a.texto)}</span>
    </div>`).join('');
}

function chRenderInsights() {
  const el = document.getElementById('ch-insights');
  if (!el) return;
  el.innerHTML = chState.insights.map(i => `
    <div class="ch-insight"><span>💡</span><span>${chEsc(i.texto)}</span></div>`).join('');
}

function chRenderTimeline() {
  const el = document.getElementById('ch-timeline');
  if (!el) return;
  el.innerHTML = chState.timeline.map(t => `
    <div class="ch-tl-item">
      <div class="ch-tl-dot" style="background:${t.cor}"></div>
      <div class="ch-tl-body">
        <div class="ch-tl-desc">${chEsc(t.desc)}</div>
        <div class="ch-tl-time">${chEsc(t.tempo)}</div>
      </div>
    </div>`).join('');
}

function chRenderCEO() {
  const el = document.getElementById('ch-ceo-grid');
  if (!el) return;
  const leads  = typeof allLeads !== 'undefined' ? allLeads : [];
  const vendas = leads.filter(l => l.status === 'Fechado');
  const ativos = leads.filter(l => !['Fechado','Perdido'].includes(l.status));
  const iniMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const vendasMes = vendas.filter(l => (l.fechado_em||l.updated_at||'') >= iniMes);
  const vgvMes = vendasMes.reduce((a,l) => { const v=parseFloat(String(l.valor||'').replace(/[^\d,.]/g,'').replace(/\./g,'').replace(',','.')); return a+(isNaN(v)?0:v); }, 0);
  const criticos = ativos.filter(l => { const d = l.ultimo_contato||l.updated_at||l.created_at; return d && (Date.now()-new Date(d).getTime())/86400000 > 15; }).length;

  el.innerHTML = [
    { t:'Pipeline', v:ativos.length+' leads', s:'ativos no funil' },
    { t:'Vendas/Mês', v:vendasMes.length, s:'fechamentos' },
    { t:'VGV/Mês', v:vgvMes>0?vgvMes.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}):'R$0', s:'volume de vendas' },
    { t:'Problemas', v:criticos, s:'leads críticos', cor:criticos>0?'#EF4444':'#22C55E' },
  ].map(c=>`
    <div class="ch-ceo-card">
      <div class="ch-ceo-card-title">${c.t}</div>
      <div class="ch-ceo-card-val" style="color:${c.cor||'#F0FDF4'}">${c.v}</div>
      <div class="ch-ceo-card-sub">${c.s}</div>
    </div>`).join('');
}

/* ─────────────────────────────────────────────
   BOTÃO INICIAR OPERAÇÃO
───────────────────────────────────────────── */
async function chIniciarOperacao() {
  const btn = document.getElementById('ch-btn-iniciar');
  if (!btn || chState.processando) return;
  chState.processando = true;
  const t0 = Date.now();

  btn.disabled = true;
  btn.innerHTML = '<span class="ch-spin"></span> Processando…';

  let analises = 0;
  let recomendacoes = 0;

  try {
    // 1. Atualiza ICC
    try { await TrustService.calcularEquipe(false); analises++; } catch {}
    // 2. Atualiza DNA
    try { await DNAService.reprocessar(); analises++; } catch {}
    // 3. Reprocessa Intelligence (Predictor, Coach, Performance, Automation)
    try { await IntelligenceService.reprocessarTudo(); analises += 4; } catch {}
    // 4. Gera missões
    try { await MissionService.gerarParaEquipe(false); analises++; } catch {}
    // 5. Recalcula dados da home
    await chCarregarDados();
    recomendacoes = chState.recomendacoes.length + chState.alertas.length;
    analises += 3;
    // 6. Rerender tudo
    chRenderTudo();
    // 7. Recarrega dados globais
    if (typeof loadAll === 'function') try { await loadAll(); } catch {}

    const tempo = ((Date.now() - t0) / 1000).toFixed(1);
    const resultEl = document.getElementById('ch-op-result');
    const statsEl  = document.getElementById('ch-op-stats');
    if (resultEl) resultEl.classList.add('visible');
    if (statsEl) statsEl.innerHTML = [
      `<span class="ch-op-stat">⏱ <strong>${tempo}s</strong> de processamento</span>`,
      `<span class="ch-op-stat">🔍 <strong>${analises}</strong> análises realizadas</span>`,
      `<span class="ch-op-stat">🎯 <strong>${recomendacoes}</strong> recomendações geradas</span>`,
    ].join('');

    if (typeof showToast === 'function') showToast(`✅ Operação processada em ${tempo}s`, 'success');

    CommandEventService.record({ modulo:'command', tipo:'OPERACAO_INICIADA', origem:'COMMAND',
      usuario:(typeof currentUser!=='undefined'&&currentUser?.nome)||'Sistema',
      descricao:`Operação processada: ${analises} análises, ${recomendacoes} recomendações`,
      metadata:JSON.stringify({tempo,analises,recomendacoes}) }).catch(()=>{});

  } catch(err) {
    console.error('[COMMAND HOME] Iniciar operação error:', err?.message || err);
    if (typeof showToast === 'function') showToast('Erro ao processar operação', 'error');
  } finally {
    chState.processando = false;
    btn.disabled = false;
    btn.innerHTML = '▶ Iniciar Operação';
  }
}

/* ─────────────────────────────────────────────
   COMMAND ASSISTANT — Respostas por regras
───────────────────────────────────────────── */
function chEnviarMensagem() {
  const field = document.getElementById('ch-assistant-field');
  if (!field || !field.value.trim()) return;
  const pergunta = field.value.trim();
  field.value = '';

  chAddMsg(pergunta, 'user');

  // Pequeno delay para parecer que está "pensando"
  setTimeout(() => {
    const resposta = chGerarResposta(pergunta.toLowerCase());
    chAddMsg(resposta, 'bot');
  }, 400);
}

function chAddMsg(texto, tipo) {
  const msgs = document.getElementById('ch-msgs');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = `ch-msg ch-msg-${tipo}`;
  div.textContent = texto;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function chGerarResposta(q) {
  const leads     = typeof allLeads !== 'undefined' ? allLeads : [];
  const corretores= typeof allCorretores !== 'undefined' ? allCorretores : [];
  const ativos    = leads.filter(l => !['Fechado','Perdido'].includes(l.status));
  const vendas    = leads.filter(l => l.status === 'Fechado');

  // Quem devo cobrar hoje?
  if (q.includes('cobrar') || q.includes('contatar') || q.includes('ligar')) {
    const parados = ativos.filter(l => { const d = l.ultimo_contato||l.updated_at||l.created_at; return d && (Date.now()-new Date(d).getTime())/86400000 > 7; }).slice(0,3);
    if (!parados.length) return '✅ Ótimo! Todos os leads foram contatados recentemente.';
    return `📋 Prioridade de contato hoje:\n${parados.map(l=>`• ${l.nome} (${Math.round((Date.now()-new Date(l.ultimo_contato||l.updated_at||l.created_at).getTime())/86400000)}d sem contato)`).join('\n')}`;
  }

  // Quem merece novos leads?
  if (q.includes('merece') || q.includes('novo lead') || q.includes('distribuir')) {
    const corrMap = {};
    ativos.forEach(l => { if(l.corretor) corrMap[l.corretor] = (corrMap[l.corretor]||0)+1; });
    const disponiveis = corretores.filter(c => c.cargo==='Corretor' && (corrMap[c.nome]||0) < 10);
    if (!disponiveis.length) return '⚠️ Todos os consultores estão com carteira cheia (10+ leads).';
    return `🎯 Consultores disponíveis para novos leads:\n${disponiveis.map(c=>`• ${c.nome} (${corrMap[c.nome]||0} leads ativos)`).join('\n')}`;
  }

  // Quem está evoluindo?
  if (q.includes('evoluindo') || q.includes('melhor') || q.includes('crescendo')) {
    const corrVendas = {};
    const iniMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    vendas.filter(l => (l.fechado_em||l.updated_at||'') >= iniMes).forEach(l => { if(l.corretor) corrVendas[l.corretor] = (corrVendas[l.corretor]||0)+1; });
    const top = Object.entries(corrVendas).sort((a,b)=>b[1]-a[1]).slice(0,3);
    if (!top.length) return '📊 Ainda sem vendas registradas este mês.';
    return `📈 Consultores em evolução este mês:\n${top.map(([n,v],i)=>`${i+1}. ${n} — ${v} venda${v>1?'s':''}`).join('\n')}`;
  }

  // Quem vende mais?
  if (q.includes('vende mais') || q.includes('melhor vendedor') || q.includes('top')) {
    const corrVendas = {};
    vendas.forEach(l => { if(l.corretor) corrVendas[l.corretor] = (corrVendas[l.corretor]||0)+1; });
    const top = Object.entries(corrVendas).sort((a,b)=>b[1]-a[1]).slice(0,3);
    if (!top.length) return '📊 Sem dados de venda disponíveis ainda.';
    return `🏆 Ranking geral de vendas:\n${top.map(([n,v],i)=>`${i+1}. ${n} — ${v} venda${v>1?'s':''}`).join('\n')}`;
  }

  // Qual região converte melhor?
  if (q.includes('região') || q.includes('bairro') || q.includes('local')) {
    const bairroMap = {};
    leads.forEach(l => { const b = l.bairro||'Não informado'; if(!bairroMap[b])bairroMap[b]={t:0,v:0}; bairroMap[b].t++; if(l.status==='Fechado')bairroMap[b].v++; });
    const top = Object.entries(bairroMap).filter(([,v])=>v.t>=2).sort((a,b)=>(b[1].v/b[1].t)-(a[1].v/a[1].t)).slice(0,3);
    if (!top.length) return '📍 Preencha o campo "bairro" nos leads para gerar análise regional.';
    return `📍 Regiões com maior conversão:\n${top.map(([b,v])=>`• ${b}: ${Math.round(v.v/v.t*100)}% (${v.v}/${v.t})`).join('\n')}`;
  }

  // Leads para recuperar?
  if (q.includes('recuperar') || q.includes('recovery') || q.includes('perdido')) {
    const rec = ativos.filter(l => { const d = l.ultimo_contato||l.updated_at||l.created_at; return d && (Date.now()-new Date(d).getTime())/86400000 > 15; }).slice(0,4);
    if (!rec.length) return '✅ Nenhum lead em estado crítico de recovery no momento.';
    return `♻️ Leads para recuperar urgente:\n${rec.map(l=>`• ${l.nome} — ${Math.round((Date.now()-new Date(l.ultimo_contato||l.updated_at||l.created_at).getTime())/86400000)} dias sem contato`).join('\n')}`;
  }

  // Saúde da operação?
  if (q.includes('saúde') || q.includes('saude') || q.includes('como está') || q.includes('status')) {
    const s = chState.saude;
    if (!s) return '⏳ Calcule a saúde da operação clicando em "Iniciar Operação".';
    return `${s.emoji} ${s.label} — Score: ${s.score}/100\n\n${chState.recomendacoes.length} recomendações e ${chState.alertas.length} alertas ativos.`;
  }

  // Resposta padrão
  return `💬 Posso responder sobre:\n• "Quem devo cobrar hoje?"\n• "Quem merece novos leads?"\n• "Quem está evoluindo?"\n• "Quem vende mais?"\n• "Qual região converte melhor?"\n• "Leads para recuperar?"\n• "Como está a saúde da operação?"`;
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function chEsc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
