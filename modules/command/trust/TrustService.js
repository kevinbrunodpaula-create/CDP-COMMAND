/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — COMMAND TRUST ENGINE                                  ║
 * ║  TrustService.js                                             ║
 * ║  SPR-005 · KR7 Command Trust                                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Orquestrador do Trust Engine.
 * Coordena TrustCalculator, TrustHistory, TrustRepository e Events Engine.
 *
 * PREPARADO para SPR-006 — Distribuição Inteligente:
 *   TrustService.getDistribuicaoWeights() retorna pesos por consultor.
 */

'use strict';

const TrustService = (() => {

  let _cache = null; // ICCResult[] em memória

  /* ─────────────────────────────────────────────
     CALCULAR
  ───────────────────────────────────────────── */

  /**
   * Calcula ICC de toda a equipe, persiste histórico e registra eventos.
   * @param {boolean} [silent=false] — não registra eventos se true
   * @returns {Promise<ICCResult[]>}
   */
  async function calcularEquipe(silent = false) {
    const corretores    = TrustRepository.getCorretores();
    const leads         = TrustRepository.getLeads();
    const iccAnteriores = TrustHistory.todosIccAnteriores();

    const results = calcularICCEquipe(corretores, leads, iccAnteriores);

    // Persiste histórico local e cache de sessão
    results.forEach(r => TrustHistory.registrar(r.corretor.nome, r.icc, r.nivel));
    TrustRepository.saveCache(results);
    _cache = results;

    if (!silent) {
      // Registra eventos — um por consultor
      results.forEach(r => {
        CommandEventService.recordTrustUpdated(
          r.corretor.nome,
          r.iccAnterior,
          r.icc,
          r.nivel,
          r.justificativa,
          {
            tendencia   : r.tendencia.dir,
            leads       : r.stats.totalLeads,
            vendas      : r.stats.vendas,
            abandonados : r.stats.abandonados,
          }
        ).catch(() => {});

        // Alerta se ICC crítico
        if (r.icc < 50) {
          CommandEventService.recordTrustAlert(
            r.corretor.nome,
            r.icc,
            `ICC abaixo de 50 — ${r.nivel}. ${r.justificativa}`
          ).catch(() => {});
        }
      });
    }

    return results;
  }

  /**
   * Retorna ICC com cache, ou calcula se necessário.
   */
  async function obterICC() {
    if (_cache && _cache.length > 0) return _cache;
    return calcularEquipe(true);
  }

  /**
   * Força recálculo ignorando cache.
   */
  async function reprocessar() {
    _cache = null;
    TrustRepository.clearCache();
    return calcularEquipe(false);
  }

  /**
   * ICC de um consultor específico.
   * @param {string} nome
   */
  async function iccDeConsultor(nome) {
    const results = await obterICC();
    const n = (nome || '').trim().toLowerCase();
    return results.find(r => r.corretor.nome.trim().toLowerCase() === n) || null;
  }

  /* ─────────────────────────────────────────────
     RANKINGS (para dashboard do COMMAND)
  ───────────────────────────────────────────── */

  /**
   * Retorna todos os dados para o painel do COMMAND.
   */
  async function getDashboardData() {
    const results = await obterICC();
    if (results.length === 0) return null;

    const mediaICC = Math.round(results.reduce((a,r) => a+r.icc, 0) / results.length);

    // Top 5 maiores ICC
    const top5 = results.slice(0, 5);

    // Top 5 maiores evoluções (delta positivo)
    const top5Evolucao = [...results]
      .filter(r => r.iccAnterior !== null && r.icc > r.iccAnterior)
      .sort((a, b) => (b.icc - b.iccAnterior) - (a.icc - a.iccAnterior))
      .slice(0, 5);

    // Consultores em queda
    const emQueda = results.filter(r => r.tendencia.dir === '↓');

    // Consultores críticos (ICC < 50)
    const criticos = results.filter(r => r.icc < 50);

    return { results, mediaICC, top5, top5Evolucao, emQueda, criticos };
  }

  /* ─────────────────────────────────────────────
     FILTROS
  ───────────────────────────────────────────── */

  function aplicarFiltros(results, filtros = {}) {
    return results.filter(r => {
      if (filtros.nivel && r.nivel !== filtros.nivel) return false;
      if (filtros.tendencia && r.tendencia.dir !== filtros.tendencia) return false;
      if (filtros.busca) {
        const q = filtros.busca.toLowerCase();
        if (!r.corretor.nome.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  /* ─────────────────────────────────────────────
     PREPARAÇÃO SPR-006 — Distribuição Inteligente
  ───────────────────────────────────────────── */

  /**
   * Retorna pesos de distribuição por consultor para a futura sprint.
   * @returns {Promise<Array<{nome, prioridade, confiavel, icc}>>}
   */
  async function getDistribuicaoWeights() {
    const results = await obterICC();
    return results
      .filter(r => r.distribuicaoWeight.confiavel)
      .sort((a, b) => b.icc - a.icc)
      .map(r => ({
        nome       : r.corretor.nome,
        icc        : r.icc,
        nivel      : r.nivel,
        prioridade : r.distribuicaoWeight.prioridade,
        confiavel  : r.distribuicaoWeight.confiavel,
      }));
  }

  return {
    calcularEquipe,
    obterICC,
    reprocessar,
    iccDeConsultor,
    getDashboardData,
    aplicarFiltros,
    getDistribuicaoWeights,
  };

})();
