function calcLeadScore(l){
  let score=0;
  const pv=v=>{if(!v)return 0;const s=String(v).replace(/[^\d,.]/g,'');const n=parseFloat(s.replace(/\./g,'').replace(',','.'));return isNaN(n)?0:n;};
  const ref=l.ultimo_contato||l.created_at;
  const dias=Math.floor((Date.now()-new Date(ref))/(864e5));

  // Interesse
  if(l.interesse==='hot')score+=30;
  else if(l.interesse==='warm')score+=15;
  else score+=5;

  // Perfil preenchido
  if(l.valor)score+=10;
  if(l.bairro)score+=5;
  if(l.quartos_desejados)score+=5;
  if(l.renda_familiar)score+=5;

  // Valor alto = maior prioridade
  const val=pv(l.valor);
  if(val>=500000)score+=15;
  else if(val>=300000)score+=10;
  else if(val>=150000)score+=5;

  // Histórico de contatos
  const hist=l.historico_contatos?JSON.parse(l.historico_contatos):[];
  if(hist.length>=3)score+=10;
  else if(hist.length>=1)score+=5;

  // Penalidades por tempo sem contato
  if(dias>14)score-=25;
  else if(dias>7)score-=15;
  else if(dias>3)score-=5;

  // Etapa avançada
  const etapaScore={'Lead Novo':0,'Primeiro Contato':5,'Em Atendimento':10,'Qualificado':15,'Visita Marcada':20,'Proposta':25,'Documentação':30};
  score+=(etapaScore[l.status]||0);

  // Origem qualificada
  if(['Indicação','WhatsApp'].includes(l.origem))score+=5;

  return Math.max(0,Math.min(100,score));
}

function getScoreInfo(score){
  if(score>=70)return{cls:'s-hot',label:`⭐ ${score}pts`,txt:'Alta prioridade'};
  if(score>=45)return{cls:'s-warm',label:`🔶 ${score}pts`,txt:'Média prioridade'};
  if(score>=20)return{cls:'s-cold',label:`🔷 ${score}pts`,txt:'Baixa prioridade'};
  return{cls:'s-dead',label:`⚠ ${score}pts`,txt:'Lead frio'};
}

function getSugestaoAcao(l){
  const ref=l.ultimo_contato||l.created_at;
  const dias=Math.floor((Date.now()-new Date(ref))/(864e5));
  const hist=l.historico_contatos?JSON.parse(l.historico_contatos):[];
  const score=calcLeadScore(l);

  // Regras de sugestão por contexto
  if(l.status==='Visita Marcada'&&l.visita_data){
    const dv=Math.floor((new Date(l.visita_data+'T00:00:00')-Date.now())/(864e5));
    if(dv===0)return{icon:'📍',txt:'<strong>Visita hoje!</strong> Confirme presença com o cliente.'};
    if(dv===1)return{icon:'📅',txt:'<strong>Visita amanhã.</strong> Envie confirmação pelo WhatsApp.'};
    if(dv<0)return{icon:'❗',txt:'<strong>Visita vencida!</strong> Reagende ou mova para outra etapa.'};
  }
  if(l.status==='Proposta')return{icon:'💼',txt:'<strong>Proposta enviada.</strong> Ligue para tirar dúvidas e fechar.'};
  if(l.status==='Documentação')return{icon:'📋',txt:'<strong>Em documentação.</strong> Acompanhe o processo diariamente.'};
  if(dias===0&&hist.length===0)return{icon:'👋',txt:'<strong>Lead novo!</strong> Faça o primeiro contato agora.'};
  if(dias===0)return{icon:'✅',txt:'Contato recente. <strong>Continue o atendimento.</strong>'};
  if(dias>=14)return{icon:'🚨',txt:`<strong>${dias} dias sem contato.</strong> Risco de perder — ligue agora!`};
  if(dias>=7)return{icon:'⚠️',txt:`<strong>${dias} dias parado.</strong> Envie mensagem de follow-up.`};
  if(dias>=3&&l.interesse==='hot')return{icon:'🔥',txt:'Lead quente <strong>há 3+ dias sem contato.</strong> Priorize!'};
  if(hist.length>=2&&l.status==='Em Atendimento')return{icon:'📈',txt:'Bom engajamento! <strong>Proponha uma visita.</strong>'};
  if(!l.valor||!l.renda_familiar)return{icon:'📝',txt:'<strong>Complete o perfil</strong> para habilitar o match de imóveis.'};
  if(score>=60&&l.status==='Qualificado')return{icon:'🎯',txt:'Lead qualificado! <strong>Apresente imóveis compatíveis.</strong>'};
  return{icon:'💬',txt:'<strong>Mantenha contato regular</strong> para não perder o lead.'};
}

/* ── KANBAN ── */
function getContatoInfo(l){
  // usa ultimo_contato se existir, senão updated_at/created_at
  const ref=l.ultimo_contato||l.updated_at||l.created_at;
  if(!ref)return{label:'—',cls:'',pct:0,cor:'var(--text-muted)'};
  const mins=Math.floor((Date.now()-new Date(ref))/60000);
  const horas=Math.floor(mins/60);
  const dias=Math.floor(horas/24);
  let label,cls,pct,cor;
  if(mins<60){label=mins<=1?'Agora mesmo':`${mins}min atrás`;cls='';pct=5;cor='var(--green)';}
  else if(horas<24){label=`${horas}h atrás`;cls='';pct=Math.min(20,horas*2);cor='var(--green)';}
  else if(dias===1){label='Ontem';cls='';pct=25;cor='var(--green)';}
  else if(dias<=3){label=`${dias} dias atrás`;cls='';pct=40;cor='var(--green)';}
  else if(dias<=7){label=`${dias} dias parado`;cls='warn';pct=65;cor='var(--orange)';}
  else if(dias<=14){label=`${dias} dias sem contato`;cls='danger';pct=85;cor='var(--red)';}
  else{label=`+${dias} dias sem contato`;cls='danger';pct=100;cor='var(--red)';}
  return{label,cls,pct,cor,dias};
}

function getInteracaoEl(l){
  const{label,cls,pct,cor}=getContatoInfo(l);
  return`<div>
    <div class="k-interacao ${cls}"><span class="k-int-dot"></span><span>${label}</span></div>
    <div class="k-contato-bar"><div class="k-contato-urgencia" style="width:${pct}%;background:${cor};opacity:0.7"></div></div>
  </div>`;
}

function toggleUpdForm(id,btn){
  const form=document.getElementById('upd-form-'+id);
  if(!form)return;
  const isOpen=form.classList.contains('open');
  form.classList.toggle('open',!isOpen);
  if(!isOpen){
    const ta=form.querySelector('textarea');
    if(ta){ta.value='';ta.focus();updateCounter(id,ta);}
    btn.style.display='none';
  } else {
    btn.style.display='flex';
  }
}

function updateCounter(id,ta){
  const counter=document.getElementById('upd-counter-'+id);
  if(!counter)return;
  const len=ta.value.length;
  counter.textContent=len+'/10 mín';
  counter.className='k-upd-counter'+(len>=10?' ok':'');
  const sendBtn=document.getElementById('upd-send-'+id);
  if(sendBtn)sendBtn.disabled=len<10;
}

async function registrarContato(id){
  const ta=document.getElementById('upd-ta-'+id);
  if(!ta)return;
  const obs=ta.value.trim();
  if(obs.length<10){showToast('Mínimo 10 caracteres!','error');return;}
  const sendBtn=document.getElementById('upd-send-'+id);
  sendBtn.disabled=true;sendBtn.innerHTML='<span class="spin"></span>';
  try{
    const agora=new Date().toISOString();
    const lead=allLeads.find(l=>l.id===id);
    if(!lead)throw new Error('Lead não encontrado');
    // monta novo item de histórico
    const novoItem={data:agora,obs,autor:currentUser.nome};
    const histAtual=lead.historico_contatos?JSON.parse(lead.historico_contatos):[];
    histAtual.unshift(novoItem);
    await SB.upd('leads',{ultimo_contato:agora,historico_contatos:JSON.stringify(histAtual)},`id=eq.${id}`);
    showToast('Contato registrado!','success');
    // ── COMMAND EVENT ──────────────────────────
    CommandEventService.record({
      modulo    : CommandEventModule.LEADS,
      tipo      : CommandEventType.FOLLOWUP,
      origem    : CommandEventOrigin.USER,
      lead      : lead.nome,
      consultor : lead.corretor || null,
      descricao : `Follow-up registrado: ${lead.nome}`,
      detalhes  : obs.length > 80 ? obs.slice(0,80)+'…' : obs,
    });
    // ──────────────────────────────────────────
    await loadAll();
  }catch(e){showToast('Erro: '+e.message,'error');sendBtn.disabled=false;sendBtn.innerHTML='Registrar';}
}

function renderKanban(leads){
  const board=document.getElementById('kanban-board');if(!board)return;
  const canEdit=perm('editarTodos')||currentUser.cargo==='Corretor';
  board.innerHTML=COLS.map(col=>{
    const cl=leads.filter(l=>l.status===col);
    const accent=COL_ACC[col]||'rgba(255,255,255,0.2)';
    const dot=COL_DOT[col]||'var(--text-tertiary)';
    const cards=cl.map(l=>{
      const initials=l.corretor?l.corretor.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase():'—';
      const menuId=`km-${l.id}`;
      return`<div class="kcard" draggable="true" data-id="${l.id}" style="--k-accent:${accent}" ondragstart="draggedId='${l.id}';this.classList.add('dragging')" ondragend="this.classList.remove('dragging');document.querySelectorAll('.kcol').forEach(c=>c.classList.remove('drag-over'))">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px">
          <div style="flex:1;min-width:0">
            <div class="kn">${l.nome}</div>
            ${l.telefone?`<div class="kph">${l.telefone}</div>`:''}
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;position:relative">
            ${(()=>{if(l.status==='Fechado'||l.status==='Perdido')return'';const sc=calcLeadScore(l);const si=getScoreInfo(sc);return'<span class="k-score '+si.cls+'" style="font-size:9px;padding:2px 6px">'+si.label+'</span>';})()}
            <button class="k-menu-btn" onclick="toggleKMenu('${menuId}',event)">···</button>
            <div class="k-menu-dropdown" id="${menuId}">
              <div class="k-menu-item" onclick="showDetail('${l.id}');closeKMenus()">👁 Ver detalhes</div>
              ${canEdit?`<div class="k-menu-item" onclick="editLead('${l.id}');closeKMenus()">✏️ Editar lead</div>`:''}
              <div class="k-menu-sep"></div>
              <div class="k-menu-item" onclick="abrirMatchLead('${l.id}');closeKMenus()">🏠 Match imóvel</div>
              <div class="k-menu-item" onclick="openCdpAssistant('${l.id}');closeKMenus()">✨ CDP Assistant</div>
              <div class="k-menu-item" onclick="abrirAnaliseConversa('${l.id}');closeKMenus()">💬 Analisar conversa</div>
              ${l.status!=='Follow-Up'&&l.status!=='Fechado'&&l.status!=='Perdido'?`<div class="k-menu-item" onclick="openFollowUp('${l.id}');closeKMenus()">💎 Follow-Up</div>`:''}
              ${perm('verTodos')?`<div class="k-menu-item" onclick="abrirTransferirLead('${l.id}');closeKMenus()">🔄 Transferir lead</div>`:''}
              <div class="k-menu-sep"></div>
              <div class="k-menu-item" onclick="openWpp('${l.telefone||''}');closeKMenus()">💬 WhatsApp</div>
            </div>
          </div>
        </div>
        <div class="ktags">
          <span class="tag ${INT_C[l.interesse]||'tc'}">${INT_L[l.interesse]||'—'}</span>
          ${l.tipo_imovel?`<span class="tag ta">${l.tipo_imovel}</span>`:''}
          ${l.origem?`<span class="ob ${ORI_C[l.origem]||''}">${l.origem}</span>`:''}
        </div>
        ${l.valor||l.bairro?`<div class="kval">${[l.valor,l.bairro].filter(Boolean).join(' · ')}</div>`:''}
        ${(()=>{
          if(l.status==='Fechado'||l.status==='Perdido')return'';
          const sug=getSugestaoAcao(l);
          return'<div class="k-sugestao"><span>'+sug.icon+'</span><span class="k-sugestao-txt">'+sug.txt+'</span></div>';
        })()}








          
        ${l.status==='Follow-Up'&&l.followup_info?`
          <div class="fu-badge"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Follow-Up Ativo</div>
          <div class="fu-info">${(()=>{try{const f=JSON.parse(l.followup_info);return`<strong>${f.motivo}</strong>${f.data_retomada?` · retomada: ${new Date(f.data_retomada+'T00:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}`:''}`;}catch{return'Follow-Up';}})()}</div>
        `:''}
        ${getInteracaoEl(l)}
        <div style="display:flex;gap:4px;margin-top:6px;">
          <button class="k-upd-btn" id="upd-btn-${l.id}" onclick="toggleUpdForm('${l.id}',this)" style="flex:1;margin-top:0;">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Registrar contato
          </button>
          <button onclick="openCdpAssistant('${l.id}')" style="padding:6px 9px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.18);border-radius:6px;color:var(--green);font-size:10px;cursor:pointer;display:flex;align-items:center;gap:4px;white-space:nowrap;font-family:'DM Sans',sans-serif;transition:background .15s;" onmouseover="this.style.background='rgba(34,197,94,0.15)'" onmouseout="this.style.background='rgba(34,197,94,0.08)'" title="CDP Assistant — Gerar follow-up ou post">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
            IA
          </button>
        </div>
        <div class="k-upd-form" id="upd-form-${l.id}">
          <textarea class="k-upd-textarea" id="upd-ta-${l.id}" rows="2" placeholder="O que aconteceu neste contato? (mín. 10 caracteres)" oninput="updateCounter('${l.id}',this)"></textarea>
          <div class="k-upd-actions">
            <span class="k-upd-counter" id="upd-counter-${l.id}">0/10 mín</span>
            <div style="display:flex;gap:4px">
              <button class="k-upd-cancel" onclick="toggleUpdForm('${l.id}',document.getElementById('upd-btn-${l.id}'))">Cancelar</button>
              <button class="k-upd-send" id="upd-send-${l.id}" onclick="registrarContato('${l.id}')" disabled>Registrar</button>
            </div>
          </div>
        </div>
        <div class="kfoot">
          <div class="kcorr">${l.corretor?`<div class="kcorr-dot">${initials}</div><span>${l.corretor.split(' ')[0]}</span>`:'<span>—</span>'}</div>
        </div>
      </div>`;
    }).join('');
    return`<div class="kcol" data-col="${col}">
      <div class="khd"><div class="khd-l"><span class="k-dot" style="background:${dot}"></span><span class="kt">${col}</span></div><span class="kc">${cl.length}</span></div>
      <div class="kcards">${cards}${cl.length===0?`<div class="empty-k"><span style="font-size:16px;opacity:0.3">○</span>Sem leads</div>`:''}</div>
    </div>`;
  }).join('');
  document.querySelectorAll('.kcol').forEach(col=>{
    col.addEventListener('dragover',e=>{e.preventDefault();col.classList.add('drag-over');});
    col.addEventListener('dragleave',()=>col.classList.remove('drag-over'));
    col.addEventListener('drop',e=>dropCard(e,col.dataset.col));
  });
}

async function dropCard(e,newStatus){
  e.preventDefault();document.querySelectorAll('.kcol').forEach(c=>c.classList.remove('drag-over'));
  if(!draggedId)return;
  const lead=allLeads.find(l=>l.id===draggedId);
  if(!lead||lead.status===newStatus){draggedId=null;return;}

  // Motivo obrigatório ao mover para Perdido
  if(newStatus==='Perdido'){
    draggedId=null;
    abrirMotivoPerdaKanban(lead.id);
    return;
  }
  if(newStatus==='Qualificado'){
    const faltando=[];
    if(!lead.valor)faltando.push('Valor pretendido');
    if(!lead.bairro)faltando.push('Bairro desejado');
    if(!lead.quartos_desejados)faltando.push('Quartos desejados');
    if(!lead.renda_familiar)faltando.push('Renda familiar');
    if(faltando.length){
      showToast(`Para qualificar preencha: ${faltando.join(', ')}`, 'error');
      draggedId=null;
      // abre edição do lead automaticamente
      setTimeout(()=>editLead(lead.id),300);
      return;
    }
  }

  try{
    const upd={status:newStatus};
    if(newStatus==='Fechado')upd.fechado_em=new Date().toISOString();
    await SB.upd('leads',upd,`id=eq.${draggedId}`);
    showToast(`→ ${newStatus}`,'success');
    // ── COMMAND EVENT ──────────────────────────
    const evTipo = newStatus==='Fechado'   ? CommandEventType.SALE_COMPLETED
                 : newStatus==='Perdido'   ? CommandEventType.SALE_LOST
                 : newStatus==='Visita Marcada' ? CommandEventType.VISIT_SCHEDULED
                 : newStatus==='Proposta'  ? CommandEventType.PROPOSAL_SENT
                 : newStatus==='Primeiro Contato' ? CommandEventType.FIRST_CONTACT
                 : CommandEventType.LEAD_UPDATED;
    CommandEventService.record({
      modulo    : CommandEventModule.LEADS,
      tipo      : evTipo,
      origem    : CommandEventOrigin.USER,
      lead      : lead.nome,
      consultor : lead.corretor || null,
      descricao : `Lead movido para "${newStatus}": ${lead.nome}`,
      detalhes  : `Status anterior: ${lead.status}`,
    });
    // ──────────────────────────────────────────
    await loadAll();
  }catch(e){showToast('Erro: '+e.message,'error');}
  draggedId=null;
}

function renderLeadsList(leads){
  const tbody=document.getElementById('leads-tbody');if(!tbody)return;
  const canEdit=perm('editarTodos')||currentUser.cargo==='Corretor';
  tbody.innerHTML=leads.map(l=>`<tr>
    <td data-label="Nome"><span style="cursor:pointer;color:var(--green);font-weight:500" onclick="showDetail('${l.id}')">${l.nome}</span></td>
    <td data-label="Telefone" style="color:var(--text-tertiary)">${l.telefone||'—'}</td>
    <td data-label="Interesse"><span class="tag ${INT_C[l.interesse]||'tc'}">${INT_L[l.interesse]||'—'}</span></td>
    <td data-label="Tipo" style="color:var(--text-tertiary)">${l.tipo_imovel||'—'}</td>
    <td data-label="Valor" style="color:var(--text-tertiary)">${l.valor||'—'}</td>
    <td data-label="Origem" style="color:var(--text-tertiary)">${l.origem||'—'}</td>
    <td data-label="Corretor" style="color:var(--text-tertiary)">${l.corretor||'—'}</td>
    <td data-label="Status"><span style="font-size:10px;padding:3px 8px;border-radius:6px;background:var(--bg-input);border:1px solid rgba(255,255,255,0.05);color:var(--text-tertiary)">${l.status}</span></td>
    <td data-label="Ações"><div style="display:flex;gap:4px"><div class="kbtn" onclick="showDetail('${l.id}')">👁</div>${canEdit?`<div class="kbtn" onclick="editLead('${l.id}')">✏️</div>`:''}<div class="kbtn" onclick="openWpp('${l.telefone||''}')">💬</div></div></td>
  </tr>`).join('');
}

function showDetail(id){
  const l=allLeads.find(x=>x.id===id);if(!l)return;
  const canEdit=perm('editarTodos')||currentUser.cargo==='Corretor';
  document.getElementById('detail-nome').textContent=l.nome;
  document.getElementById('detail-content').innerHTML=`
    <div class="detail-item"><div class="detail-label">Telefone</div><div class="detail-value">${l.telefone||'—'}</div></div>
    <div class="detail-item"><div class="detail-label">E-mail</div><div class="detail-value">${l.email||'—'}</div></div>
    <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value" style="color:var(--green)">${l.status}</div></div>
    <div class="detail-item"><div class="detail-label">Interesse</div><div class="detail-value">${INT_L[l.interesse]||'—'}</div></div>
    <div class="detail-item"><div class="detail-label">Tipo</div><div class="detail-value">${l.tipo_imovel||'—'}</div></div>
    <div class="detail-item"><div class="detail-label">Valor</div><div class="detail-value" style="color:var(--green)">${l.valor||'—'}</div></div>
    <div class="detail-item"><div class="detail-label">Bairro</div><div class="detail-value">${l.bairro||'—'}</div></div>
    <div class="detail-item"><div class="detail-label">Origem</div><div class="detail-value">${l.origem||'—'}</div></div>
    <div class="detail-item"><div class="detail-label">Corretor</div><div class="detail-value">${l.corretor||'—'}</div></div>
    <div class="detail-item"><div class="detail-label">Cadastrado</div><div class="detail-value">${new Date(l.created_at).toLocaleDateString('pt-BR')}</div></div>
    ${l.status==='Visita Marcada'?`
    <div class="detail-item" style="grid-column:1/-1;background:rgba(34,197,94,0.05);border:1px solid rgba(34,197,94,0.15);border-radius:10px;padding:12px">
      <div class="detail-label" style="color:var(--green);margin-bottom:8px">📅 Dados da Visita</div>
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div><div style="font-size:10px;color:var(--text-tertiary);margin-bottom:2px;text-transform:uppercase;letter-spacing:0.04em">Data</div><div style="font-size:13px;font-weight:500;color:var(--text-primary)">${l.visita_data?new Date(l.visita_data+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}):'Não informada'}</div></div>
        <div><div style="font-size:10px;color:var(--text-tertiary);margin-bottom:2px;text-transform:uppercase;letter-spacing:0.04em">Horário</div><div style="font-size:13px;font-weight:500;color:var(--text-primary)">${l.visita_hora?l.visita_hora.slice(0,5):'Não informado'}</div></div>
        <div><div style="font-size:10px;color:var(--text-tertiary);margin-bottom:2px;text-transform:uppercase;letter-spacing:0.04em">Local</div><div style="font-size:13px;font-weight:500;color:var(--text-primary)">${l.visita_local||'Não informado'}</div></div>
      </div>
    </div>`:''}
    ${l.observacoes?`<div class="detail-item" style="grid-column:1/-1"><div class="detail-label">Observações</div><div class="detail-value">${l.observacoes}</div></div>`:''}`;

  // Histórico de contatos
  const hist=l.historico_contatos?JSON.parse(l.historico_contatos):[];
  const histHtml=hist.length>0
    ?hist.map((h,i)=>`
      <div class="hist-item">
        <div class="hist-dot-line">
          <div class="hist-dot" style="background:${i===0?'var(--green)':'var(--text-muted)'}"></div>
          ${i<hist.length-1?'<div class="hist-line"></div>':''}
        </div>
        <div class="hist-body">
          <div class="hist-obs">${h.obs}</div>
          <div class="hist-meta">${h.autor||'—'} · ${new Date(h.data).toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
        </div>
      </div>`).join('')
    :'<div class="hist-empty">Nenhum contato registrado ainda.</div>';

  document.getElementById('detail-content').innerHTML+=`
    <div style="grid-column:1/-1">
      <div class="hist-wrap">
        <div class="hist-title">Histórico de contatos</div>
        ${histHtml}
      </div>
    </div>`;
  // Última análise de conversa
  if(l.ultima_analise_ia){
    try{
      const an=JSON.parse(l.ultima_analise_ia);
      document.getElementById('detail-content').innerHTML+=`
        <div style="grid-column:1/-1;margin-top:8px">
          <div style="font-size:10px;font-weight:500;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;display:flex;align-items:center;gap:8px">Última análise de conversa<span style="flex:1;height:1px;background:rgba(255,255,255,0.05)"></span></div>
          <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:10px;margin-bottom:8px;font-size:12px;background:${an.sentimento_cor}15;border:1px solid ${an.sentimento_cor}30;color:${an.sentimento_cor}">
            <span style="font-size:18px">${an.sentimento_emoji}</span><strong style="text-transform:capitalize">${an.sentimento}</strong>
          </div>
          <div style="font-size:12px;color:var(--text-tertiary);line-height:1.7;margin-bottom:6px">${an.resumo}</div>
          ${an.objecoes&&an.objecoes.length?`<div style="font-size:11px;color:var(--red);margin-bottom:4px">⚠️ ${an.objecoes.join(' · ')}</div>`:''}
          <div style="font-size:11px;color:var(--green)">🎯 ${an.proxima_acao}</div>
        </div>`;
    }catch(e){ console.warn("[leads] render error:", e?.message); }
  }
  document.getElementById('detail-edit-btn').style.display=canEdit?'':'none';
  document.getElementById('detail-edit-btn').onclick=()=>{closeModal('detail-lead');editLead(id);};
  document.getElementById('detail-wpp-btn').onclick=()=>openWpp(l.telefone||'');
  document.getElementById('detail-del-btn').style.display=canEdit?'':'none';
  document.getElementById('detail-del-btn').onclick=()=>{closeModal('detail-lead');deleteLead(id,l.nome);};
  openModal('detail-lead');
}

function editLead(id){
  const l=allLeads.find(x=>x.id===id);if(!l)return;
  document.getElementById('modal-lead-title').textContent='Editar Lead';
  document.getElementById('edit-lead-id').value=id;
  document.getElementById('new-nome').value=l.nome||'';
  document.getElementById('new-tel').value=l.telefone||'';
  document.getElementById('new-email').value=l.email||'';
  document.getElementById('new-valor').value=l.valor||'';
  document.getElementById('new-bairro').value=l.bairro||'';
  document.getElementById('new-obs').value=l.observacoes||'';
  // campos match obrigatórios
  const qd=document.getElementById('new-quartos');if(qd)qd.value=l.quartos_desejados||'';
  const rd=document.getElementById('new-renda');if(rd)rd.value=l.renda_familiar||'';
  setSelectVal('new-programa',l.programa_interesse||'');
  // campos de visita
  document.getElementById('new-visita-data').value=l.visita_data||'';
  document.getElementById('new-visita-hora').value=l.visita_hora||'';
  document.getElementById('new-visita-local').value=l.visita_local||'';
  // campos financeiros
  const assin=document.getElementById('new-assinatura');if(assin)assin.value=l.data_assinatura||'';
  const pctFat=document.getElementById('new-pct-fat');if(pctFat)pctFat.value=l.pct_faturamento||'';
  const pctImob=document.getElementById('new-pct-imob');if(pctImob)pctImob.value=l.pct_imobiliaria||'';
  const pctCom=document.getElementById('new-pct-com');if(pctCom)pctCom.value=l.pct_comissao_manual||'';
  const pctKevin=document.getElementById('new-pct-kevin');if(pctKevin)pctKevin.value=l.pct_kevin||'';
  const pctTanner=document.getElementById('new-pct-tanner');if(pctTanner)pctTanner.value=l.pct_tanner||'';
  document.getElementById('match-alert').style.display='none';
  setSelectVal('new-tipo',l.tipo_imovel);
  setSelectVal('new-int',l.interesse);
  setSelectVal('new-status',l.status);
  setSelectVal('new-corr',l.corretor||'');
  document.getElementById('visita-fields').style.display=l.status==='Visita Marcada'?'block':'none';
  document.getElementById('financeiro-fields').style.display=l.status==='Fechado'?'block':'none';
  aplicarVisibilidadeFinanceira();
  document.getElementById('btn-save-lead').textContent='Salvar alterações';
  openModal('add-lead');
}
function aplicarVisibilidadeFinanceira(){
  const isCEODir=['CEO','Diretor'].includes(currentUser.cargo);
  const restrito=document.getElementById('financeiro-fields-restrito');
  const fatWrap=document.getElementById('new-pct-fat-wrap');

/* ═══════════════════════════════════════════════════════
   SAVE LEAD — Criar / Editar lead
   (migrado do bloco principal + hooks de evento)
═══════════════════════════════════════════════════════ */
async function saveLead(){
  const nome=document.getElementById('new-nome').value.trim();
  if(!nome){showToast('Preencha o nome!','error');return;}
  const status=document.getElementById('new-status').value;
  const tel=document.getElementById('new-tel').value.trim();
  const editId=document.getElementById('edit-lead-id').value;
  const btn=document.getElementById('btn-save-lead');btn.innerHTML='<span class="spin"></span>';btn.disabled=true;

  // ── VERIFICAÇÃO DE DUPLICIDADE ──
  if(tel&&!editId){
    const telLimpo=tel.replace(/\D/g,'');
    const duplicado=allLeads.find(l=>l.telefone&&l.telefone.replace(/\D/g,'')===telLimpo);
    if(duplicado){
      const isGestor=['CEO','Diretor','Gerente'].includes(currentUser.cargo);
      if(!isGestor){
        showToast('Lead já cadastrado! Consulte seu gestor.','error');
        btn.innerHTML='Salvar Lead';btn.disabled=false;
        document.getElementById('match-alert-campos').textContent=`já cadastrado com ${duplicado.corretor||'sem corretor'} (${duplicado.status})`;
        document.getElementById('match-alert').style.display='block';
        document.getElementById('match-alert').style.background='rgba(239,68,68,0.07)';
        document.getElementById('match-alert').style.borderColor='rgba(239,68,68,0.2)';
        document.getElementById('match-alert').style.color='var(--red)';
        document.getElementById('match-alert').innerHTML=`🚫 <strong>Lead já cadastrado!</strong><br>Nome: ${duplicado.nome} · Corretor: ${duplicado.corretor||'Sem corretor'} · Status: ${duplicado.status}<br><span style="font-size:10px;opacity:.8">Consulte seu gestor para transferência.</span>`;
        return;
      } else {
        const opcao=confirm(`⚠️ Telefone já cadastrado!\n\nLead: ${duplicado.nome}\nCorretor: ${duplicado.corretor||'Sem corretor'}\nStatus: ${duplicado.status}\n\nDeseja transferir este lead para ${document.getElementById('new-corr').value||currentUser.nome}?\n\nOK = Transferir | Cancelar = Manter como está`);
        if(opcao){
          const novoCorretor=document.getElementById('new-corr').value||currentUser.nome;
          try{
            await SB.upd('leads',{corretor:novoCorretor},`id=eq.${duplicado.id}`);
            showToast(`Lead transferido para ${novoCorretor}!`,'success');
            // ── COMMAND EVENT ──
            CommandEventService.record({
              modulo:CommandEventModule.LEADS,tipo:CommandEventType.LEAD_TRANSFERRED,
              origem:CommandEventOrigin.USER,lead:duplicado.nome,consultor:novoCorretor,
              descricao:`Lead transferido (duplicidade): ${duplicado.nome}`,
              detalhes:`De: ${duplicado.corretor||'sem corretor'} → Para: ${novoCorretor}`,
            });
            await loadAll();
          }catch(e){showToast('Erro ao transferir: '+e.message,'error');}
          closeModal('add-lead');resetLeadForm();
          btn.innerHTML='Salvar Lead';btn.disabled=false;
          return;
        } else {
          btn.innerHTML='Salvar Lead';btn.disabled=false;
          return;
        }
      }
    }
  }

  // ── CHECKLIST DE QUALIFICAÇÃO ──
  if(status==='Qualificado'){
    const faltando=[];
    if(!document.getElementById('new-valor').value)faltando.push('Valor pretendido');
    if(!document.getElementById('new-bairro').value)faltando.push('Bairro desejado');
    if(!document.getElementById('new-quartos').value)faltando.push('Quartos desejados');
    if(!document.getElementById('new-renda').value)faltando.push('Renda familiar');
    if(faltando.length){
      showToast(`Para qualificar preencha: ${faltando.join(', ')}`, 'error');
      const ids={'Valor pretendido':'new-valor','Bairro desejado':'new-bairro','Quartos desejados':'new-quartos','Renda familiar':'new-renda'};
      faltando.forEach(f=>{const el=document.getElementById(ids[f]);if(el){el.style.borderColor='rgba(239,68,68,0.6)';el.style.background='rgba(239,68,68,0.04)';setTimeout(()=>{el.style.borderColor='';el.style.background='';},3000);}});
      btn.innerHTML='Salvar Lead';btn.disabled=false;
      return;
    }
  }

  // ── ALERTA MATCH ──
  if(status!=='Qualificado'){
    const camposFaltando=[];
    if(!document.getElementById('new-valor').value)camposFaltando.push('Valor');
    if(!document.getElementById('new-bairro').value)camposFaltando.push('Bairro');
    if(!document.getElementById('new-quartos').value)camposFaltando.push('Quartos');
    if(!document.getElementById('new-renda').value)camposFaltando.push('Renda');
    if(camposFaltando.length){
      document.getElementById('match-alert-campos').textContent=camposFaltando.join(', ');
      document.getElementById('match-alert').style.display='block';
      await new Promise(r=>setTimeout(r,1500));
    }
  }

  if(status==='Visita Marcada'){
    const vd=document.getElementById('new-visita-data').value;
    const vh=document.getElementById('new-visita-hora').value;
    if(!vd||!vh){showToast('Preencha data e horário da visita!','error');btn.innerHTML='Salvar Lead';btn.disabled=false;return;}
  }

  const visitaData=document.getElementById('new-visita-data').value||null;
  const visitaHora=document.getElementById('new-visita-hora').value||null;
  const visitaLocal=document.getElementById('new-visita-local').value||null;
  const origemLead=document.getElementById('new-origem').value;
  const corretorLead=currentUser.cargo==='Corretor'?currentUser.nome:(document.getElementById('new-corr').value||null);

  const leadData={
    nome,
    telefone:document.getElementById('new-tel').value||null,
    email:document.getElementById('new-email').value||null,
    interesse:document.getElementById('new-int').value,
    tipo_imovel:document.getElementById('new-tipo').value,
    valor:document.getElementById('new-valor').value||null,
    bairro:document.getElementById('new-bairro').value||null,
    origem:origemLead,
    corretor:corretorLead,
    status,
    observacoes:document.getElementById('new-obs').value||null,
    visita_data:visitaData,
    visita_hora:visitaHora,
    visita_local:visitaLocal,
    quartos_desejados:parseInt(document.getElementById('new-quartos').value)||null,
    renda_familiar:document.getElementById('new-renda').value||null,
    programa_interesse:document.getElementById('new-programa').value||null,
    data_assinatura:document.getElementById('new-assinatura')?.value||null,
    pct_faturamento:parseFloat(document.getElementById('new-pct-fat')?.value)||null,
    pct_imobiliaria:parseFloat(document.getElementById('new-pct-imob')?.value)||null,
    pct_comissao_manual:parseFloat(document.getElementById('new-pct-com')?.value)||null,
    pct_kevin:parseFloat(document.getElementById('new-pct-kevin')?.value)||null,
    pct_tanner:parseFloat(document.getElementById('new-pct-tanner')?.value)||null,
  };
  try{
    if(editId)await SB.upd('leads',leadData,`id=eq.${editId}`);
    else await SB.ins('leads',[leadData]);
    closeModal('add-lead');
    showToast(editId?'Lead atualizado':'Lead cadastrado','success');
    // ── COMMAND EVENT ──────────────────────────
    const evTipo = status==='Fechado'   ? CommandEventType.SALE_COMPLETED
                 : status==='Visita Marcada' ? CommandEventType.VISIT_SCHEDULED
                 : status==='Proposta'  ? CommandEventType.PROPOSAL_SENT
                 : editId               ? CommandEventType.LEAD_UPDATED
                 : CommandEventType.LEAD_CREATED;
    CommandEventService.record({
      modulo    : CommandEventModule.LEADS,
      tipo      : evTipo,
      origem    : CommandEventOrigin.USER,
      lead      : nome,
      consultor : corretorLead,
      descricao : editId ? `Lead atualizado: ${nome}` : `Novo lead: ${nome}`,
      detalhes  : `Status: ${status} · Origem: ${origemLead}`,
      metadata  : leadData.valor ? { valor: leadData.valor } : null,
    });
    // ──────────────────────────────────────────
    resetLeadForm();
    await loadAll();
  }catch(e){showToast('Erro: '+e.message,'error');}
  btn.innerHTML='Salvar Lead';btn.disabled=false;
}

/* ═══════════════════════════════════════════════════════
   CONFIRMAR PERDA — SALE_LOST event
═══════════════════════════════════════════════════════ */
async function confirmarPerda(){
  const leadId=document.getElementById('perda-lead-id').value;
  const motivo=document.getElementById('perda-motivo').value;
  const outro=document.getElementById('perda-outro').value.trim();
  const obs=document.getElementById('perda-obs').value.trim();
  if(!motivo){showToast('Selecione o motivo da perda!','error');return;}
  if(motivo==='Outro'&&!outro){showToast('Especifique o motivo!','error');return;}
  const motivoFinal=motivo==='Outro'?outro:motivo;
  const agora=new Date().toISOString();
  const lead=allLeads.find(l=>l.id===leadId);
  const histAtual=lead?.historico_contatos?JSON.parse(lead.historico_contatos):[];
  histAtual.unshift({data:agora,obs:`❌ Perdido: ${motivoFinal}${obs?'. '+obs:''}`,autor:currentUser.nome});
  try{
    await SB.upd('leads',{
      status:'Perdido',
      motivo_perda:motivoFinal,
      obs_perda:obs||null,
      historico_contatos:JSON.stringify(histAtual),
    },`id=eq.${leadId}`);
    closeModal('perda');
    showToast('Lead marcado como perdido','success');
    // ── COMMAND EVENT ──────────────────────────
    CommandEventService.record({
      modulo    : CommandEventModule.LEADS,
      tipo      : CommandEventType.SALE_LOST,
      origem    : CommandEventOrigin.USER,
      lead      : lead?.nome || leadId,
      consultor : lead?.corretor || null,
      descricao : `Lead perdido: ${lead?.nome || leadId}`,
      detalhes  : `Motivo: ${motivoFinal}${obs?' · '+obs:''}`,
    });
    // ──────────────────────────────────────────
    await loadAll();
  }catch(e){showToast('Erro: '+e.message,'error');}
}

/* ═══════════════════════════════════════════════════════
   CONFIRMAR TRANSFERÊNCIA — LEAD_TRANSFERRED event
═══════════════════════════════════════════════════════ */
async function confirmarTransferencia(){
  const leadId=document.getElementById('transf-lead-id').value;
  const novoCorretor=document.getElementById('transf-corretor').value;
  const motivo=document.getElementById('transf-motivo').value.trim();
  if(!novoCorretor){showToast('Selecione o corretor!','error');return;}
  if(!motivo){showToast('Informe o motivo da transferência!','error');return;}
  const lead=allLeads.find(l=>l.id===leadId);
  const agora=new Date().toISOString();
  const histAtual=lead?.historico_contatos?JSON.parse(lead.historico_contatos):[];
  histAtual.unshift({data:agora,obs:`🔄 Transferido de ${lead.corretor||'sem corretor'} para ${novoCorretor}: ${motivo}`,autor:currentUser.nome});
  try{
    await SB.upd('leads',{
      corretor:novoCorretor,
      historico_contatos:JSON.stringify(histAtual),
    },`id=eq.${leadId}`);
    closeModal('transferir');
    showToast(`Lead transferido para ${novoCorretor}!`,'success');
    // ── COMMAND EVENT ──────────────────────────
    CommandEventService.record({
      modulo    : CommandEventModule.LEADS,
      tipo      : CommandEventType.LEAD_TRANSFERRED,
      origem    : CommandEventOrigin.USER,
      lead      : lead?.nome || leadId,
      consultor : novoCorretor,
      descricao : `Lead transferido: ${lead?.nome || leadId}`,
      detalhes  : `De: ${lead?.corretor||'sem corretor'} → Para: ${novoCorretor} · Motivo: ${motivo}`,
    });
    // ──────────────────────────────────────────
    await loadAll();
  }catch(e){showToast('Erro: '+e.message,'error');}
}

/* ═══════════════════════════════════════════════════════
   SALVAR FOLLOW-UP — FOLLOWUP event (modal)
═══════════════════════════════════════════════════════ */
async function salvarFollowUp(){
  const leadId=document.getElementById('fu-lead-id').value;
  const data=document.getElementById('fu-data').value;
  const hora=document.getElementById('fu-hora').value;
  const obs=document.getElementById('fu-obs').value.trim();
  if(!data||!hora){showToast('Preencha data e hora!','error');return;}
  const lead=allLeads.find(l=>l.id===leadId);
  const agora=new Date().toISOString();
  const hist=lead?.historico_contatos?JSON.parse(lead.historico_contatos):[];
  hist.unshift({data:agora,obs:`📅 Follow-up agendado: ${data} às ${hora}${obs?' — '+obs:''}`,autor:currentUser.nome});
  try{
    await SB.upd('leads',{
      proximo_followup:`${data}T${hora}`,
      historico_contatos:JSON.stringify(hist),
    },`id=eq.${leadId}`);
    closeModal('followup');
    showToast('Follow-up agendado!','success');
    // ── COMMAND EVENT ──────────────────────────
    CommandEventService.record({
      modulo    : CommandEventModule.LEADS,
      tipo      : CommandEventType.FOLLOWUP,
      origem    : CommandEventOrigin.USER,
      lead      : lead?.nome || leadId,
      consultor : lead?.corretor || null,
      descricao : `Follow-up agendado: ${lead?.nome || leadId}`,
      detalhes  : `Data: ${data} às ${hora}${obs?' · '+obs:''}`,
    });
    // ──────────────────────────────────────────
    await loadAll();
  }catch(e){showToast('Erro: '+e.message,'error');}
}
}
