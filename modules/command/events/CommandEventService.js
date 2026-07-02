/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — COMMAND EVENTS ENGINE                                 ║
 * ║  CommandEventService                                         ║
 * ║  SPR-001 · KR7 Command                                       ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Ponto de entrada único para registrar eventos no sistema.
 * Todos os módulos devem chamar CommandEventService.record()
 * para gerar um evento — nunca acessar o repositório diretamente.
 *
 * MODO SEGURO:
 *   Erros no registro de eventos são silenciosos (apenas log no
 *   console). Nunca devem interromper o fluxo principal do sistema.
 *
 * USO:
 *   await CommandEventService.record({
 *     modulo     : CommandEventModule.LEADS,
 *     tipo       : CommandEventType.LEAD_CREATED,
 *     origem     : CommandEventOrigin.USER,
 *     descricao  : 'Lead João Silva criado',
 *     lead       : 'João Silva',
 *     consultor  : 'Corretor X',
 *     detalhes   : 'Origem: Instagram',
 *     metadata   : { imovel_interesse: 'Apto 2q Centro' },
 *   });
 *
 * O campo `usuario` é preenchido automaticamente com o usuário
 * logado (currentUser.nome), sem necessidade de passar manualmente.
 */

'use strict';

const CommandEventService = (() => {

  /* ─────────────────────────────────────────────
     FILA DE RETRY
     Eventos que falharam ficam em fila local e
     são reenvíados na próxima tentativa.
  ───────────────────────────────────────────── */
  const QUEUE_KEY = 'cdp_events_queue';

  function getQueue() {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveQueue(queue) {
    try {
      // Mantém no máximo 100 eventos em fila para não lotar o storage
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-100)));
    } catch {
      // localStorage cheio — descarta silenciosamente
    }
  }

  async function flushQueue() {
    const queue = getQueue();
    if (queue.length === 0) return;

    const failed = [];
    for (const payload of queue) {
      const result = await CommandEventRepository._insert(payload);
      if (!result) failed.push(payload);
    }
    saveQueue(failed);
  }

  /* ─────────────────────────────────────────────
     HELPERS INTERNOS
  ───────────────────────────────────────────── */

  /**
   * Resolve o nome do usuário atual.
   * Lê de currentUser (global do CDP) com fallback seguro.
   */
  function resolveUsuario() {
    if (typeof currentUser !== 'undefined' && currentUser?.nome) {
      return currentUser.nome;
    }
    return 'Sistema';
  }

  /* ─────────────────────────────────────────────
     API PÚBLICA
  ───────────────────────────────────────────── */

  /**
   * Registra um evento no sistema.
   * Silencioso — nunca lança exceção para o caller.
   *
   * @param {object} params
   * @param {string} params.modulo      - CommandEventModule (obrigatório)
   * @param {string} params.tipo        - CommandEventType (obrigatório)
   * @param {string} [params.origem]    - CommandEventOrigin (default: USER)
   * @param {string} params.descricao   - Texto legível (obrigatório)
   * @param {string} [params.consultor]
   * @param {string} [params.lead]
   * @param {string} [params.cliente]
   * @param {string} [params.imovel]
   * @param {string} [params.detalhes]
   * @param {object} [params.metadata]
   * @param {string} [params.usuario]   - Sobrescreve o usuário atual (raro)
   * @returns {Promise<object|null>}    - Evento inserido ou null se falhou
   */
  async function record(params) {
    try {
      // Tenta flush de eventuais eventos pendentes em background
      flushQueue().catch(() => {});

      const event = new CommandEventModel({
        origem  : CommandEventOrigin.USER,
        usuario : resolveUsuario(),
        ...params,
      });

      const payload = event.toPayload();
      const result  = await CommandEventRepository._insert(payload);

      if (!result) {
        // Falhou — adiciona à fila de retry
        const queue = getQueue();
        queue.push(payload);
        saveQueue(queue);
        console.warn('[CommandEventService] Evento em fila (retry):', payload.tipo);
      }

      return result;

    } catch (err) {
      // Erros de validação ou inesperados — apenas log, nunca lança
      console.error('[CommandEventService] record error:', err.message, params);
      return null;
    }
  }

  /**
   * Atalho para eventos de LOGIN.
   * @param {string} nomeUsuario
   */
  async function recordLogin(nomeUsuario) {
    return record({
      modulo    : CommandEventModule.AUTH,
      tipo      : CommandEventType.LOGIN,
      origem    : CommandEventOrigin.USER,
      usuario   : nomeUsuario,
      descricao : `Login realizado por ${nomeUsuario}`,
    });
  }

  /**
   * Atalho para eventos de LOGOUT.
   * @param {string} nomeUsuario
   */
  async function recordLogout(nomeUsuario) {
    return record({
      modulo    : CommandEventModule.AUTH,
      tipo      : CommandEventType.LOGOUT,
      origem    : CommandEventOrigin.USER,
      usuario   : nomeUsuario,
      descricao : `Logout realizado por ${nomeUsuario}`,
    });
  }

  /**
   * Atalho para criação de lead.
   * @param {string} nomeLead
   * @param {string} [consultor]
   * @param {string} [origem]         - Origem do lead (Instagram, Google, etc.)
   * @param {object} [meta]
   */
  async function recordLeadCreated(nomeLead, consultor, origem, meta) {
    return record({
      modulo    : CommandEventModule.LEADS,
      tipo      : CommandEventType.LEAD_CREATED,
      origem    : CommandEventOrigin.USER,
      lead      : nomeLead,
      consultor : consultor || null,
      descricao : `Lead criado: ${nomeLead}`,
      detalhes  : origem ? `Origem: ${origem}` : null,
      metadata  : meta || null,
    });
  }

  /**
   * Atalho para atualização de lead.
   * @param {string} nomeLead
   * @param {string} [consultor]
   * @param {string} [detalhe]   - O que foi alterado
   */
  async function recordLeadUpdated(nomeLead, consultor, detalhe) {
    return record({
      modulo    : CommandEventModule.LEADS,
      tipo      : CommandEventType.LEAD_UPDATED,
      origem    : CommandEventOrigin.USER,
      lead      : nomeLead,
      consultor : consultor || null,
      descricao : `Lead atualizado: ${nomeLead}`,
      detalhes  : detalhe || null,
    });
  }

  /**
   * Atalho para venda fechada.
   * @param {string} nomeLead
   * @param {string} [consultor]
   * @param {string} [nomeImovel]
   * @param {number} [valorVgv]
   */
  async function recordSaleCompleted(nomeLead, consultor, nomeImovel, valorVgv) {
    return record({
      modulo    : CommandEventModule.LEADS,
      tipo      : CommandEventType.SALE_COMPLETED,
      origem    : CommandEventOrigin.USER,
      lead      : nomeLead,
      consultor : consultor || null,
      imovel    : nomeImovel || null,
      descricao : `Venda fechada: ${nomeLead}${nomeImovel ? ` — ${nomeImovel}` : ''}`,
      metadata  : valorVgv ? { vgv: valorVgv } : null,
    });
  }

  /**
   * Atalho para alertas do COMMAND.
   * @param {string} descricao
   * @param {object} [meta]
   */
  async function recordCommandAlert(descricao, meta) {
    return record({
      modulo    : CommandEventModule.COMMAND,
      tipo      : CommandEventType.COMMAND_ALERT,
      origem    : CommandEventOrigin.COMMAND,
      descricao,
      metadata  : meta || null,
    });
  }

  /**
   * Atalho para análise do COMMAND RECOVERY.
   * @param {object} summary - { total, saudavel, atencao, risco, critico, abandonado }
   */
  async function recordRecoveryAnalysis(summary) {
    return record({
      modulo    : CommandEventModule.RECOVERY,
      tipo      : CommandEventType.COMMAND_RECOVERY_ANALYSIS,
      origem    : CommandEventOrigin.COMMAND,
      descricao : `Recovery Analysis — ${summary.total} leads analisados`,
      detalhes  : `Saudável:${summary.saudavel} · Atenção:${summary.atencao} · Risco:${summary.risco} · Crítico:${summary.critico} · Abandonado:${summary.abandonado}`,
      metadata  : summary,
    });
  }

  /**
   * Atalho para atualização de score de consultor.
   * @param {string} nomeConsultor
   * @param {number} score
   * @param {string} nivel  — Elite / Excelente / Bom / Atenção / Crítico
   * @param {object} [breakdown]
   */
  async function recordScoreUpdated(nomeConsultor, score, nivel, breakdown) {
    return record({
      modulo    : CommandEventModule.MANAGER,
      tipo      : CommandEventType.COMMAND_SCORE_UPDATED,
      origem    : CommandEventOrigin.COMMAND,
      consultor : nomeConsultor,
      descricao : `Score calculado: ${nomeConsultor} — ${score}/100 (${nivel})`,
      metadata  : { score, nivel, ...breakdown },
    });
  }

  /**
   * Atalho para atualização de DNA comercial de consultor.
   * @param {string} nomeConsultor
   * @param {object} summary — especialidades, conversao, etc.
   */
  async function recordDNAUpdated(nomeConsultor, summary) {
    return record({
      modulo    : CommandEventModule.DNA,
      tipo      : CommandEventType.COMMAND_DNA_UPDATED,
      origem    : CommandEventOrigin.COMMAND,
      consultor : nomeConsultor,
      descricao : `DNA atualizado: ${nomeConsultor}`,
      detalhes  : `Conversão: ${summary.taxaConversao}% · Especialidade: ${summary.especialidadePrincipal || '—'}`,
      metadata  : summary,
    });
  }

  /**
   * Atalho para atualização do ICC de um consultor.
   * @param {string} nomeConsultor
   * @param {number} iccAnterior
   * @param {number} iccAtual
   * @param {string} nivel
   * @param {string} justificativa
   * @param {object} [breakdown]
   */
  async function recordTrustUpdated(nomeConsultor, iccAnterior, iccAtual, nivel, justificativa, breakdown) {
    return record({
      modulo    : CommandEventModule.TRUST,
      tipo      : CommandEventType.COMMAND_TRUST_UPDATED,
      origem    : CommandEventOrigin.COMMAND,
      consultor : nomeConsultor,
      descricao : `ICC atualizado: ${nomeConsultor} — ${iccAtual}/100 (${nivel})`,
      detalhes  : justificativa,
      metadata  : { iccAnterior, iccAtual, nivel, ...breakdown },
    });
  }

  /**
   * Atalho para alerta de ICC crítico.
   * @param {string} nomeConsultor
   * @param {number} icc
   * @param {string} motivo
   */
  async function recordTrustAlert(nomeConsultor, icc, motivo) {
    return record({
      modulo    : CommandEventModule.TRUST,
      tipo      : CommandEventType.COMMAND_TRUST_ALERT,
      origem    : CommandEventOrigin.COMMAND,
      consultor : nomeConsultor,
      descricao : `⚠️ Alerta ICC: ${nomeConsultor} — ${icc}/100`,
      detalhes  : motivo,
      metadata  : { icc, motivo },
    });
  }

  /**
   * Atalho para análise de distribuição.
   * @param {number} totalLeads
   * @param {number} totalConsultores
   */
  async function recordDistributionAnalyzed(totalLeads, totalConsultores) {
    return record({
      modulo    : CommandEventModule.DISTRIBUTION,
      tipo      : CommandEventType.COMMAND_DISTRIBUTION_ANALYZED,
      origem    : CommandEventOrigin.COMMAND,
      descricao : `Distribuição analisada — ${totalLeads} leads · ${totalConsultores} consultores`,
      metadata  : { totalLeads, totalConsultores },
    });
  }

  /**
   * Atalho para recomendação de distribuição.
   * @param {string} nomeLead
   * @param {string} consultorRecomendado
   * @param {number} probabilidade
   * @param {string} motivo
   */
  async function recordDistributionRecommended(nomeLead, consultorRecomendado, probabilidade, motivo) {
    return record({
      modulo    : CommandEventModule.DISTRIBUTION,
      tipo      : CommandEventType.COMMAND_DISTRIBUTION_RECOMMENDED,
      origem    : CommandEventOrigin.COMMAND,
      lead      : nomeLead,
      consultor : consultorRecomendado,
      descricao : `Recomendação: ${nomeLead} → ${consultorRecomendado} (${probabilidade}%)`,
      detalhes  : motivo,
      metadata  : { probabilidade, motivo },
    });
  }

  async function recordMissionCreated(consultor, tipo, leadNome) {
    return record({ modulo:CommandEventModule.MISSIONS, tipo:CommandEventType.MISSION_CREATED,
      origem:CommandEventOrigin.COMMAND, consultor, lead:leadNome||null,
      descricao:`Missão criada: ${tipo}${leadNome?' — '+leadNome:''}` });
  }
  async function recordMissionCompleted(consultor, tipo, leadNome, pts) {
    return record({ modulo:CommandEventModule.MISSIONS, tipo:CommandEventType.MISSION_COMPLETED,
      origem:CommandEventOrigin.USER, consultor, lead:leadNome||null,
      descricao:`Missão concluída: ${tipo}${leadNome?' — '+leadNome:''}`,
      metadata:{ pontos:pts } });
  }
  async function recordMissionExpired(consultor, tipo, leadNome) {
    return record({ modulo:CommandEventModule.MISSIONS, tipo:CommandEventType.MISSION_EXPIRED,
      origem:CommandEventOrigin.SYSTEM, consultor, lead:leadNome||null,
      descricao:`Missão expirada: ${tipo}${leadNome?' — '+leadNome:''}` });
  }

  async function recordBriefingGenerated(alertas, insights, vendas24h) {
    return record({ modulo:CommandEventModule.EXECUTIVE, tipo:CommandEventType.COMMAND_BRIEFING_GENERATED,
      origem:CommandEventOrigin.COMMAND, descricao:`Briefing executivo gerado — ${alertas} alertas · ${vendas24h} vendas 24h`,
      metadata:{ alertas, insights, vendas24h } });
  }
  async function recordWarRoomUpdated(problemas, oportunidades) {
    return record({ modulo:CommandEventModule.EXECUTIVE, tipo:CommandEventType.COMMAND_WARROOM_UPDATED,
      origem:CommandEventOrigin.COMMAND, descricao:`War Room atualizada — ${problemas} problemas · ${oportunidades} oportunidades`,
      metadata:{ problemas, oportunidades } });
  }

  async function recordPredictionCreated(nomeLead, probabilidade, tipo) {
    return record({ modulo:CommandEventModule.INTELLIGENCE, tipo:CommandEventType.COMMAND_PREDICTION_CREATED,
      origem:CommandEventOrigin.COMMAND, lead:nomeLead,
      descricao:`Predição: ${nomeLead} — ${tipo} ${probabilidade}%`, metadata:{ probabilidade, tipo } });
  }
  async function recordCoachUpdated(nomeCorretor, planoGerado) {
    return record({ modulo:CommandEventModule.INTELLIGENCE, tipo:CommandEventType.COMMAND_COACH_UPDATED,
      origem:CommandEventOrigin.COMMAND, consultor:nomeCorretor,
      descricao:`Coach atualizado: ${nomeCorretor}`, metadata:{ planoGerado } });
  }
  async function recordPerformanceUpdated(nomeCorretor, score) {
    return record({ modulo:CommandEventModule.INTELLIGENCE, tipo:CommandEventType.COMMAND_PERFORMANCE_UPDATED,
      origem:CommandEventOrigin.COMMAND, consultor:nomeCorretor,
      descricao:`Performance calculada: ${nomeCorretor} — ${score}pts`, metadata:{ score } });
  }
  async function recordAutomationExecuted(regra, resultado) {
    return record({ modulo:CommandEventModule.INTELLIGENCE, tipo:CommandEventType.COMMAND_AUTOMATION_EXECUTED,
      origem:CommandEventOrigin.COMMAND,
      descricao:`Automação: ${regra}`, metadata:{ resultado } });
  }

  // ── API exposta ───────────────────────────────
  return {
    record, recordLogin, recordLogout, recordLeadCreated, recordLeadUpdated,
    recordSaleCompleted, recordCommandAlert, recordRecoveryAnalysis,
    recordScoreUpdated, recordDNAUpdated, recordTrustUpdated, recordTrustAlert,
    recordDistributionAnalyzed, recordDistributionRecommended,
    recordMissionCreated, recordMissionCompleted, recordMissionExpired,
    recordBriefingGenerated, recordWarRoomUpdated,
    recordPredictionCreated, recordCoachUpdated, recordPerformanceUpdated, recordAutomationExecuted,
    flushQueue,
  };

})();
