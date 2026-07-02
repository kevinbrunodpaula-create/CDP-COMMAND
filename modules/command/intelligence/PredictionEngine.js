/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — COMMAND INTELLIGENCE                                  ║
 * ║  PredictionEngine.js                                         ║
 * ║  Release 2.9 · KR7 Command Intelligence                      ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Funções PURAS de predição. Zero deps externas.
 * Integra: DNA (SPR-004), ICC (SPR-005), Recovery (SPR-002),
 *          Distribution (SPR-006), Events (SPR-001)
 *
 * RESTRIÇÕES Release 2.9:
 *   ✗ Não executa ações automáticas
 *   ✓ Apenas calcula e apresenta probabilidades
 */

'use strict';

/* ─────────────────────────────────────────────
   HELPERS INTERNOS
───────────────────────────────────────────── */
var _norm  = s => (s||'').trim().toLowerCase();
var _dias  = iso => iso ? Math.floor((Date.now()-new Date(iso).getTime())/86_400_000) : 999;
var _clamp = (n,min,max) => Math.min(max,Math.max(min,n));
var _parseV= v => { if(!v) return 0; const n=parseFloat(String(v).replace(/[^\d,.]/g,'').replace(/\./g,'').replace(',','.')); return isNaN(n)?0:n; };

/* ─────────────────────────────────────────────
   ESTRELAS (1–5) baseado em percentual
───────────────────────────────────────────── */
function calcEstrelas(pct) {
  if (pct >= 80) return 5;
  if (pct >= 60) return 4;
  if (pct >= 40) return 3;
  if (pct >= 20) return 2;
  return 1;
}

/* ─────────────────────────────────────────────
   FATORES DE CONTEXTO
───────────────────────────────────────────── */
function fatorICC(iccData) {
  if (!iccData) return 1.0;
  const icc = iccData.icc || 50;
  return 0.7 + (icc / 100) * 0.6;
}

function fatorDNA(lead, dnaData) {
  if (!dnaData?.distribuicaoHints) return 1.0;
  const hints = dnaData.distribuicaoHints;
  let score = 1.0;
  if (hints.tipoPreferido && _norm(hints.tipoPreferido) === _norm(lead.tipo_imovel)) score += 0.25;
  if (hints.bairroPreferido && _norm(hints.bairroPreferido) === _norm(lead.bairro)) score += 0.2;
  if (hints.faixaPreferida && lead.valor) score += 0.1;
  return Math.min(1.6, score);
}

function fatorDiasParado(lead) {
  const dias = _dias(lead.ultimo_contato || lead.updated_at || lead.created_at);
  if (dias <= 1)  return 1.3;
  if (dias <= 3)  return 1.1;
  if (dias <= 7)  return 0.9;
  if (dias <= 15) return 0.6;
  if (dias <= 30) return 0.35;
  return 0.15;
}

function _fatorOrigemPred(lead, dnaData) {
  if (!dnaData?.distribuicaoHints?.origemMelhor) return 1.0;
  return _norm(dnaData.distribuicaoHints.origemMelhor) === _norm(lead.origem) ? 1.2 : 0.9;
}

function fatorStatus(lead, statusAlvo) {
  const funil = ['Lead Novo','Qualificado','Em Atendimento','Follow-Up','Visita Marcada','Proposta','Documentação','Fechado'];
  const idxAtual = funil.indexOf(lead.status || 'Lead Novo');
  const idxAlvo  = funil.indexOf(statusAlvo);
  if (idxAlvo <= idxAtual) return 1.2; // já passou daqui
  const distancia = idxAlvo - idxAtual;
  return Math.max(0.1, 1.2 - distancia * 0.2);
}

/* ─────────────────────────────────────────────
   6 PREDIÇÕES
───────────────────────────────────────────── */

/** P1 — Probabilidade de Venda */
function predVenda(lead, iccData, dnaData) {
  const base = dnaData?.metricas?.taxaConversao || 12;
  const raw  = base
    * fatorICC(iccData)
    * fatorDiasParado(lead)
    * fatorDNA(lead, dnaData)
    * fatorStatus(lead, 'Fechado');

  const pct = _clamp(Math.round(raw), 2, 95);
  const motivos = [];
  if ((iccData?.icc||0) >= 80)             motivos.push(`Consultor com ICC elevado (${iccData.icc}/100)`);
  if (fatorDNA(lead,dnaData) >= 1.2)       motivos.push('DNA do consultor compatível com o perfil do lead');
  if (_dias(lead.ultimo_contato) <= 3)     motivos.push('Lead com contato recente — engajamento alto');
  if (fatorDiasParado(lead) < 0.5)         motivos.push('Lead parado há muito tempo — risco de perda');
  if (lead.status === 'Proposta')          motivos.push('Lead já recebeu proposta — próximo do fechamento');

  return { tipo:'Venda', pct, estrelas:calcEstrelas(pct), motivos, cor:'#22C55E' };
}

/** P2 — Probabilidade de Proposta */
function predProposta(lead, iccData, dnaData) {
  if (['Proposta','Documentação','Fechado'].includes(lead.status)) {
    return { tipo:'Proposta', pct:92, estrelas:5, motivos:['Lead já está na fase de proposta ou além'], cor:'#0EA5E9' };
  }
  const base = 35;
  const raw  = base
    * fatorICC(iccData)
    * fatorDiasParado(lead)
    * fatorStatus(lead, 'Proposta')
    * (lead.valor ? 1.15 : 0.85);

  const pct = _clamp(Math.round(raw), 3, 90);
  const motivos = [];
  if (lead.valor)                           motivos.push('Interesse de valor informado — lead qualificado');
  if (lead.status === 'Visita Marcada')     motivos.push('Visita agendada — proposta é próximo passo');
  if ((iccData?.icc||0) >= 70)             motivos.push('Consultor confiável para conduzir negociação');
  if (!lead.valor)                          motivos.push('Valor de interesse não informado — qualificação incompleta');

  return { tipo:'Proposta', pct, estrelas:calcEstrelas(pct), motivos, cor:'#0EA5E9' };
}

/** P3 — Probabilidade de Visita */
function predVisita(lead, iccData, dnaData) {
  if (['Visita Marcada','Proposta','Documentação','Fechado'].includes(lead.status)) {
    return { tipo:'Visita', pct:88, estrelas:5, motivos:['Lead já passou pela etapa de visita'], cor:'#8B5CF6' };
  }
  const base = 40;
  const raw  = base
    * fatorICC(iccData)
    * fatorDiasParado(lead)
    * fatorStatus(lead, 'Visita Marcada')
    * (lead.bairro ? 1.1 : 0.9);

  const pct = _clamp(Math.round(raw), 3, 88);
  const motivos = [];
  if (lead.bairro)                          motivos.push(`Região definida: ${lead.bairro}`);
  if (lead.tipo_imovel)                     motivos.push(`Tipo de imóvel: ${lead.tipo_imovel}`);
  if ((iccData?.stats?.tempoMedioResposta||99) <= 4) motivos.push('Consultor responde rápido — facilita agendamento');

  return { tipo:'Visita', pct, estrelas:calcEstrelas(pct), motivos, cor:'#8B5CF6' };
}

/** P4 — Probabilidade de Desistência */
function predDesistencia(lead) {
  const dias = _dias(lead.ultimo_contato || lead.updated_at || lead.created_at);
  let pct = 10;
  if (dias >= 30)  pct = 85;
  else if (dias >= 15) pct = 60;
  else if (dias >= 7)  pct = 35;
  else if (dias >= 3)  pct = 20;

  if (lead.status === 'Perdido') pct = 98;
  if (!lead.telefone)  pct = Math.min(98, pct + 15);
  if (!lead.corretor)  pct = Math.min(98, pct + 20);

  pct = _clamp(pct, 2, 98);
  const motivos = [];
  if (dias >= 15)              motivos.push(`${dias} dias sem contato — alto risco de abandono`);
  if (!lead.telefone)          motivos.push('Sem telefone cadastrado — dificulta recontato');
  if (!lead.corretor)          motivos.push('Sem corretor responsável');
  if (dias <= 3)               motivos.push('Contato recente — risco baixo');

  return { tipo:'Desistência', pct, estrelas:calcEstrelas(100-pct), motivos, cor:'#EF4444', inverso:true };
}

/** P5 — Probabilidade de Financiamento */
function predFinanciamento(lead) {
  const valor = _parseV(lead.valor);
  let pct = 45; // base: muitos compram financiado
  if (valor > 0 && valor < 300_000) pct = 70;
  else if (valor >= 300_000 && valor < 600_000) pct = 55;
  else if (valor >= 600_000) pct = 30;

  if (_norm(lead.interesse).includes('financi')) pct = Math.min(90, pct + 20);
  if (_norm(lead.interesse).includes('vista'))   pct = Math.max(5,  pct - 30);

  pct = _clamp(pct, 5, 92);
  const motivos = [];
  if (valor < 300_000)          motivos.push('Faixa de preço mais propensa ao financiamento');
  if (valor >= 600_000)         motivos.push('Ticket alto — mais comum pagamento à vista ou mix');
  if (_norm(lead.interesse).includes('financi')) motivos.push('Lead demonstrou interesse em financiamento');

  return { tipo:'Financiamento', pct, estrelas:calcEstrelas(pct), motivos, cor:'#F59E0B' };
}

/** P6 — Probabilidade de Recuperação */
function predRecuperacao(lead, iccData) {
  const dias = _dias(lead.ultimo_contato || lead.updated_at || lead.created_at);
  if (['Fechado','Perdido'].includes(lead.status)) {
    return { tipo:'Recuperação', pct: lead.status==='Perdido'?15:2, estrelas:1, motivos:['Lead já finalizado'], cor:'#64748B' };
  }

  let pct = 50;
  if (dias < 7)    pct = 85;
  else if (dias < 15) pct = 65;
  else if (dias < 30) pct = 40;
  else pct = 18;

  if ((iccData?.icc||0) >= 80) pct = Math.min(95, pct + 15);
  if (lead.telefone)           pct = Math.min(95, pct + 8);

  pct = _clamp(pct, 5, 95);
  const motivos = [];
  if (dias < 7)              motivos.push('Contato recente — recuperação muito provável');
  if (dias >= 30)            motivos.push('Lead frio — recuperação difícil mas possível');
  if ((iccData?.icc||0)>=80) motivos.push('Consultor com alto ICC — maior chance de reconectar');
  if (lead.telefone)         motivos.push('Telefone disponível — contato direto possível');

  return { tipo:'Recuperação', pct, estrelas:calcEstrelas(pct), motivos, cor:'#14B8A6' };
}

/* ─────────────────────────────────────────────
   FUNÇÃO PRINCIPAL
───────────────────────────────────────────── */

/**
 * Calcula todas as 6 predições para um lead.
 * @param {object} lead
 * @param {object} [iccData]   — resultado do TrustService
 * @param {object} [dnaData]   — resultado do DNAService
 * @returns {PredictionResult}
 */
function calcularPredicoes(lead, iccData, dnaData) {
  return {
    lead,
    predicoes: [
      predVenda(lead, iccData, dnaData),
      predProposta(lead, iccData, dnaData),
      predVisita(lead, iccData, dnaData),
      predDesistencia(lead),
      predFinanciamento(lead),
      predRecuperacao(lead, iccData),
    ],
    geradoEm: new Date().toISOString(),
  };
}

/**
 * Calcula predições para todos os leads ativos.
 * @param {Array} leads
 * @param {object} iccMap  — { nome: ICCResult }
 * @param {object} dnaMap  — { nome: DNAResult }
 * @returns {PredictionResult[]}
 */
function calcularPredicoesCarteira(leads, iccMap, dnaMap) {
  return leads
    .filter(l => !['Fechado','Perdido'].includes(l.status))
    .map(lead => {
      const iccData = iccMap[(lead.corretor||'').trim()] || null;
      const dnaData = dnaMap[(lead.corretor||'').trim()] || null;
      return calcularPredicoes(lead, iccData, dnaData);
    })
    .sort((a,b) => {
      const aVenda = a.predicoes.find(p=>p.tipo==='Venda')?.pct||0;
      const bVenda = b.predicoes.find(p=>p.tipo==='Venda')?.pct||0;
      return bVenda - aVenda;
    });
}
