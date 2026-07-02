/**
 * CDP — COMMAND INTELLIGENCE
 * IntelligenceService.js
 * Release 2.9 · KR7 Command Intelligence
 */

'use strict';

const IntelligenceService = (() => {

  let _cache = { pred:null, coach:null, perf:null, auto:null };

  /* ── ICC/DNA helpers ── */
  async function _getIccMap() {
    try {
      const r = await TrustService.obterICC();
      const m = {}; r.forEach(x=>{ m[x.corretor.nome]=x; }); return m;
    } catch { return {}; }
  }
  async function _getDnaMap() {
    try {
      const r = await DNAService.obterDNA();
      const m = {}; r.forEach(x=>{ m[x.corretor.nome]=x; }); return m;
    } catch { return {}; }
  }

  /* ─── PREDICTOR ─── */
  async function gerarPredicoes(silent=false) {
    const leads  = IntelligenceRepository.getLeads();
    const iccMap = await _getIccMap();
    const dnaMap = await _getDnaMap();
    const data   = calcularPredicoesCarteira(leads, iccMap, dnaMap);
    _cache.pred  = data;
    IntelligenceRepository.savePredictions(data);
    if (!silent && data.length>0) {
      const top = data[0];
      const venda = top.predicoes.find(p=>p.tipo==='Venda');
      CommandEventService.recordPredictionCreated(top.lead.nome, venda?.pct||0, 'Venda').catch(()=>{});
    }
    return data;
  }
  async function obterPredicoes() {
    if (_cache.pred) return _cache.pred;
    const cached = IntelligenceRepository.loadPredictions();
    if (cached) { _cache.pred=cached; return cached; }
    return gerarPredicoes(true);
  }

  /* ─── COACH ─── */
  async function gerarCoachEquipeS(silent=false) {
    const leads  = IntelligenceRepository.getLeads();
    const corretores = IntelligenceRepository.getCorretores();
    const iccMap = await _getIccMap();
    const data   = gerarCoachEquipe(corretores, leads, iccMap);
    _cache.coach = data;
    IntelligenceRepository.saveCoach(data);
    if (!silent && data.length>0)
      CommandEventService.recordCoachUpdated(data[0].corretor.nome, true).catch(()=>{});
    return data;
  }
  async function obterCoach() {
    if (_cache.coach) return _cache.coach;
    const cached = IntelligenceRepository.loadCoach();
    if (cached) { _cache.coach=cached; return cached; }
    return gerarCoachEquipeS(true);
  }

  /* ─── PERFORMANCE ─── */
  async function gerarPerformanceS(silent=false) {
    const leads  = IntelligenceRepository.getLeads();
    const corretores = IntelligenceRepository.getCorretores();
    const iccMap = await _getIccMap();
    const data   = calcularRanking(corretores, leads, iccMap);
    _cache.perf  = data;
    IntelligenceRepository.savePerf(data);
    if (!silent && data.length>0)
      CommandEventService.recordPerformanceUpdated(data[0].corretor.nome, data[0].score).catch(()=>{});
    return data;
  }
  async function obterPerformance() {
    if (_cache.perf) return _cache.perf;
    const cached = IntelligenceRepository.loadPerf();
    if (cached) { _cache.perf=cached; return cached; }
    return gerarPerformanceS(true);
  }

  /* ─── AUTOMATION ─── */
  async function avaliarAutomacoes(silent=false) {
    const leads  = IntelligenceRepository.getLeads();
    const corretores = IntelligenceRepository.getCorretores();
    let iccResults = [];
    try { iccResults = await TrustService.obterICC(); } catch {}
    const data   = avaliarRegras(leads, corretores, iccResults);
    _cache.auto  = data;
    IntelligenceRepository.saveAuto(data);
    if (!silent)
      CommandEventService.recordAutomationExecuted('Avaliação completa', `${data.resumo.total} regras`).catch(()=>{});
    return data;
  }
  async function obterAutomacoes() {
    if (_cache.auto) return _cache.auto;
    const cached = IntelligenceRepository.loadAuto();
    if (cached) { _cache.auto=cached; return cached; }
    return avaliarAutomacoes(true);
  }

  /* ─── REPROCESSAR TUDO ─── */
  async function reprocessarTudo() {
    _cache = { pred:null, coach:null, perf:null, auto:null };
    IntelligenceRepository.clearAll();
    const [pred, coach, perf, auto] = await Promise.all([
      gerarPredicoes(false),
      gerarCoachEquipeS(false),
      gerarPerformanceS(false),
      avaliarAutomacoes(false),
    ]);
    return { pred, coach, perf, auto };
  }

  /* ─── FILTROS ─── */
  function filtrarPredicoes(pred, filtros={}) {
    return pred.filter(p => {
      if (filtros.busca) { const q=filtros.busca.toLowerCase(); if(!p.lead.nome.toLowerCase().includes(q)) return false; }
      if (filtros.corretor) { if((p.lead.corretor||'').toLowerCase()!==filtros.corretor.toLowerCase()) return false; }
      if (filtros.probMin!=null) {
        const venda = p.predicoes.find(x=>x.tipo==='Venda');
        if (!venda || venda.pct < filtros.probMin) return false;
      }
      return true;
    });
  }

  return {
    gerarPredicoes, obterPredicoes,
    gerarCoachEquipeS, obterCoach,
    gerarPerformanceS, obterPerformance,
    avaliarAutomacoes, obterAutomacoes,
    reprocessarTudo, filtrarPredicoes,
  };

})();
