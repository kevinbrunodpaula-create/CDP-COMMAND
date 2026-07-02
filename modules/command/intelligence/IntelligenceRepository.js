/**
 * CDP — COMMAND INTELLIGENCE
 * IntelligenceRepository.js
 * Release 2.9 · KR7 Command Intelligence
 */

'use strict';

const IntelligenceRepository = (() => {

  const KEYS = {
    pred   : 'cdp_intel_pred',
    coach  : 'cdp_intel_coach',
    perf   : 'cdp_intel_perf',
    auto   : 'cdp_intel_auto',
  };
  const TTL = 10 * 60 * 1000; // 10 min

  function _save(key, data) {
    try { sessionStorage.setItem(key, JSON.stringify({ data, savedAt:Date.now() })); }
    catch {}
  }
  function _load(key) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const { data, savedAt } = JSON.parse(raw);
      return Date.now()-savedAt < TTL ? data : null;
    } catch { return null; }
  }
  function _clear(key) { try { sessionStorage.removeItem(key); } catch {} }

  const savePredictions = d => _save(KEYS.pred, d);
  const loadPredictions = () => _load(KEYS.pred);
  const clearPredictions= () => _clear(KEYS.pred);

  const saveCoach  = d => _save(KEYS.coach, d);
  const loadCoach  = () => _load(KEYS.coach);
  const clearCoach = () => _clear(KEYS.coach);

  const savePerf   = d => _save(KEYS.perf, d);
  const loadPerf   = () => _load(KEYS.perf);
  const clearPerf  = () => _clear(KEYS.perf);

  const saveAuto   = d => _save(KEYS.auto, d);
  const loadAuto   = () => _load(KEYS.auto);
  const clearAuto  = () => _clear(KEYS.auto);

  function clearAll() { Object.values(KEYS).forEach(k => _clear(k)); }

  function getLeads()      { return typeof allLeads!=='undefined'?allLeads:[]; }
  function getCorretores() { return typeof allCorretores!=='undefined'?allCorretores:[]; }

  return {
    savePredictions, loadPredictions, clearPredictions,
    saveCoach, loadCoach, clearCoach,
    savePerf, loadPerf, clearPerf,
    saveAuto, loadAuto, clearAuto,
    clearAll, getLeads, getCorretores,
  };

})();
