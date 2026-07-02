/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — COMMAND DNA ENGINE                                    ║
 * ║  DNARepository.js                                            ║
 * ║  SPR-004 · KR7 Command DNA                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Cache de sessão e acesso ao histórico de eventos DNA.
 */

'use strict';

const DNARepository = (() => {

  const CACHE_KEY    = 'cdp_dna_cache';
  const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

  /* ── Cache de sessão ── */

  function saveCache(dnaResults) {
    try {
      // Armazena versão leve (sem evolucao/forcas completos) para não lotar storage
      const leve = dnaResults.map(d => ({
        nome         : d.corretor.nome,
        cargo        : d.corretor.cargo,
        metricas     : d.metricas,
        espPrincipal : d.espPrincipal,
        fmt          : d.fmt,
        perfil       : d.perfil,
        distribuicaoHints: d.distribuicaoHints,
      }));
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: leve, savedAt: Date.now() }));
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

  /* ── Dados globais ── */

  function getCorretores() {
    return typeof allCorretores !== 'undefined' ? allCorretores : [];
  }

  function getLeads() {
    return typeof allLeads !== 'undefined' ? allLeads : [];
  }

  /* ── Histórico via Events Engine ── */

  async function findDNAHistory(nomeConsultor, limit = 8) {
    try {
      return await CommandEventRepository.findAll({
        modulo    : CommandEventModule.DNA,
        tipo      : CommandEventType.COMMAND_DNA_UPDATED,
        consultor : nomeConsultor,
        limit,
      });
    } catch (err) {
      console.error('[DNARepository] findDNAHistory error:', err);
      return [];
    }
  }

  async function findRecentDNAEvents(limit = 30) {
    try {
      return await CommandEventRepository.findAll({
        modulo : CommandEventModule.DNA,
        tipo   : CommandEventType.COMMAND_DNA_UPDATED,
        limit,
      });
    } catch (err) {
      console.error('[DNARepository] findRecentDNAEvents error:', err);
      return [];
    }
  }

  return { saveCache, loadCache, clearCache, getCorretores, getLeads, findDNAHistory, findRecentDNAEvents };

})();
