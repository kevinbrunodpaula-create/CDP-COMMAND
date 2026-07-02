/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — COMMAND SCORE ENGINE                                  ║
 * ║  ManagerService.js                                           ║
 * ║  SPR-003 · KR7 Command Manager                               ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Orquestrador do módulo COMMAND MANAGER / SCORE ENGINE.
 * Coordena ScoreCalculator, ManagerRepository e CommandEventService.
 */

'use strict';

const ManagerService = (() => {

  let _scoreCache = null; // cache em memória da sessão atual

  /* ─────────────────────────────────────────────
     CALCULAR SCORES DA EQUIPE
  ───────────────────────────────────────────── */

  /**
   * Calcula scores de toda a equipe e persiste no cache.
   * Registra um evento COMMAND_SCORE_UPDATED por consultor.
   *
   * @param {boolean} [silent=false] — se true, não registra eventos
   * @returns {Promise<ScoreResult[]>}
   */
  async function calcularEquipe(silent = false) {
    const corretores = ManagerRepository.getCorretores();
    const leads      = ManagerRepository.getLeads();

    if (corretores.length === 0) return [];

    const scores = calcularScoreEquipe(corretores, leads);

    // Persistência
    ManagerRepository.saveCache(scores.map(s => ({
      nome  : s.corretor.nome,
      score : s.score,
      nivel : s.nivel,
    })));
    _scoreCache = scores;

    // Registra eventos (assíncrono, silencioso)
    if (!silent) {
      scores.forEach(s => {
        CommandEventService.recordScoreUpdated(
          s.corretor.nome,
          s.score,
          s.nivel,
          {
            leads   : s.stats.totalLeads,
            vendas  : s.stats.vendas,
            criticos: s.stats.criticos,
          }
        ).catch(() => {});
      });
    }

    return scores;
  }

  /**
   * Retorna os scores em cache, ou calcula se necessário.
   * @returns {Promise<ScoreResult[]>}
   */
  async function obterScores() {
    if (_scoreCache && _scoreCache.length > 0) return _scoreCache;
    const cached = ManagerRepository.loadCache();
    // Cache leve só tem {nome, score, nivel} — precisa recalcular para ter dimensoes
    return calcularEquipe(true);
  }

  /**
   * Força recálculo ignorando cache.
   * @returns {Promise<ScoreResult[]>}
   */
  async function reprocessar() {
    _scoreCache = null;
    ManagerRepository.clearCache();
    return calcularEquipe(false);
  }

  /**
   * Calcula score de um único consultor pelo nome.
   * @param {string} nome
   * @returns {ScoreResult|null}
   */
  async function scoreDeConsultor(nome) {
    const scores = await obterScores();
    return scores.find(s =>
      s.corretor.nome.trim().toLowerCase() === nome.trim().toLowerCase()
    ) || null;
  }

  /* ─────────────────────────────────────────────
     DADOS PARA O DASHBOARD DO COMMAND
  ───────────────────────────────────────────── */

  /**
   * Retorna resumo para o painel do COMMAND Dashboard.
   * @returns {Promise<ManagerDashboardData>}
   */
  async function getDashboardData() {
    const scores = await obterScores();
    if (scores.length === 0) return null;

    const scoreMedia = Math.round(
      scores.reduce((acc, s) => acc + s.score, 0) / scores.length
    );
    const top5    = scores.slice(0, 5);
    const atencao = [...scores]
      .filter(s => s.score < 65)
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);

    return { scores, scoreMedia, top5, atencao, total: scores.length };
  }

  /* ─────────────────────────────────────────────
     FILTROS
  ───────────────────────────────────────────── */

  function aplicarFiltros(scores, filtros = {}) {
    return scores.filter(s => {
      if (filtros.nivel && s.nivel !== filtros.nivel) return false;
      if (filtros.busca) {
        const q = filtros.busca.toLowerCase();
        if (!s.corretor.nome.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  // ── API pública ───────────────────────────────
  return {
    calcularEquipe,
    obterScores,
    reprocessar,
    scoreDeConsultor,
    getDashboardData,
    aplicarFiltros,
  };

})();
