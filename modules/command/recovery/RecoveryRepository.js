/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — COMMAND RECOVERY ENGINE                               ║
 * ║  RecoveryRepository.js                                       ║
 * ║  SPR-002 · KR7 Command Recovery                              ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Gerencia a persistência de snapshots de análise de recovery.
 *
 * ESTRATÉGIA:
 *   Os resultados são armazenados em memória (sessionStorage) para
 *   acesso rápido entre filtros. A persistência permanente dos
 *   eventos fica na tabela command_events (SPR-001).
 *
 *   Caso futuramente seja necessário persistir snapshots completos
 *   no Supabase, basta implementar _saveSnapshot() e _loadSnapshot().
 *
 * IMPORTANTE:
 *   Este módulo NÃO lê leads diretamente.
 *   Os leads vêm de `allLeads` (global do CDP), que já é
 *   carregado e filtrado por cargo em loadAll().
 */

'use strict';

const RecoveryRepository = (() => {

  const CACHE_KEY     = 'cdp_recovery_cache';
  const CACHE_TTL_MS  = 5 * 60 * 1000; // 5 minutos

  /* ─────────────────────────────────────────────
     CACHE EM SESSÃO
  ───────────────────────────────────────────── */

  /**
   * Salva resultado de análise no sessionStorage.
   * @param {{ resultados: Array, resumo: object }} analise
   */
  function saveCache(analise) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        data  : analise,
        savedAt: Date.now(),
      }));
    } catch {
      // sessionStorage cheio — ignora silenciosamente
    }
  }

  /**
   * Lê o cache de análise se ainda válido.
   * @returns {{ resultados: Array, resumo: object }|null}
   */
  function loadCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { data, savedAt } = JSON.parse(raw);
      if (Date.now() - savedAt > CACHE_TTL_MS) return null; // expirado
      return data;
    } catch {
      return null;
    }
  }

  /** Invalida o cache (forçar nova análise). */
  function clearCache() {
    try { sessionStorage.removeItem(CACHE_KEY); } catch { /* noop */ }
  }

  /* ─────────────────────────────────────────────
     LEITURA DE LEADS ATIVOS
  ───────────────────────────────────────────── */

  /**
   * Retorna os leads ativos do estado global do CDP.
   * Usa allLeads (já filtrado por cargo em loadAll).
   * @returns {Array}
   */
  function getLeadsAtivos() {
    if (typeof allLeads === 'undefined' || !Array.isArray(allLeads)) {
      console.warn('[RecoveryRepository] allLeads não disponível ainda.');
      return [];
    }
    return allLeads.filter(l => l.status !== 'Fechado' && l.status !== 'Perdido');
  }

  /* ─────────────────────────────────────────────
     HISTÓRICO DE ANÁLISES (via command_events)
  ───────────────────────────────────────────── */

  /**
   * Busca as últimas análises de recovery registradas na Events Engine.
   * @param {number} [limit=10]
   * @returns {Promise<Array>}
   */
  async function findLastAnalyses(limit = 10) {
    try {
      return await CommandEventRepository.findAll({
        modulo : CommandEventModule.RECOVERY,
        tipo   : CommandEventType.COMMAND_RECOVERY_ANALYSIS,
        limit,
      });
    } catch (err) {
      console.error('[RecoveryRepository] findLastAnalyses error:', err);
      return [];
    }
  }

  // ── API pública ───────────────────────────────
  return {
    saveCache,
    loadCache,
    clearCache,
    getLeadsAtivos,
    findLastAnalyses,
  };

})();
