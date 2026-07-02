/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — COMMAND ENGINE                                        ║
 * ║  Release 5.0 · Motor Central de Inteligência                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Motor único que agrega e analisa TODOS os dados do CRM.
 * ZERO dependências de APIs externas. 100% regras matemáticas.
 *
 * Analisa: Leads · Agenda · Visitas · Propostas · Conversões
 *          DNA · ICC · Recovery · Tempo Comercial · Eventos · Metas
 */

'use strict';

var CommandEngine = (function() {

  /* ─────────────────────────────────────────────
     HELPERS INTERNOS
  ───────────────────────────────────────────── */
  var _n   = s => (s||'').trim().toLowerCase();
  var _ds  = iso => iso ? (Date.now()-new Date(iso).getTime())/86400000 : 999;
  var _pv  = v => { const n=parseFloat(String(v||'').replace(/[^\d,.]/g,'').replace(/\./g,'').replace(',','.')); return isNaN(n)?0:n; };
  var _clp = (n,a,b) => Math.max(a,Math.min(b,n));
  var _hoje= () => new Date().toISOString().slice(0,10);

  function _leads() { return typeof allLeads!=='undefined'?allLeads:[]; }
  function _corretores() { return typeof allCorretores!=='undefined'?allCorretores:[]; }
  function _usuario() { return typeof currentUser!=='undefined'?currentUser:null; }

  /* ─────────────────────────────────────────────
     1. ANÁLISE DE LEADS
  ───────────────────────────────────────────── */
  function analisarLeads(leads) {
    const ativos   = leads.filter(l => !['Fechado','Perdido'].includes(l.status));
    const vendas   = leads.filter(l => l.status === 'Fechado');
    const perdidos = leads.filter(l => l.status === 'Perdido');
    const hoje     = _hoje();

    const criticos = ativos.filter(l => _ds(l.ultimo_contato||l.updated_at||l.created_at) > 15);
    const parados  = ativos.filter(l => _ds(l.ultimo_contato||l.updated_at||l.created_at) > 7);
    const novosHoje= leads.filter(l => (l.created_at||'').startsWith(hoje));
    const visitasHoje = ativos.filter(l => l.visita_data === hoje);
    const propostas= ativos.filter(l => l.status === 'Proposta');
    const semCorretor = ativos.filter(l => !l.corretor?.trim());

    const iniMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const vendasMes = vendas.filter(l => (l.fechado_em||l.updated_at||'') >= iniMes);
    const vgvMes = vendasMes.reduce((a,l) => a+_pv(l.valor), 0);

    const conv = leads.length > 0 ? Math.round(vendas.length/leads.length*100) : 0;

    return {
      total:leads.length, ativos:ativos.length, vendas:vendas.length,
      perdidos:perdidos.length, criticos:criticos.length, parados:parados.length,
      novosHoje:novosHoje.length, visitasHoje:visitasHoje.length,
      propostas:propostas.length, semCorretor:semCorretor.length,
      vendasMes:vendasMes.length, vgvMes, conv,
      leadsCriticos: criticos.slice(0,5),
      leadsParados:  parados.slice(0,5),
    };
  }

  /* ─────────────────────────────────────────────
     2. TEMPO COMERCIAL
  ───────────────────────────────────────────── */
  function calcularTempoComercial(leads) {
    const tempos = [];
    leads.filter(l=>l.status==='Fechado'&&l.created_at&&l.fechado_em).forEach(l => {
      const dias = (new Date(l.fechado_em)-new Date(l.created_at))/86400000;
      if (dias >= 0 && dias < 730) tempos.push(dias);
    });

    const respostas = leads.filter(l=>l.ultimo_contato&&l.created_at)
      .map(l=>(new Date(l.ultimo_contato)-new Date(l.created_at))/3600000)
      .filter(h=>h>=0&&h<720);

    return {
      tempoMedioVenda: tempos.length ? Math.round(tempos.reduce((a,b)=>a+b,0)/tempos.length) : null,
      tempoMedioResposta: respostas.length ? Math.round(respostas.reduce((a,b)=>a+b,0)/respostas.length) : null,
      totalVendasAnalisadas: tempos.length,
    };
  }

  /* ─────────────────────────────────────────────
     3. SCORE DE CORRETOR (0-100)
  ───────────────────────────────────────────── */
  function scoreCorretor(nome, leads) {
    const meus = leads.filter(l => _n(l.corretor) === _n(nome));
    if (!meus.length) return 0;
    const ativos = meus.filter(l=>!['Fechado','Perdido'].includes(l.status));
    const vendas = meus.filter(l=>l.status==='Fechado');
    const conv = meus.length>0?vendas.length/meus.length:0;
    const tempos = meus.filter(l=>l.ultimo_contato&&l.created_at)
      .map(l=>(new Date(l.ultimo_contato)-new Date(l.created_at))/3600000).filter(h=>h>=0&&h<720);
    const tmResp = tempos.length?tempos.reduce((a,b)=>a+b,0)/tempos.length:24;
    const criticos = ativos.filter(l=>_ds(l.ultimo_contato||l.updated_at||l.created_at)>15).length;

    const pConv   = _clp(Math.round(conv*300), 0, 35);
    const pVel    = _clp(Math.round(tmResp<=2?30:tmResp<=4?24:tmResp<=8?18:tmResp<=24?10:5), 0, 30);
    const pCrit   = _clp(Math.round(20-(criticos/Math.max(ativos.length,1))*40), 0, 20);
    const pVol    = _clp(Math.round(meus.length/10*15), 0, 15);

    return Math.min(100, pConv+pVel+pCrit+pVol);
  }

  /* ─────────────────────────────────────────────
     4. RANKING DA EQUIPE
  ───────────────────────────────────────────── */
  function rankingEquipe(leads, corretores) {
    return corretores
      .filter(c=>c.cargo==='Corretor'&&c.ativo!==false)
      .map(c => {
        const meus  = leads.filter(l=>_n(l.corretor)===_n(c.nome));
        const ativos= meus.filter(l=>!['Fechado','Perdido'].includes(l.status));
        const vendas= meus.filter(l=>l.status==='Fechado');
        const iniMes= new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString();
        const vendasMes = vendas.filter(l=>(l.fechado_em||l.updated_at||'')>=iniMes).length;
        return {
          corretor:c, score:scoreCorretor(c.nome, leads),
          totalLeads:meus.length, ativos:ativos.length,
          vendas:vendas.length, vendasMes,
          conv:meus.length>0?Math.round(vendas.length/meus.length*100):0,
        };
      })
      .sort((a,b)=>b.score-a.score);
  }

  /* ─────────────────────────────────────────────
     5. RECOMENDAÇÕES PERSONALIZADAS (não genéricas)
  ───────────────────────────────────────────── */
  function recomendacoes(leads, corretores, perfil, nomeUsuario) {
    const recs = [];
    const meus = nomeUsuario ? leads.filter(l=>_n(l.corretor)===_n(nomeUsuario)) : leads;
    const ativos= meus.filter(l=>!['Fechado','Perdido'].includes(l.status));

    // Corretor: leads pessoais críticos
    if (perfil === 'Corretor') {
      const criticos = ativos.filter(l=>_ds(l.ultimo_contato||l.updated_at||l.created_at)>7);
      criticos.slice(0,3).forEach(l => {
        const dias = Math.round(_ds(l.ultimo_contato||l.updated_at||l.created_at));
        recs.push({ tipo:'urgente', icone:'⏸', titulo:`Retomar contato: ${l.nome}`, motivo:`${dias} dias sem movimentação. Status: ${l.status}.` });
      });
      const hoje = _hoje();
      const visitasHoje = ativos.filter(l=>l.visita_data===hoje);
      visitasHoje.forEach(l => recs.push({ tipo:'visita', icone:'📅', titulo:`Visita hoje: ${l.nome}`, motivo:`Confirme o horário e prepare o material.` }));
      const propostas = ativos.filter(l=>l.status==='Proposta'&&_ds(l.ultimo_contato||l.updated_at||l.created_at)>3);
      propostas.slice(0,2).forEach(l => recs.push({ tipo:'proposta', icone:'📄', titulo:`Follow-up proposta: ${l.nome}`, motivo:`Proposta sem retorno há ${Math.round(_ds(l.ultimo_contato||l.updated_at||l.created_at))} dias.` }));
    }

    // Coordenador: equipe
    if (perfil === 'Coordenador') {
      const ranking = rankingEquipe(leads, corretores);
      ranking.filter(r=>r.ativos===0).slice(0,3).forEach(r => {
        recs.push({ tipo:'distribuicao', icone:'👤', titulo:`${r.corretor.nome} sem leads ativos`, motivo:'Distribuir novos leads para manter produtividade.' });
      });
      const criticos = leads.filter(l=>!['Fechado','Perdido'].includes(l.status)&&_ds(l.ultimo_contato||l.updated_at||l.created_at)>15&&l.corretor);
      if (criticos.length>0) recs.push({ tipo:'urgente', icone:'🔴', titulo:`${criticos.length} lead(s) crítico(s) na equipe`, motivo:`Leads parados há mais de 15 dias. Recovery necessário.` });
    }

    // Gestor: operação
    if (['CEO','Diretor','Gerente'].includes(perfil)) {
      const allAtivos = leads.filter(l=>!['Fechado','Perdido'].includes(l.status));
      const semCorr = allAtivos.filter(l=>!l.corretor?.trim());
      if (semCorr.length>0) recs.push({ tipo:'urgente', icone:'👤', titulo:`${semCorr.length} lead(s) sem responsável`, motivo:'Distribuir imediatamente para não perder oportunidades.' });
      const criticos = allAtivos.filter(l=>_ds(l.ultimo_contato||l.updated_at||l.created_at)>20);
      if (criticos.length>0) recs.push({ tipo:'recovery', icone:'♻️', titulo:`${criticos.length} lead(s) em recovery crítico`, motivo:`Parados há mais de 20 dias. Ação imediata necessária.` });
      const visitasHoje = allAtivos.filter(l=>l.visita_data===_hoje());
      if (visitasHoje.length>0) recs.push({ tipo:'visita', icone:'🏠', titulo:`${visitasHoje.length} visita(s) hoje`, motivo:'Confirme com os consultores e clientes.' });
    }

    return recs.slice(0,6);
  }

  /* ─────────────────────────────────────────────
     6. SAÚDE DA OPERAÇÃO (0-100)
  ───────────────────────────────────────────── */
  function saudeOperacao(leads, corretores) {
    if (!leads.length) return { score:0, cor:'#64748B', emoji:'⚫', label:'Sem dados' };
    const analise = analisarLeads(leads);
    const pConv    = _clp(Math.round(analise.conv/25*25), 0, 25);
    const pParados = _clp(Math.round(20-(analise.parados/Math.max(analise.ativos,1))*40), 0, 20);
    const tc       = calcularTempoComercial(leads);
    const tmR      = tc.tempoMedioResposta||24;
    const pTempo   = tmR<=4?20:tmR<=8?16:tmR<=12?12:tmR<=24?7:3;
    const pRecovery= _clp(Math.round(15-(analise.criticos/Math.max(analise.ativos,1))*30), 0, 15);
    const pCorretor= _clp(Math.round(10-(analise.semCorretor/Math.max(analise.ativos,1))*20), 0, 10);
    const iniMes   = new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString();
    const vM       = leads.filter(l=>l.status==='Fechado'&&(l.fechado_em||l.updated_at||'')>=iniMes).length;
    const pMeta    = Math.min(10, vM*2);
    const score    = pConv+pParados+pTempo+pRecovery+pCorretor+pMeta;
    const cor      = score>=75?'#22C55E':score>=55?'#0EA5E9':score>=35?'#F59E0B':'#EF4444';
    const emoji    = score>=75?'🟢':score>=55?'🔵':score>=35?'🟡':'🔴';
    const label    = score>=75?'Saudável':score>=55?'Estável':score>=35?'Atenção':'Crítico';
    return { score, cor, emoji, label };
  }

  /* ─────────────────────────────────────────────
     7. META PESSOAL DO CORRETOR
  ───────────────────────────────────────────── */
  function metaCorretor(nome, leads, metaMensal=5) {
    const meus = leads.filter(l=>_n(l.corretor)===_n(nome));
    const iniMes = new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString();
    const vendasMes = meus.filter(l=>l.status==='Fechado'&&(l.fechado_em||l.updated_at||'')>=iniMes).length;
    const diasPassados = new Date().getDate();
    const diasTotais   = new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
    const diasRestantes= diasTotais - diasPassados;
    const ritmo        = diasPassados>0?vendasMes/diasPassados:0;
    const projecao     = Math.round(vendasMes + ritmo*diasRestantes);
    const pct          = Math.round(vendasMes/metaMensal*100);
    return { vendas:vendasMes, meta:metaMensal, pct:Math.min(pct,100), projecao, diasRestantes };
  }

  /* ─────────────────────────────────────────────
     8. INSIGHTS AUTOMÁTICOS
  ───────────────────────────────────────────── */
  function insights(leads, corretores) {
    const result = [];
    const vendas = leads.filter(l=>l.status==='Fechado');
    if (!vendas.length) return [{ texto:'Continue registrando atendimentos para gerar insights.' }];

    // Melhor tipo de imóvel
    const tipoMap = {};
    leads.forEach(l => {
      const t = l.tipo_imovel||'Outro';
      if (!tipoMap[t]) tipoMap[t]={t:0,v:0};
      tipoMap[t].t++; if(l.status==='Fechado')tipoMap[t].v++;
    });
    const topTipo = Object.entries(tipoMap).filter(([,v])=>v.t>=2).sort((a,b)=>(b[1].v/b[1].t)-(a[1].v/a[1].t))[0];
    if (topTipo) result.push({ texto:`${topTipo[0]} tem a maior taxa de conversão: ${Math.round(topTipo[1].v/topTipo[1].t*100)}%.` });

    // Melhor origem
    const origMap = {};
    leads.forEach(l => {
      const o = l.origem||'Outro';
      if (!origMap[o]) origMap[o]={t:0,v:0};
      origMap[o].t++; if(l.status==='Fechado')origMap[o].v++;
    });
    const topOrig = Object.entries(origMap).filter(([,v])=>v.t>=3).sort((a,b)=>(b[1].v/b[1].t)-(a[1].v/a[1].t))[0];
    if (topOrig) result.push({ texto:`${topOrig[0]} converte ${Math.round(topOrig[1].v/topOrig[1].t*100)}% — melhor canal.` });

    // Top corretor
    const cMap = {};
    vendas.forEach(l => { if(l.corretor) cMap[l.corretor]=(cMap[l.corretor]||0)+1; });
    const top = Object.entries(cMap).sort((a,b)=>b[1]-a[1])[0];
    if (top) result.push({ texto:`${top[0]} lidera com ${top[1]} venda${top[1]>1?'s':''} — referência da equipe.` });

    // Projeção mensal
    const iniMes = new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString();
    const vMes = vendas.filter(l=>(l.fechado_em||l.updated_at||'')>=iniMes).length;
    const dias = new Date().getDate()||1;
    const diasR = new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate()-dias;
    if (vMes>0) result.push({ texto:`Ritmo atual projeta ${vMes+Math.round(vMes/dias*diasR)} vendas no mês.` });

    return result.slice(0,4);
  }

  /* ─────────────────────────────────────────────
     9. TIMELINE
  ───────────────────────────────────────────── */
  function timeline(leads, nomeUsuario, limite=30) {
    const filtrados = nomeUsuario
      ? leads.filter(l=>_n(l.corretor)===_n(nomeUsuario))
      : leads;

    const cores = { 'Fechado':'#22C55E','Perdido':'#EF4444','Visita Marcada':'#8B5CF6',
      'Proposta':'#0EA5E9','Lead Novo':'#34D399','Follow-Up':'#F59E0B',
      'Documentação':'#14B8A6','Em Atendimento':'#F97316','Qualificado':'#60A5FA' };

    return [...filtrados]
      .sort((a,b)=>new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at))
      .slice(0, limite)
      .map(l => {
        const ts = l.updated_at||l.created_at;
        const diff = (Date.now()-new Date(ts).getTime())/3600000;
        const tempo = diff<1?'Agora':diff<24?`${Math.round(diff)}h atrás`:`${Math.round(diff/24)}d atrás`;
        return { cor:cores[l.status]||'#64748B', desc:`${l.nome} → ${l.status||'Lead Novo'}${l.corretor?` (${l.corretor})`:' (sem corretor)'}`, tempo };
      });
  }

  /* ─────────────────────────────────────────────
     10. ANÁLISE COMPLETA (ponto de entrada único)
  ───────────────────────────────────────────── */
  function analisarCompleto(opcoes) {
    opcoes = opcoes || {};
    const leads     = _leads();
    const corretores= _corretores();
    const usuario   = _usuario();
    const perfil    = usuario?.cargo || 'Corretor';
    const nome      = usuario?.nome  || '';

    // Filtra leads por perfil para segurança
    const leadsFiltrados = (perfil==='Corretor'||perfil==='Coordenador'&&opcoes.apenasEquipe)
      ? leads.filter(l => perfil==='Corretor' ? _n(l.corretor)===_n(nome) : true)
      : leads;

    return {
      perfil, nomeUsuario:nome,
      leads:           analisarLeads(leadsFiltrados),
      tempoComercial:  calcularTempoComercial(leadsFiltrados),
      saude:           saudeOperacao(leadsFiltrados, corretores),
      ranking:         (perfil==='Corretor')?[]:rankingEquipe(leads, corretores),
      recomendacoes:   recomendacoes(leads, corretores, perfil, nome),
      insights:        insights(leadsFiltrados, corretores),
      timeline:        timeline(leadsFiltrados, perfil==='Corretor'?nome:null),
      meta:            perfil==='Corretor'?metaCorretor(nome, leads):null,
      geradoEm:        new Date().toISOString(),
    };
  }

  /* ─────────────────────────────────────────────
     API PÚBLICA
  ───────────────────────────────────────────── */
  return {
    analisarCompleto,
    analisarLeads,
    calcularTempoComercial,
    scoreCorretor,
    rankingEquipe,
    recomendacoes,
    saudeOperacao,
    metaCorretor,
    insights,
    timeline,
  };

})();
