/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — SMART MISSIONS ENGINE                                 ║
 * ║  MissionRepository.js                                        ║
 * ║  SPR-007 · KR7 Command Operation                             ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Persiste missões e XP no localStorage.
 * Missões sobrevivem ao reload até serem concluídas ou expirarem.
 */

'use strict';

const MissionRepository = (() => {

  const MISSIONS_KEY  = 'cdp_missions';
  const XP_KEY        = 'cdp_missions_xp';
  const HISTORY_KEY   = 'cdp_missions_history';
  const DAILY_KEY     = 'cdp_missions_daily';
  const MAX_HISTORY   = 100;

  /* ─────────────────────────────────────────────
     MISSÕES ATIVAS
  ───────────────────────────────────────────── */

  function saveMissions(missionsMap) {
    try { localStorage.setItem(MISSIONS_KEY, JSON.stringify({ data:missionsMap, savedAt:new Date().toISOString() })); }
    catch { /* cheio */ }
  }

  function loadMissions() {
    try {
      const raw = localStorage.getItem(MISSIONS_KEY);
      if (!raw) return null;
      const { data, savedAt } = JSON.parse(raw);
      // Regenrar se passou do dia
      const hoje = new Date().toISOString().slice(0,10);
      if (savedAt.slice(0,10) !== hoje) return null;
      return data;
    } catch { return null; }
  }

  function clearMissions() {
    try { localStorage.removeItem(MISSIONS_KEY); } catch { /* */ }
  }

  /* ─────────────────────────────────────────────
     XP / GAMIFICAÇÃO
  ───────────────────────────────────────────── */

  function loadXP() {
    try { return JSON.parse(localStorage.getItem(XP_KEY) || '{}'); }
    catch { return {}; }
  }

  function saveXP(xpMap) {
    try { localStorage.setItem(XP_KEY, JSON.stringify(xpMap)); }
    catch { /* */ }
  }

  function addXP(nomeCorretor, xp) {
    const map = loadXP();
    map[nomeCorretor] = (map[nomeCorretor] || 0) + xp;
    saveXP(map);
    return map[nomeCorretor];
  }

  function getXP(nomeCorretor) {
    return loadXP()[nomeCorretor] || 0;
  }

  function getTotalXP() { return loadXP(); }

  /* ─────────────────────────────────────────────
     HISTÓRICO DE MISSÕES CONCLUÍDAS
  ───────────────────────────────────────────── */

  function addToHistory(mission) {
    try {
      const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      hist.unshift({
        id          : mission.id,
        tipo        : mission.tipo,
        corretor    : mission.corretor,
        leadNome    : mission.lead?.nome || null,
        status      : mission.status,
        pontos      : mission.pontos,
        xp          : mission.xp,
        concluidaEm : mission.concluidaEm || new Date().toISOString(),
        prioridade  : mission.prioridade,
      });
      localStorage.setItem(HISTORY_KEY, JSON.stringify(hist.slice(0, MAX_HISTORY)));
    } catch { /* cheio */ }
  }

  function getHistory(nomeCorretor, limit = 20) {
    try {
      const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      const filtrado = nomeCorretor
        ? hist.filter(h => (h.corretor||'').toLowerCase() === (nomeCorretor||'').toLowerCase())
        : hist;
      return filtrado.slice(0, limit);
    } catch { return []; }
  }

  /* ─────────────────────────────────────────────
     RESUMO DIÁRIO
  ───────────────────────────────────────────── */

  function getDailySummary(nomeCorretor) {
    try {
      const hoje = new Date().toISOString().slice(0,10);
      const hist  = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      const hoje_ = hist.filter(h =>
        h.concluidaEm?.slice(0,10) === hoje &&
        (nomeCorretor ? h.corretor?.toLowerCase() === nomeCorretor.toLowerCase() : true)
      );
      const concluidas = hoje_.filter(h => h.status === MissionStatus.CONCLUIDA).length;
      const xpHoje = hoje_.reduce((a,h) => a+( h.xp||0),0);
      const ptsHoje= hoje_.reduce((a,h) => a+(h.pontos||0),0);
      return { concluidas, xpHoje, ptsHoje, itens: hoje_ };
    } catch { return { concluidas:0, xpHoje:0, ptsHoje:0, itens:[] }; }
  }

  /* ─────────────────────────────────────────────
     DADOS GLOBAIS
  ───────────────────────────────────────────── */

  function getCorretores() { return typeof allCorretores!=='undefined'?allCorretores:[]; }
  function getLeads()      { return typeof allLeads!=='undefined'?allLeads:[]; }

  return {
    saveMissions, loadMissions, clearMissions,
    addXP, getXP, getTotalXP,
    addToHistory, getHistory,
    getDailySummary,
    getCorretores, getLeads,
  };

})();
