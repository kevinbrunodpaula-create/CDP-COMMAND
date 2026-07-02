function reiniciarSessaoDisc(){
  discSessao={atendeu:0,nao:0,ag:0,decl:0,hist:[]};
  discIdxAtual=0;
  renderDiscagem();
}

function renderDiscagem(){
  if(!allLeads)return;
  const corr=document.getElementById('disc-filter-corr');
  if(corr){
    const atual=corr.value;
    corr.innerHTML='<option value="">Meus leads</option>';
    if(perm('verTodos')){
      const nomes=[...new Set(allLeads.map(l=>l.corretor).filter(Boolean))].sort();
      nomes.forEach(n=>{const o=document.createElement('option');o.value=n;o.textContent=n;if(n===atual)o.selected=true;corr.appendChild(o);});
    }
  }
  const filtroCorr=document.getElementById('disc-filter-corr')?.value;
  let leads=allLeads.filter(l=>l.status!=='Fechado'&&l.status!=='Perdido'&&l.telefone);
  if(filtroCorr)leads=leads.filter(l=>l.corretor===filtroCorr);
  else if(!perm('verTodos'))leads=leads.filter(l=>l.corretor===currentUser.nome);
  // ordena por score desc
  discFilaAtual=[...leads].sort((a,b)=>calcLeadScore(b)-calcLeadScore(a));
  // remove já feitos nesta sessão
  const feitosIds=discSessao.hist.map(h=>h.id);
  const filaRestante=discFilaAtual.filter(l=>!feitosIds.includes(l.id));
  document.getElementById('disc-k-total').textContent=filaRestante.length;
  document.getElementById('disc-k-atendeu').textContent=discSessao.atendeu;
  document.getElementById('disc-k-nao').textContent=discSessao.nao;
  document.getElementById('disc-k-ag').textContent=discSessao.ag;
  const total=discSessao.atendeu+discSessao.nao+discSessao.ag+discSessao.decl;
  const taxa=total>0?Math.round(((discSessao.atendeu+discSessao.ag)/total)*100):0;
  document.getElementById('disc-k-taxa').textContent=taxa+'%';
  document.getElementById('disc-fila-count').textContent=filaRestante.length+' leads';
  // render fila
  const filaEl=document.getElementById('disc-fila-lista');
  if(!filaRestante.length){filaEl.innerHTML='<div class="disc-vazia">🎉 Fila concluída!<br><span style="font-size:11px">Todos os leads foram contatados.</span></div>';}
  else{
    filaEl.innerHTML=filaRestante.slice(0,20).map((l,i)=>{
      const score=calcLeadScore(l);const{cls}=getScoreInfo(score);
      const isAtivo=i===0&&!document.getElementById('disc-lead-ativo')?.dataset.id;
      return`<div class="disc-fila-item${isAtivo?' ativo-row':''}" onclick="discSelecionarLead('${l.id}')">
        <div class="disc-fila-num">${i+1}</div>
        <div class="disc-fila-av">${l.nome.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
        <div class="disc-fila-info">
          <div class="disc-fila-nome">${l.nome}</div>
          <div class="disc-fila-sub">${l.status} · ${l.telefone}</div>
        </div>
        <span class="k-score ${cls} disc-fila-score">${score}</span>
      </div>`;
    }).join('')+(filaRestante.length>20?`<div style="padding:10px;text-align:center;font-size:10px;color:var(--text-muted)">+${filaRestante.length-20} mais na fila</div>`:'');
  }
  // render lead ativo (primeiro da fila)
  if(filaRestante.length>0){
    discMostrarLeadAtivo(filaRestante[0]);
  } else {
    document.getElementById('disc-lead-ativo').innerHTML='<div class="disc-vazia" style="background:var(--bg-input);border:1px solid rgba(255,255,255,0.06);border-radius:10px">🎉 Nenhum lead na fila!<br><span style="font-size:11px;color:var(--text-muted)">Adicione leads ou mude o filtro.</span></div>';
  }
  // render histórico
  renderDiscHistorico();
}

function discSelecionarLead(id){
  const l=allLeads.find(x=>x.id===id);
  if(l)discMostrarLeadAtivo(l);
}

function discMostrarLeadAtivo(lead){
  const el=document.getElementById('disc-lead-ativo');
  el.dataset.id=lead.id;
  const score=calcLeadScore(lead);const{cls,label}=getScoreInfo(score);
  const intLabel=lead.interesse==='hot'?'🔥 Quente':lead.interesse==='warm'?'🟡 Morno':'🧊 Frio';
  const intCor=lead.interesse==='hot'?'rgba(239,68,68,0.1)':lead.interesse==='warm'?'rgba(245,158,11,0.1)':'rgba(148,163,184,0.08)';
  const intBorder=lead.interesse==='hot'?'rgba(239,68,68,0.25)':lead.interesse==='warm'?'rgba(245,158,11,0.25)':'rgba(148,163,184,0.15)';
  const intTxt=lead.interesse==='hot'?'var(--red)':lead.interesse==='warm'?'var(--orange)':'var(--text-tertiary)';
  el.innerHTML=`
    <div class="disc-card-ativo">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px">
        <div>
          <div class="disc-nome">${lead.nome}</div>
          <a href="tel:${(lead.telefone||'').replace(/\D/g,'')}" class="disc-tel">${lead.telefone||'Sem telefone'}</a>
        </div>
        <span class="k-score ${cls}" style="font-size:13px;padding:4px 10px">${label}</span>
      </div>
      <div class="disc-info-row">
        <span class="disc-badge" style="background:${intCor};border:1px solid ${intBorder};color:${intTxt}">${intLabel}</span>
        <span class="disc-badge" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);color:var(--text-tertiary)">${lead.status}</span>
        ${lead.tipo_imovel?`<span class="disc-badge" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);color:var(--text-muted)">${lead.tipo_imovel}</span>`:''}
        ${lead.valor?`<span style="font-size:11px;color:var(--text-tertiary)">${lead.valor}</span>`:''}
      </div>
      ${lead.telefone?`<a href="tel:+55${lead.telefone.replace(/\D/g,'')}" class="disc-btn-ligar" id="disc-btn-ligar-main" onclick="discIniciarTimer()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.82 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
        📞 Ligar — ${lead.telefone}
      </a>`:`<div style="font-size:12px;color:var(--text-tertiary);padding:8px 0">⚠️ Lead sem telefone cadastrado.</div>`}
      <div id="disc-timer-el" style="display:none;margin-top:10px"><span class="disc-timer"><span class="disc-timer-dot"></span><span id="disc-timer-txt">00:00</span> em ligação</span></div>
      <div class="disc-resultados">
        <div style="width:100%;font-size:10px;font-weight:500;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Registrar resultado:</div>
        <button class="disc-res-btn disc-res-atendeu" onclick="discRegistrarResultado('${lead.id}','atendeu')">✅ Atendeu</button>
        <button class="disc-res-btn disc-res-nao" onclick="discRegistrarResultado('${lead.id}','nao')">📵 Não atendeu</button>
        <button class="disc-res-btn disc-res-ag" onclick="discRegistrarResultado('${lead.id}','agendou')">📅 Agendou visita</button>
        <button class="disc-res-btn disc-res-decl" onclick="discRegistrarResultado('${lead.id}','declinado')">🚫 Declinado</button>
        <textarea class="disc-res-obs" id="disc-obs-${lead.id}" placeholder="Observação opcional..." rows="2"></textarea>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;align-items:center">
        <button class="disc-pular" onclick="discPularLead('${lead.id}')">Pular →</button>
        <button class="disc-pular" onclick="showDetail('${lead.id}')" style="border-color:rgba(34,197,94,0.2);color:var(--green)">Ver detalhes</button>
        ${lead.telefone?`<a href="https://wa.me/55${lead.telefone.replace(/\D/g,'')}" target="_blank" class="disc-pular" style="border-color:rgba(34,197,94,0.2);color:var(--green);text-decoration:none">WhatsApp</a>`:''}
      </div>
    </div>`;
}

function discIniciarTimer(){
  const el=document.getElementById('disc-timer-el');
  if(el)el.style.display='flex';
  if(discTimerInterval)clearInterval(discTimerInterval);
  discTimerSeg=0;
  discTimerInterval=setInterval(()=>{
    discTimerSeg++;
    const m=String(Math.floor(discTimerSeg/60)).padStart(2,'0');
    const s=String(discTimerSeg%60).padStart(2,'0');
    const t=document.getElementById('disc-timer-txt');
    if(t)t.textContent=m+':'+s;
  },1000);
}

function discPararTimer(){
  if(discTimerInterval){clearInterval(discTimerInterval);discTimerInterval=null;}
  const el=document.getElementById('disc-timer-el');
  if(el)el.style.display='none';
  discTimerSeg=0;
}

async function discRegistrarResultado(leadId,resultado){
  if(discTimerInterval)discPararTimer();
  const lead=allLeads.find(l=>l.id===leadId);
  if(!lead)return;
  const obs=document.getElementById('disc-obs-'+leadId)?.value?.trim()||'';
  const agora=new Date().toISOString();
  const resMap={atendeu:'✅ Atendeu',nao:'📵 Não atendeu',agendou:'📅 Agendou visita',declinado:'🚫 Declinado'};
  const resLabel=resMap[resultado]||resultado;

  // atualiza histórico do CRM
  const histAtual=lead.historico_contatos?JSON.parse(lead.historico_contatos):[];
  histAtual.unshift({data:agora,obs:`📞 Ligação — ${resLabel}${obs?': '+obs:''}`,autor:currentUser.nome});
  let novoStatus=lead.status;
  if(resultado==='atendeu'&&lead.status==='Lead Novo')novoStatus='Primeiro Contato';
  if(resultado==='agendou')novoStatus='Visita Marcada';
  if(resultado==='declinado')novoStatus='Perdido';
  try{
    await SB.upd('leads',{
      ultimo_contato:agora,
      historico_contatos:JSON.stringify(histAtual),
      ...(novoStatus!==lead.status?{status:novoStatus}:{}),
    },`id=eq.${leadId}`);
    // atualiza contagem da sessão
    if(resultado==='atendeu')discSessao.atendeu++;
    else if(resultado==='nao')discSessao.nao++;
    else if(resultado==='agendou')discSessao.ag++;
    else discSessao.decl++;
    discSessao.hist.push({id:leadId,nome:lead.nome,resultado,obs,hora:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})});
    await loadAll();
    renderDiscagem();
    showToast(`${resLabel} — ${lead.nome.split(' ')[0]}`,'success');
  }catch(e){showToast('Erro ao salvar: '+e.message,'error');}
}

function discPularLead(leadId){
  discSessao.hist.push({id:leadId,nome:(allLeads.find(l=>l.id===leadId)?.nome||'—'),resultado:'pulado',obs:'',hora:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})});
  renderDiscagem();
}

function renderDiscHistorico(){
  const wrap=document.getElementById('disc-historico-wrap');
  const lista=document.getElementById('disc-historico-lista');
  if(!wrap||!lista)return;
  if(!discSessao.hist.length){wrap.style.display='none';return;}
  wrap.style.display='block';
  const cores={atendeu:'var(--green)',nao:'var(--red)',agendou:'var(--green)',declinado:'var(--text-muted)',pulado:'var(--text-muted)'};
  lista.innerHTML=[...discSessao.hist].reverse().map(h=>`
    <div class="disc-hist-item">
      <div class="disc-hist-dot" style="background:${cores[h.resultado]||'var(--text-muted)'}"></div>
      <div class="disc-hist-txt"><strong style="color:var(--text-secondary)">${h.nome}</strong> — ${h.resultado==='atendeu'?'✅ Atendeu':h.resultado==='nao'?'📵 Não atendeu':h.resultado==='agendou'?'📅 Agendou':h.resultado==='declinado'?'🚫 Declinado':'⏭ Pulado'}${h.obs?`<br><span style="color:var(--text-tertiary);font-size:10px">${h.obs}</span>`:''}</div>
      <div class="disc-hist-hora">${h.hora}</div>
    </div>`).join('');
}

// Abre central de ligações já com um lead selecionado
function abrirDiscagemComLead(leadId){
  goTo('ligacoes',document.querySelector('.nav-item[onclick*="ligacoes"]'));
  renderDiscagem();
  setTimeout(()=>discSelecionarLead(leadId),200);
}

/* ══════════════════════════════════════════
   OFERTA ATIVA
   Storage keys (localStorage por usuário):
   cdp_oa_fila      — array de prospectos na fila
   cdp_oa_desc      — descartados
   cdp_oa_atv       — ativados (histórico)
   cdp_oa_sess      — contadores da sessão atual
══════════════════════════════════════════ */

/* ══════════════════════════════════════════
   OFERTA ATIVA — Supabase Edition
   Tabelas: oa_fila, oa_historico
══════════════════════════════════════════ */

// helpers Supabase para OA
