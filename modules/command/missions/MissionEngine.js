/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — SMART MISSIONS ENGINE                                 ║
 * ║  MissionEngine.js                                            ║
 * ║  SPR-007 · KR7 Command Operation                             ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Motor central: gera, atualiza e expira missões.
 */

'use strict';

const MissionEngine = (() => {

  /**
   * Verifica e expira missões com prazo ultrapassado.
   * @param {object} missionsMap  — { [nome]: Mission[] }
   * @returns {object}            — missionsMap com expiradas marcadas
   */
  function processarExpiracao(missionsMap) {
    const agora = new Date();
    const modificado = { ...missionsMap };
    Object.keys(modificado).forEach(nome => {
      modificado[nome] = (modificado[nome] || []).map(m => {
        if (m.status === MissionStatus.PENDENTE && new Date(m.prazo) < agora) {
          MissionRepository.addToHistory({ ...m, status: MissionStatus.EXPIRADA });
          CommandEventService.recordMissionExpired(m.corretor, m.tipo, m.lead?.nome).catch(()=>{});
          return { ...m, status: MissionStatus.EXPIRADA };
        }
        return m;
      });
    });
    return modificado;
  }

  /**
   * Conclui uma missão e atualiza XP.
   * @param {object} missionsMap
   * @param {string} nomeCorretor
   * @param {string} missionId
   * @returns {{ missionsMap, xpTotal, level, pontos }}
   */
  function concluirMissao(missionsMap, nomeCorretor, missionId) {
    const mapa = { ...missionsMap };
    if (!mapa[nomeCorretor]) return { missionsMap:mapa, xpTotal:0, pontos:0 };

    let missaoConc = null;
    mapa[nomeCorretor] = mapa[nomeCorretor].map(m => {
      if (m.id === missionId && m.status === MissionStatus.PENDENTE) {
        missaoConc = { ...m, status:MissionStatus.CONCLUIDA, concluidaEm:new Date().toISOString() };
        return missaoConc;
      }
      return m;
    });

    if (!missaoConc) return { missionsMap:mapa, xpTotal:0, pontos:0 };

    // XP e pontos
    const xpTotal = MissionRepository.addXP(nomeCorretor, missaoConc.xp);
    MissionRepository.addToHistory(missaoConc);
    CommandEventService.recordMissionCompleted(nomeCorretor, missaoConc.tipo, missaoConc.lead?.nome, missaoConc.pontos).catch(()=>{});

    const nivel = getNivel(xpTotal);
    return { missionsMap:mapa, xpTotal, nivel, pontos:missaoConc.pontos, xp:missaoConc.xp };
  }

  /**
   * Cancela uma missão.
   */
  function cancelarMissao(missionsMap, nomeCorretor, missionId) {
    const mapa = { ...missionsMap };
    if (!mapa[nomeCorretor]) return mapa;
    mapa[nomeCorretor] = mapa[nomeCorretor].map(m => {
      if (m.id === missionId && m.status === MissionStatus.PENDENTE) {
        MissionRepository.addToHistory({ ...m, status:MissionStatus.CANCELADA, concluidaEm:new Date().toISOString() });
        return { ...m, status:MissionStatus.CANCELADA };
      }
      return m;
    });
    return mapa;
  }

  /**
   * Estatísticas da equipe para o painel do gestor.
   */
  function statsEquipe(missionsMap, xpMap) {
    const todos = Object.entries(missionsMap);
    let totalPendentes=0, totalConcluidas=0, totalExpiradas=0;
    const porConsultor = todos.map(([nome, missoes]) => {
      const pend  = missoes.filter(m => m.status===MissionStatus.PENDENTE).length;
      const conc  = missoes.filter(m => m.status===MissionStatus.CONCLUIDA).length;
      const exp   = missoes.filter(m => m.status===MissionStatus.EXPIRADA).length;
      const total = missoes.length;
      const taxa  = total > 0 ? Math.round((conc/total)*100) : 0;
      const xp    = xpMap[nome] || 0;
      totalPendentes  += pend;
      totalConcluidas += conc;
      totalExpiradas  += exp;
      return { nome, pend, conc, exp, total, taxa, xp, nivel:getNivel(xp) };
    }).sort((a,b) => b.conc - a.conc || b.taxa - a.taxa);

    const taxaGeral = (totalPendentes+totalConcluidas) > 0
      ? Math.round((totalConcluidas/(totalPendentes+totalConcluidas))*100)
      : 0;

    return { porConsultor, totalPendentes, totalConcluidas, totalExpiradas, taxaGeral,
      top5: porConsultor.slice(0,5),
      atrasados: porConsultor.filter(c => c.taxa < 30 && c.total >= 3),
    };
  }

  return { processarExpiracao, concluirMissao, cancelarMissao, statsEquipe };

})();
