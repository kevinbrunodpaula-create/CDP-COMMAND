/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — MORNING BRIEFING & WAR ROOM                          ║
 * ║  BriefingGenerator.js                                        ║
 * ║  SPR-008 · KR7 Command Executive                             ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Funções PURAS de geração de inteligência executiva.
 * Zero dependências externas. Testável isoladamente.
 *
 * RESTRIÇÕES SPR-008:
 *   ✗ Não executa ações automáticas
 *   ✗ Não redistribui leads
 *   ✓ Apenas analisa e apresenta inteligência
 */

'use strict';

/* ─────────────────────────────────────────────
   HELPERS INTERNOS
───────────────────────────────────────────── */
var _norm    = s => (s||'').trim().toLowerCase();
var _dias    = iso => iso ? Math.floor((Date.now()-new Date(iso).getTime())/86_400_000) : 999;
var _horas   = iso => iso ? Math.floor((Date.now()-new Date(iso).getTime())/3_600_000)  : 9999;
var _parseV  = v => { if(!v) return 0; const n=parseFloat(String(v).replace(/[^\d,.]/g,'').replace(/\./g,'').replace(',','.')); return isNaN(n)?0:n; };
var _fmtBRL  = v => v>0 ? v.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}) : '—';
var _now     = () => new Date();
var _hoje    = () => _now().toISOString().slice(0,10);
var _ini24h  = () => new Date(Date.now()-24*3_600_000).toISOString();
var _ini48h  = () => new Date(Date.now()-48*3_600_000).toISOString();
var _iniMes  = () => { const d=_now(); return new Date(d.getFullYear(),d.getMonth(),1).toISOString(); };
var _fimMes  = () => { const d=_now(); return new Date(d.getFullYear(),d.getMonth()+1,0,23,59,59).toISOString(); };
var _leadsCorretor = (all, nome) => all.filter(l=>_norm(l.corretor)===_norm(nome));

/* ─────────────────────────────────────────────
   1. RESUMO DAS ÚLTIMAS 24H
───────────────────────────────────────────── */
function gerarResumo24h(allLeads, allCorretores) {
  const ini24 = _ini24h();
  const ini48 = _ini48h();

  const novosHoje     = allLeads.filter(l => l.created_at >= ini24);
  const novosOntem    = allLeads.filter(l => l.created_at >= ini48 && l.created_at < ini24);
  const vendasHoje    = allLeads.filter(l => l.status==='Fechado' && (l.fechado_em||l.updated_at||'')>=ini24);
  const vendasOntem   = allLeads.filter(l => l.status==='Fechado' && (l.fechado_em||l.updated_at||'')>=ini48 && (l.fechado_em||l.updated_at||'')<ini24);
  const perdidosHoje  = allLeads.filter(l => l.status==='Perdido' && (l.updated_at||'')>=ini24);
  const visitasHoje   = allLeads.filter(l => l.visita_data===_hoje() || (l.status==='Visita Marcada' && (l.updated_at||'')>=ini24));
  const propostasHoje = allLeads.filter(l => l.status==='Proposta' && (l.updated_at||'')>=ini24);

  // Atendimentos = leads com contato nas últimas 24h
  const atendidosHoje = allLeads.filter(l => l.ultimo_contato && l.ultimo_contato >= ini24);

  // Leads recuperados = Follow-Up com contato recente após período sem movimento
  const recuperadosHoje = allLeads.filter(l => l.status==='Follow-Up' && l.ultimo_contato && l.ultimo_contato >= ini24);

  // VGV das vendas de hoje
  const vgvHoje = vendasHoje.reduce((acc,l) => acc+_parseV(l.valor),0);
  const vgvOntem= vendasOntem.reduce((acc,l) => acc+_parseV(l.valor),0);

  // Corretores mais produtivos (por atendimentos hoje)
  const prodPorCorretor = {};
  atendidosHoje.forEach(l => { if(l.corretor) prodPorCorretor[l.corretor]=(prodPorCorretor[l.corretor]||0)+1; });
  const maisAtivos = Object.entries(prodPorCorretor).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([nome,qt])=>({nome,qt}));

  // Corretores menos ativos (sem nenhum contato em 24h)
  const nomesCorretor = [...new Set(allLeads.filter(l=>l.corretor).map(l=>l.corretor))];
  const menosAtivos   = nomesCorretor
    .filter(nome => !prodPorCorretor[nome])
    .slice(0,3)
    .map(nome => ({ nome, ultimaAtividade: _leadsCorretor(allLeads,nome).map(l=>l.ultimo_contato||l.updated_at||'').filter(Boolean).sort().pop()||null }));

  // Delta vs ontem
  const deltaLeads  = novosHoje.length - novosOntem.length;
  const deltaVendas = vendasHoje.length - vendasOntem.length;
  const deltaVgv    = vgvHoje - vgvOntem;

  return {
    novosHoje: novosHoje.length, novosOntem: novosOntem.length, deltaLeads,
    atendidosHoje: atendidosHoje.length,
    visitasHoje: visitasHoje.length,
    propostasHoje: propostasHoje.length,
    vendasHoje: vendasHoje.length, vendasOntem: vendasOntem.length, deltaVendas,
    perdidosHoje: perdidosHoje.length,
    recuperadosHoje: recuperadosHoje.length,
    vgvHoje, vgvOntem, deltaVgv,
    vgvHojeFmt: _fmtBRL(vgvHoje),
    maisAtivos, menosAtivos,
  };
}

/* ─────────────────────────────────────────────
   2. META E PREVISÃO DO MÊS
───────────────────────────────────────────── */
function gerarPrevisaoMes(allLeads, allCorretores, metaMensal = 0) {
  const iniMes = _iniMes();
  const hoje   = _now();
  const diasMes  = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0).getDate();
  const diasPassados = hoje.getDate();
  const diasRestantes= diasMes - diasPassados;

  const vendasMes   = allLeads.filter(l => l.status==='Fechado' && (l.fechado_em||l.updated_at||'')>=iniMes);
  const vgvMes      = vendasMes.reduce((acc,l)=>acc+_parseV(l.valor),0);
  const qtdVendas   = vendasMes.length;

  // Projeção linear
  const taxaDiaria   = diasPassados > 0 ? vgvMes / diasPassados : 0;
  const previsaoFim  = Math.round(vgvMes + taxaDiaria * diasRestantes);

  // Pct da meta (se informada)
  const metaFmt      = _fmtBRL(metaMensal);
  const pctMeta      = metaMensal > 0 ? Math.min(200, Math.round((vgvMes/metaMensal)*100)) : null;

  // Tendência
  const ini2aSem = new Date(hoje.getFullYear(), hoje.getMonth(), Math.max(1, diasPassados-7)).toISOString();
  const ini1aSem = new Date(hoje.getFullYear(), hoje.getMonth(), Math.max(1, diasPassados-14)).toISOString();
  const vgv2aSem = allLeads.filter(l=>l.status==='Fechado'&&(l.fechado_em||l.updated_at||'')>=ini2aSem).reduce((a,l)=>a+_parseV(l.valor),0);
  const vgv1aSem = allLeads.filter(l=>l.status==='Fechado'&&(l.fechado_em||l.updated_at||'')>=ini1aSem&&(l.fechado_em||l.updated_at||'')<ini2aSem).reduce((a,l)=>a+_parseV(l.valor),0);
  const tendencia = vgv2aSem > vgv1aSem*1.1 ? '↑ Acelerando' : vgv2aSem < vgv1aSem*0.9 ? '↓ Desacelerando' : '→ Estável';

  // Pipeline ativo (propostas em aberto)
  const pipeline = allLeads.filter(l=>['Proposta','Documentação'].includes(l.status));
  const vgvPipeline = pipeline.reduce((a,l)=>a+_parseV(l.valor),0);

  return {
    diasPassados, diasRestantes, diasMes,
    qtdVendas, vgvMes, vgvMesFmt:_fmtBRL(vgvMes),
    previsaoFim, previsaoFimFmt:_fmtBRL(previsaoFim),
    metaMensal, metaFmt, pctMeta,
    tendencia,
    pipeline: pipeline.length, vgvPipeline, vgvPipelineFmt:_fmtBRL(vgvPipeline),
    taxaDiaria: Math.round(taxaDiaria),
  };
}

/* ─────────────────────────────────────────────
   3. ALERTAS AUTOMÁTICOS
───────────────────────────────────────────── */
function gerarAlertas(allLeads, allCorretores, iccResults = []) {
  const alertas = [];
  const ini24   = _ini24h();

  // Leads sem primeiro contato (> 6h)
  const semContato6h = allLeads.filter(l => !l.ultimo_contato && _horas(l.created_at) > 6 && l.status!=='Fechado' && l.status!=='Perdido');
  if (semContato6h.length > 0)
    alertas.push({ tipo:'CRITICO', icone:'🔥', titulo:'Leads sem primeiro contato', descricao:`${semContato6h.length} lead${semContato6h.length>1?'s':''} aguardando primeiro atendimento há mais de 6h.`, leads:semContato6h.slice(0,3).map(l=>l.nome) });

  // Leads críticos (15–29 dias)
  const criticos = allLeads.filter(l=>!['Fechado','Perdido'].includes(l.status)&&_dias(l.ultimo_contato||l.updated_at||l.created_at)>=15&&_dias(l.ultimo_contato||l.updated_at||l.created_at)<30);
  if (criticos.length > 0)
    alertas.push({ tipo:'ALTO', icone:'🔴', titulo:'Leads em estado crítico', descricao:`${criticos.length} lead${criticos.length>1?'s':''} com 15+ dias sem movimentação.`, leads:criticos.slice(0,3).map(l=>l.nome) });

  // Leads abandonados (30+)
  const abandonados = allLeads.filter(l=>!['Fechado','Perdido'].includes(l.status)&&_dias(l.ultimo_contato||l.updated_at||l.created_at)>=30);
  if (abandonados.length > 0)
    alertas.push({ tipo:'ALTO', icone:'⚫', titulo:'Leads abandonados', descricao:`${abandonados.length} lead${abandonados.length>1?'s':''} com 30+ dias sem qualquer movimento.`, leads:abandonados.slice(0,3).map(l=>l.nome) });

  // Visitas hoje não confirmadas
  const visitasHoje = allLeads.filter(l=>l.visita_data===_hoje()&&l.status==='Visita Marcada');
  if (visitasHoje.length > 0)
    alertas.push({ tipo:'ALTO', icone:'📅', titulo:'Visitas hoje a confirmar', descricao:`${visitasHoje.length} visita${visitasHoje.length>1?'s':''} agendada${visitasHoje.length>1?'s':''} para hoje sem confirmação.`, leads:visitasHoje.map(l=>l.nome) });

  // Propostas antigas sem resposta (> 7 dias)
  const propostasVencidas = allLeads.filter(l=>l.status==='Proposta'&&_dias(l.ultimo_contato||l.updated_at||l.created_at)>=7);
  if (propostasVencidas.length > 0)
    alertas.push({ tipo:'MEDIO', icone:'📄', titulo:'Propostas sem retorno', descricao:`${propostasVencidas.length} proposta${propostasVencidas.length>1?'s':''} sem resposta há 7+ dias.`, leads:propostasVencidas.slice(0,3).map(l=>l.nome) });

  // Consultores sobrecarregados (> 15 leads ativos)
  const nomes = [...new Set(allLeads.filter(l=>l.corretor).map(l=>l.corretor))];
  const sobrecarregados = nomes.filter(nome => {
    const ativos = allLeads.filter(l=>_norm(l.corretor)===_norm(nome)&&!['Fechado','Perdido'].includes(l.status)).length;
    return ativos > 15;
  });
  if (sobrecarregados.length > 0)
    alertas.push({ tipo:'MEDIO', icone:'⚠️', titulo:'Corretores sobrecarregados', descricao:`${sobrecarregados.join(', ')} com carteira acima do ideal.`, leads:[] });

  // ICC em queda
  const iccEmQueda = iccResults.filter(r => r.tendencia?.dir==='↓');
  if (iccEmQueda.length > 0)
    alertas.push({ tipo:'MEDIO', icone:'📉', titulo:'ICC em queda', descricao:`${iccEmQueda.map(r=>r.corretor.nome).join(', ')} com índice de confiança em queda.`, leads:[] });

  // Clientes aguardando retorno (Follow-Up > 2 dias)
  const aguardando = allLeads.filter(l=>l.status==='Follow-Up'&&_dias(l.ultimo_contato||l.updated_at||l.created_at)>=2);
  if (aguardando.length > 0)
    alertas.push({ tipo:'MEDIO', icone:'📞', titulo:'Clientes aguardando retorno', descricao:`${aguardando.length} lead${aguardando.length>1?'s':''} em Follow-Up aguardando contato.`, leads:aguardando.slice(0,3).map(l=>l.nome) });

  // Ordenar: CRITICO → ALTO → MEDIO
  const ordem = { CRITICO:0, ALTO:1, MEDIO:2 };
  return alertas.sort((a,b) => (ordem[a.tipo]||2)-(ordem[b.tipo]||2));
}

/* ─────────────────────────────────────────────
   4. WAR ROOM — Problemas e Oportunidades
───────────────────────────────────────────── */
function gerarWarRoom(allLeads, allCorretores, resumo24h, alertas, iccResults = []) {
  const problemas    = [];
  const oportunidades= [];

  // ── PROBLEMAS ──
  const taxa30d = allLeads.length > 0 ? Math.round(allLeads.filter(l=>l.status==='Perdido').length/allLeads.length*100) : 0;
  if (taxa30d > 20)
    problemas.push({ emoji:'📉', titulo:'Alta taxa de perda', descricao:`${taxa30d}% dos leads estão marcados como perdidos — acima do limite ideal de 20%.`, impacto:'alto' });

  if (resumo24h.menosAtivos.length > 0)
    problemas.push({ emoji:'😴', titulo:'Corretores inativos', descricao:`${resumo24h.menosAtivos.map(c=>c.nome).join(', ')} sem atendimentos nas últimas 24h.`, impacto:'alto' });

  const semTelefone = allLeads.filter(l=>!l.telefone&&!['Fechado','Perdido'].includes(l.status)).length;
  if (semTelefone > 3)
    problemas.push({ emoji:'📵', titulo:'Leads sem telefone', descricao:`${semTelefone} leads ativos sem telefone cadastrado — impossível contato direto.`, impacto:'medio' });

  const semOrigem = allLeads.filter(l=>!l.origem&&!['Fechado','Perdido'].includes(l.status)).length;
  if (semOrigem > 5)
    problemas.push({ emoji:'❓', titulo:'Leads sem origem registrada', descricao:`${semOrigem} leads sem origem definida — dificulta análise de ROI de campanhas.`, impacto:'medio' });

  const iccCriticos = iccResults.filter(r=>r.icc<50);
  if (iccCriticos.length > 0)
    problemas.push({ emoji:'🚨', titulo:'Consultores com ICC crítico', descricao:`${iccCriticos.map(r=>r.corretor.nome).join(', ')} abaixo do mínimo de confiança.`, impacto:'alto' });

  // Tempo médio de resposta lento (> 8h em média)
  const tempos = allLeads.filter(l=>l.ultimo_contato&&l.created_at).map(l=>(new Date(l.ultimo_contato)-new Date(l.created_at))/3_600_000).filter(h=>h>=0&&h<720);
  const tempoMedio = tempos.length>0 ? Math.round(tempos.reduce((a,b)=>a+b,0)/tempos.length) : 0;
  if (tempoMedio > 8)
    problemas.push({ emoji:'⏱', titulo:'Tempo de resposta alto', descricao:`Média de ${tempoMedio}h para primeiro contato — acima do ideal de 4h.`, impacto:'alto' });

  // ── OPORTUNIDADES ──
  // Leads qualificados sem visita
  const qualSemVisita = allLeads.filter(l=>l.status==='Qualificado'&&!l.visita_data).length;
  if (qualSemVisita > 0)
    oportunidades.push({ emoji:'🏠', titulo:'Leads qualificados sem visita', descricao:`${qualSemVisita} leads prontos para agendar visita — alto potencial de conversão.`, impacto:'alto' });

  // Leads em proposta (pipeline quente)
  const pipeline = allLeads.filter(l=>['Proposta','Documentação'].includes(l.status));
  if (pipeline.length > 0) {
    const vgvPipe = pipeline.reduce((a,l)=>a+_parseV(l.valor),0);
    oportunidades.push({ emoji:'💼', titulo:'Pipeline de propostas ativo', descricao:`${pipeline.length} propostas abertas com VGV potencial de ${_fmtBRL(vgvPipe)}.`, impacto:'alto' });
  }

  // Bairros com alta conversão (> 30%)
  const porBairro = {};
  allLeads.filter(l=>l.bairro).forEach(l => {
    if(!porBairro[l.bairro]) porBairro[l.bairro]={total:0,fechados:0};
    porBairro[l.bairro].total++;
    if(l.status==='Fechado') porBairro[l.bairro].fechados++;
  });
  const bairrosFortes = Object.entries(porBairro)
    .filter(([,v])=>v.total>=3&&v.fechados/v.total>=0.3)
    .sort((a,b)=>b[1].fechados/b[1].total-a[1].fechados/a[1].total)
    .slice(0,2);
  bairrosFortes.forEach(([bairro,v]) => {
    oportunidades.push({ emoji:'📍', titulo:`Alta conversão em ${bairro}`, descricao:`${Math.round(v.fechados/v.total*100)}% de conversão nessa região — priorizar leads de ${bairro}.`, impacto:'medio' });
  });

  // Origens com alta conversão
  const porOrigem = {};
  allLeads.filter(l=>l.origem).forEach(l => {
    if(!porOrigem[l.origem]) porOrigem[l.origem]={total:0,fechados:0};
    porOrigem[l.origem].total++;
    if(l.status==='Fechado') porOrigem[l.origem].fechados++;
  });
  const origensFortes = Object.entries(porOrigem)
    .filter(([,v])=>v.total>=3&&v.fechados/v.total>=0.25)
    .sort((a,b)=>b[1].fechados/b[1].total-a[1].fechados/a[1].total)
    .slice(0,2);
  origensFortes.forEach(([origem,v]) => {
    oportunidades.push({ emoji:'📣', titulo:`Leads de ${origem} convertem bem`, descricao:`${Math.round(v.fechados/v.total*100)}% de conversão — aumentar captação por ${origem}.`, impacto:'medio' });
  });

  // Leads recuperáveis (Follow-Up com contato recente)
  const recuperaveis = allLeads.filter(l=>l.status==='Follow-Up'&&l.ultimo_contato&&_dias(l.ultimo_contato)<3).length;
  if (recuperaveis > 0)
    oportunidades.push({ emoji:'♻️', titulo:'Leads em processo de recuperação', descricao:`${recuperaveis} leads voltando ao funil — acompanhar de perto.`, impacto:'medio' });

  // Prioridades do dia
  const prioridades = [];
  if (resumo24h.novosHoje > 0)   prioridades.push(`Atender ${resumo24h.novosHoje} novo${resumo24h.novosHoje>1?'s':''} lead${resumo24h.novosHoje>1?'s':''} do dia`);
  if (qualSemVisita > 0)         prioridades.push(`Agendar visitas para ${qualSemVisita} leads qualificados`);
  if (pipeline.length > 0)       prioridades.push(`Acompanhar ${pipeline.length} propostas em aberto`);
  if (resumo24h.visitasHoje > 0) prioridades.push(`Confirmar ${resumo24h.visitasHoje} visita${resumo24h.visitasHoje>1?'s':''} de hoje`);
  if (resumo24h.menosAtivos.length > 0) prioridades.push(`Mobilizar ${resumo24h.menosAtivos.map(c=>c.nome.split(' ')[0]).join(', ')}`);

  // Maior risco e oportunidade
  const maiorRisco       = problemas[0]   || null;
  const maiorOportunidade= oportunidades[0]|| null;

  return {
    problemas:   problemas.slice(0,10),
    oportunidades:oportunidades.slice(0,10),
    prioridades: prioridades.slice(0,5),
    maiorRisco, maiorOportunidade, tempoMedio,
  };
}

/* ─────────────────────────────────────────────
   5. INSIGHTS AUTOMÁTICOS
───────────────────────────────────────────── */
function gerarInsights(allLeads, allCorretores, resumo24h, previsao, warRoom, iccResults = []) {
  const insights = [];

  // Tendência de leads
  if (resumo24h.deltaLeads > 0)
    insights.push({ icone:'📈', texto:`${resumo24h.novosHoje} leads recebidos hoje — ${resumo24h.deltaLeads > 0 ? '+'+resumo24h.deltaLeads : resumo24h.deltaLeads} em relação a ontem.` });
  else if (resumo24h.novosHoje === 0)
    insights.push({ icone:'⚠️', texto:'Nenhum lead recebido nas últimas 24h — verificar campanhas ativas.' });

  // Performance de vendas
  if (resumo24h.vendasHoje > 0)
    insights.push({ icone:'🏆', texto:`${resumo24h.vendasHoje} venda${resumo24h.vendasHoje>1?'s':''} fechada${resumo24h.vendasHoje>1?'s':''} hoje gerando ${resumo24h.vgvHojeFmt}.` });

  // Projeção do mês
  if (previsao.pctMeta !== null)
    insights.push({ icone:previsao.pctMeta>=100?'✅':'📊', texto:`Meta do mês: ${previsao.pctMeta}% atingido. Projeção de fechamento: ${previsao.previsaoFimFmt}. Tendência: ${previsao.tendencia}.` });

  // Corretores destaque
  if (resumo24h.maisAtivos.length > 0)
    insights.push({ icone:'⭐', texto:`Destaque do dia: ${resumo24h.maisAtivos[0].nome} com ${resumo24h.maisAtivos[0].qt} atendimento${resumo24h.maisAtivos[0].qt>1?'s':''}.` });

  // Tempo de resposta
  if (warRoom.tempoMedio > 0)
    insights.push({ icone:warRoom.tempoMedio<=4?'⚡':'⏱', texto:`Tempo médio de resposta da equipe: ${warRoom.tempoMedio}h. ${warRoom.tempoMedio<=4?'Excelente.':'Meta: menos de 4h.'}`  });

  // War room highlight
  if (warRoom.maiorRisco)
    insights.push({ icone:'🚨', texto:`Principal risco: ${warRoom.maiorRisco.titulo}. ${warRoom.maiorRisco.descricao}` });

  if (warRoom.maiorOportunidade)
    insights.push({ icone:'💡', texto:`Principal oportunidade: ${warRoom.maiorOportunidade.descricao}` });

  // ICC alert
  const iccCriticos = iccResults.filter(r=>r.icc<50);
  if (iccCriticos.length > 0)
    insights.push({ icone:'🔐', texto:`${iccCriticos.length} consultor${iccCriticos.length>1?'es':''} com ICC crítico — impacto direto na qualidade dos atendimentos.` });

  return insights.slice(0, 6);
}

/* ─────────────────────────────────────────────
   FUNÇÃO PRINCIPAL — gerarBriefing
───────────────────────────────────────────── */
function gerarBriefing(allLeads, allCorretores, iccResults = [], metaMensal = 0) {
  const resumo24h  = gerarResumo24h(allLeads, allCorretores);
  const previsao   = gerarPrevisaoMes(allLeads, allCorretores, metaMensal);
  const alertas    = gerarAlertas(allLeads, allCorretores, iccResults);

  let warRoom = { problemas:[], oportunidades:[], prioridades:[], maiorRisco:null, maiorOportunidade:null, tempoMedio:0 };
  try { warRoom = gerarWarRoom(allLeads, allCorretores, resumo24h, alertas, iccResults); } catch(e) { console.warn('[Briefing] warRoom error:', e.message); }

  let insights = [];
  try { insights = gerarInsights(allLeads, allCorretores, resumo24h, previsao, warRoom, iccResults); } catch(e) { console.warn('[Briefing] insights error:', e.message); }

  const geradoEm   = new Date().toISOString();
  const saudacao   = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  return {
    geradoEm, saudacao,
    resumo24h, previsao, alertas, warRoom, insights,
    meta: { alertasCriticos: alertas.filter(a=>a.tipo==='CRITICO').length, totalAlertas: alertas.length },
  };
}
