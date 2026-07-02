function renderCorretores(corretores){
  const grid=document.getElementById('corr-grid'),hier=document.getElementById('corr-hier'),cnt=document.getElementById('corr-count');
  if(!grid)return;const canEdit=perm('editarTodos');
  const niveis=['CEO','Diretor','Gerente','Corretor','Assistente'];
  const hierData=niveis.map(n=>({label:n,count:corretores.filter(c=>getNivel(c.cargo)===n).length,cfg:NIVEL_CFG[n]})).filter(x=>x.count>0);
  if(hier)hier.innerHTML=hierData.map(x=>`<div class="ch-item"><span class="ch-dot" style="background:${x.cfg.dot}"></span><div><div class="ch-val">${x.count}</div><div class="ch-lbl">${x.label}${x.count>1?'s':''}</div></div></div>`).join('');
  if(cnt)cnt.textContent=`${corretores.length} membro${corretores.length!==1?'s':''}`;
  if(!corretores.length){grid.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-muted)"><div style="font-size:32px;opacity:0.3;margin-bottom:10px">👥</div><div style="font-size:13px">Nenhum membro cadastrado</div></div>`;return;}
  const sorted=[...corretores].sort((a,b)=>{const order=['CEO','Diretor','Gerente','Corretor','Assistente'];const ia=order.indexOf(getNivel(a.cargo)),ib=order.indexOf(getNivel(b.cargo));if(ia!==ib)return ia-ib;return 0;});
  const parseValorR=v=>{if(!v)return 0;const s=String(v).replace(/[^\d,.]/g,'');const n=parseFloat(s.replace(/\./g,'').replace(',','.'));return isNaN(n)?0:n;};
  const vgvPorCorretor=c=>allLeads.filter(l=>(l.corretor||'').trim().toLowerCase()===c.nome.trim().toLowerCase()&&l.status==='Fechado').reduce((acc,l)=>acc+parseValorR(l.valor),0);
  const rankMap={};[...corretores].sort((a,b)=>vgvPorCorretor(b)-vgvPorCorretor(a)).forEach((c,i)=>rankMap[c.id]=i+1);
  grid.innerHTML=sorted.map(c=>{
    const nivel=getNivel(c.cargo),cfg=NIVEL_CFG[nivel]||NIVEL_CFG['Corretor'];
    const norm=n=>(n||'').trim().toLowerCase();
    const leads=allLeads.filter(l=>norm(l.corretor)===norm(c.nome)).length;
    const ativos=allLeads.filter(l=>norm(l.corretor)===norm(c.nome)&&l.status!=='Fechado'&&l.status!=='Perdido').length;
    const vendas=allLeads.filter(l=>norm(l.corretor)===norm(c.nome)&&l.status==='Fechado').length;
    const parseValor=v=>{if(!v)return 0;const s=String(v).replace(/[^\d,.]/g,'');const n=parseFloat(s.replace(/\./g,'').replace(',','.'));return isNaN(n)?0:n;};
    // usa allLeadsRanking para pegar TODOS os fechados independente do cargo
    const todosLeads=[...allLeads,...(allLeadsRanking||[])];
    const totalVendido=todosLeads.filter(l=>norm(l.corretor)===norm(c.nome)&&l.status==='Fechado').reduce((acc,l)=>acc+parseValor(l.valor),0);
    const conv=leads>0?Math.round((vendas/leads)*100):0;
    const metaVal=parseFloat(c.meta)||parseFloat(c.meta_mensal)||0;
    const metaPct=metaVal>0?Math.min(Math.round((totalVendido/metaVal)*100),100):0;
    const fmtBRL=v=>v>=1000000?(v/1000000).toFixed(1)+'M':v>=1000?(v/1000).toFixed(0)+'k':'0';
    const falta=metaVal>0?Math.max(metaVal-totalVendido,0):0;
    const barColor=metaPct>=80?'var(--green)':metaPct>=50?'var(--orange)':'var(--red)';
    const initials=c.nome.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const rank=rankMap[c.id]||'—';const rankColor=rank===1?'var(--orange)':rank===2?'var(--text-tertiary)':rank===3?'var(--orange)':'var(--text-muted)';
    return`<div class="corr-card">
      <div class="corr-card-accent" style="background:${cfg.accent}"></div>
      <div class="corr-body">
        <div class="corr-hrow">
          <div class="corr-av">${initials}<span class="corr-online" style="background:${cfg.online?'var(--green)':'var(--text-muted)'}"></span></div>
          <div class="corr-info"><div class="corr-nm">${c.nome}</div><div class="corr-role-row"><span class="corr-badge ${cfg.badge}">${nivel}</span></div></div>
          ${canEdit?`<button class="corr-edit" onclick="editCorretorModal('${c.id}')"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>`:''}
        </div>
        <div class="corr-metrics">
          <div class="cm"><div class="cm-val">${ativos}</div><div class="cm-lbl">Ativos</div></div>
          <div class="cm"><div class="cm-val">${vendas}</div><div class="cm-lbl">Vendas</div></div>
          <div class="cm"><div class="cm-val" style="color:${conv>0?'var(--green)':'var(--text-primary)'}">${conv}%</div><div class="cm-lbl">Conv.</div></div>
        </div>
        <div class="corr-meta">
          <div class="corr-meta-hd"><span class="corr-meta-lbl">Meta: R$ ${fmtBRL(metaVal)} · Vendido: R$ ${fmtBRL(totalVendido)}</span><span class="corr-meta-pct" style="color:${barColor}">${metaPct}%</span></div>
          <div class="cm-bar-bg"><div class="cm-bar" style="width:${metaPct}%;background:${barColor}"></div></div>
          ${metaVal>0&&falta>0?`<div style="font-size:10px;color:var(--text-tertiary);margin-top:3px">Falta R$ ${fmtBRL(falta)}</div>`:''}
        </div>
        <div class="corr-rank"><span class="rank-num" style="color:${rankColor}">#${rank}</span><span class="rank-lbl">Ranking equipe</span><span class="rank-conv">${leads} lead${leads!==1?'s':''}</span></div>
      </div>
      <div class="corr-footer">
        <span class="corr-contact">${c.email||c.telefone||'—'}</span>
        ${canEdit?`<button class="corr-del" onclick="deleteCorretor('${c.id}','${c.nome.replace(/'/g,'')}')">Remover</button>`:''}
      </div>
    </div>`;
  }).join('');
}
function filterCorretores(){const q=(document.getElementById('search-corr')?.value||'').toLowerCase(),nivel=document.getElementById('filter-nivel')?.value||'';renderCorretores(allCorretores.filter(c=>(!q||c.nome.toLowerCase().includes(q)||(c.cargo||'').toLowerCase().includes(q))&&(!nivel||getNivel(c.cargo)===nivel)));}
function editCorretorModal(id){
  const c=allCorretores.find(x=>x.id===id);if(!c)return;
  document.getElementById('co-nome').value=c.nome||'';document.getElementById('co-cargo').value=c.cargo||'Corretor';document.getElementById('co-tel').value=c.telefone||'';document.getElementById('co-email').value=c.email||'';document.getElementById('co-meta').value=c.meta||'';
  document.getElementById('co-nome').dataset.editId=id;document.getElementById('modal-corr-title').textContent='Editar Membro';document.getElementById('btn-save-co').textContent='Salvar alterações';openModal('add-corretor');
}
async function saveCorretor(){
  const nome=document.getElementById('co-nome').value.trim();if(!nome){showToast('Preencha o nome!','error');return;}
  const btn=document.getElementById('btn-save-co');btn.innerHTML='<span class="spin"></span>';btn.disabled=true;
  const editId=document.getElementById('co-nome').dataset.editId;
  const data={nome,cargo:document.getElementById('co-cargo').value,telefone:document.getElementById('co-tel').value||null,email:document.getElementById('co-email').value||null,meta:parseFloat(document.getElementById('co-meta').value)||0};
  try{
    if(editId){await SB.upd('corretores',data,`id=eq.${editId}`);delete document.getElementById('co-nome').dataset.editId;}
    else await SB.ins('corretores',[data]);
    closeModal('add-corretor');showToast(editId?'Membro atualizado':`"${nome}" cadastrado`,'success');
    // ── COMMAND EVENT ──────────────────────────
    CommandEventService.record({
      modulo    : CommandEventModule.CORRETORES,
      tipo      : editId ? CommandEventType.LEAD_UPDATED : CommandEventType.USER_CREATED,
      origem    : CommandEventOrigin.USER,
      consultor : nome,
      descricao : editId ? `Membro atualizado: ${nome}` : `Novo membro cadastrado: ${nome}`,
      detalhes  : `Cargo: ${data.cargo}`,
    });
    // ──────────────────────────────────────────
    ['co-nome','co-tel','co-email','co-meta'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    document.getElementById('modal-corr-title').textContent='Novo Membro';document.getElementById('btn-save-co').textContent='Salvar';
    await loadAll();
  }catch(e){showToast('Erro: '+e.message,'error');}
  btn.innerHTML='Salvar';btn.disabled=false;
}

/* ── USUARIOS ── */
