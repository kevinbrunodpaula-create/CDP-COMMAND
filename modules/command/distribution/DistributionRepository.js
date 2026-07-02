/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — SMART LEAD DISTRIBUTION ENGINE                        ║
 * ║  DistributionRepository.js                                   ║
 * ║  SPR-006 · KR7 Command Intelligence                          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

'use strict';

const DistributionRepository = (() => {

  const CACHE_KEY    = 'cdp_dist_cache';
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos (análise muda com novos leads)

  function saveCache(analises) {
    try {
      // Armazena versão leve
      const leve = analises.map(a => ({
        leadId       : a.lead.id,
        leadNome     : a.lead.nome,
        leadStatus   : a.lead.status,
        corretor     : a.lead.corretor || null,
        recomendado  : a.recomendado?.corretor?.nome || null,
        probabilidade: a.recomendado?.probabilidade || 0,
        nivelConfianca: a.recomendado?.nivelConfianca || '—',
        justificativa: a.justificativa,
        top5         : (a.top5 || []).map(t => ({ nome: t.corretor.nome, probabilidade: t.probabilidade })),
      }));
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: leve, savedAt: Date.now() }));
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

  function getLeads() {
    return typeof allLeads !== 'undefined' ? allLeads : [];
  }

  function getCorretores() {
    return typeof allCorretores !== 'undefined' ? allCorretores : [];
  }

  async function findDistributionEvents(limit = 20) {
    try {
      return await CommandEventRepository.findAll({
        modulo : CommandEventModule.DISTRIBUTION,
        limit,
      });
    } catch { return []; }
  }

  return { saveCache, loadCache, clearCache, getLeads, getCorretores, findDistributionEvents };

})();
