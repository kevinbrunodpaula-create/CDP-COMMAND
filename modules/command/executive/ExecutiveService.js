/**
 * CDP — MORNING BRIEFING & WAR ROOM
 * ExecutiveService.js
 * SPR-008 · KR7 Command Executive
 */

'use strict';

const ExecutiveService = (() => {

  let _briefing = null;
  let _geradoEm = null;

  async function _gerarBriefingExec(silent = false) {
    const leads      = ExecutiveRepository.getLeads();
    const corretores = ExecutiveRepository.getCorretores();
    const meta       = ExecutiveRepository.getMetaMensal();

    // Carrega ICC para enriquecer alertas
    let iccResults = [];
    try { iccResults = await TrustService.obterICC(); } catch { /* sem ICC */ }

    const briefing = gerarBriefing(leads, corretores, iccResults, meta);

    // Enriquece War Room com scoring
    try {
      if (!briefing.warRoom) briefing.warRoom = { problemas:[], oportunidades:[], prioridades:[], maiorRisco:null, maiorOportunidade:null, tempoMedio:0 };
      briefing.warRoom.problemas = WarRoomEngine.pontuarProblemas(briefing.warRoom.problemas || []);
      briefing.warRoom.oportunidades = WarRoomEngine.pontuarOportunidades(briefing.warRoom.oportunidades || []);
      briefing.warRoom.status = WarRoomEngine.statusWarRoom(briefing.meta ? briefing.meta.alertasCriticos : 0, briefing.meta ? briefing.meta.totalAlertas : 0);
      briefing.warRoom.temperatura = WarRoomEngine.calcularTemperatura(briefing);
    } catch(wrErr) { console.warn('warRoom enrichment error:', wrErr.message); }

    ExecutiveRepository.saveCache(briefing);
    _briefing = briefing;
    _geradoEm = briefing.geradoEm;

    if (!silent) {
      CommandEventService.recordBriefingGenerated(
        briefing.meta.totalAlertas, briefing.insights.length, briefing.resumo24h.vendasHoje
      ).catch(()=>{});
      CommandEventService.recordWarRoomUpdated(
        briefing.warRoom.problemas.length, briefing.warRoom.oportunidades.length
      ).catch(()=>{});
    }

    return briefing;
  }

  async function obterBriefing() {
    if (_briefing) return _briefing;
    const cached = ExecutiveRepository.loadCache();
    if (cached) { _briefing=cached; _geradoEm=cached.geradoEm; return cached; }
    return _gerarBriefingExec(true);
  }

  async function atualizar() {
    _briefing = null;
    ExecutiveRepository.clearCache();
    return _gerarBriefingExec(false);
  }

  function getGeradoEm() { return _geradoEm; }

  function setMeta(valor) {
    ExecutiveRepository.setMetaMensal(valor);
    // Invalida cache para próxima leitura refletir nova meta
    _briefing = null;
    ExecutiveRepository.clearCache();
  }

  return { gerarBriefing: _gerarBriefingExec, obterBriefing, atualizar, getGeradoEm, setMeta };

})();
