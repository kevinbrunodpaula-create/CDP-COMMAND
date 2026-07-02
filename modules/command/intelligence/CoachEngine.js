/**
 * CDP — COMMAND INTELLIGENCE
 * CoachEngine.js — Coach Virtual por Consultor
 * Release 2.9 · KR7 Command Intelligence
 */

'use strict';

var _norm  = s => (s||'').trim().toLowerCase();
var _dias  = iso => iso ? Math.floor((Date.now()-new Date(iso).getTime())/86_400_000) : 999;
var _horas = iso => iso ? Math.floor((Date.now()-new Date(iso).getTime())/3_600_000) : 999;
var _leads = (all, nome) => all.filter(l => _norm(l.corretor) === _norm(nome));

/* ─────────────────────────────────────────────
   ANÁLISE DE HÁBITOS
───────────────────────────────────────────── */
function analisarHabitos(leads) {
  const ativos   = leads.filter(l => !['Fechado','Perdido'].includes(l.status));
  const vendas   = leads.filter(l => l.status === 'Fechado').length;
  const perdidos = leads.filter(l => l.status === 'Perdido').length;

  // Tempo médio de resposta
  const tempos = leads.filter(l=>l.ultimo_contato&&l.created_at)
    .map(l => (new Date(l.ultimo_contato)-new Date(l.created_at))/3_600_000)
    .filter(h=>h>=0&&h<720);
  const tempoMedioH = tempos.length ? Math.round(tempos.reduce((a,b)=>a+b,0)/tempos.length) : null;

  // Follow-ups (últimos 30 dias)
  const cutoff30 = new Date(Date.now()-30*86_400_000).toISOString();
  let totalFU = 0;
  leads.forEach(l => {
    try { totalFU += (l.historico_contatos?JSON.parse(l.historico_contatos):[]).filter(h=>h.data>=cutoff30).length; }
    catch {}
  });

  // Visitas
  const visitas  = leads.filter(l=>['Visita Marcada','Proposta','Documentação','Fechado'].includes(l.status)).length;
  const propostas= leads.filter(l=>['Proposta','Documentação','Fechado'].includes(l.status)).length;

  // Taxa conversão
  const taxaConv = leads.length > 0 ? Math.round((vendas/leads.length)*100) : 0;

  // Leads abandonados (30+d)
  const abandonados = ativos.filter(l=>_dias(l.ultimo_contato||l.updated_at||l.created_at)>=30).length;

  // Campos preenchidos (qualidade do CRM)
  const campos = ['telefone','email','valor','bairro','origem'];
  const qualCRM = leads.length > 0
    ? Math.round(leads.reduce((acc,l) => acc + campos.filter(c=>l[c]&&String(l[c]).trim()).length, 0) / (leads.length * campos.length) * 100)
    : 100;

  return { total:leads.length, vendas, perdidos, ativos:ativos.length, tempoMedioH,
    totalFU, visitas, propostas, taxaConv, abandonados, qualCRM };
}

/* ─────────────────────────────────────────────
   PONTOS FORTES E FRACOS
───────────────────────────────────────────── */
function gerarPontosFortes(hab, iccData) {
  const pontos = [];
  if (hab.tempoMedioH !== null && hab.tempoMedioH <= 4)
    pontos.push({ icone:'⚡', texto:`Excelente velocidade de resposta: média de ${hab.tempoMedioH}h.` });
  if (hab.taxaConv >= 20)
    pontos.push({ icone:'🎯', texto:`Taxa de conversão de ${hab.taxaConv}% — acima da média da equipe.` });
  if (hab.totalFU >= 10)
    pontos.push({ icone:'🔄', texto:`Cadência de follow-up excelente: ${hab.totalFU} registros em 30 dias.` });
  if (hab.visitas >= 5)
    pontos.push({ icone:'🏠', texto:`${hab.visitas} visitas realizadas — boa conversão de funil.` });
  if (hab.qualCRM >= 80)
    pontos.push({ icone:'📋', texto:`CRM bem preenchido: ${hab.qualCRM}% de completude.` });
  if (hab.abandonados === 0)
    pontos.push({ icone:'✅', texto:'Carteira saudável — nenhum lead abandonado.' });
  if ((iccData?.icc||0) >= 85)
    pontos.push({ icone:'🔐', texto:`ICC elevado: ${iccData.icc}/100 — alto índice de confiança.` });
  return pontos.slice(0, 4);
}

function gerarPontosFracos(hab, iccData) {
  const pontos = [];
  if (hab.tempoMedioH !== null && hab.tempoMedioH > 8)
    pontos.push({ icone:'⏱', texto:`Tempo de resposta alto: ${hab.tempoMedioH}h em média. Meta: menos de 4h.` });
  if (hab.taxaConv < 10 && hab.total >= 5)
    pontos.push({ icone:'📉', texto:`Conversão de ${hab.taxaConv}% — abaixo do esperado. Meta: 15%+.` });
  if (hab.totalFU < 5 && hab.total >= 3)
    pontos.push({ icone:'📵', texto:'Baixa cadência de follow-ups. Meta: 2+ por lead ativo por semana.' });
  if (hab.visitas < 2 && hab.total >= 5)
    pontos.push({ icone:'🏠', texto:'Poucas visitas realizadas — trabalhar agendamentos.' });
  if (hab.qualCRM < 60)
    pontos.push({ icone:'📋', texto:`CRM incompleto: apenas ${hab.qualCRM}% dos campos preenchidos.` });
  if (hab.abandonados >= 3)
    pontos.push({ icone:'⚫', texto:`${hab.abandonados} leads abandonados — recuperar antes de pedir novos.` });
  if ((iccData?.icc||0) < 50 && iccData)
    pontos.push({ icone:'🚨', texto:`ICC crítico: ${iccData.icc}/100 — prioridade de desenvolvimento.` });
  return pontos.slice(0, 4);
}

/* ─────────────────────────────────────────────
   PLANO DE EVOLUÇÃO
───────────────────────────────────────────── */
function gerarPlanoEvolucao(hab, iccData) {
  const acoes = [];

  if (hab.tempoMedioH !== null && hab.tempoMedioH > 4)
    acoes.push({ prazo:'Esta semana', acao:'Responder novos leads em até 20 minutos.', impacto:'alto', meta:'Reduzir tempo de resposta para <4h' });

  if (hab.totalFU < 8 && hab.total >= 3)
    acoes.push({ prazo:'Diário', acao:'Realizar pelo menos 2 follow-ups por lead ativo.', impacto:'alto', meta:'10+ follow-ups/mês' });

  if (hab.visitas < 3 && hab.total >= 5)
    acoes.push({ prazo:'Esta semana', acao:'Agendar visitas para todos os leads em "Qualificado".', impacto:'alto', meta:'3+ visitas/semana' });

  if (hab.qualCRM < 70)
    acoes.push({ prazo:'Hoje', acao:`Preencher campos faltantes em ${hab.ativos} leads ativos (telefone, valor, bairro).`, impacto:'medio', meta:'90%+ de completude' });

  if (hab.abandonados >= 2)
    acoes.push({ prazo:'Esta semana', acao:`Recuperar ${hab.abandonados} leads parados há 30+ dias.`, impacto:'alto', meta:'Zero abandonados' });

  if (hab.propostas === 0 && hab.total >= 5)
    acoes.push({ prazo:'Esta semana', acao:'Enviar proposta para leads em "Em Atendimento" avançado.', impacto:'alto', meta:'2+ propostas' });

  if (acoes.length === 0)
    acoes.push({ prazo:'Contínuo', acao:'Manter cadência atual e buscar novos leads qualificados.', impacto:'medio', meta:'Superar performance atual' });

  return acoes.slice(0, 4);
}

/* ─────────────────────────────────────────────
   SUGESTÕES DO COACH
───────────────────────────────────────────── */
function gerarSugestoesCoach(hab) {
  const s = [];

  if (hab.tempoMedioH !== null && hab.tempoMedioH > 20)
    s.push('Você perdeu leads por demora no primeiro contato. Responder em até 20 minutos aumenta sua conversão em ~28%.');

  if (hab.taxaConv < 10 && hab.total >= 5)
    s.push('Sua taxa de conversão está abaixo do esperado. Foque em qualificar melhor os leads antes de avançar no funil.');

  if (hab.totalFU < 3 && hab.total >= 5)
    s.push('Aumentar o número de follow-ups tem impacto direto nas vendas. Leads com 3+ follow-ups convertem 2x mais.');

  if (hab.visitas < 2 && hab.total >= 5)
    s.push('Leads que chegam à fase de visita têm 4x mais chance de fechar. Priorize o agendamento de visitas.');

  if (hab.abandonados >= 3)
    s.push(`${hab.abandonados} leads abandonados representam oportunidade perdida. Reative com uma mensagem personalizada hoje.`);

  if (s.length === 0)
    s.push('Excelente performance! Continue com a cadência atual e expanda sua carteira.');

  return s.slice(0, 3);
}

/* ─────────────────────────────────────────────
   TREINAMENTOS RECOMENDADOS
───────────────────────────────────────────── */
function recomendarTreinamentos(hab) {
  const tr = [];
  if (hab.tempoMedioH > 8)        tr.push({ icone:'⚡', nome:'Gestão de Tempo e Priorização', foco:'Resposta rápida a novos leads' });
  if (hab.taxaConv < 12)          tr.push({ icone:'🎯', nome:'Técnicas de Fechamento', foco:'Converter mais leads em vendas' });
  if (hab.totalFU < 5)            tr.push({ icone:'📞', nome:'Cadência de Follow-up', foco:'Manter leads engajados' });
  if (hab.visitas < 3)            tr.push({ icone:'🏠', nome:'Apresentação de Imóveis', foco:'Aumentar taxa de agendamento' });
  if (hab.qualCRM < 60)           tr.push({ icone:'📋', nome:'Uso do CRM', foco:'Registrar informações corretamente' });
  if (tr.length === 0)            tr.push({ icone:'🏆', nome:'Advanced Selling', foco:'Elevar performance já alta' });
  return tr.slice(0, 3);
}

/* ─────────────────────────────────────────────
   FUNÇÃO PRINCIPAL
───────────────────────────────────────────── */
function gerarCoach(corretor, allLeads, iccData) {
  const leads       = _leads(allLeads, corretor.nome);
  const hab         = analisarHabitos(leads);
  const fortes      = gerarPontosFortes(hab, iccData);
  const fracos      = gerarPontosFracos(hab, iccData);
  const plano       = gerarPlanoEvolucao(hab, iccData);
  const sugestoes   = gerarSugestoesCoach(hab);
  const treinamentos= recomendarTreinamentos(hab);

  // Score de maturidade comercial 0-100
  let maturidade = 40;
  if (hab.tempoMedioH !== null && hab.tempoMedioH <= 4) maturidade += 20;
  else if (hab.tempoMedioH !== null && hab.tempoMedioH <= 12) maturidade += 10;
  if (hab.taxaConv >= 15) maturidade += 20;
  else if (hab.taxaConv >= 8) maturidade += 10;
  if (hab.totalFU >= 10) maturidade += 10;
  if (hab.visitas >= 5) maturidade += 10;
  if (hab.abandonados === 0) maturidade += 10;
  maturidade = Math.min(100, maturidade);

  return { corretor, hab, fortes, fracos, plano, sugestoes, treinamentos, maturidade,
    geradoEm: new Date().toISOString() };
}

function gerarCoachEquipe(corretores, allLeads, iccMap = {}) {
  return corretores
    .filter(c => c.nome && !['CEO','Diretor'].includes(c.cargo))
    .map(c => gerarCoach(c, allLeads, iccMap[c.nome] || null))
    .sort((a,b) => b.maturidade - a.maturidade);
}
