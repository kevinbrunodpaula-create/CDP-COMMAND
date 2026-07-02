/**
 * CDP — COMMAND DNA 2.0
 * DNAMatcher.js — Compatibilidade Lead × Corretor
 * SPR-013 · KR7 Command DNA Inteligente
 */

'use strict';

var _nem = s => (s||'').trim().toLowerCase();
var _pvm = v => { const n=parseFloat(String(v||'').replace(/[^\d,.]/g,'').replace(/\./g,'').replace(',','.')); return isNaN(n)?0:n; };
var _clam = (n,a,b) => Math.max(a,Math.min(b,n));

/* ─────────────────────────────────────────────
   FATORES DE COMPATIBILIDADE
───────────────────────────────────────────── */

function fatorTipoImovel(lead, dna2) {
  const tipo = _nem(lead.tipo_imovel||'');
  if (!tipo) return { pts:0, max:25, motivo:null };
  const idx = dna2.indices;
  let pts = 0;
  if (tipo.includes('apartamento')) pts = idx.apartamentos * 0.25;
  else if (tipo.includes('casa'))   pts = idx.casas * 0.25;
  else if (tipo.includes('terreno'))pts = idx.terrenos * 0.25;
  else if (tipo.includes('comercial'))pts= idx.comercial * 0.25;
  pts = _clam(Math.round(pts), 0, 25);
  const motivo = pts >= 15 ? `Especialista em ${lead.tipo_imovel} (${pts}pts)` : null;
  return { pts, max:25, motivo };
}

function fatorFaixaPreco(lead, dna2) {
  const valor = _pvm(lead.valor);
  if (!valor) return { pts:0, max:20, motivo:null };
  const ticket = dna2.vivo.ticketMedio;
  if (!ticket) return { pts:5, max:20, motivo:null };
  const diff = Math.abs(valor - ticket) / ticket;
  const pts = diff < 0.1 ? 20 : diff < 0.25 ? 16 : diff < 0.5 ? 10 : diff < 1 ? 5 : 0;
  const motivo = pts >= 16 ? `Faixa de preço ideal para este consultor` : null;
  return { pts:_clam(pts,0,20), max:20, motivo };
}

function fatorRegiao(lead, dna2) {
  const bairroLead = _nem(lead.bairro||'');
  if (!bairroLead) return { pts:0, max:20, motivo:null };
  const hints = dna2.distribuicaoHints || {};
  const bPref = _nem(hints.bairroPreferido||'');
  if (bPref && bairroLead.includes(bPref)) return { pts:20, max:20, motivo:`Alta conversão na região ${lead.bairro}` };
  if (bPref && bPref.includes(bairroLead)) return { pts:15, max:20, motivo:`Atua na região ${lead.bairro}` };
  return { pts:5, max:20, motivo:null };
}

function fatorVelocidade(dna2) {
  const v = dna2.scores.velocidade;
  const pts = _clam(Math.round(v * 0.15), 0, 15);
  const motivo = v >= 80 ? `Tempo médio de resposta excelente` : null;
  return { pts, max:15, motivo };
}

function fatorConversao(dna2) {
  const c = dna2.scores.conversao;
  const pts = _clam(Math.round(c * 0.10), 0, 10);
  const motivo = c >= 70 ? `Alta taxa de conversão histórica` : null;
  return { pts, max:10, motivo };
}

function fatorOrigem(lead, dna2) {
  const origemLead = _nem(lead.origem||'');
  const melhorOrigem = _nem(dna2.vivo.melhorOrigem||'');
  if (!origemLead || !melhorOrigem) return { pts:0, max:10, motivo:null };
  const pts = origemLead === melhorOrigem ? 10 : 0;
  const motivo = pts ? `Maior conversão via ${lead.origem}` : null;
  return { pts, max:10, motivo };
}

/* ─────────────────────────────────────────────
   MATCH PRINCIPAL
───────────────────────────────────────────── */
function calcularMatch(lead, dna2) {
  const fatores = [
    fatorTipoImovel(lead, dna2),
    fatorFaixaPreco(lead, dna2),
    fatorRegiao(lead, dna2),
    fatorVelocidade(dna2),
    fatorConversao(dna2),
    fatorOrigem(lead, dna2),
  ];

  const totalPts = fatores.reduce((a,f)=>a+f.pts, 0);
  const maxPts   = fatores.reduce((a,f)=>a+f.max, 0);
  const pct      = Math.round((totalPts / maxPts) * 100);

  const motivos = fatores.map(f=>f.motivo).filter(Boolean);

  let estrelas = 1;
  if (pct >= 80) estrelas = 5;
  else if (pct >= 65) estrelas = 4;
  else if (pct >= 50) estrelas = 3;
  else if (pct >= 35) estrelas = 2;

  let recomendacao = 'Não recomendado';
  let corRec = '#EF4444';
  if (pct >= 75) { recomendacao='Altamente recomendado'; corRec='#22C55E'; }
  else if (pct >= 60) { recomendacao='Recomendado'; corRec='#0EA5E9'; }
  else if (pct >= 45) { recomendacao='Compatível'; corRec='#F59E0B'; }
  else if (pct >= 30) { recomendacao='Compatibilidade baixa'; corRec='#F97316'; }

  return { corretor:dna2.corretor, pct, estrelas, motivos, recomendacao, corRec, scoreGeral:dna2.scoreGeral };
}

/**
 * Rankeia corretores por compatibilidade com um lead.
 */
function rankearParaLead(lead, todosRNA2) {
  return todosRNA2
    .filter(d => d.corretor.nome && !['CEO','Diretor'].includes(d.corretor.cargo))
    .map(d => calcularMatch(lead, d))
    .sort((a,b) => b.pct - a.pct);
}
