/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — SMART MISSIONS ENGINE                                 ║
 * ║  MissionService.js                                           ║
 * ║  SPR-007 · KR7 Command Operation                             ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

'use strict';

const MissionService = (() => {

  let _missionsMap = {}; // { [nomeCorretor]: Mission[] }
  let _geradoEm    = null;

  /* ─────────────────────────────────────────────
     GERAR MISSÕES
  ───────────────────────────────────────────── */

  async function gerarParaEquipe(silent = false) {
    const corretores = MissionRepository.getCorretores();
    const leads      = MissionRepository.getLeads();

    // Tenta carregar ICC para enriquecer prioridades
    let iccMap = {};
    try {
      const iccResults = await TrustService.obterICC();
      iccResults.forEach(r => { iccMap[r.corretor.nome] = r; });
    } catch { /* ICC não disponível — segue sem */ }

    _missionsMap = gerarMissoesEquipe(corretores, leads, iccMap);
    _missionsMap = MissionEngine.processarExpiracao(_missionsMap);
    _geradoEm    = new Date().toISOString();

    MissionRepository.saveMissions(_missionsMap);

    if (!silent) {
      // Registra evento por consultor com missões críticas
      Object.entries(_missionsMap).forEach(([nome, missoes]) => {
        const criticas = missoes.filter(m => m.prioridade === MissionPriority.CRITICA);
        criticas.slice(0,3).forEach(m => {
          CommandEventService.recordMissionCreated(nome, m.tipo, m.lead?.nome).catch(()=>{});
        });
      });
    }

    return _missionsMap;
  }

  async function obterMissoes() {
    if (Object.keys(_missionsMap).length > 0) return _missionsMap;
    const cached = MissionRepository.loadMissions();
    if (cached) { _missionsMap = cached; return _missionsMap; }
    return gerarParaEquipe(true);
  }

  async function reprocessar() {
    _missionsMap = {};
    MissionRepository.clearMissions();
    return gerarParaEquipe(false);
  }

  /* ─────────────────────────────────────────────
     MISSÕES DE UM CONSULTOR
  ───────────────────────────────────────────── */

  async function missoesDeCorretor(nome, filtroStatus) {
    const mapa = await obterMissoes();
    const todas = mapa[nome] || [];
    if (!filtroStatus) return todas;
    return todas.filter(m => m.status === filtroStatus);
  }

  /* ─────────────────────────────────────────────
     CONCLUIR / CANCELAR
  ───────────────────────────────────────────── */

  async function concluir(nomeCorretor, missionId) {
    await obterMissoes();
    const resultado = MissionEngine.concluirMissao(_missionsMap, nomeCorretor, missionId);
    _missionsMap = resultado.missionsMap;
    MissionRepository.saveMissions(_missionsMap);
    return resultado;
  }

  async function cancelar(nomeCorretor, missionId) {
    await obterMissoes();
    _missionsMap = MissionEngine.cancelarMissao(_missionsMap, nomeCorretor, missionId);
    MissionRepository.saveMissions(_missionsMap);
  }

  /* ─────────────────────────────────────────────
     STATS / DASHBOARD
  ───────────────────────────────────────────── */

  async function getStatsEquipe() {
    const mapa  = await obterMissoes();
    const xpMap = MissionRepository.getTotalXP();
    return MissionEngine.statsEquipe(mapa, xpMap);
  }

  async function getDashboardData() {
    const stats = await getStatsEquipe();
    const hoje  = MissionRepository.getDailySummary(null);
    return { stats, hoje };
  }

  function getGeradoEm() { return _geradoEm; }

  /* ─────────────────────────────────────────────
     FILTROS
  ───────────────────────────────────────────── */

  function filtrarMissoes(missoes, filtros = {}) {
    return missoes.filter(m => {
      if (filtros.status    && m.status !== filtros.status)       return false;
      if (filtros.prioridade && m.prioridade !== filtros.prioridade) return false;
      if (filtros.tipo      && m.tipo !== filtros.tipo)           return false;
      if (filtros.busca) {
        const q = filtros.busca.toLowerCase();
        if (!m.descricao.toLowerCase().includes(q) && !(m.lead?.nome||'').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  return {
    gerarParaEquipe, obterMissoes, reprocessar,
    missoesDeCorretor, concluir, cancelar,
    getStatsEquipe, getDashboardData, filtrarMissoes,
    getGeradoEm,
  };

})();
