/**
 * CDP — COMMAND INTELLIGENCE
 * PerformanceEngine.js — Metas Inteligentes e Rankings
 * Release 2.9 · KR7 Command Intelligence
 */

'use strict';

var _normP  = s => (s||'').trim().toLowerCase();
var _leadsP = (all,nome) => all.filter(l=>_normP(l.corretor)===_normP(nome));
var _fmtBRL = v => v>0?v.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}):'—';
var _parseVP= v => { if(!v) return 0; const n=parseFloat(String(v).replace(/[^\d,.]/g,'').replace(/\./g,'').replace(',','.')); return isNaN(n)?0:n; };

var _hoje   = () => new Date().toISOString().slice(0,10);
var _ini    = (dias) => new Date(Date.now()-dias*86_400_000).toISOString();
var _iniMes = () => { const d=new Date(); return new Date(d.getFullYear(),d.getMonth(),1).toISOString(); };
var _iniSemana = () => { const d=new Date(); d.setDate(d.getDate()-d.getDay()); d.setHours(0,0,0,0); return d.toISOString(); };
var _iniAno = () => new Date(new Date().getFullYear(),0,1).toISOString();

/* ─────────────────────────────────────────────
   MÉTRICAS DE UM CONSULTOR
───────────────────────────────────────────── */
function calcMetricas(leads, periodo) {
  const vendas     = leads.filter(l=>l.status==='Fechado'&&(l.fechado_em||l.updated_at||'')>=periodo);
  const vgv        = vendas.reduce((a,l)=>a+_parseVP(l.valor),0);
  const visitas    = leads.filter(l=>l.visita_data>=periodo.slice(0,10)||
    (['Proposta','Documentação','Fechado'].includes(l.status)&&(l.updated_at||'')>=periodo)).length;
  const propostas  = leads.filter(l=>['Proposta','Documentação','Fechado'].includes(l.status)&&(l.updated_at||'')>=periodo).length;
  const novos      = leads.filter(l=>l.created_at>=periodo).length;

  let totalFU = 0;
  leads.forEach(l => {
    try { totalFU += (l.historico_contatos?JSON.parse(l.historico_contatos):[]).filter(h=>h.data>=periodo).length; }
    catch {}
  });

  const tempos = leads.filter(l=>l.ultimo_contato&&l.created_at)
    .map(l=>(new Date(l.ultimo_contato)-new Date(l.created_at))/3_600_000)
    .filter(h=>h>=0&&h<720);
  const tempoResp = tempos.length ? Math.round(tempos.reduce((a,b)=>a+b,0)/tempos.length) : null;
  const taxaConv  = leads.length > 0 ? Math.round((leads.filter(l=>l.status==='Fechado').length/leads.length)*100) : 0;

  return { vendas:vendas.length, vgv, vgvFmt:_fmtBRL(vgv), visitas, propostas, novos, totalFU, tempoResp, taxaConv };
}

/* ─────────────────────────────────────────────
   METAS INTELIGENTES (baseadas no histórico)
───────────────────────────────────────────── */
function calcularMetas(leads) {
  const mesAtual = calcMetricas(leads, _iniMes());
  const mesAnterior = calcMetricas(leads, _ini(60));
  const base = Math.max(mesAnterior.vendas || 1, 1);

  return {
    diaria  : { meta:1, atual: calcMetricas(leads,_ini(1)).vendas, label:'vendas/dia' },
    semanal : { meta: Math.max(2,Math.round(base/4)), atual:calcMetricas(leads,_iniSemana()).vendas, label:'vendas/semana' },
    mensal  : { meta: Math.max(3, Math.round(base*1.15)), atual:mesAtual.vendas, label:'vendas/mês' },
    anual   : { meta: Math.max(30, Math.round(base*12*1.1)), atual:calcMetricas(leads,_iniAno()).vendas, label:'vendas/ano' },
  };
}

/* ─────────────────────────────────────────────
   GRÁFICO DE EVOLUÇÃO (6 semanas)
───────────────────────────────────────────── */
function gerarEvolucaoSemanal(leads) {
  const semanas = [];
  for (let i=5; i>=0; i--) {
    const ini = new Date(Date.now()-(i+1)*7*86_400_000).toISOString();
    const fim = new Date(Date.now()-i*7*86_400_000).toISOString();
    const vendas = leads.filter(l=>l.status==='Fechado'&&(l.fechado_em||l.updated_at||'')>=ini&&(l.fechado_em||l.updated_at||'')<fim).length;
    const fuSem = (() => {
      let t=0; leads.forEach(l=>{ try{t+=(l.historico_contatos?JSON.parse(l.historico_contatos):[]).filter(h=>h.data>=ini&&h.data<fim).length;}catch{} }); return t;
    })();
    const d = new Date(Date.now()-i*7*86_400_000);
    semanas.push({ label:`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`, vendas, followups:fuSem });
  }
  return semanas;
}

/* ─────────────────────────────────────────────
   PERFORMANCE COMPLETA DE UM CONSULTOR
───────────────────────────────────────────── */
function calcularPerformance(corretor, allLeads, iccData, scoreData) {
  const leads     = _leadsP(allLeads, corretor.nome);
  const diaria    = calcMetricas(leads, _ini(1));
  const semanal   = calcMetricas(leads, _iniSemana());
  const mensal    = calcMetricas(leads, _iniMes());
  const total     = calcMetricas(leads, _ini(365));
  const metas     = calcularMetas(leads);
  const evolucao  = gerarEvolucaoSemanal(leads);

  const score = (() => {
    let s = 0;
    if (total.tempoResp !== null && total.tempoResp <= 4) s += 25;
    else if (total.tempoResp <= 12) s += 15;
    if (total.taxaConv >= 20) s += 25;
    else if (total.taxaConv >= 10) s += 15;
    if (mensal.vendas >= 3) s += 25;
    else if (mensal.vendas >= 1) s += 12;
    if (mensal.totalFU >= 10) s += 15;
    else if (mensal.totalFU >= 5) s += 8;
    if (mensal.visitas >= 5) s += 10;
    return Math.min(100, s);
  })();

  return {
    corretor, leads: leads.length,
    diaria, semanal, mensal, total, metas, evolucao, score,
    icc: iccData?.icc || null, nivel: iccData?.nivel || null,
    geradoEm: new Date().toISOString(),
  };
}

function calcularRanking(corretores, allLeads, iccMap = {}) {
  return corretores
    .filter(c => c.nome && !['CEO','Diretor'].includes(c.cargo))
    .map(c => calcularPerformance(c, allLeads, iccMap[c.nome] || null, null))
    .sort((a,b) => b.score - a.score);
}
