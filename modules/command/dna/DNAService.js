/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — COMMAND DNA ENGINE                                    ║
 * ║  DNAService.js                                               ║
 * ║  SPR-004 · KR7 Command DNA                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Orquestrador: coordena DNACalculator, DNARepository e Events Engine.
 * Ponto único de entrada para toda a análise de DNA Comercial.
 *
 * PREPARADO para integração futura com Distribuição Inteligente:
 *   DNAService.getDNADeConsultor(nome).distribuicaoHints
 */

'use strict';

const DNAService = (() => {

  let _cache = null; // DNAResult[] em memória

  /* ─────────────────────────────────────────────
     CALCULAR
  ───────────────────────────────────────────── */

  /**
   * Calcula DNA de toda a equipe e registra eventos.
   * @param {boolean} [silent=false]
   * @returns {Promise<DNAResult[]>}
   */
  async function calcularEquipe(silent = false) {
    const corretores = DNARepository.getCorretores();
    const leads      = DNARepository.getLeads();

    const results = calcularDNAEquipe(corretores, leads);

    DNARepository.saveCache(results);
    _cache = results;

    if (!silent) {
      results.forEach(d => {
        CommandEventService.recordDNAUpdated(
          d.corretor.nome,
          {
            taxaConversao    : d.metricas.taxaConversao,
            vendas           : d.metricas.vendas,
            totalLeads       : d.metricas.total,
            especialidadePrincipal: d.espPrincipal,
            regiaoDestaque   : d.fmt.regiaoDestaque,
            tipoDestaque     : d.fmt.tipoDestaque,
            distribuicaoHints: d.distribuicaoHints,
          }
        ).catch(() => {});
      });
    }

    return results;
  }

  /**
   * Retorna DNA com cache, ou calcula se necessário.
   * @returns {Promise<DNAResult[]>}
   */
  async function obterDNA() {
    if (_cache && _cache.length > 0) return _cache;
    // Cache leve não tem todos os campos — recalcula
    return calcularEquipe(true);
  }

  /**
   * Força recálculo ignorando cache.
   */
  async function reprocessar() {
    _cache = null;
    DNARepository.clearCache();
    return calcularEquipe(false);
  }

  /**
   * DNA de um consultor específico.
   * @param {string} nome
   * @returns {Promise<DNAResult|null>}
   */
  async function getDNADeConsultor(nome) {
    const results = await obterDNA();
    const n = (nome || '').trim().toLowerCase();
    return results.find(d => d.corretor.nome.trim().toLowerCase() === n) || null;
  }

  /* ─────────────────────────────────────────────
     FILTROS
  ───────────────────────────────────────────── */

  function aplicarFiltros(results, filtros = {}) {
    return results.filter(d => {
      if (filtros.busca) {
        const q = filtros.busca.toLowerCase();
        if (!d.corretor.nome.toLowerCase().includes(q)) return false;
      }
      if (filtros.tipo && d.especialidades.tipoImovel?.valor !== filtros.tipo) return false;
      if (filtros.conversaoMin != null && d.metricas.taxaConversao < filtros.conversaoMin) return false;
      return true;
    });
  }

  return { calcularEquipe, obterDNA, reprocessar, getDNADeConsultor, aplicarFiltros };

})();
