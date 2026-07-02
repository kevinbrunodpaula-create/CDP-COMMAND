async function oaDB(method, path, body){
  return dbReq(method, path, body);
}

async function oaLogHistorico(prospecto_id, prospecto_nome, acao, detalhes){
  try{
    await oaDB('POST','oa_historico',[{
      prospecto_id: prospecto_id||null,
      prospecto_nome: prospecto_nome||null,
      acao,
      feito_por: currentUser?.nome||'sistema',
      detalhes: detalhes||null,
    }]);
  }catch(e){ console.warn('Histórico OA falhou:',e.message); }
}

let oaAbaAtual='fila';
let oaIdAtivo=null;
let oaImportDados=[];
let oaTimerInterval=null;
let oaTimerSeg=0;
let oaFila=[];
let oaDesc=[];
let oaAtv=[];

function oaMudarAba(aba){
  oaAbaAtual=aba;
  ['fila','descartados','ativados'].forEach(a=>{
    document.getElementById(`oa-aba-${a}`)?.style&&(document.getElementById(`oa-aba-${a}`).style.display=a===aba?'block':'none');
    document.getElementById(`oa-tab-${a}`)?.classList[a===aba?'add':'remove']('active');
  });
}

async function renderOA(){
  try{
    const [fila, desc, atv] = await Promise.all([
      oaDB('GET','oa_fila?status=eq.aguardando&order=criado_em.asc'),
      oaDB('GET','oa_fila?status=eq.descartado&order=atualizado_em.desc'),
      oaDB('GET','oa_fila?status=eq.ativado&order=atualizado_em.desc'),
    ]);
    oaFila=fila||[]; oaDesc=desc||[]; oaAtv=atv||[];
  }catch(e){
    showToast('Erro ao carregar Oferta Ativa: '+e.message,'error');
    return;
  }

  const total=oaFila.length+oaDesc.length+oaAtv.length;
  const taxa=total>0?Math.round((oaAtv.length/(oaAtv.length+oaDesc.length+0.001))*100):0;
  el('oa-k-fila').textContent=oaFila.length;
  el('oa-k-ativados').textContent=oaAtv.length;
  el('oa-k-descartados').textContent=oaDesc.length;
  el('oa-k-taxa').textContent=taxa+'%';
  const hoje=new Date().toDateString();
  const ligHoje=oaAtv.filter(a=>new Date(a.atualizado_em).toDateString()===hoje).length
              +oaDesc.filter(d=>new Date(d.atualizado_em).toDateString()===hoje).length;
  el('oa-k-ligados').textContent=ligHoje;

  if(el('oa-fila-count'))el('oa-fila-count').textContent=oaFila.length;
  if(el('oa-desc-count'))el('oa-desc-count').textContent=oaDesc.length;
  if(el('oa-atv-count'))el('oa-atv-count').textContent=oaAtv.length;

  const search=(el('oa-search')?.value||'').toLowerCase();
  const filaFiltrada=oaFila.filter(p=>!search||p.nome.toLowerCase().includes(search)||(p.telefone||'').includes(search));

  const ativoEl=document.getElementById('oa-prospecto-ativo');
  if(!ativoEl)return;

  const prospectoAtivo=oaFila.find(p=>p.id===oaIdAtivo)||filaFiltrada[0]||null;
  if(prospectoAtivo){
    oaIdAtivo=prospectoAtivo.id;
    ativoEl.innerHTML=oaCardAtivo(prospectoAtivo);
  } else {
    ativoEl.innerHTML=`<div style="background:var(--bg-input);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:40px;text-align:center;color:var(--text-muted);font-size:13px">
      ⚡ Nenhum prospecto na fila.<br><span style="font-size:11px">Importe uma lista ou adicione manualmente.</span>
      <div style="margin-top:16px;display:flex;gap:8px;justify-content:center">
        <button class="btn-p" onclick="oaAbrirImportar()" style="background:var(--orange);border-color:var(--orange);color:#000;font-size:12px">📥 Importar lista</button>
        <button class="btn-p" onclick="oaAbrirAddManual()" style="font-size:12px">+ Adicionar</button>
      </div>
    </div>`;
  }

  const listaEl=document.getElementById('oa-lista-fila');
  if(listaEl){
    listaEl.innerHTML=filaFiltrada.length?filaFiltrada.map((p,i)=>`
      <div class="oa-item${p.id===oaIdAtivo?' oa-ativo-row':''}" onclick="oaSelecionar('${p.id}')">
        <div class="oa-item-av">${p.nome.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
        <div class="oa-item-info">
          <div class="oa-item-nome">${p.nome}</div>
          <div class="oa-item-sub">${p.telefone||'Sem tel'}${p.corretor_atual?` · <span style="color:var(--orange)">${p.corretor_atual}</span>`:''}${p.criado_em?`<span style="color:var(--text-muted);font-size:9px;margin-left:4px">· ${new Date(p.criado_em).toLocaleDateString('pt-BR')}</span>`:''}</div>
        </div>
        <div class="oa-item-actions">
          ${p.telefone?`<a href="tel:${p.telefone.replace(/\D/g,'')}" class="oa-mini-btn oa-mini-ligar" onclick="oaIniciarTimer(event)">📞</a>`:''}
          <button class="oa-mini-btn oa-mini-ativar" onclick="oaAbrirAtivar('${p.id}',event)">✅</button>
          <button class="oa-mini-btn oa-mini-descartar" onclick="oaDescartar('${p.id}',event)">🗑</button>
        </div>
      </div>`).join('')
    :`<div class="disc-vazia" style="color:var(--text-tertiary)">Fila vazia!</div>`;
  }

  const descEl=document.getElementById('oa-lista-descartados');
  if(descEl){
    descEl.innerHTML=oaDesc.length?oaDesc.map(p=>`
      <div class="oa-desc-item">
        <div class="oa-desc-av">${p.nome.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
        <div class="oa-desc-info">
          <div class="oa-desc-nome">${p.nome}</div>
          <div class="oa-desc-sub">${p.telefone||'Sem tel'}${p.dados_extras?.motivo_descarte?' · '+p.dados_extras.motivo_descarte:''}<span style="color:var(--text-muted);font-size:9px;margin-left:4px">· Desc. por ${p.corretor_atual||'?'}</span></div>
        </div>
        <button class="oa-btn-restaurar" onclick="oaRestaurar('${p.id}')">↩ Restaurar</button>
      </div>`).join('')
    :`<div class="disc-vazia" style="color:var(--text-muted);font-size:12px">Nenhum descartado ainda.</div>`;
  }

  const atvEl=document.getElementById('oa-lista-ativados');
  if(atvEl){
    atvEl.innerHTML=oaAtv.length?oaAtv.map(p=>`
      <div class="oa-ativados-item">
        <div class="oa-ativados-dot"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:500;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.nome}</div>
          <div style="font-size:10px;color:var(--text-tertiary)">${p.telefone||'—'} · Ativado por ${p.corretor_atual||'—'} · ${p.atualizado_em?new Date(p.atualizado_em).toLocaleDateString('pt-BR'):''}</div>
        </div>
        <span class="disc-badge" style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);color:var(--green);font-size:10px;padding:3px 8px">✅ Lead criado</span>
      </div>`).join('')
    :`<div class="disc-vazia" style="color:var(--text-muted);font-size:12px">Nenhum lead ativado ainda.</div>`;
  }
}

function el(id){return document.getElementById(id);}

function oaCardAtivo(p){
  return`<div class="oa-card-ativo">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px">
      <div>
        <div class="oa-nome">${p.nome}</div>
        ${p.telefone?`<a href="tel:${p.telefone.replace(/\D/g,'')}" class="oa-tel">${p.telefone}</a>`:`<span style="font-size:12px;color:var(--text-tertiary)">Sem telefone</span>`}
      </div>
      <span style="font-size:10px;font-weight:500;padding:4px 10px;border-radius:20px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);color:var(--orange);flex-shrink:0">Prospecção</span>
    </div>
    ${p.dados_extras?.obs?`<div style="font-size:11px;color:var(--text-tertiary);background:rgba(255,255,255,0.03);border-radius:6px;padding:8px 10px;margin-bottom:12px">${p.dados_extras.obs}</div>`:''}
    ${p.email?`<div style="font-size:11px;color:var(--text-tertiary);margin-bottom:10px">✉ ${p.email}</div>`:''}
    ${p.corretor_atual?`<div style="font-size:10px;color:var(--orange);margin-bottom:10px">👤 Em atendimento: ${p.corretor_atual}</div>`:''}
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">
      ${p.telefone?`<a href="tel:${p.telefone.replace(/\D/g,'')}" class="oa-btn-ligar" id="oa-btn-ligar-main" onclick="oaIniciarTimer(event)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.82 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
        Ligar agora
      </a>`:''}
      ${p.telefone?`<a href="https://wa.me/55${p.telefone.replace(/\D/g,'')}" target="_blank" class="disc-pular" style="border-color:rgba(34,197,94,0.2);color:var(--green);text-decoration:none">WhatsApp</a>`:''}
    </div>
    <div id="oa-timer-el" style="display:none;margin-bottom:12px"><span class="disc-timer"><span class="disc-timer-dot"></span><span id="oa-timer-txt">00:00</span> em ligação</span></div>
    <textarea class="oa-obs-input" id="oa-obs-${p.id}" placeholder="Observação da ligação (opcional)..." rows="2"></textarea>
    <div class="oa-acoes">
      <button class="oa-btn-ativar" onclick="oaAbrirAtivar('${p.id}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Ativar — criar lead
      </button>
      <button class="oa-btn-descartar" onclick="oaDescartar('${p.id}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        Descartar
      </button>
      <button class="oa-btn-pular-oa" onclick="oaPular('${p.id}')">Pular →</button>
    </div>
  </div>`;
}

function oaIniciarTimer(e){
  if(e)e.stopPropagation();
  const timerEl=document.getElementById('oa-timer-el');
  if(timerEl)timerEl.style.display='flex';
  if(oaTimerInterval)clearInterval(oaTimerInterval);
  oaTimerSeg=0;
  oaTimerInterval=setInterval(()=>{
    oaTimerSeg++;
    const m=String(Math.floor(oaTimerSeg/60)).padStart(2,'0');
    const s=String(oaTimerSeg%60).padStart(2,'0');
    const t=document.getElementById('oa-timer-txt');
    if(t)t.textContent=m+':'+s;
  },1000);
}

function oaPararTimer(){
  if(oaTimerInterval){clearInterval(oaTimerInterval);oaTimerInterval=null;}
  oaTimerSeg=0;
  const timerEl=document.getElementById('oa-timer-el');
  if(timerEl)timerEl.style.display='none';
}

function oaSelecionar(id){
  oaIdAtivo=id;
  renderOA();
}

async function oaPular(id){
  try{
    await oaDB('PATCH',`oa_fila?id=eq.${id}`,{
      atualizado_em: new Date().toISOString(),
      dados_extras: {pulado_em: new Date().toISOString(), pulado_por: currentUser?.nome}
    });
    const p=oaFila.find(x=>x.id===id);
    await oaLogHistorico(id, p?.nome, 'pulado', {por: currentUser?.nome});
  }catch(e){showToast('Erro: '+e.message,'error');return;}
  oaIdAtivo=null;
  oaPararTimer();
  renderOA();
}

async function oaDescartar(id,e){
  if(e){e.stopPropagation();e.preventDefault();}
  oaPararTimer();
  const p=oaFila.find(x=>x.id===id);
  if(!p)return;
  const obs=document.getElementById(`oa-obs-${id}`)?.value?.trim()||'';
  try{
    await oaDB('PATCH',`oa_fila?id=eq.${id}`,{
      status:'descartado',
      corretor_atual: currentUser?.nome,
      atualizado_em: new Date().toISOString(),
      dados_extras:{...(p.dados_extras||{}), motivo_descarte:obs||null, descartado_por:currentUser?.nome, descartado_em:new Date().toISOString()}
    });
    await oaLogHistorico(id, p.nome, 'descartado', {motivo:obs||null, por:currentUser?.nome});
  }catch(err){showToast('Erro ao descartar: '+err.message,'error');return;}
  oaIdAtivo=null;
  showToast(`${p.nome.split(' ')[0]} descartado — disponível na aba Descartados`,'info');
  renderOA();
}

async function oaRestaurar(id){
  const p=oaDesc.find(x=>x.id===id);
  if(!p)return;
  try{
    await oaDB('PATCH',`oa_fila?id=eq.${id}`,{
      status:'aguardando',
      corretor_atual:null,
      atualizado_em:new Date().toISOString(),
      dados_extras:{...(p.dados_extras||{}), restaurado_por:currentUser?.nome, restaurado_em:new Date().toISOString()}
    });
    await oaLogHistorico(id, p.nome, 'restaurado', {por:currentUser?.nome});
  }catch(err){showToast('Erro ao restaurar: '+err.message,'error');return;}
  showToast(`${p.nome.split(' ')[0]} restaurado para a fila!`,'success');
  renderOA();
}

function oaAbrirAtivar(id,e){
  if(e){e.stopPropagation();e.preventDefault();}
  const p=oaFila.find(x=>x.id===id);
  if(!p)return;
  document.getElementById('oa-ativar-id').value=id;
  document.getElementById('oa-ativar-info').innerHTML=`<strong style="color:var(--text-primary)">${p.nome}</strong><br>📞 ${p.telefone||'Sem telefone'}${p.email?` · ✉ ${p.email}`:''}`;
  const obsEl=document.getElementById(`oa-obs-${id}`);
  if(obsEl&&obsEl.value)document.getElementById('oa-atv-obs').value=obsEl.value;
  ['oa-atv-tipo','oa-atv-valor','oa-atv-bairro'].forEach(i=>{const e=document.getElementById(i);if(e)e.value='';});
  document.getElementById('oa-atv-int').value='warm';
  document.getElementById('oa-atv-origem').value='Oferta Ativa';
  openModal('oa-ativar');
}

async function oaConfirmarAtivar(){
  const id=document.getElementById('oa-ativar-id').value;
  const p=oaFila.find(x=>x.id===id);
  if(!p)return;
  const tipo=document.getElementById('oa-atv-tipo').value;
  const valor=document.getElementById('oa-atv-valor').value.trim();
  const bairro=document.getElementById('oa-atv-bairro').value.trim();
  const interesse=document.getElementById('oa-atv-int').value;
  const origem=document.getElementById('oa-atv-origem').value;
  const obs=document.getElementById('oa-atv-obs').value.trim();

  const btn=document.getElementById('btn-oa-confirmar-ativar');
  btn.innerHTML='<span class="spin"></span>';btn.disabled=true;

  try{
    const agora=new Date().toISOString();
    const histInicial=[{data:agora,obs:`⚡ Ativado via Oferta Ativa${obs?': '+obs:''}`,autor:currentUser.nome}];
    await SB.ins('leads',[{
      nome:p.nome,
      telefone:p.telefone||null,
      email:p.email||null,
      tipo_imovel:tipo||null,
      valor:valor||null,
      bairro:bairro||null,
      interesse,
      origem,
      corretor:currentUser.nome,
      status:'Lead Novo',
      created_at:agora,
      historico_contatos:JSON.stringify(histInicial),
    }]);
    // Atualiza status no Supabase
    await oaDB('PATCH',`oa_fila?id=eq.${id}`,{
      status:'ativado',
      corretor_atual:currentUser.nome,
      atualizado_em:agora,
      dados_extras:{...(p.dados_extras||{}), ativado_por:currentUser.nome, ativado_em:agora, interesse, obs}
    });
    await oaLogHistorico(id, p.nome, 'ativado', {por:currentUser.nome, interesse, obs});
    oaIdAtivo=null;
    oaPararTimer();
    closeModal('oa-ativar');
    showToast(`🎉 ${p.nome.split(' ')[0]} ativado como Lead Novo!`,'success');
    await loadAll();
    renderOA();
  }catch(err){showToast('Erro ao criar lead: '+err.message,'error');}
  btn.innerHTML='<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Ativar — criar lead';
  btn.disabled=false;
}

/* ── OA: Add manual ── */
function oaAbrirAddManual(){
  ['oa-add-nome','oa-add-tel','oa-add-email','oa-add-obs'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  openModal('oa-add');
  setTimeout(()=>document.getElementById('oa-add-nome')?.focus(),100);
}

async function oaSalvarAdd(){
  const nome=document.getElementById('oa-add-nome').value.trim();
  const tel=document.getElementById('oa-add-tel').value.trim();
  if(!nome){showToast('Informe o nome!','error');return;}
  if(!tel){showToast('Informe o telefone!','error');return;}
  try{
    const agora=new Date().toISOString();
    const [novo]=await oaDB('POST','oa_fila',[{
      nome, telefone:tel,
      email:document.getElementById('oa-add-email').value.trim()||null,
      dados_extras:{obs:document.getElementById('oa-add-obs').value.trim()||null},
      status:'aguardando',
      criado_em:agora, atualizado_em:agora,
    }]);
    await oaLogHistorico(novo?.id, nome, 'adicionado_manual', {por:currentUser?.nome});
    closeModal('oa-add');
    showToast(`${nome.split(' ')[0]} adicionado à Oferta Ativa!`,'success');
    renderOA();
  }catch(e){showToast('Erro: '+e.message,'error');}
}

/* ── OA: Importar CSV/Sheets ── */
function oaAbrirImportar(){
  oaImportDados=[];
  const fi=document.getElementById('oa-imp-file');if(fi)fi.value='';
  const su=document.getElementById('oa-imp-sheets');if(su)su.value='';
  const pv=document.getElementById('oa-imp-preview');if(pv)pv.style.display='none';
  const bi=document.getElementById('btn-oa-importar');if(bi)bi.disabled=true;
  openModal('oa-importar');
}

async function oaPreviewImport(input){
  const file=input.files[0];if(!file)return;
  const text=await file.text();
  const rows=parseCSV(text);
  oaImportDados=rows.map(r=>({
    nome:r.nome||r.name||r.cliente||r.contato||'',
    telefone:(r.telefone||r.fone||r.celular||r.whatsapp||r.phone||r.tel||'').replace(/'+/g,'').trim(),
    email:r.email||r['e-mail']||r.mail||'',
    obs:r.obs||r.observacao||r.observação||'',
  })).filter(r=>r.nome);
  oaMostrarPreviewImport();
}

async function oaBuscarSheets(){
  const url=document.getElementById('oa-imp-sheets')?.value?.trim();
  if(!url){showToast('Cole o link!','error');return;}
  const match=url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if(!match){showToast('Link inválido!','error');return;}
  const csvUrl=`https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
  try{
    showToast('Buscando planilha...','info');
    const resp=await fetch(csvUrl);
    if(!resp.ok)throw new Error('Planilha não acessível');
    const text=await resp.text();
    const rows=parseCSV(text);
    oaImportDados=rows.map(r=>({
      nome:r.nome||r.name||r.cliente||r.contato||'',
      telefone:(r.telefone||r.fone||r.celular||r.whatsapp||r.tel||'').replace(/'+/g,'').trim(),
      email:r.email||r['e-mail']||r.mail||'',
      obs:r.obs||r.observacao||r.observação||'',
    })).filter(r=>r.nome);
    oaMostrarPreviewImport();
  }catch(e){showToast('Erro: '+e.message,'error');}
}

function oaMostrarPreviewImport(){
  if(!oaImportDados.length){showToast('Nenhum contato encontrado','error');return;}
  const pv=document.getElementById('oa-imp-preview');
  const table=document.getElementById('oa-imp-preview-table');
  const stats=document.getElementById('oa-imp-stats');
  const sample=oaImportDados.slice(0,5);
  table.innerHTML=`<table style="width:100%;border-collapse:collapse">
    <tr style="background:rgba(255,255,255,0.04)">${['Nome','Telefone','E-mail'].map(h=>`<th style="padding:5px 8px;text-align:left;color:var(--text-tertiary);font-size:10px">${h}</th>`).join('')}</tr>
    ${sample.map(r=>`<tr style="border-top:1px solid rgba(255,255,255,0.04)">${[r.nome,r.telefone||'—',r.email||'—'].map(v=>`<td style="padding:5px 8px;color:var(--text-secondary);font-size:10px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${v}</td>`).join('')}</tr>`).join('')}
  </table>`;
  stats.innerHTML=`<span style="color:var(--orange)">⚡ ${oaImportDados.length} contatos encontrados</span>${oaImportDados.length>5?`<span style="color:var(--text-tertiary);margin-left:8px">+${oaImportDados.length-5} não exibidos</span>`:''}`;
  pv.style.display='block';
  document.getElementById('btn-oa-importar').disabled=false;
}

async function oaEnviarImport(){
  if(!oaImportDados.length)return;
  const btn=document.getElementById('btn-oa-importar');
  btn.innerHTML='<span class="spin"></span> Importando...';btn.disabled=true;
  try{
    // Busca telefones já existentes para evitar duplicatas
    const existentes=await oaDB('GET','oa_fila?select=telefone&status=neq.ativado');
    const telsExistentes=new Set((existentes||[]).map(p=>(p.telefone||'').replace(/\D/g,'')).filter(Boolean));
    const agora=new Date().toISOString();
    const novos=[];
    let dupl=0;
    for(const r of oaImportDados){
      const telN=(r.telefone||'').replace(/\D/g,'');
      if(telN&&telsExistentes.has(telN)){dupl++;continue;}
      novos.push({
        nome:r.nome, telefone:r.telefone||null, email:r.email||null,
        status:'aguardando',
        dados_extras:r.obs?{obs:r.obs}:null,
        criado_em:agora, atualizado_em:agora,
      });
      if(telN)telsExistentes.add(telN);
    }
    if(novos.length){
      // insere em lotes de 500
      for(let i=0;i<novos.length;i+=500){
        await oaDB('POST','oa_fila',novos.slice(i,i+500));
      }
      await oaLogHistorico(null, null, 'importacao', {
        por:currentUser?.nome,
        total:novos.length,
        duplicados:dupl,
        arquivo: oaImportDados.length+' contatos processados'
      });
    }
    closeModal('oa-importar');
    showToast(`⚡ ${novos.length} contatos importados${dupl?` · ${dupl} duplicados ignorados`:''}!`,'success');
    renderOA();
  }catch(e){
    showToast('Erro na importação: '+e.message,'error');
  }
  btn.innerHTML='📥 Importar para Oferta Ativa';btn.disabled=false;
}

function abrirAiComLead(leadId){
  const lead=allLeads?.find(l=>l.id===leadId);
  if(lead){
    aiLeadCtx=lead;
    const p=document.getElementById('ai-panel');
    if(!p.classList.contains('open'))toggleAiPanel();
    if(aiHistory.length===0)aiBoasVindas();
    // mensagem automática de contexto
    setTimeout(()=>{
      aiAddMsg('ai',`Contexto carregado: **${lead.nome}**\nStatus: ${lead.status} · Interesse: ${lead.interesse==='hot'?'🔥 Quente':lead.interesse==='warm'?'🟡 Morno':'🧊 Frio'}\n\nO que você precisa para este lead?`);
    },200);
  }
}
