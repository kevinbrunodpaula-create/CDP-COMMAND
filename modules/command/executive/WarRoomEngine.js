/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — MORNING BRIEFING & WAR ROOM                          ║
 * ║  WarRoomEngine.js                                            ║
 * ║  SPR-008 · KR7 Command Executive                             ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Complementa o BriefingGenerator com atualizações em tempo real
 * da War Room. Enquanto o briefing é gerado uma vez no dia,
 * a War Room pode ser atualizada a qualquer momento.
 */

'use strict';

const WarRoomEngine = (() => {

  /**
   * Pontua problemas por urgência (0–100).
   * @param {Array} problemas
   * @returns {Array} — ordenado por score desc
   */
  function pontuarProblemas(problemas) {
    return problemas.map(p => ({
      ...p,
      score: p.impacto === 'alto' ? 80 + Math.random()*20 : p.impacto === 'medio' ? 50 + Math.random()*30 : 20 + Math.random()*30,
    })).sort((a,b) => b.score - a.score);
  }

  /**
   * Pontua oportunidades por potencial.
   * @param {Array} oportunidades
   * @returns {Array} — ordenado por score desc
   */
  function pontuarOportunidades(oportunidades) {
    return oportunidades.map(o => ({
      ...o,
      score: o.impacto === 'alto' ? 75 + Math.random()*25 : 40 + Math.random()*35,
    })).sort((a,b) => b.score - a.score);
  }

  /**
   * Gera o status de cor da war room com base nos alertas.
   * @param {number} criticos
   * @param {number} total
   * @returns {{ cor, label, emoji }}
   */
  function statusWarRoom(criticos, total) {
    if (criticos >= 3)   return { cor:'#EF4444', label:'ALERTA MÁXIMO', emoji:'🔴', bg:'rgba(239,68,68,0.08)' };
    if (criticos >= 1)   return { cor:'#F97316', label:'ATENÇÃO', emoji:'🟠', bg:'rgba(249,115,22,0.08)' };
    if (total >= 5)      return { cor:'#EAB308', label:'MONITORAMENTO', emoji:'🟡', bg:'rgba(234,179,8,0.08)' };
    return               { cor:'#22C55E', label:'OPERAÇÃO NORMAL', emoji:'🟢', bg:'rgba(34,197,94,0.06)' };
  }

  /**
   * Calcula a "temperatura" operacional (0–100).
   * 100 = máxima crise, 0 = tudo tranquilo.
   * @param {object} briefing
   * @returns {number}
   */
  function calcularTemperatura(briefing) {
    let temp = 20; // base
    temp += Math.min(40, briefing.alertas.filter(a=>a.tipo==='CRITICO').length * 15);
    temp += Math.min(20, briefing.alertas.filter(a=>a.tipo==='ALTO').length * 5);
    temp += Math.min(10, briefing.warRoom.problemas.length * 2);
    if (briefing.resumo24h.novosHoje === 0) temp += 10;
    return Math.min(100, Math.round(temp));
  }

  return { pontuarProblemas, pontuarOportunidades, statusWarRoom, calcularTemperatura };

})();
