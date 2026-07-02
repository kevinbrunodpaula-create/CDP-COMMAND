/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — COMMAND SCORE ENGINE                                  ║
 * ║  ScoreCalculator.js                                          ║
 * ║  SPR-003 · KR7 Command Manager                               ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Funções PURAS de cálculo de score. Zero dependências externas.
 * Cada dimensão é calculada, documentada e retorna seu breakdown
 * para exibição transparente ao gestor.
 *
 * PONTUAÇÃO MÁXIMA: 100 pts
 *   Tempo médio de resposta   → 0–20 pts
 *   Atualização do CRM        → 0–15 pts
 *   Follow-ups realizados     → 0–15 pts
 *   Visitas agendadas         → 0–10 pts
 *   Visitas realizadas        → 0–10 pts
 *   Propostas enviadas        → 0–10 pts
 *   Vendas                    → 0–15 pts
 *   Leads abandonados         → até −15 pts
 *   Leads recuperados         → até +10 pts
 *
 * RESTRIÇÕES desta Sprint (SPR-003):
 *   ✗ NÃO redistribui leads
 *   ✗ NÃO altera responsáveis
 *   ✓ Apenas calcula, apresenta e justifica
 */

'use strict';

/* ─────────────────────────────────────────────
   NÍVEIS DE CLASSIFICAÇÃO
───────────────────────────────────────────── */
const ScoreLevel = Object.freeze({
  ELITE     : 'Elite',
  EXCELENTE : 'Excelente',
  BOM       : 'Bom',
  ATENCAO   : 'Atenção',
  CRITICO   : 'Crítico',
});

const SCORE_LEVEL_CFG = Object.freeze({
  Elite     : { min:95, color:'#A78BFA', bg:'rgba(167,139,250,0.1)', border:'rgba(167,139,250,0.25)', emoji:'⭐' },
  Excelente : { min:80, color:'#22C55E', bg:'rgba(34,197,94,0.08)',  border:'rgba(34,197,94,0.22)',   emoji:'🏆' },
  Bom       : { min:65, color:'#0EA5E9', bg:'rgba(14,165,233,0.08)', border:'rgba(14,165,233,0.22)',  emoji:'👍' },
  Atenção   : { min:50, color:'#EAB308', bg:'rgba(234,179,8,0.08)',  border:'rgba(234,179,8,0.22)',   emoji:'⚠️' },
  Crítico   : { min:0,  color:'#EF4444', bg:'rgba(239,68,68,0.08)',  border:'rgba(239,68,68,0.22)',   emoji:'🚨' },
});

/* ─────────────────────────────────────────────
   HELPERS INTERNOS
───────────────────────────────────────────── */

/** Dias desde uma ISO date string */
function _dias(iso) {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/** Clamp num entre min e max */
function _clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/** Normaliza nome para comparação */
function _norm(s) {
  return (s || '').trim().toLowerCase();
}

/** Leads de um corretor */
function _leads(allLeads, nome) {
  const n = _norm(nome);
  return allLeads.filter(l => _norm(l.corretor) === n);
}

/** Leads ativos de um corretor (nem Fechado nem Perdido) */
function _ativos(leads) {
  return leads.filter(l => l.status !== 'Fechado' && l.status !== 'Perdido');
}

/* ─────────────────────────────────────────────
   DIMENSÕES DO SCORE
   Cada função retorna { pontos, max, label, detalhe, positivo }
───────────────────────────────────────────── */

/**
 * D1 — Tempo médio de resposta (0–20 pts)
 * Baseado em: dias desde created_at até primeiro contato (ultimo_contato)
 * < 1 dia → 20 | 1–2 dias → 15 | 3–5 dias → 8 | > 5 dias → 2 | sem contato → 0
 */
function calcRespostaRapida(leads) {
  const MAX = 20;
  const comContato = leads.filter(l => l.ultimo_contato && l.created_at);
  if (comContato.length === 0) {
    return { pontos: 0, max: MAX, label: 'Tempo de resposta', detalhe: 'Nenhum lead com contato registrado.', positivo: false };
  }
  const tempos = comContato.map(l => {
    const criado   = new Date(l.created_at).getTime();
    const contato  = new Date(l.ultimo_contato).getTime();
    return Math.max(0, (contato - criado) / 86_400_000);
  });
  const media = tempos.reduce((a, b) => a + b, 0) / tempos.length;

  let pontos, detalheLabel;
  if (media < 1)       { pontos = 20; detalheLabel = 'Excelente — responde no mesmo dia'; }
  else if (media < 2)  { pontos = 15; detalheLabel = 'Bom — responde em até 2 dias'; }
  else if (media < 5)  { pontos = 8;  detalheLabel = `Médio — responde em ~${media.toFixed(1)} dias`; }
  else                 { pontos = 2;  detalheLabel = `Lento — ${media.toFixed(1)} dias em média`; }

  return { pontos, max: MAX, label: 'Tempo de resposta', detalhe: detalheLabel, positivo: pontos >= 15 };
}

/**
 * D2 — Atualização do CRM (0–15 pts)
 * Leads ativos sem contato há > 7 dias → penalidade progressiva
 * 0% parados → 15 | <20% → 12 | <40% → 8 | <60% → 4 | ≥60% → 0
 */
function calcAtualizacaoCRM(leads) {
  const MAX = 15;
  const ativos = _ativos(leads);
  if (ativos.length === 0) {
    return { pontos: MAX, max: MAX, label: 'Atualização do CRM', detalhe: 'Sem leads ativos para avaliar.', positivo: true };
  }
  const parados = ativos.filter(l => _dias(l.ultimo_contato || l.updated_at || l.created_at) > 7).length;
  const pct = parados / ativos.length;

  let pontos, detalhe;
  if (pct === 0)     { pontos = 15; detalhe = 'CRM 100% atualizado — nenhum lead parado.'; }
  else if (pct < 0.2){ pontos = 12; detalhe = `${parados} lead${parados>1?'s':''} parado${parados>1?'s':''} (${Math.round(pct*100)}% da carteira).`; }
  else if (pct < 0.4){ pontos = 8;  detalhe = `${parados} leads parados (${Math.round(pct*100)}%) — CRM desatualizado.`; }
  else if (pct < 0.6){ pontos = 4;  detalhe = `${parados} leads parados (${Math.round(pct*100)}%) — atenção urgente.`; }
  else               { pontos = 0;  detalhe = `${parados} leads parados (${Math.round(pct*100)}%) — CRM crítico.`; }

  return { pontos, max: MAX, label: 'Atualização do CRM', detalhe, positivo: pontos >= 12 };
}

/**
 * D3 — Follow-ups realizados (0–15 pts)
 * Conta entradas no historico_contatos dos últimos 30 dias
 * ≥10 → 15 | ≥6 → 12 | ≥3 → 8 | ≥1 → 4 | 0 → 0
 */
function calcFollowUps(leads) {
  const MAX = 15;
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
  let totalFU = 0;
  leads.forEach(l => {
    try {
      const hist = l.historico_contatos ? JSON.parse(l.historico_contatos) : [];
      totalFU += hist.filter(h => h.data >= cutoff).length;
    } catch { /* hist malformado */ }
  });

  let pontos, detalhe;
  if (totalFU >= 10)     { pontos = 15; detalhe = `${totalFU} follow-ups nos últimos 30 dias — excelente cadência.`; }
  else if (totalFU >= 6) { pontos = 12; detalhe = `${totalFU} follow-ups nos últimos 30 dias.`; }
  else if (totalFU >= 3) { pontos = 8;  detalhe = `${totalFU} follow-ups — abaixo do ideal (meta: 10+).`; }
  else if (totalFU >= 1) { pontos = 4;  detalhe = `Apenas ${totalFU} follow-up${totalFU>1?'s':''} no mês.`; }
  else                   { pontos = 0;  detalhe = 'Nenhum follow-up registrado nos últimos 30 dias.'; }

  return { pontos, max: MAX, label: 'Follow-ups realizados', detalhe, positivo: pontos >= 12, total: totalFU };
}

/**
 * D4 — Visitas agendadas (0–10 pts)
 * Leads com status Visita Marcada nos últimos 30 dias
 * ≥5 → 10 | ≥3 → 8 | ≥1 → 5 | 0 → 0
 */
function calcVisitasAgendadas(leads) {
  const MAX = 10;
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const agendadas = leads.filter(l =>
    l.status === 'Visita Marcada' ||
    (l.visita_data && l.visita_data >= cutoff.slice(0,10))
  ).length;

  let pontos, detalhe;
  if (agendadas >= 5)     { pontos = 10; detalhe = `${agendadas} visitas agendadas — excelente.`; }
  else if (agendadas >= 3){ pontos = 8;  detalhe = `${agendadas} visitas agendadas no período.`; }
  else if (agendadas >= 1){ pontos = 5;  detalhe = `${agendadas} visita${agendadas>1?'s':''} agendada${agendadas>1?'s':''}.`; }
  else                    { pontos = 0;  detalhe = 'Nenhuma visita agendada nos últimos 30 dias.'; }

  return { pontos, max: MAX, label: 'Visitas agendadas', detalhe, positivo: pontos >= 8, total: agendadas };
}

/**
 * D5 — Visitas realizadas (0–10 pts)
 * Leads que avançaram além de Visita Marcada (Proposta, Documentação, Fechado)
 * ≥4 → 10 | ≥2 → 7 | ≥1 → 4 | 0 → 0
 */
function calcVisitasRealizadas(leads) {
  const MAX = 10;
  const realizadas = leads.filter(l =>
    ['Proposta','Documentação','Fechado'].includes(l.status)
  ).length;

  let pontos, detalhe;
  if (realizadas >= 4)    { pontos = 10; detalhe = `${realizadas} visitas convertidas em proposta ou fechamento.`; }
  else if (realizadas >= 2){ pontos = 7; detalhe = `${realizadas} visitas avançaram no funil.`; }
  else if (realizadas >= 1){ pontos = 4; detalhe = `${realizadas} visita realizad${realizadas>1?'as':'a'}.`; }
  else                    { pontos = 0;  detalhe = 'Nenhuma visita convertida no funil.'; }

  return { pontos, max: MAX, label: 'Visitas realizadas', detalhe, positivo: pontos >= 7, total: realizadas };
}

/**
 * D6 — Propostas enviadas (0–10 pts)
 * Leads com status Proposta ou além (Documentação, Fechado)
 * ≥4 → 10 | ≥2 → 7 | ≥1 → 4 | 0 → 0
 */
function calcPropostas(leads) {
  const MAX = 10;
  const propostas = leads.filter(l =>
    ['Proposta','Documentação','Fechado'].includes(l.status)
  ).length;

  let pontos, detalhe;
  if (propostas >= 4)     { pontos = 10; detalhe = `${propostas} propostas enviadas — excelente conversão.`; }
  else if (propostas >= 2){ pontos = 7;  detalhe = `${propostas} propostas enviadas.`; }
  else if (propostas >= 1){ pontos = 4;  detalhe = `${propostas} proposta enviada.`; }
  else                    { pontos = 0;  detalhe = 'Nenhuma proposta registrada.'; }

  return { pontos, max: MAX, label: 'Propostas enviadas', detalhe, positivo: pontos >= 7, total: propostas };
}

/**
 * D7 — Vendas (0–15 pts)
 * Leads com status Fechado
 * ≥5 → 15 | ≥3 → 12 | ≥2 → 9 | ≥1 → 6 | 0 → 0
 */
function calcVendas(leads) {
  const MAX = 15;
  const vendas = leads.filter(l => l.status === 'Fechado').length;

  let pontos, detalhe;
  if (vendas >= 5)     { pontos = 15; detalhe = `${vendas} vendas fechadas — performance Elite.`; }
  else if (vendas >= 3){ pontos = 12; detalhe = `${vendas} vendas fechadas — excelente.`; }
  else if (vendas >= 2){ pontos = 9;  detalhe = `${vendas} vendas fechadas.`; }
  else if (vendas >= 1){ pontos = 6;  detalhe = `${vendas} venda fechada.`; }
  else                 { pontos = 0;  detalhe = 'Nenhuma venda fechada no período.'; }

  return { pontos, max: MAX, label: 'Vendas fechadas', detalhe, positivo: pontos >= 9, total: vendas };
}

/**
 * D8 — Leads abandonados (penalidade, até −15)
 * Leads com 30+ dias sem movimentação
 * 0 → +0 | 1–2 → −3 | 3–5 → −7 | 6–10 → −11 | >10 → −15
 */
function calcAbandonados(leads) {
  const MIN = -15;
  const ativos = _ativos(leads);
  const abandonados = ativos.filter(l =>
    _dias(l.ultimo_contato || l.updated_at || l.created_at) >= 30
  ).length;

  let pontos, detalhe;
  if (abandonados === 0)     { pontos = 0;   detalhe = 'Nenhum lead abandonado — excelente.'; }
  else if (abandonados <= 2) { pontos = -3;  detalhe = `${abandonados} lead${abandonados>1?'s':''} abandonado${abandonados>1?'s':''}.`; }
  else if (abandonados <= 5) { pontos = -7;  detalhe = `${abandonados} leads abandonados — atenção.`; }
  else if (abandonados <= 10){ pontos = -11; detalhe = `${abandonados} leads abandonados — crítico.`; }
  else                       { pontos = -15; detalhe = `${abandonados} leads abandonados — situação grave.`; }

  return { pontos, max: 0, min: MIN, label: 'Leads abandonados', detalhe, positivo: pontos === 0, total: abandonados };
}

/**
 * D9 — Leads recuperados (bônus, até +10)
 * Leads que saíram de status antigo e avançaram no funil (Follow-Up → Em Atendimento+)
 * Simplificado: leads com Follow-Up que têm contato recente (< 7 dias)
 * ≥5 → +10 | ≥3 → +7 | ≥1 → +3 | 0 → 0
 */
function calcRecuperados(leads) {
  const MAX = 10;
  // Leads em Follow-Up ativos com contato recente = foram recuperados recentemente
  const recuperados = leads.filter(l =>
    l.status === 'Follow-Up' &&
    _dias(l.ultimo_contato) < 7
  ).length;

  let pontos, detalhe;
  if (recuperados >= 5)     { pontos = 10; detalhe = `${recuperados} leads recuperados recentemente — ótimo resgate.`; }
  else if (recuperados >= 3){ pontos = 7;  detalhe = `${recuperados} leads recuperados.`; }
  else if (recuperados >= 1){ pontos = 3;  detalhe = `${recuperados} lead${recuperados>1?'s':''} recuperado${recuperados>1?'s':''}.`; }
  else                      { pontos = 0;  detalhe = 'Nenhum lead recuperado recentemente.'; }

  return { pontos, max: MAX, label: 'Leads recuperados', detalhe, positivo: pontos >= 7, total: recuperados };
}

/* ─────────────────────────────────────────────
   FUNÇÃO PRINCIPAL — calcularScore
───────────────────────────────────────────── */

/**
 * Calcula o Score completo de um consultor.
 *
 * @param {object} corretor   — objeto do Supabase (id, nome, cargo, ...)
 * @param {Array}  allLeads   — todos os leads (filtrado por cargo já foi feito)
 * @returns {ScoreResult}
 */
function calcularScore(corretor, allLeads) {
  const leads = _leads(allLeads, corretor.nome);

  const dimensoes = [
    calcRespostaRapida(leads),
    calcAtualizacaoCRM(leads),
    calcFollowUps(leads),
    calcVisitasAgendadas(leads),
    calcVisitasRealizadas(leads),
    calcPropostas(leads),
    calcVendas(leads),
    calcAbandonados(leads),
    calcRecuperados(leads),
  ];

  const bruto  = dimensoes.reduce((acc, d) => acc + d.pontos, 0);
  const score  = _clamp(Math.round(bruto), 0, 100);
  const nivel  = getScoreLevel(score);
  const cfg    = SCORE_LEVEL_CFG[nivel];

  // Separar positivos e negativos para o painel de detalhamento
  const positivos  = dimensoes.filter(d => d.positivo && d.pontos > 0);
  const negativos  = dimensoes.filter(d => !d.positivo || d.pontos < 0);

  // Sugestões automáticas do COMMAND
  const sugestoes  = gerarSugestoes(dimensoes, leads);

  // Estatísticas gerais
  const ativosCorretor = _ativos(leads);
  const vendas = leads.filter(l => l.status === 'Fechado').length;
  const criticos = ativosCorretor.filter(l =>
    _dias(l.ultimo_contato || l.updated_at || l.created_at) >= 15
  ).length;
  const ultimaAtividade = leads
    .map(l => l.ultimo_contato || l.updated_at || l.created_at)
    .filter(Boolean)
    .sort()
    .pop() || null;

  return {
    corretor,
    score,
    nivel,
    cfg,
    dimensoes,
    positivos,
    negativos,
    sugestoes,
    stats: {
      totalLeads    : leads.length,
      leadsAtivos   : ativosCorretor.length,
      vendas,
      criticos,
      ultimaAtividade,
    },
  };
}

/**
 * Determina o nível pelo score.
 * @param {number} score
 * @returns {string}
 */
function getScoreLevel(score) {
  if (score >= 95) return 'Elite';
  if (score >= 80) return 'Excelente';
  if (score >= 65) return 'Bom';
  if (score >= 50) return 'Atenção';
  return 'Crítico';
}

/**
 * Gera sugestões automáticas do COMMAND baseadas nas dimensões fracas.
 * @param {Array} dimensoes
 * @param {Array} leads
 * @returns {string[]}
 */
function gerarSugestoes(dimensoes, leads) {
  const sugestoes = [];
  const d = {};
  dimensoes.forEach(dim => { d[dim.label] = dim; });

  if ((d['Tempo de resposta']?.pontos || 0) < 10)
    sugestoes.push('Responder novos leads em menos de 24h aumenta significativamente a taxa de conversão.');

  if ((d['Atualização do CRM']?.pontos || 0) < 10)
    sugestoes.push('Atualizar o status dos leads semanalmente no CRM melhora a visibilidade e o score.');

  if ((d['Follow-ups realizados']?.pontos || 0) < 8)
    sugestoes.push('Aumentar a cadência de follow-ups. Meta: pelo menos 2 por semana por lead ativo.');

  if ((d['Visitas agendadas']?.pontos || 0) < 5)
    sugestoes.push('Priorizar agendamento de visitas para leads em "Qualificado" e "Em Atendimento".');

  if ((d['Vendas fechadas']?.pontos || 0) < 6)
    sugestoes.push('Revisar a estratégia de fechamento. Leads com proposta enviada há mais de 7 dias precisam de atenção.');

  if ((d['Leads abandonados']?.pontos || 0) < -5)
    sugestoes.push('Recuperar leads com 30+ dias de inatividade antes de solicitar novos leads.');

  if (sugestoes.length === 0)
    sugestoes.push('Excelente performance! Manter a cadência atual e focar em leads com maior VGV potencial.');

  return sugestoes.slice(0, 3); // máximo 3 sugestões
}

/**
 * Calcula scores de toda a equipe de corretores.
 * @param {Array} allCorretores
 * @param {Array} allLeads
 * @returns {ScoreResult[]}   — ordenado por score desc
 */
function calcularScoreEquipe(allCorretores, allLeads) {
  // Apenas corretores (exclui CEO e Diretor do ranking de score)
  const equipe = allCorretores.filter(c =>
    !['CEO', 'Diretor'].includes(c.cargo) && c.nome
  );

  return equipe
    .map(c => calcularScore(c, allLeads))
    .sort((a, b) => b.score - a.score);
}
