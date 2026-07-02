/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — SMART LEAD DISTRIBUTION ENGINE                        ║
 * ║  DistributionEngine.js                                       ║
 * ║  SPR-006 · KR7 Command Intelligence                          ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Motor central: orquestra ICC, DNA e regras de matching.
 * Produz análise completa e simulação de impacto.
 *
 * RESTRIÇÕES SPR-006:
 *   ✗ Não altera corretor dos leads
 *   ✓ Apenas analisa, recomenda e simula
 */

'use strict';

const DistributionEngine = (() => {

  /* ─────────────────────────────────────────────
     CONSTRUIR MAPS DE ICC E DNA
  ───────────────────────────────────────────── */

  /**
   * Constrói um map {nome: ICCResult} a partir do array de ICC.
   * @param {Array} iccResults
   * @returns {object}
   */
  function buildIccMap(iccResults) {
    const map = {};
    (iccResults || []).forEach(r => { map[r.corretor.nome] = r; });
    return map;
  }

  /**
   * Constrói um map {nome: DNAResult} a partir do array de DNA.
   * @param {Array} dnaResults
   * @returns {object}
   */
  function buildDnaMap(dnaResults) {
    const map = {};
    (dnaResults || []).forEach(d => { map[d.corretor.nome] = d; });
    return map;
  }

  /* ─────────────────────────────────────────────
     ANÁLISE DE UM LEAD
  ───────────────────────────────────────────── */

  /**
   * Analisa um lead e retorna ranking completo de consultores.
   * @param {object} lead
   * @param {Array}  corretores
   * @param {Array}  allLeads
   * @param {object} iccMap
   * @param {object} dnaMap
   * @returns {LeadAnalysis}
   */
  function analisarLead(lead, corretores, allLeads, iccMap, dnaMap) {
    const ranking = rankingParaLead(lead, corretores, allLeads, iccMap, dnaMap);

    if (ranking.length === 0) {
      return { lead, ranking: [], recomendado: null, justificativa: 'Sem consultores disponíveis.', top5: [] };
    }

    const recomendado    = ranking[0];
    const justificativa  = gerarJustificativaDistribuicao(lead, recomendado);
    const top5           = ranking.slice(0, 5);

    return { lead, ranking, recomendado, justificativa, top5 };
  }

  /* ─────────────────────────────────────────────
     ANÁLISE DA CARTEIRA COMPLETA
  ───────────────────────────────────────────── */

  /**
   * Analisa todos os leads sem corretor (ou com corretor atual).
   * Leads Fechados/Perdidos são excluídos.
   *
   * @param {Array}  allLeads
   * @param {Array}  corretores
   * @param {object} iccMap
   * @param {object} dnaMap
   * @param {object} [opts]
   * @param {boolean} [opts.apenasSeCorretor=false] — só leads sem corretor
   * @returns {LeadAnalysis[]}
   */
  function analisarCarteira(allLeads, corretores, iccMap, dnaMap, opts = {}) {
    const leadsAlvo = allLeads.filter(l => {
      if (['Fechado','Perdido'].includes(l.status)) return false;
      if (opts.apenasSeCorretor) return !l.corretor || l.corretor.trim() === '';
      return true;
    });

    return leadsAlvo.map(l => analisarLead(l, corretores, allLeads, iccMap, dnaMap));
  }

  /* ─────────────────────────────────────────────
     SIMULAÇÃO DE IMPACTO
  ───────────────────────────────────────────── */

  /**
   * Simula como ficaria a carteira após distribuição inteligente.
   * Calcula: distribuição por consultor, conversão prevista, equilíbrio.
   *
   * @param {LeadAnalysis[]} analises
   * @param {Array} corretores
   * @param {Array} allLeads
   * @returns {SimulationResult}
   */
  function simularDistribuicao(analises, corretores, allLeads) {
    // Conta quantos leads cada consultor receberia
    const distribuicao = {};
    corretores.forEach(c => {
      const leadsAtuais = allLeads.filter(l =>
        (l.corretor || '').trim().toLowerCase() === c.nome.trim().toLowerCase() &&
        !['Fechado','Perdido'].includes(l.status)
      ).length;
      distribuicao[c.nome] = { nome: c.nome, atual: leadsAtuais, novos: 0, total: leadsAtuais, probMedia: 0, probs: [] };
    });

    // Distribui leads conforme recomendação
    analises.forEach(a => {
      if (!a.recomendado) return;
      const nome = a.recomendado.corretor.nome;
      if (!distribuicao[nome]) distribuicao[nome] = { nome, atual: 0, novos: 0, total: 0, probMedia: 0, probs: [] };
      distribuicao[nome].novos++;
      distribuicao[nome].total++;
      distribuicao[nome].probs.push(a.recomendado.probabilidade);
    });

    // Calcula média de probabilidade por consultor
    Object.values(distribuicao).forEach(d => {
      d.probMedia = d.probs.length > 0
        ? Math.round(d.probs.reduce((a,b) => a+b,0) / d.probs.length)
        : 0;
    });

    const lista = Object.values(distribuicao).sort((a,b) => b.total - a.total);

    // Métricas de simulação
    const probGeral   = analises.length > 0
      ? Math.round(analises.reduce((a,s) => a + (s.recomendado?.probabilidade || 0), 0) / analises.length)
      : 0;

    const sobrecarregados = lista.filter(d => d.total > 18);
    const disponiveis     = lista.filter(d => d.total <= 10);
    const max = Math.max(...lista.map(d => d.total), 1);
    const min = Math.min(...lista.map(d => d.total), 0);
    const equilibrio = max > 0 ? Math.round((1 - (max - min) / max) * 100) : 100;

    return {
      distribuicao: lista,
      probGeral,
      sobrecarregados,
      disponiveis,
      equilibrio,
      totalLeads   : analises.length,
      totalConsultores: lista.filter(d => d.novos > 0).length,
    };
  }

  /* ─────────────────────────────────────────────
     DASHBOARD DATA
  ───────────────────────────────────────────── */

  /**
   * Dados para o painel do COMMAND.
   */
  function getDashboardData(analises, allLeads, corretores) {
    const comRecomendacao = analises.filter(a => a.recomendado);
    const recomendados    = {};
    comRecomendacao.forEach(a => {
      const n = a.recomendado.corretor.nome;
      recomendados[n] = (recomendados[n] || 0) + 1;
    });

    // Top 3 consultores mais indicados
    const topIndicados = Object.entries(recomendados)
      .sort((a,b) => b[1] - a[1])
      .slice(0, 3)
      .map(([nome, qtd]) => ({ nome, qtd }));

    // Sobrecarregados (> 15 leads ativos)
    const sobrecarregados = corretores
      .filter(c => !['CEO','Diretor'].includes(c.cargo))
      .map(c => ({
        nome: c.nome,
        ativos: allLeads.filter(l =>
          (l.corretor||'').trim().toLowerCase() === c.nome.trim().toLowerCase() &&
          !['Fechado','Perdido'].includes(l.status)
        ).length,
      }))
      .filter(c => c.ativos > 15)
      .sort((a,b) => b.ativos - a.ativos);

    // Disponíveis (< 5 leads ativos)
    const disponiveis = corretores
      .filter(c => !['CEO','Diretor'].includes(c.cargo))
      .map(c => ({
        nome: c.nome,
        ativos: allLeads.filter(l =>
          (l.corretor||'').trim().toLowerCase() === c.nome.trim().toLowerCase() &&
          !['Fechado','Perdido'].includes(l.status)
        ).length,
      }))
      .filter(c => c.ativos < 5)
      .sort((a,b) => a.ativos - b.ativos);

    return {
      totalRecomendados: comRecomendacao.length,
      topIndicados,
      sobrecarregados,
      disponiveis,
    };
  }

  // ── API pública ───────────────────────────────
  return {
    buildIccMap,
    buildDnaMap,
    analisarLead,
    analisarCarteira,
    simularDistribuicao,
    getDashboardData,
  };

})();
