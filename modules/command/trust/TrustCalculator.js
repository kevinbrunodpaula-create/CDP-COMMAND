/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — COMMAND TRUST ENGINE                                  ║
 * ║  TrustCalculator.js                                          ║
 * ║  SPR-005 · KR7 Command Trust                                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Funções PURAS de cálculo do ICC — Índice de Confiança do Corretor.
 * Zero dependências externas. Testável isoladamente.
 *
 * CRITÉRIOS (total 100 pontos base):
 *   Tempo médio de resposta    → 20%
 *   Atualização do CRM         → 15%
 *   Follow-ups realizados      → 15%
 *   Comparecimento às reuniões → 10%  (inferido de visitas/compromissos)
 *   Taxa de conversão          → 20%
 *   Qualidade dos registros    → 10%
 *   Leads abandonados          → penalidade até −15
 *   Leads recuperados          → bônus até +10
 *
 * RESTRIÇÕES SPR-005:
 *   ✗ Não redistribui leads
 *   ✗ Não altera responsáveis
 *   ✓ Apenas calcula, justifica e apresenta
 */

'use strict';

/* ─────────────────────────────────────────────
   NÍVEIS DO ICC
───────────────────────────────────────────── */
const TrustLevel = Object.freeze({
  COMMANDER      : 'COMMANDER',
  ALTA_CONFIANCA : 'ALTA CONFIANÇA',
  CONFIAVEL      : 'CONFIÁVEL',
  EM_OBSERVACAO  : 'EM OBSERVAÇÃO',
  CRITICO        : 'CRÍTICO',
});

const TRUST_LEVEL_CFG = Object.freeze({
  'COMMANDER'      : { min:95, color:'#A78BFA', bg:'rgba(167,139,250,0.1)', border:'rgba(167,139,250,0.28)', emoji:'⭐', badge:'rgba(167,139,250,0.15)' },
  'ALTA CONFIANÇA' : { min:85, color:'#22C55E', bg:'rgba(34,197,94,0.08)',  border:'rgba(34,197,94,0.25)',   emoji:'🏆', badge:'rgba(34,197,94,0.12)'   },
  'CONFIÁVEL'      : { min:70, color:'#0EA5E9', bg:'rgba(14,165,233,0.08)', border:'rgba(14,165,233,0.25)',  emoji:'✅', badge:'rgba(14,165,233,0.12)'  },
  'EM OBSERVAÇÃO'  : { min:50, color:'#EAB308', bg:'rgba(234,179,8,0.08)',  border:'rgba(234,179,8,0.25)',   emoji:'⚠️', badge:'rgba(234,179,8,0.12)'  },
  'CRÍTICO'        : { min:0,  color:'#EF4444', bg:'rgba(239,68,68,0.08)',  border:'rgba(239,68,68,0.25)',   emoji:'🚨', badge:'rgba(239,68,68,0.12)'   },
});

/* ─────────────────────────────────────────────
   HELPERS INTERNOS
───────────────────────────────────────────── */
var _norm  = s => (s || '').trim().toLowerCase();
var _clamp = (n, min, max) => Math.min(max, Math.max(min, n));
var _dias  = iso => iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : Infinity;
var _leads = (all, nome) => all.filter(l => _norm(l.corretor) === _norm(nome));
var _ativos= leads => leads.filter(l => l.status !== 'Fechado' && l.status !== 'Perdido');

/* ─────────────────────────────────────────────
   CRITÉRIO 1 — Tempo médio de resposta (0–20)
───────────────────────────────────────────── */
function iccRespostaRapida(leads) {
  const com = leads.filter(l => l.ultimo_contato && l.created_at);
  if (com.length === 0) return { pts: 8, max: 20, label: 'Tempo de resposta', status: 'neutro',
    detalhe: 'Sem dados suficientes para calcular.' };

  const horas = com.map(l =>
    Math.max(0, (new Date(l.ultimo_contato) - new Date(l.created_at)) / 3_600_000)
  ).filter(h => h < 720);
  const media = horas.length > 0 ? horas.reduce((a,b) => a+b,0)/horas.length : 0;

  let pts, detalhe, status;
  if (media < 1)      { pts=20; detalhe=`Responde em menos de 1h em média — excelente.`; status='forte'; }
  else if (media < 4) { pts=17; detalhe=`Tempo médio de ${media.toFixed(1)}h — muito bom.`; status='forte'; }
  else if (media < 12){ pts=12; detalhe=`Tempo médio de ${media.toFixed(1)}h — aceitável.`; status='neutro'; }
  else if (media < 24){ pts=7;  detalhe=`Tempo médio de ${media.toFixed(1)}h — precisa melhorar.`; status='fraco'; }
  else                { pts=2;  detalhe=`Tempo médio de ${media.toFixed(0)}h — crítico.`; status='fraco'; }

  return { pts, max:20, label:'Tempo de resposta', detalhe, status, mediaHoras: Math.round(media) };
}

/* ─────────────────────────────────────────────
   CRITÉRIO 2 — Atualização do CRM (0–15)
───────────────────────────────────────────── */
function iccAtualizacaoCRM(leads) {
  const ativos = _ativos(leads);
  if (ativos.length === 0) return { pts:15, max:15, label:'Atualização do CRM', status:'forte',
    detalhe:'Sem leads ativos — critério não penalizado.' };

  const parados = ativos.filter(l => _dias(l.ultimo_contato || l.updated_at || l.created_at) > 7).length;
  const pct = parados / ativos.length;

  let pts, detalhe, status;
  if (pct === 0)     { pts=15; detalhe='CRM 100% atualizado.'; status='forte'; }
  else if (pct<0.15) { pts=13; detalhe=`${parados} lead${parados>1?'s':''} sem atualização (${Math.round(pct*100)}%).`; status='forte'; }
  else if (pct<0.30) { pts=10; detalhe=`${parados} leads desatualizados (${Math.round(pct*100)}%).`; status='neutro'; }
  else if (pct<0.50) { pts=5;  detalhe=`${parados} leads desatualizados (${Math.round(pct*100)}%) — atenção.`; status='fraco'; }
  else               { pts=0;  detalhe=`${parados} leads desatualizados (${Math.round(pct*100)}%) — CRM crítico.`; status='fraco'; }

  return { pts, max:15, label:'Atualização do CRM', detalhe, status, pctParados: Math.round(pct*100) };
}

/* ─────────────────────────────────────────────
   CRITÉRIO 3 — Follow-ups realizados (0–15)
───────────────────────────────────────────── */
function iccFollowUps(leads) {
  const cutoff = new Date(Date.now() - 30*86_400_000).toISOString();
  let total = 0;
  leads.forEach(l => {
    try { total += (l.historico_contatos ? JSON.parse(l.historico_contatos) : []).filter(h => h.data >= cutoff).length; }
    catch { /* */ }
  });
  const porLead = leads.length > 0 ? (total / leads.length) : 0;

  let pts, detalhe, status;
  if (total >= 15)    { pts=15; detalhe=`${total} follow-ups em 30 dias — cadência excelente.`; status='forte'; }
  else if (total>=8)  { pts=12; detalhe=`${total} follow-ups em 30 dias — boa cadência.`; status='forte'; }
  else if (total>=4)  { pts=8;  detalhe=`${total} follow-ups em 30 dias — abaixo do ideal.`; status='neutro'; }
  else if (total>=1)  { pts=4;  detalhe=`Apenas ${total} follow-up${total>1?'s':''} em 30 dias.`; status='fraco'; }
  else                { pts=0;  detalhe='Nenhum follow-up registrado em 30 dias.'; status='fraco'; }

  return { pts, max:15, label:'Follow-ups realizados', detalhe, status, total, porLead: +porLead.toFixed(1) };
}

/* ─────────────────────────────────────────────
   CRITÉRIO 4 — Comparecimento às reuniões (0–10)
   Inferido por: visitas realizadas + leads avançados no funil
───────────────────────────────────────────── */
function iccComparecimento(leads) {
  const agendadas  = leads.filter(l => l.visita_data || l.status === 'Visita Marcada').length;
  const realizadas = leads.filter(l => ['Proposta','Documentação','Fechado'].includes(l.status)).length;

  if (agendadas === 0) return { pts:5, max:10, label:'Comparecimento', status:'neutro',
    detalhe:'Sem visitas agendadas para avaliar.' };

  const taxa = realizadas / agendadas;
  let pts, detalhe, status;
  if (taxa >= 0.8)    { pts=10; detalhe=`${realizadas}/${agendadas} visitas convertidas (${Math.round(taxa*100)}%).`; status='forte'; }
  else if (taxa>=0.5) { pts=7;  detalhe=`${realizadas}/${agendadas} visitas convertidas (${Math.round(taxa*100)}%).`; status='neutro'; }
  else if (taxa>=0.25){ pts=4;  detalhe=`Baixa conversão de visitas: ${Math.round(taxa*100)}%.`; status='fraco'; }
  else                { pts=1;  detalhe=`Muito poucas visitas convertidas: ${Math.round(taxa*100)}%.`; status='fraco'; }

  return { pts, max:10, label:'Comparecimento', detalhe, status, agendadas, realizadas };
}

/* ─────────────────────────────────────────────
   CRITÉRIO 5 — Taxa de conversão (0–20)
───────────────────────────────────────────── */
function iccConversao(leads) {
  const total  = leads.length;
  const vendas = leads.filter(l => l.status === 'Fechado').length;
  if (total < 3) return { pts:8, max:20, label:'Taxa de conversão', status:'neutro',
    detalhe:`Poucos leads (${total}) para calcular conversão.`, taxa:0, vendas };

  const taxa = vendas / total;
  let pts, detalhe, status;
  if (taxa >= 0.30)   { pts=20; detalhe=`${Math.round(taxa*100)}% de conversão (${vendas}/${total}) — elite.`; status='forte'; }
  else if (taxa>=0.20){ pts=17; detalhe=`${Math.round(taxa*100)}% de conversão (${vendas}/${total}) — excelente.`; status='forte'; }
  else if (taxa>=0.12){ pts=12; detalhe=`${Math.round(taxa*100)}% de conversão (${vendas}/${total}) — bom.`; status='neutro'; }
  else if (taxa>=0.06){ pts=6;  detalhe=`${Math.round(taxa*100)}% de conversão (${vendas}/${total}) — abaixo da meta.`; status='fraco'; }
  else                { pts=2;  detalhe=`${Math.round(taxa*100)}% de conversão — crítico.`; status='fraco'; }

  return { pts, max:20, label:'Taxa de conversão', detalhe, status, taxa: Math.round(taxa*100), vendas };
}

/* ─────────────────────────────────────────────
   CRITÉRIO 6 — Qualidade dos registros (0–10)
   Verifica completude dos campos nos leads
───────────────────────────────────────────── */
function iccQualidadeRegistros(leads) {
  if (leads.length === 0) return { pts:10, max:10, label:'Qualidade dos registros', status:'forte',
    detalhe:'Sem leads para avaliar.' };

  const campos = ['telefone','email','valor','bairro','origem','interesse'];
  const scores = leads.map(l => {
    const preenchidos = campos.filter(c => l[c] && String(l[c]).trim()).length;
    return preenchidos / campos.length;
  });
  const media = scores.reduce((a,b) => a+b,0) / scores.length;

  let pts, detalhe, status;
  if (media >= 0.85)    { pts=10; detalhe=`Registros ${Math.round(media*100)}% completos — excelente qualidade.`; status='forte'; }
  else if (media>=0.65) { pts=7;  detalhe=`Registros ${Math.round(media*100)}% completos.`; status='neutro'; }
  else if (media>=0.45) { pts=4;  detalhe=`Registros ${Math.round(media*100)}% completos — melhorar preenchimento.`; status='fraco'; }
  else                  { pts=1;  detalhe=`Registros incompletos (${Math.round(media*100)}%) — qualidade crítica.`; status='fraco'; }

  return { pts, max:10, label:'Qualidade dos registros', detalhe, status, completude: Math.round(media*100) };
}

/* ─────────────────────────────────────────────
   CRITÉRIO 7 — Leads abandonados (penalidade −15 a 0)
───────────────────────────────────────────── */
function iccAbandonados(leads) {
  const ativos     = _ativos(leads);
  const abandonados= ativos.filter(l => _dias(l.ultimo_contato || l.updated_at || l.created_at) >= 30).length;

  let pts, detalhe, status;
  if (abandonados === 0)  { pts=0;   detalhe='Nenhum lead abandonado — excelente.'; status='forte'; }
  else if (abandonados<=1){ pts=-3;  detalhe=`${abandonados} lead abandonado.`; status='neutro'; }
  else if (abandonados<=3){ pts=-7;  detalhe=`${abandonados} leads abandonados — atenção.`; status='fraco'; }
  else if (abandonados<=6){ pts=-11; detalhe=`${abandonados} leads abandonados — situação grave.`; status='fraco'; }
  else                    { pts=-15; detalhe=`${abandonados} leads abandonados — crítico.`; status='fraco'; }

  return { pts, max:0, min:-15, label:'Leads abandonados', detalhe, status, total: abandonados };
}

/* ─────────────────────────────────────────────
   CRITÉRIO 8 — Leads recuperados (bônus 0 a +10)
───────────────────────────────────────────── */
function iccRecuperados(leads) {
  const recuperados = leads.filter(l =>
    l.status === 'Follow-Up' && l.ultimo_contato && _dias(l.ultimo_contato) < 7
  ).length;

  let pts, detalhe, status;
  if (recuperados >= 5)     { pts=10; detalhe=`${recuperados} leads recuperados — ótimo resgate.`; status='forte'; }
  else if (recuperados >= 3){ pts=7;  detalhe=`${recuperados} leads recuperados.`; status='forte'; }
  else if (recuperados >= 1){ pts=3;  detalhe=`${recuperados} lead${recuperados>1?'s':''} recuperado${recuperados>1?'s':''}.`; status='neutro'; }
  else                      { pts=0;  detalhe='Nenhum lead recuperado recentemente.'; status='neutro'; }

  return { pts, max:10, label:'Leads recuperados', detalhe, status, total: recuperados };
}

/* ─────────────────────────────────────────────
   NÍVEL DO ICC
───────────────────────────────────────────── */
function getTrustLevel(icc) {
  if (icc >= 95) return 'COMMANDER';
  if (icc >= 85) return 'ALTA CONFIANÇA';
  if (icc >= 70) return 'CONFIÁVEL';
  if (icc >= 50) return 'EM OBSERVAÇÃO';
  return 'CRÍTICO';
}

/* ─────────────────────────────────────────────
   TENDÊNCIA (compara 30 dias vs período anterior)
───────────────────────────────────────────── */
function calcularTendencia(leads, nomeCorretor) {
  const agora  = Date.now();
  const d30    = new Date(agora - 30*86_400_000).toISOString();
  const d60    = new Date(agora - 60*86_400_000).toISOString();

  const recentes  = leads.filter(l => (l.updated_at||l.created_at) >= d30);
  const anteriores= leads.filter(l => { const d=l.updated_at||l.created_at; return d >= d60 && d < d30; });

  if (recentes.length === 0 && anteriores.length === 0) return { dir:'→', label:'Estável', delta:0 };

  // Calcula mini-ICC para cada período (só conversão + atualização como proxy)
  const miniICC = leadsP => {
    if (leadsP.length === 0) return 50;
    const vendas = leadsP.filter(l => l.status === 'Fechado').length;
    const conv   = Math.min(20, (vendas / leadsP.length) * 100);
    const ativos = leadsP.filter(l => l.status !== 'Fechado' && l.status !== 'Perdido');
    const parados= ativos.filter(l => _dias(l.ultimo_contato || l.updated_at || l.created_at) > 7).length;
    const crm    = ativos.length > 0 ? (1 - parados/ativos.length) * 15 : 15;
    return Math.round(conv + crm);
  };

  const delta = miniICC(recentes) - miniICC(anteriores);
  if (delta >= 3)       return { dir:'↑', label:'Evoluindo',  delta: Math.abs(delta) };
  if (delta <= -3)      return { dir:'↓', label:'Em queda',   delta: Math.abs(delta) };
  return                       { dir:'→', label:'Estável',    delta: 0 };
}

/* ─────────────────────────────────────────────
   JUSTIFICATIVA AUTOMÁTICA DO COMMAND
───────────────────────────────────────────── */
function gerarJustificativa(nome, iccAnterior, iccAtual, criterios) {
  const delta = iccAtual - (iccAnterior || iccAtual);
  const primeiroNome = nome.split(' ')[0];

  const fortes = criterios.filter(c => c.status === 'forte' && c.pts > 0);
  const fracos  = criterios.filter(c => c.status === 'fraco');

  let texto = `O ICC de ${primeiroNome} é ${iccAtual}/100`;
  if (delta > 0)       texto += ` (↑ ${delta} pontos)`;
  else if (delta < 0)  texto += ` (↓ ${Math.abs(delta)} pontos)`;
  texto += '.';

  if (fortes.length > 0) {
    const descricoes = fortes.slice(0,2).map(c => c.label.toLowerCase());
    texto += ` Pontos positivos: ${descricoes.join(', ')}.`;
  }
  if (fracos.length > 0) {
    const descricoes = fracos.slice(0,2).map(c => c.label.toLowerCase());
    texto += ` Pontos de atenção: ${descricoes.join(', ')}.`;
  }
  return texto;
}

/* ─────────────────────────────────────────────
   SUGESTÕES DO COMMAND
───────────────────────────────────────────── */
function gerarSugestoesTrust(criterios) {
  const s = [];
  const d = {};
  criterios.forEach(c => { d[c.label] = c; });

  if ((d['Tempo de resposta']?.pts || 0) < 12)
    s.push('Responder novos leads em menos de 4h aumenta significativamente o ICC.');
  if ((d['Atualização do CRM']?.pts || 0) < 10)
    s.push('Atualizar o status de cada lead após toda interação é fundamental para o CRM.');
  if ((d['Follow-ups realizados']?.pts || 0) < 8)
    s.push('Aumentar a cadência de follow-ups para pelo menos 2 por lead ativo por semana.');
  if ((d['Taxa de conversão']?.pts || 0) < 12)
    s.push('Revisar a abordagem de fechamento — priorize leads com proposta enviada há menos de 7 dias.');
  if ((d['Leads abandonados']?.pts || 0) < -5)
    s.push('Recuperar leads com 30+ dias de inatividade antes de solicitar novos.');
  if ((d['Qualidade dos registros']?.pts || 0) < 7)
    s.push('Preencher todos os campos do lead (telefone, email, valor, bairro, origem) melhora o ICC e facilita o match.');

  if (s.length === 0)
    s.push('Excelente performance! Manter a cadência atual e buscar novos leads de qualidade.');

  return s.slice(0, 3);
}

/* ─────────────────────────────────────────────
   FUNÇÃO PRINCIPAL — calcularICC
───────────────────────────────────────────── */

/**
 * Calcula o ICC completo de um consultor.
 * @param {object} corretor
 * @param {Array}  allLeads
 * @param {number} [iccAnterior]  — ICC da última execução (para delta e justificativa)
 * @returns {ICCResult}
 */
function calcularICC(corretor, allLeads, iccAnterior = null) {
  const leads    = _leads(allLeads, corretor.nome);
  const criterios = [
    iccRespostaRapida(leads),
    iccAtualizacaoCRM(leads),
    iccFollowUps(leads),
    iccComparecimento(leads),
    iccConversao(leads),
    iccQualidadeRegistros(leads),
    iccAbandonados(leads),
    iccRecuperados(leads),
  ];

  const bruto = criterios.reduce((acc, c) => acc + c.pts, 0);
  const icc   = _clamp(Math.round(bruto), 0, 100);
  const nivel = getTrustLevel(icc);
  const cfg   = TRUST_LEVEL_CFG[nivel];

  const tendencia    = calcularTendencia(leads, corretor.nome);
  const justificativa= gerarJustificativa(corretor.nome, iccAnterior, icc, criterios);
  const sugestoes    = gerarSugestoesTrust(criterios);

  const fortes  = criterios.filter(c => c.status === 'forte' && c.pts > 0);
  const fracos  = criterios.filter(c => c.status === 'fraco');

  const ativos = _ativos(leads);
  const ultimaAtividade = leads
    .map(l => l.ultimo_contato || l.updated_at || l.created_at)
    .filter(Boolean).sort().pop() || null;

  const tempoMedioResposta = criterios[0].mediaHoras ?? null;

  return {
    corretor,
    icc,
    iccAnterior,
    nivel,
    cfg,
    criterios,
    fortes,
    fracos,
    sugestoes,
    justificativa,
    tendencia,
    stats: {
      totalLeads       : leads.length,
      leadsAtivos      : ativos.length,
      vendas           : leads.filter(l => l.status === 'Fechado').length,
      abandonados      : criterios[6].total || 0,
      tempoMedioResposta,
      ultimaAtividade,
    },
    // Preparado para SPR-006 — Distribuição Inteligente
    distribuicaoWeight: {
      icc,
      nivel,
      confiavel: icc >= 70,
      prioridade: icc >= 85 ? 'alta' : icc >= 70 ? 'normal' : icc >= 50 ? 'baixa' : 'suspensa',
    },
  };
}

/**
 * Calcula ICC de toda a equipe.
 * @param {Array} allCorretores
 * @param {Array} allLeads
 * @param {object} [iccAnteriores]  — map {nome: iccAnterior}
 * @returns {ICCResult[]}
 */
function calcularICCEquipe(allCorretores, allLeads, iccAnteriores = {}) {
  return allCorretores
    .filter(c => c.nome && !['CEO','Diretor'].includes(c.cargo))
    .map(c => calcularICC(c, allLeads, iccAnteriores[c.nome] || null))
    .sort((a, b) => b.icc - a.icc);
}
