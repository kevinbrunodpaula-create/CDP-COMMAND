/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — SMART LEAD DISTRIBUTION ENGINE                        ║
 * ║  DistributionService.js                                      ║
 * ║  SPR-006 · KR7 Command Intelligence                          ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Ponto único de entrada para o Distribution Engine.
 * Coordena ICC (SPR-005), DNA (SPR-004), Engine e eventos.
 *
 * RESTRIÇÕES SPR-006:
 *   ✗ Não altera corretor dos leads
 *   ✓ Apenas analisa, recomenda, simula
 */

'use strict';

const DistributionService = (() => {

  let _cache     = null;  // LeadAnalysis[] em memória
  let _iccMap    = {};
  let _dnaMap    = {};
  let _calcEm    = null;

  /* ─────────────────────────────────────────────
     CARREGAR DADOS DEPENDENTES
  ───────────────────────────────────────────── */

  async function _loadDependencies() {
    // ICC — usa TrustService (SPR-005)
    try {
      const iccResults = await TrustService.obterICC();
      _iccMap = DistributionEngine.buildIccMap(iccResults);
    } catch (e) {
      console.warn('[Distribution] ICC não disponível:', e.message);
      _iccMap = {};
    }

    // DNA — usa DNAService (SPR-004)
    try {
      const dnaResults = await DNAService.obterDNA();
      _dnaMap = DistributionEngine.buildDnaMap(dnaResults);
    } catch (e) {
      console.warn('[Distribution] DNA não disponível:', e.message);
      _dnaMap = {};
    }
  }

  /* ─────────────────────────────────────────────
     ANALISAR
  ───────────────────────────────────────────── */

  /**
   * Executa análise completa da carteira.
   * @param {object} [opts]
   * @param {boolean} [opts.silent=false]
   * @returns {Promise<LeadAnalysis[]>}
   */
  async function analisar(opts = {}) {
    await _loadDependencies();

    const leads      = DistributionRepository.getLeads();
    const corretores = DistributionRepository.getCorretores();

    const analises = DistributionEngine.analisarCarteira(leads, corretores, _iccMap, _dnaMap);
    _cache  = analises;
    _calcEm = new Date().toISOString();

    DistributionRepository.saveCache(analises);

    if (!opts.silent) {
      // Registra evento de análise
      CommandEventService.recordDistributionAnalyzed(
        analises.length,
        corretores.filter(c => !['CEO','Diretor'].includes(c.cargo)).length
      ).catch(() => {});

      // Registra top recomendações (até 10)
      const comRec = analises.filter(a => a.recomendado);
      comRec.slice(0, 10).forEach(a => {
        CommandEventService.recordDistributionRecommended(
          a.lead.nome,
          a.recomendado.corretor.nome,
          a.recomendado.probabilidade,
          a.justificativa
        ).catch(() => {});
      });
    }

    return analises;
  }

  /**
   * Retorna análise em cache ou executa nova.
   */
  async function obterAnalise() {
    if (_cache && _cache.length > 0) return _cache;
    return analisar({ silent: true });
  }

  /**
   * Força recálculo.
   */
  async function reprocessar() {
    _cache = null;
    _iccMap = {};
    _dnaMap = {};
    DistributionRepository.clearCache();
    return analisar({ silent: false });
  }

  /**
   * Analisa um lead específico (útil ao abrir um lead no CRM).
   * @param {object} lead
   * @returns {Promise<LeadAnalysis>}
   */
  async function analisarLead(lead) {
    if (Object.keys(_iccMap).length === 0) await _loadDependencies();
    const corretores = DistributionRepository.getCorretores();
    const leads      = DistributionRepository.getLeads();
    return DistributionEngine.analisarLead(lead, corretores, leads, _iccMap, _dnaMap);
  }

  /* ─────────────────────────────────────────────
     SIMULAÇÃO
  ───────────────────────────────────────────── */

  /**
   * Simula o impacto da distribuição recomendada.
   */
  async function simular() {
    const analises   = await obterAnalise();
    const corretores = DistributionRepository.getCorretores();
    const leads      = DistributionRepository.getLeads();
    return DistributionEngine.simularDistribuicao(analises, corretores, leads);
  }

  /* ─────────────────────────────────────────────
     FILTROS
  ───────────────────────────────────────────── */

  function aplicarFiltros(analises, filtros = {}) {
    return analises.filter(a => {
      if (filtros.busca) {
        const q = filtros.busca.toLowerCase();
        if (!a.lead.nome.toLowerCase().includes(q) &&
            !(a.recomendado?.corretor?.nome || '').toLowerCase().includes(q)) return false;
      }
      if (filtros.status && a.lead.status !== filtros.status) return false;
      if (filtros.semCorretor && a.lead.corretor && a.lead.corretor.trim()) return false;
      if (filtros.probMin != null && (a.recomendado?.probabilidade || 0) < filtros.probMin) return false;
      return true;
    });
  }

  /* ─────────────────────────────────────────────
     DASHBOARD DATA
  ───────────────────────────────────────────── */

  async function getDashboardData() {
    const analises   = await obterAnalise();
    const corretores = DistributionRepository.getCorretores();
    const leads      = DistributionRepository.getLeads();
    return DistributionEngine.getDashboardData(analises, leads, corretores);
  }

  // ── API pública ───────────────────────────────
  return {
    analisar,
    obterAnalise,
    reprocessar,
    analisarLead,
    simular,
    aplicarFiltros,
    getDashboardData,
    getCalcEm: () => _calcEm,
  };

})();
