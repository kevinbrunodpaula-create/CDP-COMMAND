/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — COMMAND TRUST ENGINE                                  ║
 * ║  TrustRepository.js                                          ║
 * ║  SPR-005 · KR7 Command Trust                                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

'use strict';

const TrustRepository = (() => {

  const CACHE_KEY    = 'cdp_icc_cache';
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

  /* ── Cache de sessão ── */
  function saveCache(results) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        data    : results.map(r => ({
          nome       : r.corretor.nome,
          cargo      : r.corretor.cargo,
          icc        : r.icc,
          iccAnterior: r.iccAnterior,
          nivel      : r.nivel,
          tendencia  : r.tendencia,
          justificativa: r.justificativa,
          stats      : r.stats,
          distribuicaoWeight: r.distribuicaoWeight,
        })),
        savedAt : Date.now(),
      }));
    } catch { /* cheio */ }
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
    try { sessionStorage.removeItem(CACHE_KEY); } catch { /* */ }
  }

  /* ── Dados globais ── */
  function getCorretores() {
    return typeof allCorretores !== 'undefined' ? allCorretores : [];
  }
  function getLeads() {
    return typeof allLeads !== 'undefined' ? allLeads : [];
  }

  /* ── Histórico de eventos via Events Engine ── */
  async function findTrustEvents(nomeConsultor, limit = 10) {
    try {
      return await CommandEventRepository.findAll({
        modulo    : CommandEventModule.TRUST,
        consultor : nomeConsultor,
        limit,
      });
    } catch { return []; }
  }

  async function findAlerts(limit = 20) {
    try {
      return await CommandEventRepository.findAll({
        modulo : CommandEventModule.TRUST,
        tipo   : CommandEventType.COMMAND_TRUST_ALERT,
        limit,
      });
    } catch { return []; }
  }

  return { saveCache, loadCache, clearCache, getCorretores, getLeads, findTrustEvents, findAlerts };

})();
