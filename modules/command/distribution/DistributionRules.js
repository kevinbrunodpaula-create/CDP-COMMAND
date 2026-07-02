/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — SMART LEAD DISTRIBUTION ENGINE                        ║
 * ║  DistributionRules.js                                        ║
 * ║  SPR-006 · KR7 Command Intelligence                          ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Funções PURAS de pontuação para matching lead ↔ consultor.
 * Zero dependências externas. Testável isoladamente.
 *
 * Cada regra retorna { pts, max, label, motivo, ativo }
 * O score final é normalizado para 0–100 (probabilidade de conversão).
 *
 * RESTRIÇÕES SPR-006:
 *   ✗ Não distribui leads automaticamente
 *   ✗ Não altera responsáveis
 *   ✓ Apenas recomenda e justifica
 */

'use strict';

/* ─────────────────────────────────────────────
   HELPERS INTERNOS
───────────────────────────────────────────── */
var _norm    = s => (s || '').trim().toLowerCase();
var _dias    = iso => iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : 999;
var _parseV  = v => { if(!v)return 0; const n=parseFloat(String(v).replace(/[^\d,.]/g,'').replace(/\./g,'').replace(',','.')); return isNaN(n)?0:n; };
var _faixaLead = valor => {
  const v = _parseV(valor);
  if (!v) return null;
  if (v < 200_000)   return 'Até R$ 200k';
  if (v < 400_000)   return 'R$ 200k–400k';
  if (v < 700_000)   return 'R$ 400k–700k';
  if (v < 1_000_000) return 'R$ 700k–1M';
  return 'Acima de R$ 1M';
};
var _leadsCorretor = (allLeads, nome) => allLeads.filter(l => _norm(l.corretor) === _norm(nome));

/* ─────────────────────────────────────────────
   REGRAS DE PONTUAÇÃO
   Cada regra recebe (lead, corretor, allLeads, iccData, dnaData)
   e retorna { pts, max, label, motivo, ativo }
───────────────────────────────────────────── */

/**
 * R1 — ICC do Consultor (0–25 pts)
 * Peso maior — o ICC já sintetiza performance geral.
 */
function rICC(lead, corretor, allLeads, iccData) {
  if (!iccData) return { pts:8, max:25, label:'ICC', motivo:'ICC não calculado.', ativo:false };
  const icc = iccData.icc || 0;
  let pts;
  if (icc >= 95)      pts = 25;
  else if (icc >= 85) pts = 22;
  else if (icc >= 70) pts = 17;
  else if (icc >= 50) pts = 10;
  else                pts = 2;

  // Consultor crítico → penalidade extra
  if (!iccData.distribuicaoWeight?.confiavel) pts = Math.min(pts, 4);

  return {
    pts, max: 25, label: 'ICC do consultor',
    motivo: `ICC ${icc}/100 — ${iccData.nivel || '—'}`,
    ativo: pts >= 17,
  };
}

/**
 * R2 — Especialidade por Tipo de Imóvel (0–15 pts)
 * Compara tipo_imovel do lead com tipoPreferido do DNA.
 */
function rEspecialidadeTipo(lead, corretor, allLeads, iccData, dnaData) {
  const hints = dnaData?.distribuicaoHints;
  if (!hints || !lead.tipo_imovel) return { pts:3, max:15, label:'Tipo de imóvel', motivo:'Sem dados de especialidade.', ativo:false };

  const match = _norm(hints.tipoPreferido) === _norm(lead.tipo_imovel);
  const pts   = match ? 15 : 3;
  return {
    pts, max: 15, label: 'Especialidade — tipo',
    motivo: match
      ? `Especialista em ${lead.tipo_imovel} (DNA compatível).`
      : `DNA preferencial: ${hints.tipoPreferido || '—'}. Lead quer: ${lead.tipo_imovel}.`,
    ativo: match,
  };
}

/**
 * R3 — Região / Bairro (0–12 pts)
 */
function rRegiao(lead, corretor, allLeads, iccData, dnaData) {
  const hints = dnaData?.distribuicaoHints;
  if (!hints || (!lead.bairro && !lead.cidade)) {
    return { pts:2, max:12, label:'Região', motivo:'Lead sem região definida.', ativo:false };
  }

  let pts = 2, motivo = 'Sem match de região.', ativo = false;

  if (lead.bairro && hints.bairroPreferido && _norm(lead.bairro) === _norm(hints.bairroPreferido)) {
    pts = 12; motivo = `Alta conversão em ${lead.bairro} (DNA).`; ativo = true;
  } else if (lead.bairro && hints.bairroPreferido && _norm(lead.bairro).includes(_norm(hints.bairroPreferido).split(' ')[0])) {
    pts = 8; motivo = `Região próxima ao bairro forte do consultor.`; ativo = true;
  } else if (lead.cidade && hints.bairroPreferido) {
    pts = 4; motivo = `Mesma cidade, bairro diferente.`;
  }

  return { pts, max:12, label:'Região / Bairro', motivo, ativo };
}

/**
 * R4 — Faixa de Preço (0–10 pts)
 */
function rFaixaPreco(lead, corretor, allLeads, iccData, dnaData) {
  const hints  = dnaData?.distribuicaoHints;
  const faixaL = _faixaLead(lead.valor);
  if (!hints?.faixaPreferida || !faixaL) {
    return { pts:3, max:10, label:'Faixa de preço', motivo:'Sem dados de faixa.', ativo:false };
  }
  const match = hints.faixaPreferida === faixaL;
  const pts   = match ? 10 : 3;
  return {
    pts, max:10, label:'Faixa de preço',
    motivo: match
      ? `Consultor tem alta conversão na faixa ${faixaL}.`
      : `DNA preferencial: ${hints.faixaPreferida}. Lead: ${faixaL}.`,
    ativo: match,
  };
}

/**
 * R5 — Origem do Lead (0–8 pts)
 */
function rOrigem(lead, corretor, allLeads, iccData, dnaData) {
  const hints = dnaData?.distribuicaoHints;
  if (!hints?.origemMelhor || !lead.origem) {
    return { pts:2, max:8, label:'Origem do lead', motivo:'Sem dados de origem.', ativo:false };
  }
  const match = _norm(hints.origemMelhor) === _norm(lead.origem);
  const pts   = match ? 8 : 2;
  return {
    pts, max:8, label:'Origem do lead',
    motivo: match
      ? `Alta conversão de leads via ${lead.origem}.`
      : `DNA forte: ${hints.origemMelhor}. Lead: ${lead.origem || '—'}.`,
    ativo: match,
  };
}

/**
 * R6 — Carga de Trabalho / Equilíbrio (0–12 pts)
 * Consultores com menos leads ativos recebem pontuação maior.
 */
function rCargaTrabalho(lead, corretor, allLeads) {
  const leadsCorretor = _leadsCorretor(allLeads, corretor.nome);
  const ativos = leadsCorretor.filter(l => l.status !== 'Fechado' && l.status !== 'Perdido').length;
  const total  = leadsCorretor.length;

  let pts, motivo, ativo;
  if (ativos === 0)       { pts=12; motivo=`Sem leads ativos — disponível para novo lead.`; ativo=true; }
  else if (ativos <= 5)   { pts=12; motivo=`${ativos} leads ativos — carteira equilibrada.`; ativo=true; }
  else if (ativos <= 10)  { pts=9;  motivo=`${ativos} leads ativos — capacidade razoável.`; ativo=true; }
  else if (ativos <= 18)  { pts=5;  motivo=`${ativos} leads ativos — carteira carregada.`; ativo=false; }
  else                    { pts=1;  motivo=`${ativos} leads ativos — consultor sobrecarregado.`; ativo=false; }

  return { pts, max:12, label:'Carga de trabalho', motivo, ativo, ativos, total };
}

/**
 * R7 — Tempo desde o último lead recebido (0–8 pts)
 * Consultores que não recebem leads há mais tempo têm prioridade.
 */
function rTempoSemLead(lead, corretor, allLeads) {
  const leadsCorretor = _leadsCorretor(allLeads, corretor.nome);
  if (leadsCorretor.length === 0) {
    return { pts:8, max:8, label:'Tempo sem lead', motivo:'Nunca recebeu um lead — máxima prioridade.', ativo:true };
  }
  const datas = leadsCorretor.map(l => l.created_at).filter(Boolean).sort();
  const ultimoLead = datas[datas.length - 1];
  const dias = _dias(ultimoLead);

  let pts, motivo, ativo;
  if (dias >= 7)      { pts=8; motivo=`${dias} dias sem receber um lead.`; ativo=true; }
  else if (dias >= 3) { pts=6; motivo=`Último lead há ${dias} dias.`; ativo=true; }
  else if (dias >= 1) { pts=3; motivo=`Lead recebido há ${dias} dia${dias>1?'s':''}.`; ativo=false; }
  else                { pts=1; motivo='Lead recebido hoje — aguardar próxima rodada.'; ativo=false; }

  return { pts, max:8, label:'Tempo sem lead', motivo, ativo };
}

/**
 * R8 — Taxa de Conversão Histórica (0–10 pts)
 */
function rConversaoHistorica(lead, corretor, allLeads, iccData, dnaData) {
  const taxa = dnaData?.metricas?.taxaConversao ?? null;
  if (taxa === null) return { pts:4, max:10, label:'Conversão histórica', motivo:'Sem histórico de conversão.', ativo:false };

  let pts, motivo, ativo;
  if (taxa >= 25)      { pts=10; motivo=`${taxa}% de taxa de conversão — excelente.`; ativo=true; }
  else if (taxa >= 15) { pts=8;  motivo=`${taxa}% de taxa de conversão — boa.`; ativo=true; }
  else if (taxa >= 8)  { pts=5;  motivo=`${taxa}% de taxa de conversão — regular.`; ativo=false; }
  else                 { pts=2;  motivo=`${taxa}% de taxa de conversão — abaixo da meta.`; ativo:false }

  return { pts, max:10, label:'Conversão histórica', motivo, ativo };
}

/**
 * R9 — Tempo Médio de Resposta (0–10 pts)
 */
function rTempoResposta(lead, corretor, allLeads, iccData) {
  const horas = iccData?.stats?.tempoMedioResposta ?? null;
  if (horas === null) return { pts:5, max:10, label:'Tempo de resposta', motivo:'Sem dados de resposta.', ativo:false };

  let pts, motivo, ativo;
  if (horas <= 1)      { pts=10; motivo=`Responde em menos de 1h — ideal para leads quentes.`; ativo=true; }
  else if (horas <= 4) { pts=8;  motivo=`Tempo médio de ${horas}h — muito bom.`; ativo=true; }
  else if (horas <= 12){ pts=5;  motivo=`Tempo médio de ${horas}h — aceitável.`; ativo:false }
  else                 { pts=1;  motivo=`Tempo médio de ${horas}h — pode perder o lead.`; ativo:false }

  return { pts, max:10, label:'Tempo de resposta', motivo, ativo };
}

/**
 * R10 — Leads Críticos na Carteira (penalidade −8 a 0)
 * Consultores com muitos críticos estão menos disponíveis.
 */
function rDistLeadsCriticos(lead, corretor, allLeads, iccData) {
  const criticos = iccData?.stats?.abandonados ?? 0;

  let pts, motivo, ativo;
  if (criticos === 0)     { pts=0;  motivo='Sem leads críticos — carteira saudável.'; ativo=true; }
  else if (criticos <= 2) { pts=-2; motivo=`${criticos} lead${criticos>1?'s':''} crítico${criticos>1?'s':''}.`; ativo=true; }
  else if (criticos <= 5) { pts=-5; motivo=`${criticos} leads críticos — atenção.`; ativo:false }
  else                    { pts=-8; motivo=`${criticos} leads críticos — priorize recuperação.`; ativo:false }

  return { pts, max:0, min:-8, label:'Leads críticos', motivo, ativo };
}

/* ─────────────────────────────────────────────
   PONTUAÇÃO FINAL DE UM CONSULTOR PARA UM LEAD
───────────────────────────────────────────── */

/**
 * Calcula a pontuação de match entre um lead e um consultor.
 * @param {object} lead
 * @param {object} corretor
 * @param {Array}  allLeads
 * @param {object} iccData    — resultado do TrustService
 * @param {object} dnaData    — resultado do DNAService
 * @returns {MatchResult}
 */
function calcularMatch(lead, corretor, allLeads, iccData, dnaData) {
  const regras = [
    rICC(lead, corretor, allLeads, iccData),
    rEspecialidadeTipo(lead, corretor, allLeads, iccData, dnaData),
    rRegiao(lead, corretor, allLeads, iccData, dnaData),
    rFaixaPreco(lead, corretor, allLeads, iccData, dnaData),
    rOrigem(lead, corretor, allLeads, iccData, dnaData),
    rCargaTrabalho(lead, corretor, allLeads),
    rTempoSemLead(lead, corretor, allLeads),
    rConversaoHistorica(lead, corretor, allLeads, iccData, dnaData),
    rTempoResposta(lead, corretor, allLeads, iccData),
    rDistLeadsCriticos(lead, corretor, allLeads, iccData),
  ];

  const maxTotal  = regras.reduce((a, r) => a + (r.max || 0), 0); // 110 pts base
  const bruto     = regras.reduce((a, r) => a + r.pts, 0);
  const normalizado = Math.round(Math.max(0, (bruto / maxTotal)) * 100);

  // Probabilidade: normalizado × 0.85 (teto realista)
  const probabilidade = Math.min(97, Math.round(normalizado * 0.85));

  // Motivos positivos e negativos
  const motivos    = regras.filter(r => r.ativo).map(r => r.motivo);
  const atencao    = regras.filter(r => !r.ativo && r.pts < (r.max || 0) * 0.5).map(r => r.motivo);

  return {
    corretor,
    regras,
    bruto,
    maxTotal,
    normalizado,
    probabilidade,
    motivos,
    atencao,
    nivelConfianca: probabilidade >= 70 ? 'Alta' : probabilidade >= 45 ? 'Média' : 'Baixa',
  };
}

/**
 * Gera ranking dos consultores para um lead.
 * @param {object} lead
 * @param {Array}  corretores
 * @param {Array}  allLeads
 * @param {object} iccMap    — { nome: ICCResult }
 * @param {object} dnaMap    — { nome: DNAResult }
 * @returns {MatchResult[]} — ordenado por probabilidade desc
 */
function rankingParaLead(lead, corretores, allLeads, iccMap, dnaMap) {
  return corretores
    .filter(c => c.nome && !['CEO','Diretor'].includes(c.cargo))
    .map(c => calcularMatch(lead, c, allLeads, iccMap[c.nome] || null, dnaMap[c.nome] || null))
    .sort((a, b) => b.probabilidade - a.probabilidade);
}

/**
 * Gera justificativa textual da recomendação.
 * @param {object} lead
 * @param {MatchResult} match  — primeiro do ranking
 * @returns {string}
 */
function gerarJustificativaDistribuicao(lead, match) {
  const nome = match.corretor.nome.split(' ')[0];
  const motivos = match.motivos.slice(0, 3);

  let texto = `${nome} é o consultor recomendado para ${lead.nome} com ${match.probabilidade}% de probabilidade.`;
  if (motivos.length > 0) texto += ` Motivos: ${motivos.join('; ')}.`;
  return texto;
}
