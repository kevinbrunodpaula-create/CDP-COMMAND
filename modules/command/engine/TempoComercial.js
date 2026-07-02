/**
 * CDP — TEMPO COMERCIAL
 * Release 5.0 · Registro automático de marcos comerciais
 *
 * Registra automaticamente quando o corretor usa os botões do CRM:
 * primeiro_contato, primeiro_followup, primeira_visita, primeira_proposta, venda
 *
 * NÃO usa horário do WhatsApp.
 * TUDO registrado quando o corretor clica nos botões correspondentes.
 */

'use strict';

var TempoComercial = (function() {

  var MARCOS = ['primeiro_contato','primeiro_followup','primeira_visita','primeira_proposta','fechado_em'];

  /* ─────────────────────────────────────────────
     REGISTRAR MARCO
  ───────────────────────────────────────────── */
  async function registrar(leadId, marco) {
    if (!MARCOS.includes(marco)) return;
    if (!leadId) return;
    try {
      const agora = new Date().toISOString();
      // Só registra se ainda não tiver esse marco
      const leads = typeof allLeads !== 'undefined' ? allLeads : [];
      const lead  = leads.find(l => l.id === leadId);
      if (lead && lead[marco]) return; // já registrado

      await SB.upd('leads', { [marco]: agora }, `id=eq.${leadId}`);

      // Atualiza o lead em memória
      if (lead) lead[marco] = agora;

      console.warn(`[TempoComercial] ${marco} registrado para lead ${leadId}`);
    } catch(e) {
      console.warn('[TempoComercial] Erro ao registrar:', e?.message);
    }
  }

  /* ─────────────────────────────────────────────
     CALCULAR TEMPOS PARA UM LEAD
  ───────────────────────────────────────────── */
  function calcularParaLead(lead) {
    if (!lead) return null;
    const ini = lead.created_at;
    function diff(a, b) {
      if (!a || !b) return null;
      const h = (new Date(b)-new Date(a))/3600000;
      return h >= 0 ? h : null;
    }
    function fmtH(h) {
      if (h === null) return '—';
      if (h < 1) return '< 1h';
      if (h < 24) return `${Math.round(h)}h`;
      return `${Math.round(h/24)}d`;
    }

    const tempoContato   = diff(ini, lead.primeiro_contato);
    const tempoVisita    = diff(ini, lead.primeira_visita);
    const tempoProposta  = diff(ini, lead.primeira_proposta);
    const tempoVenda     = diff(ini, lead.fechado_em);
    const tempoFU        = diff(lead.primeiro_contato, lead.primeiro_followup);

    return {
      tempoContato,   tempoContatoFmt:  fmtH(tempoContato),
      tempoVisita,    tempoVisitaFmt:   fmtH(tempoVisita),
      tempoProposta,  tempoPropostaFmt: fmtH(tempoProposta),
      tempoVenda,     tempoVendaFmt:    fmtH(tempoVenda),
      tempoFU,        tempoFUFmt:       fmtH(tempoFU),
    };
  }

  /* ─────────────────────────────────────────────
     MÉDIAS DA EQUIPE / CORRETOR
  ───────────────────────────────────────────── */
  function medias(leads) {
    function avg(arr) { return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null; }
    function fmtH(h) {
      if (h === null) return '—';
      if (h < 1) return '< 1h';
      if (h < 24) return `${Math.round(h)}h`;
      return `${Math.round(h/24)}d`;
    }

    const tc = leads.filter(l=>l.created_at&&l.primeiro_contato)
      .map(l=>(new Date(l.primeiro_contato)-new Date(l.created_at))/3600000)
      .filter(h=>h>=0&&h<720);
    const tv = leads.filter(l=>l.created_at&&l.primeira_visita)
      .map(l=>(new Date(l.primeira_visita)-new Date(l.created_at))/3600000)
      .filter(h=>h>=0);
    const tp = leads.filter(l=>l.created_at&&l.primeira_proposta)
      .map(l=>(new Date(l.primeira_proposta)-new Date(l.created_at))/3600000)
      .filter(h=>h>=0);
    const tve = leads.filter(l=>l.created_at&&l.fechado_em)
      .map(l=>(new Date(l.fechado_em)-new Date(l.created_at))/86400000)
      .filter(d=>d>=0&&d<730);

    const mContato   = avg(tc);
    const mVisita    = avg(tv);
    const mProposta  = avg(tp);
    const mVenda     = avg(tve);

    return {
      mContato,  mContatoFmt:  fmtH(mContato),
      mVisita,   mVisitaFmt:   fmtH(mVisita),
      mProposta, mPropostaFmt: fmtH(mProposta),
      mVenda:    mVenda !== null ? Math.round(mVenda) : null,
      mVendaFmt: mVenda !== null ? `${Math.round(mVenda)}d` : '—',
    };
  }

  return { registrar, calcularParaLead, medias };

})();
