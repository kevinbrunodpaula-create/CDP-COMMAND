/**
 * CDP — COMMAND INTELLIGENCE
 * AutomationEngine.js — Motor de Regras (SEM IA)
 * Release 2.9 · KR7 Command Intelligence
 *
 * IMPORTANTE: NÃO executa ações automáticas.
 * Somente detecta condições e prepara sugestões.
 * O gestor sempre decide.
 */

'use strict';

var _dias   = iso => iso ? Math.floor((Date.now()-new Date(iso).getTime())/86_400_000) : 999;
var _normA  = s => (s||'').trim().toLowerCase();
var _hoje   = () => new Date().toISOString().slice(0,10);
var _amanha = () => new Date(Date.now()+86_400_000).toISOString().slice(0,10);

/* ─────────────────────────────────────────────
   TIPOS DE REGRA
───────────────────────────────────────────── */
const RuleType = Object.freeze({
  LEAD_PARADO      : 'LEAD_PARADO',
  VISITA_MARCADA   : 'VISITA_MARCADA',
  ICC_CAIU         : 'ICC_CAIU',
  LEAD_CRITICO     : 'LEAD_CRITICO',
  META_ATINGIDA    : 'META_ATINGIDA',
  PROPOSTA_EXPIRADA: 'PROPOSTA_EXPIRADA',
  LEAD_SEM_CORRETOR: 'LEAD_SEM_CORRETOR',
  CORRETOR_SOBREC  : 'CORRETOR_SOBRECARREGADO',
  LEAD_RECUPERAVEL : 'LEAD_RECUPERAVEL',
  CONQUISTA        : 'CONQUISTA',
});

const RULE_CFG = Object.freeze({
  LEAD_PARADO       : { icone:'⏸',  cor:'#F97316', prioridade:'ALTA',   acoes:['Criar missão de follow-up','Avisar gestor','Preparar redistribuição'] },
  VISITA_MARCADA    : { icone:'📅',  cor:'#8B5CF6', prioridade:'CRITICA', acoes:['Criar lembrete de confirmação','Notificar consultor'] },
  ICC_CAIU          : { icone:'📉',  cor:'#EF4444', prioridade:'ALTA',   acoes:['Criar alerta no COMMAND','Iniciar plano de coaching'] },
  LEAD_CRITICO      : { icone:'🔴',  cor:'#EF4444', prioridade:'CRITICA', acoes:['Adicionar ao Recovery','Criar missão urgente','Avisar gestor'] },
  META_ATINGIDA     : { icone:'🏆',  cor:'#22C55E', prioridade:'BAIXA',  acoes:['Criar conquista','Parabenizar consultor'] },
  PROPOSTA_EXPIRADA : { icone:'📄',  cor:'#EAB308', prioridade:'ALTA',   acoes:['Criar missão de acompanhamento','Revisar proposta'] },
  LEAD_SEM_CORRETOR : { icone:'👤',  cor:'#64748B', prioridade:'ALTA',   acoes:['Distribuição inteligente sugerida'] },
  CORRETOR_SOBREC   : { icone:'⚠️',  cor:'#F97316', prioridade:'MEDIA',  acoes:['Balancear carteira','Pausar novos leads para este consultor'] },
  LEAD_RECUPERAVEL  : { icone:'♻️',  cor:'#14B8A6', prioridade:'MEDIA',  acoes:['Criar missão de recuperação','Adicionar ao Recovery'] },
  CONQUISTA         : { icone:'⭐',  cor:'#A78BFA', prioridade:'BAIXA',  acoes:['Registrar conquista','Atualizar ranking'] },
});

/* ─────────────────────────────────────────────
   AVALIADORES DE REGRA
───────────────────────────────────────────── */
function regraLeadParado(leads) {
  return leads
    .filter(l => !['Fechado','Perdido'].includes(l.status) && _dias(l.ultimo_contato||l.updated_at||l.created_at)>=7 && _dias(l.ultimo_contato||l.updated_at||l.created_at)<30)
    .slice(0, 5)
    .map(l => ({
      tipo: RuleType.LEAD_PARADO,
      cfg: RULE_CFG.LEAD_PARADO,
      titulo: `Lead parado: ${l.nome}`,
      descricao: `${_dias(l.ultimo_contato||l.updated_at||l.created_at)} dias sem movimentação (${l.corretor||'sem corretor'}).`,
      entidade: { tipo:'lead', id:l.id, nome:l.nome },
      status: 'PENDENTE',
      criadaEm: new Date().toISOString(),
    }));
}

function regraVisitaHoje(leads) {
  return leads
    .filter(l => l.visita_data && (l.visita_data===_hoje()||l.visita_data===_amanha()) && l.status==='Visita Marcada')
    .map(l => ({
      tipo: RuleType.VISITA_MARCADA,
      cfg: RULE_CFG.VISITA_MARCADA,
      titulo: `Visita ${l.visita_data===_hoje()?'HOJE':'amanhã'}: ${l.nome}`,
      descricao: `Confirmar visita com ${l.nome} (${l.corretor||'sem corretor'}).`,
      entidade: { tipo:'lead', id:l.id, nome:l.nome },
      status: 'PENDENTE',
      criadaEm: new Date().toISOString(),
    }));
}

function regraIccCaiu(iccResults) {
  return (iccResults||[])
    .filter(r => r.tendencia?.dir==='↓' && r.icc < 70)
    .map(r => ({
      tipo: RuleType.ICC_CAIU,
      cfg: RULE_CFG.ICC_CAIU,
      titulo: `ICC em queda: ${r.corretor.nome}`,
      descricao: `ICC caiu para ${r.icc}/100 (${r.nivel}). Tendência: em queda.`,
      entidade: { tipo:'corretor', nome:r.corretor.nome },
      status: 'PENDENTE',
      criadaEm: new Date().toISOString(),
    }));
}

function regraLeadCritico(leads) {
  return leads
    .filter(l => !['Fechado','Perdido'].includes(l.status) && _dias(l.ultimo_contato||l.updated_at||l.created_at)>=15 && _dias(l.ultimo_contato||l.updated_at||l.created_at)<30)
    .slice(0, 4)
    .map(l => ({
      tipo: RuleType.LEAD_CRITICO,
      cfg: RULE_CFG.LEAD_CRITICO,
      titulo: `Lead crítico: ${l.nome}`,
      descricao: `${_dias(l.ultimo_contato||l.updated_at||l.created_at)} dias sem contato — risco de perda iminente.`,
      entidade: { tipo:'lead', id:l.id, nome:l.nome },
      status: 'PENDENTE',
      criadaEm: new Date().toISOString(),
    }));
}

function regraPropostaExpirada(leads) {
  return leads
    .filter(l => l.status==='Proposta' && _dias(l.ultimo_contato||l.updated_at||l.created_at)>=7)
    .slice(0, 3)
    .map(l => ({
      tipo: RuleType.PROPOSTA_EXPIRADA,
      cfg: RULE_CFG.PROPOSTA_EXPIRADA,
      titulo: `Proposta sem resposta: ${l.nome}`,
      descricao: `Proposta enviada há ${_dias(l.ultimo_contato||l.updated_at||l.created_at)} dias sem retorno.`,
      entidade: { tipo:'lead', id:l.id, nome:l.nome },
      status: 'PENDENTE',
      criadaEm: new Date().toISOString(),
    }));
}

function regraLeadSemCorretor(leads) {
  return leads
    .filter(l => !l.corretor?.trim() && !['Fechado','Perdido'].includes(l.status))
    .slice(0, 5)
    .map(l => ({
      tipo: RuleType.LEAD_SEM_CORRETOR,
      cfg: RULE_CFG.LEAD_SEM_CORRETOR,
      titulo: `Lead sem responsável: ${l.nome}`,
      descricao: `Lead ativo sem corretor atribuído — distribuição inteligente recomendada.`,
      entidade: { tipo:'lead', id:l.id, nome:l.nome },
      status: 'PENDENTE',
      criadaEm: new Date().toISOString(),
    }));
}

function regraCorretorSobrecarregado(leads, corretores) {
  const nomes = [...new Set(leads.filter(l=>l.corretor).map(l=>l.corretor))];
  return nomes
    .map(nome => ({ nome, ativos: leads.filter(l=>_normA(l.corretor)===_normA(nome)&&!['Fechado','Perdido'].includes(l.status)).length }))
    .filter(c => c.ativos > 15)
    .slice(0, 3)
    .map(c => ({
      tipo: RuleType.CORRETOR_SOBREC,
      cfg: RULE_CFG.CORRETOR_SOBREC,
      titulo: `Corretor sobrecarregado: ${c.nome}`,
      descricao: `${c.nome} possui ${c.ativos} leads ativos — acima do limite ideal de 15.`,
      entidade: { tipo:'corretor', nome:c.nome },
      status: 'PENDENTE',
      criadaEm: new Date().toISOString(),
    }));
}

function regraMetaAtingida(leads, corretores) {
  const conquistas = [];
  const iniMes = new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString();
  const nomes = [...new Set(leads.filter(l=>l.corretor).map(l=>l.corretor))];
  nomes.forEach(nome => {
    const vendas = leads.filter(l=>_normA(l.corretor)===_normA(nome)&&l.status==='Fechado'&&(l.fechado_em||l.updated_at||'')>=iniMes).length;
    if (vendas >= 5) {
      conquistas.push({
        tipo: RuleType.META_ATINGIDA,
        cfg: RULE_CFG.META_ATINGIDA,
        titulo: `Meta atingida: ${nome}`,
        descricao: `${vendas} vendas no mês — meta superada!`,
        entidade: { tipo:'corretor', nome },
        status: 'PENDENTE',
        criadaEm: new Date().toISOString(),
      });
    }
  });
  return conquistas.slice(0, 2);
}

/* ─────────────────────────────────────────────
   FUNÇÃO PRINCIPAL
───────────────────────────────────────────── */
function avaliarRegras(allLeads, allCorretores, iccResults = []) {
  const ordem = { CRITICA:0, ALTA:1, MEDIA:2, BAIXA:3 };
  const regras = [
    ...regraVisitaHoje(allLeads),
    ...regraLeadCritico(allLeads),
    ...regraLeadParado(allLeads),
    ...regraPropostaExpirada(allLeads),
    ...regraLeadSemCorretor(allLeads),
    ...regraIccCaiu(iccResults),
    ...regraCorretorSobrecarregado(allLeads, allCorretores),
    ...regraMetaAtingida(allLeads, allCorretores),
  ].sort((a,b) => (ordem[a.cfg.prioridade]||3)-(ordem[b.cfg.prioridade]||3));

  const resumo = {
    total    : regras.length,
    criticas : regras.filter(r=>r.cfg.prioridade==='CRITICA').length,
    altas    : regras.filter(r=>r.cfg.prioridade==='ALTA').length,
    medias   : regras.filter(r=>r.cfg.prioridade==='MEDIA').length,
    baixas   : regras.filter(r=>r.cfg.prioridade==='BAIXA').length,
  };

  return { regras: regras.slice(0,20), resumo };
}

/** Marca uma regra como aprovada/rejeitada (atualização local — estado é do caller) */
function atualizarStatus(regras, index, novoStatus) {
  const copia = [...regras];
  if (copia[index]) copia[index] = { ...copia[index], status:novoStatus, atualizadaEm:new Date().toISOString() };
  return copia;
}
