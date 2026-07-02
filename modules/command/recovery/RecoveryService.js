/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — COMMAND RECOVERY ENGINE                               ║
 * ║  RecoveryService.js                                          ║
 * ║  SPR-002 · KR7 Command Recovery                              ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Orquestrador do módulo COMMAND RECOVERY.
 * Coordena RecoveryRules, RecoveryRepository e CommandEventService.
 *
 * RESPONSABILIDADES:
 *   - Executar a análise da carteira
 *   - Persistir resultado em cache
 *   - Registrar evento COMMAND_RECOVERY_ANALYSIS na Events Engine
 *   - Retornar resultado para a tela
 *
 * RESTRIÇÕES desta Sprint (SPR-002):
 *   ✗ NÃO redistribui leads
 *   ✗ NÃO altera responsável
 *   ✗ NÃO executa ações automáticas
 *   ✓ Apenas analisa e sugere
 */

'use strict';

const RecoveryService = (() => {

  let _ultimaAnalise = null; // cache em memória da sessão

  /* ─────────────────────────────────────────────
     EXECUTAR ANÁLISE
  ───────────────────────────────────────────── */

  /**
   * Executa uma análise completa da carteira.
   * Sempre reprocessa — ignora cache.
   * Registra evento na Events Engine.
   *
   * @returns {Promise<{ resultados: Array, resumo: object }>}
   */
  async function executarAnalise() {
    const leads = RecoveryRepository.getLeadsAtivos();

    if (leads.length === 0) {
      return {
        resultados : [],
        resumo     : {
          total: 0, saudavel: 0, atencao: 0,
          risco: 0, critico: 0, abandonado: 0,
          analisadoEm: new Date().toISOString(),
        },
      };
    }

    const analise = analisarCarteira(leads);

    // Persiste no cache de sessão
    RecoveryRepository.saveCache(analise);
    _ultimaAnalise = analise;

    // Registra na Events Engine (SPR-001)
    CommandEventService.recordRecoveryAnalysis(analise.resumo).catch(() => {});

    return analise;
  }

  /**
   * Retorna a última análise em cache, ou executa uma nova.
   * @returns {Promise<{ resultados: Array, resumo: object }>}
   */
  async function obterAnalise() {
    // 1. Memória da sessão atual
    if (_ultimaAnalise) return _ultimaAnalise;

    // 2. sessionStorage (resistente a navegação interna)
    const cached = RecoveryRepository.loadCache();
    if (cached) {
      _ultimaAnalise = cached;
      return cached;
    }

    // 3. Nenhum cache disponível — executa nova análise
    return executarAnalise();
  }

  /**
   * Invalida o cache e força nova análise.
   * @returns {Promise<{ resultados: Array, resumo: object }>}
   */
  async function reprocessar() {
    _ultimaAnalise = null;
    RecoveryRepository.clearCache();
    return executarAnalise();
  }

  /* ─────────────────────────────────────────────
     FILTROS
  ───────────────────────────────────────────── */

  /**
   * Aplica filtros sobre um array de resultados já analisados.
   *
   * @param {Array} resultados
   * @param {object} filtros
   * @param {string} [filtros.consultor]
   * @param {string} [filtros.origem]
   * @param {string} [filtros.status]
   * @param {string} [filtros.classificacao]
   * @param {number} [filtros.diasMin]
   * @param {string} [filtros.busca]
   * @returns {Array}
   */
  function aplicarFiltros(resultados, filtros = {}) {
    return resultados.filter(r => {
      if (filtros.consultor    && r.corretor !== filtros.consultor)           return false;
      if (filtros.origem       && r.origem   !== filtros.origem)              return false;
      if (filtros.status       && r.status   !== filtros.status)              return false;
      if (filtros.classificacao && r.classificacao !== filtros.classificacao) return false;
      if (filtros.diasMin != null && r.diasParadoNum < filtros.diasMin)       return false;
      if (filtros.busca) {
        const q = filtros.busca.toLowerCase();
        if (!r.nome.toLowerCase().includes(q) &&
            !r.corretor.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  /* ─────────────────────────────────────────────
     ESTATÍSTICAS AUXILIARES
  ───────────────────────────────────────────── */

  /**
   * Retorna o agrupamento de resultados por classificação.
   * @param {Array} resultados
   * @returns {object}
   */
  function agruparPorClassificacao(resultados) {
    const grupos = {
      SAUDAVEL: [], ATENCAO: [], EM_RISCO: [], CRITICO: [], ABANDONADO: [],
    };
    resultados.forEach(r => {
      if (grupos[r.classificacao]) grupos[r.classificacao].push(r);
    });
    return grupos;
  }

  // ── API pública ───────────────────────────────
  return {
    executarAnalise,
    obterAnalise,
    reprocessar,
    aplicarFiltros,
    agruparPorClassificacao,
  };

})();
