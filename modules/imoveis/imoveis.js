function getDiferenciais(){return[...document.querySelectorAll('#im-diferenciais-wrap input:checked')].map(c=>c.value);}
function setDiferenciais(arr){document.querySelectorAll('#im-diferenciais-wrap input').forEach(c=>{c.checked=arr&&arr.includes(c.value);});}

function renderImoveis(imoveis){
  const grid=document.getElementById('imoveis-grid');if(!grid)return;
  const fmt=v=>{if(!v)return'—';const s=String(v).replace(/[^\d,.]/g,'');const n=parseFloat(s.replace(/\./g,'').replace(',','.'));return isNaN(n)?v:n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});};
  if(!imoveis||!imoveis.length){grid.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-muted);font-size:13px">🏠<br><br>Nenhum imóvel cadastrado ainda.</div>`;return;}
  grid.innerHTML=imoveis.map(im=>{
    const difs=im.diferenciais?JSON.parse(im.diferenciais):[];
    const stCls=im.status==='Disponível'?'disp':im.status==='Reservado'?'res':'vend';
    const fotoHtml=im.foto_url
      ?`<img src="${im.foto_url}" style="width:100%;height:150px;object-fit:cover;display:block" onerror="this.style.display='none';this.nextSibling.style.display='flex'">`+`<div style="display:none;width:100%;height:150px;background:var(--bg-input);align-items:center;justify-content:center;font-size:36px">🏢</div>`
      :`<div style="width:100%;height:150px;background:linear-gradient(135deg,var(--bg-input),var(--bg-card-hi));display:flex;align-items:center;justify-content:center;font-size:36px">${IM_E[im.tipo]||'🏠'}</div>`;
    return`<div class="im-card">
      <div style="position:relative">${fotoHtml}<span class="im-status-badge ${stCls}">${im.status}</span>${im.publicado?`<span class="im-pub-badge">📢 Na landing</span>`:''}</div>
      <div class="im-body">
        ${im.programa?`<span class="im-programa">${im.programa}</span>`:''}
        <div class="im-nome">${im.nome}</div>
        <div class="im-sub">${[im.tipo,im.bairro,im.cidade].filter(Boolean).join(' · ')}</div>
        <div class="im-valor-big">${fmt(im.valor)}</div>
        <div class="im-specs">
          ${im.quartos?`<span class="im-spec">🛏 ${im.quartos} dorm${im.quartos>1?'s':''}</span>`:''}
          ${im.banheiros?`<span class="im-spec">🚿 ${im.banheiros}</span>`:''}
          ${im.garagem?`<span class="im-spec">🚗 ${im.garagem} vaga${im.garagem>1?'s':''}</span>`:''}
          ${im.metragem?`<span class="im-spec">📐 ${im.metragem}</span>`:''}
        </div>
        ${difs.length?`<div class="im-difs">${difs.slice(0,4).map(d=>`<span class="im-dif">${d}</span>`).join('')}${difs.length>4?`<span class="im-dif">+${difs.length-4}</span>`:''}</div>`:''}
        ${im.descricao?`<div style="font-size:10px;color:var(--text-tertiary);margin-bottom:8px">${im.descricao}</div>`:''}
        <button class="im-btn im-btn-pub ${im.publicado?'on':''}" onclick="togglePublicar('${im.id}')" style="width:100%;margin-bottom:6px">${im.publicado?'📢 Publicado na landing':'📢 Publicar na landing'}</button>
        <div class="im-actions">
          ${im.link_portal?`<button class="im-btn im-btn-link" onclick="window.open('${im.link_portal}','_blank')">🔗 Órulo</button>`:''}
          <button class="im-btn im-btn-match" onclick="abrirMatchImovel('${im.id}')">🎯 Match</button>
          <button class="im-btn im-btn-edit" onclick="editImovel('${im.id}')">✏️</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function filterImoveis(){
  const q=(document.getElementById('search-imovel').value||'').toLowerCase();
  const st=document.getElementById('filter-im-status').value;
  renderImoveis(allImoveis.filter(i=>(!q||i.nome.toLowerCase().includes(q)||(i.bairro||'').toLowerCase().includes(q))&&(!st||i.status===st)));
}

function editImovel(id){
  const im=allImoveis.find(x=>x.id===id);if(!im)return;
  document.getElementById('modal-imovel-title').textContent='Editar Imóvel';
  document.getElementById('edit-imovel-id').value=id;
  document.getElementById('im-nome').value=im.nome||'';
  document.getElementById('im-bairro').value=im.bairro||'';
  document.getElementById('im-cidade').value=im.cidade||'';
  document.getElementById('im-valor').value=im.valor||'';
  document.getElementById('im-entrada').value=im.entrada||'';
  document.getElementById('im-quartos').value=im.quartos||'';
  document.getElementById('im-banheiros').value=im.banheiros||'';
  document.getElementById('im-garagem').value=im.garagem||'';
  document.getElementById('im-metragem').value=im.metragem||'';
  document.getElementById('im-const').value=im.construtora||'';
  document.getElementById('im-link').value=im.link_portal||'';
  document.getElementById('im-foto-url').value=im.foto_url||'';
  document.getElementById('im-desc').value=im.descricao||'';
  if(im.foto_url){document.getElementById('im-foto-img').src=im.foto_url;document.getElementById('im-foto-preview').style.display='block';}
  setDiferenciais(im.diferenciais?JSON.parse(im.diferenciais):[]);
  setSelectVal('im-tipo',im.tipo);
  setSelectVal('im-status',im.status);
  setSelectVal('im-programa',im.programa||'');
  document.getElementById('btn-save-im').textContent='Salvar alterações';
  openModal('add-imovel');
}

async function saveImovel(){
  const nome=document.getElementById('im-nome').value.trim();
  if(!nome){showToast('Preencha o nome!','error');return;}
  const btn=document.getElementById('btn-save-im');btn.innerHTML='<span class="spin"></span>';btn.disabled=true;
  const editId=document.getElementById('edit-imovel-id').value;
  const difs=getDiferenciais();
  const data={
    nome,
    tipo:document.getElementById('im-tipo').value,
    bairro:document.getElementById('im-bairro').value||null,
    cidade:document.getElementById('im-cidade').value||null,
    valor:document.getElementById('im-valor').value||null,
    entrada:document.getElementById('im-entrada').value||null,
    quartos:parseInt(document.getElementById('im-quartos').value)||null,
    banheiros:parseInt(document.getElementById('im-banheiros').value)||null,
    garagem:parseInt(document.getElementById('im-garagem').value)||null,
    metragem:document.getElementById('im-metragem').value||null,
    construtora:document.getElementById('im-const').value||null,
    status:document.getElementById('im-status').value,
    link_portal:document.getElementById('im-link').value||null,
    foto_url:document.getElementById('im-foto-url').value||null,
    programa:document.getElementById('im-programa').value||null,
    descricao:document.getElementById('im-desc').value||null,
    diferenciais:difs.length?JSON.stringify(difs):null,
  };
  try{
    if(editId){
      const atual=allImoveis.find(x=>x.id===editId);
      if(atual)data.publicado=atual.publicado||false; // mantém estado de publicação
      await SB.upd('imoveis',data,`id=eq.${editId}`);
    }
    else await SB.ins('imoveis',[data]);
    closeModal('add-imovel');
    showToast(editId?'Imóvel atualizado':`"${nome}" cadastrado`,'success');
    // ── COMMAND EVENT ──────────────────────────
    CommandEventService.record({
      modulo    : CommandEventModule.IMOVEIS,
      tipo      : editId ? CommandEventType.LEAD_UPDATED : CommandEventType.PROPERTY_CREATED,
      origem    : CommandEventOrigin.USER,
      imovel    : nome,
      descricao : editId ? `Imóvel atualizado: ${nome}` : `Novo imóvel cadastrado: ${nome}`,
      detalhes  : `Tipo: ${data.tipo} · Bairro: ${data.bairro||'—'} · Valor: ${data.valor||'—'}`,
    });
    // ──────────────────────────────────────────
    document.getElementById('edit-imovel-id').value='';
    document.getElementById('modal-imovel-title').textContent='Novo Imóvel';
    document.getElementById('btn-save-im').textContent='Salvar Imóvel';
    document.getElementById('im-foto-preview').style.display='none';
    setDiferenciais([]);
    await loadAll();
  }catch(e){showToast('Erro: '+e.message,'error');}
  btn.innerHTML='Salvar Imóvel';btn.disabled=false;
}

const MAX_PUBLICADOS=6;
async function togglePublicar(id){
  const im=allImoveis.find(x=>x.id===id);if(!im)return;
  const vaiPublicar=!im.publicado;
  // se está tentando publicar, checa o limite
  if(vaiPublicar){
    const jaPublicados=allImoveis.filter(x=>x.publicado).length;
    if(jaPublicados>=MAX_PUBLICADOS){
      showToast(`Limite de ${MAX_PUBLICADOS} imóveis na landing. Despublique um antes.`,'error');
      return;
    }
  }
  try{
    await SB.upd('imoveis',{publicado:vaiPublicar},`id=eq.${id}`);
    im.publicado=vaiPublicar; // atualiza local pra refletir na hora
    showToast(vaiPublicar?`"${im.nome}" publicado na landing 📢`:`"${im.nome}" removido da landing`,'success');
    filterImoveis(); // re-renderiza os cards
  }catch(e){
    showToast('Erro ao publicar: '+e.message,'error');
  }
}
async function abrirMatchImovel(imovelId){
  // Match a partir do imóvel — sugere leads compatíveis
  const im=allImoveis.find(x=>x.id===imovelId);if(!im)return;
  const pv=v=>{if(!v)return 0;const s=String(v).replace(/[^\d,.]/g,'');const n=parseFloat(s.replace(/\./g,'').replace(',','.'));return isNaN(n)?0:n;};
  const imVal=pv(im.valor);
  const leads=allLeads.filter(l=>l.status!=='Fechado'&&l.status!=='Perdido');
  document.getElementById('match-lead-info').innerHTML=`<strong style="color:var(--text-primary)">🏢 ${im.nome}</strong><br>${[im.tipo,im.bairro,im.cidade].filter(Boolean).join(' · ')} · ${im.valor||'—'}`;
  document.getElementById('match-results').innerHTML='';
  document.getElementById('match-loading').style.display='block';
  document.getElementById('match-empty').style.display='none';
  openModal('match');
  // calcula score local
  const scored=leads.map(l=>{
    let score=0;const razoes=[];
    const lVal=pv(l.valor);
    if(im.tipo&&l.tipo_imovel&&im.tipo.toLowerCase()===l.tipo_imovel.toLowerCase()){score+=30;razoes.push('✅ Tipo compatível');}
    if(imVal>0&&lVal>0){const diff=Math.abs(imVal-lVal)/lVal;if(diff<=0.1){score+=30;razoes.push('✅ Valor ideal');}else if(diff<=0.25){score+=15;razoes.push('⚠️ Valor próximo');}}
    if(im.bairro&&l.bairro&&im.bairro.toLowerCase()===l.bairro.toLowerCase()){score+=20;razoes.push('✅ Bairro igual');}
    if(l.interesse==='hot'){score+=15;razoes.push('🔥 Lead quente');}else if(l.interesse==='warm'){score+=7;}
    if(im.programa==='MCMV'&&lVal>0&&lVal<=350000){score+=10;razoes.push('✅ Faixa MCMV');}
    return{...l,score,razoes};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,8);
  document.getElementById('match-loading').style.display='none';
  if(!scored.length){document.getElementById('match-empty').style.display='block';return;}
  document.getElementById('match-results').innerHTML=scored.map(l=>{
    const cls=l.score>=60?'s-high':l.score>=30?'s-med':'s-low';
    return`<div class="match-card" onclick="showDetail('${l.id}');closeModal('match')">
      <div class="match-score ${cls}"><div class="match-score-num">${l.score}</div><div class="match-score-lbl">pts</div></div>
      <div class="match-info">
        <div class="match-nome">${l.nome} ${l.telefone?`· ${l.telefone}`:''}</div>
        <div class="match-razoes">${l.razoes.map(r=>`<span>${r}</span>`).join(' ')}</div>
      </div>
    </div>`;
  }).join('');
}

async function abrirMatchLead(leadId){
  // Match a partir do lead — sugere imóveis compatíveis
  const lead=allLeads.find(x=>x.id===leadId);if(!lead)return;
  const pv=v=>{if(!v)return 0;const s=String(v).replace(/[^\d,.]/g,'');const n=parseFloat(s.replace(/\./g,'').replace(',','.'));return isNaN(n)?0:n;};
  const lVal=pv(lead.valor);
  const disponiveis=allImoveis.filter(i=>i.status==='Disponível');
  document.getElementById('match-lead-info').innerHTML=`<strong style="color:var(--text-primary)">👤 ${lead.nome}</strong><br>${[lead.tipo_imovel,lead.bairro,lead.valor?lead.valor:'—'].filter(Boolean).join(' · ')}`;
  document.getElementById('match-results').innerHTML='';
  document.getElementById('match-loading').style.display='block';
  document.getElementById('match-empty').style.display='none';
  openModal('match');
  const scored=disponiveis.map(im=>{
    let score=0;const razoes=[];
    const imVal=pv(im.valor);
    if(lead.tipo_imovel&&im.tipo&&im.tipo.toLowerCase()===lead.tipo_imovel.toLowerCase()){score+=25;razoes.push('✅ Tipo ideal');}
    if(imVal>0&&lVal>0){const diff=Math.abs(imVal-lVal)/lVal;if(diff<=0.1){score+=25;razoes.push('✅ Valor ideal');}else if(diff<=0.3){score+=12;razoes.push('⚠️ Valor próximo');}}
    if(lead.bairro&&im.bairro&&im.bairro.toLowerCase()===lead.bairro.toLowerCase()){score+=20;razoes.push('✅ Bairro ideal');}
    if(lead.quartos_desejados&&im.quartos&&parseInt(lead.quartos_desejados)===im.quartos){score+=15;razoes.push('✅ Quartos ideais');}
    else if(lead.quartos_desejados&&im.quartos&&Math.abs(parseInt(lead.quartos_desejados)-im.quartos)===1){score+=7;razoes.push('⚠️ Quartos próximos');}
    if(lead.programa_interesse&&im.programa&&lead.programa_interesse===im.programa){score+=10;razoes.push(`✅ Programa ${im.programa}`);}
    if(lead.renda_familiar&&im.entrada){const renda=pv(lead.renda_familiar);const entrada=pv(im.entrada);if(renda>0&&entrada>0&&entrada<=renda*3){score+=5;razoes.push('✅ Entrada compatível');}}
    if(im.diferenciais){const difs=JSON.parse(im.diferenciais);if(difs.length>=3)score+=5;}
    return{...im,score,razoes};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,8);
  document.getElementById('match-loading').style.display='none';
  if(!scored.length){document.getElementById('match-empty').style.display='block';return;}
  const fmt=v=>{const n=parseFloat(String(v||'').replace(/[^\d,.]/g,'').replace(/\./g,'').replace(',','.'));return isNaN(n)?v:n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});};
  document.getElementById('match-results').innerHTML=scored.map(im=>{
    const cls=im.score>=60?'s-high':im.score>=30?'s-med':'s-low';
    return`<div class="match-card">
      <div class="match-score ${cls}"><div class="match-score-num">${im.score}</div><div class="match-score-lbl">pts</div></div>
      <div class="match-info" style="flex:1">
        <div class="match-nome">${im.nome} · ${fmt(im.valor)}</div>
        <div class="match-razoes">${im.razoes.map(r=>`<span>${r}</span>`).join(' ')}</div>
        ${im.link_portal?`<a href="${im.link_portal}" target="_blank" style="font-size:10px;color:var(--green);text-decoration:none;margin-top:4px;display:inline-block">🔗 Ver no Órulo</a>`:''}
      </div>
    </div>`;
  }).join('');
}

/* ── CORRETORES ── */
