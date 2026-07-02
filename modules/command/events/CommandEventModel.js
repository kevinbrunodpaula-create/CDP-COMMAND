/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — COMMAND EVENTS ENGINE                                 ║
 * ║  CommandEventModel                                           ║
 * ║  SPR-001 · KR7 Command                                       ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Define a estrutura imutável de um evento, todos os tipos
 * permitidos e todas as origens permitidas.
 *
 * REGRAS DE IMUTABILIDADE:
 *   - Eventos nunca são editados após a criação.
 *   - Eventos nunca são deletados.
 *   - Apenas INSERT é permitido na tabela command_events.
 */

'use strict';

/* ─────────────────────────────────────────────
   TIPOS DE EVENTO
   Cada tipo representa uma ação rastreável no sistema.
───────────────────────────────────────────── */
const CommandEventType = Object.freeze({
  // ── Leads ────────────────────────────────
  LEAD_CREATED      : 'LEAD_CREATED',
  LEAD_UPDATED      : 'LEAD_UPDATED',
  LEAD_IMPORTED     : 'LEAD_IMPORTED',
  LEAD_ASSIGNED     : 'LEAD_ASSIGNED',
  LEAD_TRANSFERRED  : 'LEAD_TRANSFERRED',
  LEAD_RECOVERED    : 'LEAD_RECOVERED',

  // ── Interações ───────────────────────────
  FIRST_CONTACT     : 'FIRST_CONTACT',
  PHONE_CALL        : 'PHONE_CALL',
  WHATSAPP_SENT     : 'WHATSAPP_SENT',
  EMAIL_SENT        : 'EMAIL_SENT',
  FOLLOWUP          : 'FOLLOWUP',

  // ── Pipeline ─────────────────────────────
  VISIT_SCHEDULED   : 'VISIT_SCHEDULED',
  VISIT_COMPLETED   : 'VISIT_COMPLETED',
  PROPOSAL_SENT     : 'PROPOSAL_SENT',
  SALE_COMPLETED    : 'SALE_COMPLETED',
  SALE_LOST         : 'SALE_LOST',

  // ── Entidades ────────────────────────────
  CLIENT_CREATED    : 'CLIENT_CREATED',
  PROPERTY_CREATED  : 'PROPERTY_CREATED',

  // ── Autenticação ─────────────────────────
  LOGIN             : 'LOGIN',
  LOGOUT            : 'LOGOUT',
  USER_CREATED      : 'USER_CREATED',

  // ── Sistema ──────────────────────────────
  COMMAND_ALERT              : 'COMMAND_ALERT',
  COMMAND_ACTION             : 'COMMAND_ACTION',
  COMMAND_RECOVERY_ANALYSIS  : 'COMMAND_RECOVERY_ANALYSIS',
  COMMAND_SCORE_UPDATED      : 'COMMAND_SCORE_UPDATED',
  COMMAND_DNA_UPDATED        : 'COMMAND_DNA_UPDATED',
  OPERACAO_INICIADA          : 'OPERACAO_INICIADA',
  TIMELINE_EVENTO            : 'TIMELINE_EVENTO',
  ALERTA_CRITICO             : 'ALERTA_CRITICO',
  RECOMENDACAO_GERADA        : 'RECOMENDACAO_GERADA',
  DNA_CREATED                : 'DNA_CREATED',
  DNA_UPDATED                : 'DNA_UPDATED',
  DNA_MATCH_COMPLETED        : 'DNA_MATCH_COMPLETED',
  COMMAND_TRUST_UPDATED      : 'COMMAND_TRUST_UPDATED',
  COMMAND_TRUST_ALERT        : 'COMMAND_TRUST_ALERT',
  COMMAND_DISTRIBUTION_ANALYZED    : 'COMMAND_DISTRIBUTION_ANALYZED',
  COMMAND_DISTRIBUTION_RECOMMENDED : 'COMMAND_DISTRIBUTION_RECOMMENDED',
  MISSION_CREATED   : 'MISSION_CREATED',
  MISSION_COMPLETED : 'MISSION_COMPLETED',
  MISSION_EXPIRED   : 'MISSION_EXPIRED',
  MISSION_CANCELLED : 'MISSION_CANCELLED',
  COMMAND_BRIEFING_GENERATED : 'COMMAND_BRIEFING_GENERATED',
  COMMAND_WARROOM_UPDATED    : 'COMMAND_WARROOM_UPDATED',
  COMMAND_PREDICTION_CREATED    : 'COMMAND_PREDICTION_CREATED',
  COMMAND_COACH_UPDATED         : 'COMMAND_COACH_UPDATED',
  COMMAND_PERFORMANCE_UPDATED   : 'COMMAND_PERFORMANCE_UPDATED',
  COMMAND_AUTOMATION_EXECUTED   : 'COMMAND_AUTOMATION_EXECUTED',
});

/* ─────────────────────────────────────────────
   ORIGENS DO EVENTO
   Identifica quem disparou o evento.
───────────────────────────────────────────── */
const CommandEventOrigin = Object.freeze({
  USER         : 'USER',
  SYSTEM       : 'SYSTEM',
  COMMAND      : 'COMMAND',
  LANDING_PAGE : 'LANDING_PAGE',
  IMPORT       : 'IMPORT',
  API          : 'API',
});

/* ─────────────────────────────────────────────
   MÓDULOS RASTREÁVEIS
   Identifica de qual módulo o evento veio.
───────────────────────────────────────────── */
const CommandEventModule = Object.freeze({
  LEADS          : 'leads',
  IMOVEIS        : 'imoveis',
  CORRETORES     : 'corretores',
  AGENDA         : 'agenda',
  FINANCEIRO     : 'financeiro',
  CONFIGURACOES  : 'configuracoes',
  USUARIOS       : 'usuarios',
  DASHBOARD      : 'dashboard',
  RELATORIOS     : 'relatorios',
  AUTH           : 'auth',
  IMPORT         : 'import',
  LIGACOES       : 'ligacoes',
  OFERTA_ATIVA   : 'oferta_ativa',
  COMMAND        : 'command',
  RECOVERY       : 'recovery',
  MANAGER        : 'manager',
  DNA            : 'dna',
  TRUST          : 'trust',
  DISTRIBUTION   : 'distribution',
  MISSIONS       : 'missions',
  EXECUTIVE      : 'executive',
  INTELLIGENCE   : 'intelligence',
  SYSTEM         : 'system',
});

/* ─────────────────────────────────────────────
   MODELO DO EVENTO
   Descreve a estrutura completa de um CommandEvent.

   Campos:
     id          → UUID gerado pelo Supabase (PK, imutável)
     timestamp   → ISO 8601 UTC, gerado no momento do INSERT
     modulo      → CommandEventModule
     tipo        → CommandEventType
     origem      → CommandEventOrigin
     usuario     → nome do usuário logado no momento
     consultor   → corretor relacionado ao evento (opcional)
     lead        → identificador do lead (nome ou ID, opcional)
     cliente     → identificador do cliente (opcional)
     imovel      → identificador do imóvel (opcional)
     descricao   → texto legível do evento (obrigatório)
     detalhes    → texto livre com contexto adicional (opcional)
     metadata    → objeto JSON livre para dados extras (opcional)
───────────────────────────────────────────── */
class CommandEventModel {
  /**
   * @param {object} params
   * @param {string} params.modulo     - CommandEventModule
   * @param {string} params.tipo       - CommandEventType
   * @param {string} params.origem     - CommandEventOrigin
   * @param {string} params.usuario    - Nome do usuário logado
   * @param {string} [params.consultor]
   * @param {string} [params.lead]
   * @param {string} [params.cliente]
   * @param {string} [params.imovel]
   * @param {string} params.descricao  - Descrição legível (obrigatória)
   * @param {string} [params.detalhes]
   * @param {object} [params.metadata]
   */
  constructor({
    modulo,
    tipo,
    origem,
    usuario,
    consultor  = null,
    lead       = null,
    cliente    = null,
    imovel     = null,
    descricao,
    detalhes   = null,
    metadata   = null,
  }) {
    // ── Validações ───────────────────────────
    if (!modulo)    throw new Error('CommandEventModel: modulo é obrigatório');
    if (!tipo)      throw new Error('CommandEventModel: tipo é obrigatório');
    if (!origem)    throw new Error('CommandEventModel: origem é obrigatória');
    if (!usuario)   throw new Error('CommandEventModel: usuario é obrigatório');
    if (!descricao) throw new Error('CommandEventModel: descricao é obrigatória');

    if (!Object.values(CommandEventType).includes(tipo)) {
      throw new Error(`CommandEventModel: tipo inválido — "${tipo}"`);
    }
    if (!Object.values(CommandEventOrigin).includes(origem)) {
      throw new Error(`CommandEventModel: origem inválida — "${origem}"`);
    }

    // ── Dados ────────────────────────────────
    this.modulo    = modulo;
    this.tipo      = tipo;
    this.origem    = origem;
    this.usuario   = usuario;
    this.consultor = consultor;
    this.lead      = lead;
    this.cliente   = cliente;
    this.imovel    = imovel;
    this.descricao = descricao;
    this.detalhes  = detalhes;
    this.metadata  = metadata ? JSON.stringify(metadata) : null;

    // timestamp gerado localmente como ISO string; o Supabase
    // pode sobrescrever com DEFAULT now() se a coluna assim definir.
    this.timestamp = new Date().toISOString();
  }

  /** Retorna objeto plano pronto para INSERT no Supabase */
  toPayload() {
    return {
      timestamp  : this.timestamp,
      modulo     : this.modulo,
      tipo       : this.tipo,
      origem     : this.origem,
      usuario    : this.usuario,
      consultor  : this.consultor,
      lead       : this.lead,
      cliente    : this.cliente,
      imovel     : this.imovel,
      descricao  : this.descricao,
      detalhes   : this.detalhes,
      metadata   : this.metadata,
    };
  }
}
