/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — COMMAND SCORE ENGINE                                  ║
 * ║  ManagerRepository.js                                        ║
 * ║  SPR-003 · KR7 Command Manager                               ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Gerencia cache de scores calculados e acesso ao histórico
 * de eventos de score via Events Engine (SPR-001).
 */

'use strict';

const ManagerRepository = (() => {

  const CACHE_KEY    = 'cdp_manager_scores';
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

  /* ─────────────────────────────────────────────
     CACHE EM SESSÃO
  ───────────────────────────────────────────── */

  function saveCache(scores) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        data    : scores,
        savedAt : Date.now(),
      }));
    } catch { /* cheio — silencioso */ }
  }

  function loadCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { data, savedAt } = JSON.parse(raw);
      if (Date.now() - savedAt > CACHE_TTL_MS) return null;
      return data;
    } catch { return null; }
  }

  function clearCache() {
    try { sessionStorage.removeItem(CACHE_KEY); } catch { /* noop */ }
  }

  /* ─────────────────────────────────────────────
     DADOS GLOBAIS (allLeads / allCorretores)
  ───────────────────────────────────────────── */

  function getCorretores() {
    if (typeof allCorretores === 'undefined') return [];
    // Inclui todos — CEO/Diretor podem ter score calculado mas ficam
    // fora do ranking principal (filtrado no ScoreCalculator)
    return allCorretores;
  }

  function getLeads() {
    if (typeof allLeads === 'undefined') return [];
    // Para CEO/Diretor que vêem todos os leads — já vem filtrado por cargo
    return allLeads;
  }

  /* ─────────────────────────────────────────────
     HISTÓRICO DE SCORES (via Events Engine)
  ───────────────────────────────────────────── */

  /**
   * Busca os últimos N eventos de score de um consultor.
   * @param {string} nomeConsultor
   * @param {number} [limit=10]
   * @returns {Promise<Array>}
   */
  async function findScoreHistory(nomeConsultor, limit = 10) {
    try {
      return await CommandEventRepository.findAll({
        tipo      : CommandEventType.COMMAND_SCORE_UPDATED,
        consultor : nomeConsultor,
        limit,
      });
    } catch (err) {
      console.error('[ManagerRepository] findScoreHistory error:', err);
      return [];
    }
  }

  /**
   * Busca os N cálculos mais recentes de score da equipe.
   * @param {number} [limit=20]
   * @returns {Promise<Array>}
   */
  async function findRecentScoreEvents(limit = 20) {
    try {
      return await CommandEventRepository.findAll({
        modulo : CommandEventModule.MANAGER,
        tipo   : CommandEventType.COMMAND_SCORE_UPDATED,
        limit,
      });
    } catch (err) {
      console.error('[ManagerRepository] findRecentScoreEvents error:', err);
      return [];
    }
  }

  // ── API pública ───────────────────────────────
  return {
    saveCache,
    loadCache,
    clearCache,
    getCorretores,
    getLeads,
    findScoreHistory,
    findRecentScoreEvents,
  };

})();
