/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — COMMAND DNA 2.0                                       ║
 * ║  DNAEngine.js                                                ║
 * ║  SPR-013 · KR7 Command DNA Inteligente                       ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Motor central do DNA 2.0.
 * Orquestra: Questionário → Aprendizado Automático → DNA Vivo → Scores
 *
 * PREPARADO para IA futura: toda lógica é stateless e injetável.
 */

'use strict';

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
var _ne  = s => (s||'').trim().toLowerCase();
var _clm = (n,a,b) => Math.max(a, Math.min(b, n));
var _pv  = v => { const n=parseFloat(String(v||'').replace(/[^\d,.]/g,'').replace(/\./g,'').replace(',','.')); return isNaN(n)?0:n; };
var _dsd = iso => iso ? (Date.now()-new Date(iso).getTime())/86400000 : 999;
var _lcf = (all,nome) => all.filter(l=>_ne(l.corretor)===_ne(nome));

/* ─────────────────────────────────────────────
   8 ÍNDICES DE ESPECIALIDADE (0-100)
───────────────────────────────────────────── */
function calcularIndices(corretor, allLeads) {
  const leads  = _lcf(allLeads, corretor.nome);
  const vendas = leads.filter(l => l.status === 'Fechado');

  function idxTipo(tipo) {
    const vt = vendas.filter(l => _ne(l.tipo_imovel).includes(_ne(tipo)));
    return _clm(Math.round((vt.length / Math.max(vendas.length, 1)) * 100 * 1.5), 0, 100);
  }

  const temMCMV   = vendas.filter(l => _pv(l.valor) < 350000).length;
  const temAP     = vendas.filter(l => _pv(l.valor) > 800000).length;
  const temInv    = leads.filter(l => _ne(l.interesse||'').includes('invest')).length;
  const temPrime  = leads.filter(l => _ne(l.interesse||'').includes('primeiro') || _ne(l.interesse||'').includes('1')).length;
  const temCom    = vendas.filter(l => _ne(l.tipo_imovel||'').includes('comercial')).length;
  const total     = Math.max(leads.length, 1);

  return {
    apartamentos   : idxTipo('apartamento'),
    casas          : idxTipo('casa'),
    terrenos       : idxTipo('terreno'),
    mcmv           : _clm(Math.round((temMCMV / Math.max(vendas.length,1)) * 180), 0, 100),
    altopadrao     : _clm(Math.round((temAP   / Math.max(vendas.length,1)) * 180), 0, 100),
    investidor     : _clm(Math.round((temInv  / total) * 200), 0, 100),
    primeiroImovel : _clm(Math.round((temPrime/ total) * 200), 0, 100),
    comercial      : _clm(Math.round((temCom  / Math.max(vendas.length,1)) * 180), 0, 100),
  };
}

/* ─────────────────────────────────────────────
   8 SCORES COMPORTAMENTAIS (0-100)
───────────────────────────────────────────── */
function calcularScores(corretor, allLeads, questionario) {
  const leads   = _lcf(allLeads, corretor.nome);
  const ativos  = leads.filter(l => !['Fechado','Perdido'].includes(l.status));
  const vendas  = leads.filter(l => l.status === 'Fechado');
  const perdidos= leads.filter(l => l.status === 'Perdido');

  // Velocidade (tempo médio de resposta)
  const tempos = leads.filter(l=>l.ultimo_contato&&l.created_at)
    .map(l=>(new Date(l.ultimo_contato)-new Date(l.created_at))/3600000)
    .filter(h=>h>=0&&h<720);
  const tmResp = tempos.length ? tempos.reduce((a,b)=>a+b,0)/tempos.length : 24;
  const velocidade = _clm(Math.round(tmResp<=2?100:tmResp<=4?88:tmResp<=8?72:tmResp<=12?55:tmResp<=24?40:20), 0, 100);

  // Conversão
  const conversao = leads.length > 0 ? _clm(Math.round((vendas.length/leads.length)*100*4), 0, 100) : 0;

  // Follow-up
  let totalFU = 0;
  leads.forEach(l => { try { totalFU += (l.historico_contatos?JSON.parse(l.historico_contatos):[]).length; } catch {} });
  const followup = _clm(Math.round(totalFU / Math.max(leads.length,1) * 20), 0, 100);

  // Organização (% campos preenchidos)
  const campos = ['telefone','email','valor','bairro','origem','tipo_imovel'];
  const orgScore = leads.length > 0
    ? Math.round(leads.reduce((acc,l)=>acc+campos.filter(c=>l[c]&&String(l[c]).trim()).length,0) / (leads.length*campos.length) * 100)
    : 100;
  const organizacao = _clm(orgScore, 0, 100);

  // Persistência (visitas + propostas / leads ativos)
  const visitas  = leads.filter(l=>['Visita Marcada','Proposta','Documentação','Fechado'].includes(l.status)).length;
  const persistencia = ativos.length > 0 ? _clm(Math.round((visitas/Math.max(leads.length,1))*150), 0, 100) : 0;

  // Negociação (propostas que fecharam)
  const propostas = leads.filter(l=>['Proposta','Documentação','Fechado'].includes(l.status)).length;
  const negociacao = propostas > 0 ? _clm(Math.round((vendas.length/propostas)*100), 0, 100) : 0;

  // Comunicação — do questionário se disponível, senão estimado
  const qComm = questionario?.comunicacao ?? null;
  const comunicacao = qComm !== null ? qComm : _clm(Math.round(velocidade*0.6 + followup*0.4), 0, 100);

  // Relacionamento (taxa de retenção: leads que passam por múltiplas etapas)
  const multietapa = leads.filter(l=>['Visita Marcada','Proposta','Documentação','Fechado'].includes(l.status)).length;
  const relacionamento = leads.length > 0 ? _clm(Math.round((multietapa/leads.length)*130), 0, 100) : 0;

  return { comunicacao, negociacao, followup, velocidade, organizacao, conversao, persistencia, relacionamento };
}

/* ─────────────────────────────────────────────
   APRENDIZADO AUTOMÁTICO — DNA VIVO
   Analisa padrões temporais do comportamento
───────────────────────────────────────────── */
function calcularDNAVivo(corretor, allLeads) {
  const leads  = _lcf(allLeads, corretor.nome);
  const vendas = leads.filter(l => l.status === 'Fechado');

  // Melhor horário de atendimento
  const horMap = {};
  leads.forEach(l => {
    if (l.ultimo_contato) {
      const h = new Date(l.ultimo_contato).getHours();
      const faixa = h<9?'Manhã cedo (6-9h)':h<12?'Manhã (9-12h)':h<14?'Almoço (12-14h)':h<18?'Tarde (14-18h)':h<21?'Noite (18-21h)':'Noite (21h+)';
      horMap[faixa] = (horMap[faixa]||0)+1;
    }
  });
  const melhorHorario = Object.entries(horMap).sort((a,b)=>b[1]-a[1])[0]?.[0] || null;

  // Melhor dia da semana
  const diasNome = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const diaMap = {};
  leads.forEach(l => {
    if (l.ultimo_contato) {
      const d = diasNome[new Date(l.ultimo_contato).getDay()];
      diaMap[d] = (diaMap[d]||0)+1;
    }
  });
  const melhorDia = Object.entries(diaMap).sort((a,b)=>b[1]-a[1])[0]?.[0] || null;

  // Ticket médio e faixa predominante
  const valores = vendas.map(l=>_pv(l.valor)).filter(v=>v>0);
  const ticketMedio = valores.length ? Math.round(valores.reduce((a,b)=>a+b,0)/valores.length) : 0;
  let faixaPredo = 'Não identificada';
  if (ticketMedio > 0) {
    if (ticketMedio < 300000)      faixaPredo = 'Econômico (até R$300k)';
    else if (ticketMedio < 600000) faixaPredo = 'Médio (R$300k–R$600k)';
    else if (ticketMedio < 1000000)faixaPredo = 'Alto (R$600k–R$1M)';
    else                           faixaPredo = 'Alto Padrão (acima R$1M)';
  }

  // Origem com maior conversão
  const origMap = {};
  leads.forEach(l => {
    const o = l.origem||'Outro';
    if (!origMap[o]) origMap[o] = { total:0, vendas:0 };
    origMap[o].total++;
    if (l.status==='Fechado') origMap[o].vendas++;
  });
  const melhorOrigem = Object.entries(origMap)
    .filter(([,v])=>v.total>=2)
    .map(([k,v])=>({ origem:k, conv:Math.round(v.vendas/v.total*100) }))
    .sort((a,b)=>b.conv-a.conv)[0]?.origem || null;

  // Tempo médio até venda (dias)
  const temposVenda = vendas
    .filter(l=>l.created_at&&l.fechado_em)
    .map(l=>(new Date(l.fechado_em)-new Date(l.created_at))/86400000)
    .filter(d=>d>=0&&d<730);
  const tempoMedioVenda = temposVenda.length ? Math.round(temposVenda.reduce((a,b)=>a+b,0)/temposVenda.length) : null;

  // Evolução mensal (últimos 6 meses)
  const evolucao = [];
  for (let i=5; i>=0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth()-i);
    const mes = d.toLocaleString('pt-BR',{month:'short',year:'2-digit'});
    const ini = new Date(d.getFullYear(),d.getMonth(),1).toISOString();
    const fim = new Date(d.getFullYear(),d.getMonth()+1,1).toISOString();
    const vMes = vendas.filter(l=>(l.fechado_em||l.updated_at||'')>=ini&&(l.fechado_em||l.updated_at||'')<fim).length;
    const lMes = leads.filter(l=>l.created_at>=ini&&l.created_at<fim).length;
    evolucao.push({ mes, vendas:vMes, leads:lMes, conv:lMes>0?Math.round(vMes/lMes*100):0 });
  }

  return { melhorHorario, melhorDia, faixaPredo, melhorOrigem, tempoMedioVenda, ticketMedio, evolucao };
}

/* ─────────────────────────────────────────────
   SCORE GERAL DO DNA (0-100)
───────────────────────────────────────────── */
function calcularScoreGeral(scores, indices) {
  const pesos = { conversao:0.28, velocidade:0.18, followup:0.14, negociacao:0.12,
                  organizacao:0.10, persistencia:0.10, comunicacao:0.05, relacionamento:0.03 };
  const base = Object.entries(pesos).reduce((acc,[k,p]) => acc + (scores[k]||0)*p, 0);

  // Bônus por especialidade desenvolvida
  const maxIndice = Math.max(...Object.values(indices));
  const bonus = maxIndice >= 70 ? 5 : maxIndice >= 50 ? 3 : 0;

  return _clm(Math.round(base + bonus), 0, 100);
}

/* ─────────────────────────────────────────────
   NÍVEL DO DNA
───────────────────────────────────────────── */
function nivelDNA(score) {
  if (score >= 85) return { label:'Elite', cor:'#FFD700', emoji:'🏆' };
  if (score >= 70) return { label:'Avançado', cor:'#22C55E', emoji:'⭐' };
  if (score >= 50) return { label:'Desenvolvido', cor:'#0EA5E9', emoji:'📈' };
  if (score >= 30) return { label:'Em Evolução', cor:'#F59E0B', emoji:'🌱' };
  return { label:'Iniciante', cor:'#64748B', emoji:'🔰' };
}

/* ─────────────────────────────────────────────
   FUNÇÃO PRINCIPAL
───────────────────────────────────────────── */
function calcularDNA2(corretor, allLeads, questionario) {
  const indices   = calcularIndices(corretor, allLeads);
  const scores    = calcularScores(corretor, allLeads, questionario);
  const vivo      = calcularDNAVivo(corretor, allLeads);
  const scoreGeral = calcularScoreGeral(scores, indices);
  const nivel     = nivelDNA(scoreGeral);

  return {
    corretor, questionario: questionario || null,
    indices, scores, vivo, scoreGeral, nivel,
    geradoEm: new Date().toISOString(),
  };
}

function calcularDNA2Equipe(corretores, allLeads, questionarios) {
  return corretores
    .filter(c => c.nome && !['CEO','Diretor'].includes(c.cargo))
    .map(c => calcularDNA2(c, allLeads, questionarios?.[c.nome] || null))
    .sort((a,b) => b.scoreGeral - a.scoreGeral);
}
