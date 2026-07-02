/**
 * CDP — MORNING BRIEFING & WAR ROOM
 * ExecutiveRepository.js
 * SPR-008 · KR7 Command Executive
 */

'use strict';

const ExecutiveRepository = (() => {

  const CACHE_KEY    = 'cdp_briefing_cache';
  const META_KEY     = 'cdp_meta_mensal';
  const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min — briefing não é tempo real

  function saveCache(briefing) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data:briefing, savedAt:Date.now() })); }
    catch { /* cheio */ }
  }

  function loadCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { data, savedAt } = JSON.parse(raw);
      if (Date.now()-savedAt > CACHE_TTL_MS) return null;
      return data;
    } catch { return null; }
  }

  function clearCache() {
    try { sessionStorage.removeItem(CACHE_KEY); } catch { /* */ }
  }

  // Meta mensal em localStorage (persiste)
  function getMetaMensal() {
    try { return parseFloat(localStorage.getItem(META_KEY)||'0')||0; }
    catch { return 0; }
  }
  function setMetaMensal(valor) {
    try { localStorage.setItem(META_KEY, String(valor)); }
    catch { /* */ }
  }

  function getLeads()      { return typeof allLeads      !== 'undefined' ? allLeads      : []; }
  function getCorretores() { return typeof allCorretores !== 'undefined' ? allCorretores : []; }

  async function findBriefingEvents(limit = 5) {
    try { return await CommandEventRepository.findAll({ modulo:CommandEventModule.EXECUTIVE, limit }); }
    catch { return []; }
  }

  return { saveCache, loadCache, clearCache, getMetaMensal, setMetaMensal, getLeads, getCorretores, findBriefingEvents };

})();
