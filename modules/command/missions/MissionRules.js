/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — SMART MISSIONS ENGINE                                 ║
 * ║  MissionRules.js                                             ║
 * ║  SPR-007 · KR7 Command Operation                             ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Funções PURAS de geração de missões.
 * Zero dependências externas. Testável isoladamente.
 *
 * RESTRIÇÕES SPR-007:
 *   ✗ Não envia notificações
 *   ✗ Não executa automações
 *   ✓ Apenas gera, acompanha e conclui missões
 */

'use strict';

/* ─────────────────────────────────────────────
   TIPOS DE MISSÃO
───────────────────────────────────────────── */
const MissionType = Object.freeze({
  PRIMEIRO_CONTATO    : 'Primeiro contato',
  FOLLOWUP            : 'Realizar Follow-up',
  RESPONDER_WHATSAPP  : 'Responder WhatsApp',
  REALIZAR_LIGACAO    : 'Realizar ligação',
  CONFIRMAR_VISITA    : 'Confirmar visita',
  AGENDAR_VISITA      : 'Agendar visita',
  ENVIAR_PROPOSTA     : 'Enviar proposta',
  ATUALIZAR_CRM       : 'Atualizar CRM',
  RECUPERAR_LEAD      : 'Recuperar Lead',
  FINALIZAR_NEGOCIACAO: 'Finalizar negociação',
});

/* ─────────────────────────────────────────────
   PRIORIDADES
───────────────────────────────────────────── */
const MissionPriority = Object.freeze({
  CRITICA : 'CRITICA',
  ALTA    : 'ALTA',
  MEDIA   : 'MEDIA',
  BAIXA   : 'BAIXA',
});

const PRIORITY_CFG = Object.freeze({
  CRITICA : { emoji:'🔴', label:'Crítica',  color:'#EF4444', bg:'rgba(239,68,68,0.08)',  border:'rgba(239,68,68,0.22)',  pts:40, tempoMin:30 },
  ALTA    : { emoji:'🟠', label:'Alta',     color:'#F97316', bg:'rgba(249,115,22,0.08)', border:'rgba(249,115,22,0.22)', pts:25, tempoMin:60 },
  MEDIA   : { emoji:'🟡', label:'Média',    color:'#EAB308', bg:'rgba(234,179,8,0.08)',  border:'rgba(234,179,8,0.22)',  pts:15, tempoMin:120 },
  BAIXA   : { emoji:'🟢', label:'Baixa',    color:'#22C55E', bg:'rgba(34,197,94,0.08)',  border:'rgba(34,197,94,0.22)', pts:8,  tempoMin:240 },
});

/* ─────────────────────────────────────────────
   STATUS DA MISSÃO
───────────────────────────────────────────── */
const MissionStatus = Object.freeze({
  PENDENTE  : 'PENDENTE',
  CONCLUIDA : 'CONCLUIDA',
  EXPIRADA  : 'EXPIRADA',
  CANCELADA : 'CANCELADA',
});

/* ─────────────────────────────────────────────
   GAMIFICAÇÃO — NÍVEIS
───────────────────────────────────────────── */
const GAMIFICATION_LEVELS = [
  { nome:'Bronze',    minXP:0,    emoji:'🥉', color:'#CD7F32', bg:'rgba(205,127,50,0.1)' },
  { nome:'Prata',     minXP:200,  emoji:'🥈', color:'#C0C0C0', bg:'rgba(192,192,192,0.1)' },
  { nome:'Ouro',      minXP:500,  emoji:'🥇', color:'#FFD700', bg:'rgba(255,215,0,0.1)' },
  { nome:'Diamante',  minXP:1000, emoji:'💎', color:'#B9F2FF', bg:'rgba(185,242,255,0.1)' },
  { nome:'Elite KR7', minXP:2000, emoji:'⭐', color:'#A78BFA', bg:'rgba(167,139,250,0.1)' },
];

function _getNivelMission(xp) {
  let nivel = GAMIFICATION_LEVELS[0];
  for (const n of GAMIFICATION_LEVELS) {
    if (xp >= n.minXP) nivel = n;
  }
  return nivel;
}

function getProximoNivel(xp) {
  for (const n of GAMIFICATION_LEVELS) {
    if (xp < n.minXP) return n;
  }
  return null;
}

/* ─────────────────────────────────────────────
   HELPERS INTERNOS
───────────────────────────────────────────── */
var _norm  = s => (s||'').trim().toLowerCase();
var _dias  = iso => iso ? Math.floor((Date.now()-new Date(iso).getTime())/86_400_000) : 999;
var _horas = iso => iso ? Math.floor((Date.now()-new Date(iso).getTime())/3_600_000) : 999;
var _leads = (all, nome) => all.filter(l => _norm(l.corretor) === _norm(nome));
var _uid   = () => `m_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;

/* ─────────────────────────────────────────────
   CONSTRUTOR DE MISSÃO
───────────────────────────────────────────── */
function criarMissao({ tipo, prioridade, corretor, lead=null, descricao, motivo, tempoEstimado, prazoHoras=24 }) {
  const cfg    = PRIORITY_CFG[prioridade];
  const agora  = new Date();
  const prazo  = new Date(agora.getTime() + prazoHoras * 3_600_000);

  return {
    id           : _uid(),
    tipo,
    prioridade,
    cfg,
    corretor,
    lead         : lead ? { id:lead.id, nome:lead.nome, status:lead.status, telefone:lead.telefone||null } : null,
    descricao,
    motivo,
    tempoEstimado: tempoEstimado || cfg.tempoMin,
    prazo        : prazo.toISOString(),
    prazoHoras,
    status       : MissionStatus.PENDENTE,
    criadaEm     : agora.toISOString(),
    concluidaEm  : null,
    pontos       : cfg.pts,
    xp           : Math.round(cfg.pts * 1.5),
  };
}

/* ─────────────────────────────────────────────
   REGRAS DE GERAÇÃO DE MISSÕES
   Cada regra recebe (leads, corretor, iccData)
   e retorna array de Missao[]
───────────────────────────────────────────── */

/** R1 — Leads sem nenhum contato (Lead Novo) */
function rPrimeiroContato(leads, corretor) {
  return leads
    .filter(l => l.status === 'Lead Novo' || (!l.ultimo_contato && l.status !== 'Fechado' && l.status !== 'Perdido'))
    .slice(0, 3)
    .map(lead => criarMissao({
      tipo        : MissionType.PRIMEIRO_CONTATO,
      prioridade  : MissionPriority.CRITICA,
      corretor,
      lead,
      descricao   : `Fazer o primeiro contato com ${lead.nome}`,
      motivo      : `Lead sem nenhum contato registrado desde ${new Date(lead.created_at||Date.now()).toLocaleDateString('pt-BR')}.`,
      tempoEstimado: 15,
      prazoHoras  : 4,
    }));
}

/** R2 — Leads críticos (15–29 dias sem contato) */
function rLeadsCriticos(leads, corretor) {
  return leads
    .filter(l => {
      const dias = _dias(l.ultimo_contato || l.updated_at || l.created_at);
      return dias >= 15 && dias < 30 && !['Fechado','Perdido'].includes(l.status);
    })
    .slice(0, 3)
    .map(lead => {
      const dias = _dias(lead.ultimo_contato || lead.updated_at || lead.created_at);
      return criarMissao({
        tipo        : MissionType.REALIZAR_LIGACAO,
        prioridade  : MissionPriority.CRITICA,
        corretor,
        lead,
        descricao   : `Ligar para ${lead.nome} — ${dias} dias sem contato`,
        motivo      : `Lead em estado crítico. Última movimentação há ${dias} dias.`,
        tempoEstimado: 20,
        prazoHoras  : 6,
      });
    });
}

/** R3 — Leads em risco (7–14 dias sem contato) */
function rLeadsEmRisco(leads, corretor) {
  return leads
    .filter(l => {
      const dias = _dias(l.ultimo_contato || l.updated_at || l.created_at);
      return dias >= 7 && dias < 15 && !['Fechado','Perdido'].includes(l.status);
    })
    .slice(0, 3)
    .map(lead => {
      const dias = _dias(lead.ultimo_contato || lead.updated_at || lead.created_at);
      return criarMissao({
        tipo        : MissionType.FOLLOWUP,
        prioridade  : MissionPriority.ALTA,
        corretor,
        lead,
        descricao   : `Follow-up urgente: ${lead.nome}`,
        motivo      : `Sem contato há ${dias} dias — risco de perder o lead.`,
        tempoEstimado: 15,
        prazoHoras  : 12,
      });
    });
}

/** R4 — Visitas do dia a confirmar */
function rConfirmarVisitas(leads, corretor) {
  const hoje = new Date().toISOString().slice(0, 10);
  const amanha = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  return leads
    .filter(l => l.status === 'Visita Marcada' && l.visita_data && (l.visita_data === hoje || l.visita_data === amanha))
    .map(lead => criarMissao({
      tipo        : MissionType.CONFIRMAR_VISITA,
      prioridade  : lead.visita_data === hoje ? MissionPriority.CRITICA : MissionPriority.ALTA,
      corretor,
      lead,
      descricao   : `Confirmar visita com ${lead.nome} — ${lead.visita_data === hoje ? 'HOJE' : 'amanhã'}`,
      motivo      : `Visita agendada para ${lead.visita_data}${lead.visita_hora?' às '+lead.visita_hora:''}.`,
      tempoEstimado: 10,
      prazoHoras  : lead.visita_data === hoje ? 2 : 12,
    }));
}

/** R5 — Propostas enviadas aguardando resposta (> 3 dias) */
function rPropostasPendentes(leads, corretor) {
  return leads
    .filter(l => {
      const dias = _dias(l.ultimo_contato || l.updated_at || l.created_at);
      return l.status === 'Proposta' && dias >= 3;
    })
    .slice(0, 2)
    .map(lead => {
      const dias = _dias(lead.ultimo_contato || lead.updated_at || lead.created_at);
      return criarMissao({
        tipo        : MissionType.FINALIZAR_NEGOCIACAO,
        prioridade  : dias >= 7 ? MissionPriority.CRITICA : MissionPriority.ALTA,
        corretor,
        lead,
        descricao   : `Fechar proposta com ${lead.nome}`,
        motivo      : `Proposta enviada há ${dias} dias sem resposta — ligar para tirar objeções.`,
        tempoEstimado: 30,
        prazoHoras  : 8,
      });
    });
}

/** R6 — Leads em Follow-Up atrasados (> 3 dias sem contato) */
function rFollowUpsAtrasados(leads, corretor) {
  return leads
    .filter(l => l.status === 'Follow-Up' && _dias(l.ultimo_contato || l.updated_at || l.created_at) >= 3)
    .slice(0, 3)
    .map(lead => {
      const dias = _dias(lead.ultimo_contato || lead.updated_at || lead.created_at);
      return criarMissao({
        tipo        : MissionType.RESPONDER_WHATSAPP,
        prioridade  : dias >= 7 ? MissionPriority.ALTA : MissionPriority.MEDIA,
        corretor,
        lead,
        descricao   : `Retomar contato: ${lead.nome}`,
        motivo      : `Lead em Follow-Up há ${dias} dias. Enviar mensagem pelo WhatsApp.`,
        tempoEstimado: 10,
        prazoHoras  : 24,
      });
    });
}

/** R7 — Leads qualificados sem visita agendada */
function rAgendarVisita(leads, corretor) {
  return leads
    .filter(l => l.status === 'Qualificado' && !l.visita_data)
    .slice(0, 2)
    .map(lead => criarMissao({
      tipo        : MissionType.AGENDAR_VISITA,
      prioridade  : MissionPriority.MEDIA,
      corretor,
      lead,
      descricao   : `Agendar visita: ${lead.nome}`,
      motivo      : `Lead qualificado sem visita agendada — próximo passo natural no funil.`,
      tempoEstimado: 15,
      prazoHoras  : 48,
    }));
}

/** R8 — Atualização do CRM (leads ativos sem update > 5 dias) */
function rAtualizarCRM(leads, corretor) {
  const desatualizados = leads
    .filter(l => !['Fechado','Perdido'].includes(l.status) &&
      _dias(l.ultimo_contato || l.updated_at || l.created_at) > 5)
    .length;

  if (desatualizados < 3) return [];
  return [criarMissao({
    tipo        : MissionType.ATUALIZAR_CRM,
    prioridade  : desatualizados >= 8 ? MissionPriority.ALTA : MissionPriority.MEDIA,
    corretor,
    lead        : null,
    descricao   : `Atualizar ${desatualizados} leads no CRM`,
    motivo      : `${desatualizados} leads ativos sem atualização há mais de 5 dias.`,
    tempoEstimado: Math.min(desatualizados * 5, 60),
    prazoHoras  : 24,
  })];
}

/** R9 — Leads abandonados (30+ dias) para recuperação */
function rRecuperarLeads(leads, corretor) {
  return leads
    .filter(l => !['Fechado','Perdido'].includes(l.status) &&
      _dias(l.ultimo_contato || l.updated_at || l.created_at) >= 30)
    .slice(0, 2)
    .map(lead => {
      const dias = _dias(lead.ultimo_contato || lead.updated_at || lead.created_at);
      return criarMissao({
        tipo        : MissionType.RECUPERAR_LEAD,
        prioridade  : MissionPriority.ALTA,
        corretor,
        lead,
        descricao   : `Resgatar lead: ${lead.nome}`,
        motivo      : `${dias} dias sem movimentação — última chance antes de perder definitivamente.`,
        tempoEstimado: 20,
        prazoHoras  : 24,
      });
    });
}

/** R10 — Enviar proposta para leads em atendimento avançado */
function rEnviarProposta(leads, corretor) {
  return leads
    .filter(l => ['Em Atendimento','Documentação'].includes(l.status) && !l.proposta_enviada)
    .slice(0, 2)
    .map(lead => criarMissao({
      tipo        : MissionType.ENVIAR_PROPOSTA,
      prioridade  : MissionPriority.ALTA,
      corretor,
      lead,
      descricao   : `Enviar proposta para ${lead.nome}`,
      motivo      : `Lead em ${lead.status} — momento ideal para enviar proposta comercial.`,
      tempoEstimado: 45,
      prazoHoras  : 24,
    }));
}

/* ─────────────────────────────────────────────
   GERAÇÃO COMPLETA DE MISSÕES PARA UM CONSULTOR
───────────────────────────────────────────── */

/**
 * Gera todas as missões do dia para um consultor.
 * @param {object} corretor
 * @param {Array}  allLeads
 * @param {object} [iccData]
 * @returns {Mission[]}   ordenadas por prioridade
 */
function gerarMissoes(corretor, allLeads, iccData) {
  const leadsCorretor = allLeads.filter(l =>
    (l.corretor||'').trim().toLowerCase() === (corretor.nome||'').trim().toLowerCase()
  );

  const todasMissoes = [
    ...rPrimeiroContato(leadsCorretor, corretor.nome),
    ...rLeadsCriticos(leadsCorretor, corretor.nome),
    ...rConfirmarVisitas(leadsCorretor, corretor.nome),
    ...rPropostasPendentes(leadsCorretor, corretor.nome),
    ...rLeadsEmRisco(leadsCorretor, corretor.nome),
    ...rFollowUpsAtrasados(leadsCorretor, corretor.nome),
    ...rRecuperarLeads(leadsCorretor, corretor.nome),
    ...rEnviarProposta(leadsCorretor, corretor.nome),
    ...rAgendar_Visita(leadsCorretor, corretor.nome),
    ...rAtualizarCRM(leadsCorretor, corretor.nome),
  ];

  // Ordena: CRITICA → ALTA → MEDIA → BAIXA, depois por prazo
  const ordem = { CRITICA:0, ALTA:1, MEDIA:2, BAIXA:3 };
  todasMissoes.sort((a,b) =>
    (ordem[a.prioridade]||3) - (ordem[b.prioridade]||3) ||
    new Date(a.prazo) - new Date(b.prazo)
  );

  // Limita a 10 missões por dia (não sobrecarregar)
  return todasMissoes.slice(0, 10);
}

/**
 * Gera missões para toda a equipe.
 * @param {Array} corretores
 * @param {Array} allLeads
 * @param {object} iccMap  — { nome: ICCResult }
 * @returns {object}  — { [nomeCorretor]: Mission[] }
 */
function gerarMissoesEquipe(corretores, allLeads, iccMap = {}) {
  const resultado = {};
  corretores
    .filter(c => c.nome && !['CEO','Diretor'].includes(c.cargo))
    .forEach(c => {
      resultado[c.nome] = gerarMissoes(c, allLeads, iccMap[c.nome] || null);
    });
  return resultado;
}

// Alias para compatibilidade
function rAgendar_Visita(leads, corretor) { return rAgendarVisita(leads, corretor); }
