/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — COMMAND TRUST ENGINE                                  ║
 * ║  TrustHistory.js                                             ║
 * ║  SPR-005 · KR7 Command Trust                                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Gerencia o histórico local de ICCs para calcular tendência
 * e gerar o gráfico de evolução de cada consultor.
 *
 * Persiste em localStorage — sobrevive a recarregamentos de página.
 * Mantém até 12 snapshots por consultor (1 por mês ~= 1 ano).
 */

'use strict';

const TrustHistory = (() => {

  const KEY     = 'cdp_icc_history';
  const MAX_PTS = 12; // máx snapshots por consultor

  /* ── Leitura/escrita raw ── */
  function _load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch { return {}; }
  }

  function _save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch { /* cheio */ }
  }

  /* ─────────────────────────────────────────────
     API PÚBLICA
  ───────────────────────────────────────────── */

  /**
   * Registra um snapshot de ICC para um consultor.
   * @param {string} nome
   * @param {number} icc
   * @param {string} nivel
   */
  function registrar(nome, icc, nivel) {
    const data = _load();
    if (!data[nome]) data[nome] = [];

    data[nome].push({
      ts    : new Date().toISOString(),
      icc,
      nivel,
    });

    // Mantém apenas os últimos MAX_PTS pontos
    if (data[nome].length > MAX_PTS) {
      data[nome] = data[nome].slice(-MAX_PTS);
    }

    _save(data);
  }

  /**
   * Retorna o histórico de um consultor.
   * @param {string} nome
   * @returns {Array<{ts, icc, nivel}>}
   */
  function obter(nome) {
    const data = _load();
    return data[nome] || [];
  }

  /**
   * Retorna o ICC anterior (penúltimo snapshot) de um consultor.
   * @param {string} nome
   * @returns {number|null}
   */
  function iccAnterior(nome) {
    const hist = obter(nome);
    if (hist.length < 2) return null;
    return hist[hist.length - 2].icc;
  }

  /**
   * Retorna um map {nome: iccAnterior} para todos os consultores.
   * @returns {object}
   */
  function todosIccAnteriores() {
    const data = _load();
    const result = {};
    Object.entries(data).forEach(([nome, pts]) => {
      if (pts.length >= 2) result[nome] = pts[pts.length - 2].icc;
    });
    return result;
  }

  /**
   * Gera dados de evolução formatados para o gráfico.
   * @param {string} nome
   * @returns {Array<{label, icc, nivel}>}
   */
  function evolucaoParaGrafico(nome) {
    const hist = obter(nome);
    return hist.map(pt => ({
      label : new Date(pt.ts).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }),
      icc   : pt.icc,
      nivel : pt.nivel,
    }));
  }

  /**
   * Limpa histórico de um consultor.
   * @param {string} nome
   */
  function limpar(nome) {
    const data = _load();
    delete data[nome];
    _save(data);
  }

  /** Limpa todo o histórico. */
  function limparTudo() {
    try { localStorage.removeItem(KEY); } catch { /* */ }
  }

  return { registrar, obter, iccAnterior, todosIccAnteriores, evolucaoParaGrafico, limpar, limparTudo };

})();
