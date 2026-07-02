function renderUsuarios(usuarios){
  const grid=document.getElementById('user-grid');if(!grid)return;
  grid.innerHTML=usuarios.map(u=>`<div class="user-card"><div class="user-card-header"><div class="user-av">${u.nome.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div><div><div class="user-nm">${u.nome}</div><div class="user-email">${u.email}</div></div><span class="cargo-badge ${CARGO_STYLE[u.cargo]||'cb-cor'}" style="margin-left:auto">${u.cargo}</span></div><div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:11px;color:var(--green);font-weight:400">● Ativo</span>${u.id!==currentUser.id&&perm('verUsuarios')?`<button class="btn-s" style="font-size:11px;padding:5px 10px;color:var(--red);border-color:rgba(239,68,68,0.2)" onclick="deleteUsuario('${u.id}','${u.nome.replace(/'/g,'')}')">Remover</button>`:''}</div></div>`).join('');
}
function renderPendentes(pendentes){
  const sec=document.getElementById('pendentes-section'),grid=document.getElementById('pendentes-grid');
  if(!sec||!grid)return;
  if(!pendentes.length){sec.style.display='none';return;}
  sec.style.display='block';
  grid.innerHTML=pendentes.map(p=>`<div class="solicit-card"><div class="solicit-header"><div class="solicit-av">${p.nome.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div><div><div style="font-size:13px;font-weight:500">${p.nome}</div><div style="font-size:11px;color:var(--text-tertiary)">${p.email}</div></div><span class="cargo-badge ${CARGO_STYLE[p.cargo]||'cb-cor'}" style="margin-left:auto">${p.cargo}</span></div><div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${new Date(p.created_at).toLocaleDateString('pt-BR')}</div><div class="solicit-actions"><button class="btn-s" style="flex:1;color:var(--red);border-color:rgba(239,68,68,0.2)" onclick="recusarUser('${p.id}','${p.nome.replace(/'/g,'')}')">Recusar</button><button class="btn-p" style="flex:2;justify-content:center" onclick="aprovarUser('${p.id}','${p.nome.replace(/'/g,'')}')">Aprovar</button></div></div>`).join('');
  const bp=document.getElementById('badge-pend');if(bp){bp.textContent=pendentes.length;bp.style.display=pendentes.length>0?'':'none';}
}

/* ── AGENDA ── */

/* ── NOVO ACESSO ── */
async function updateAprovadorOptions(){
  const cargo=document.getElementById('novo-cargo').value;
  const wrap=document.getElementById('aprovador-wrap'),sel=document.getElementById('novo-aprovador');
  if(!cargo){wrap.style.display='none';return;}
  wrap.style.display='block';
  sel.innerHTML='<option value="">Carregando...</option>';
  try{
    const cargosPermitidos=PODE_APROVAR[cargo]||[];
    // busca todos usuários ativos e filtra no JS — evita problema de sintaxe do OR no Supabase
    const data=await SB.sel('usuarios','ativo=eq.true&order=nome.asc');
    const aprovadores=(data||[]).filter(u=>cargosPermitidos.includes(u.cargo));
    if(!aprovadores.length){
      sel.innerHTML='<option value="">Nenhum aprovador disponível</option>';
    } else {
      sel.innerHTML='<option value="">Selecione quem aprova...</option>'+
        aprovadores.map(u=>`<option value="${u.id}">${u.nome} (${u.cargo})</option>`).join('');
    }
  }catch(e){
    sel.innerHTML='<option value="">Erro ao carregar</option>';
    console.error('Erro aprovadores:',e);
  }
}
async function enviarSolicitacao(){
  const nome=document.getElementById('novo-nome').value.trim(),email=document.getElementById('novo-email').value.trim(),senha=document.getElementById('novo-senha').value,cargo=document.getElementById('novo-cargo').value,aprovadorId=document.getElementById('novo-aprovador').value;
  const errEl=document.getElementById('novo-err');errEl.style.display='none';
  if(!nome||!email||!cargo){errEl.textContent='Preencha nome, e-mail e cargo!';errEl.style.display='block';return;}
  if(senha.length<6){errEl.textContent='Senha mínimo 6 caracteres!';errEl.style.display='block';return;}
  if(!aprovadorId){errEl.textContent='Selecione quem irá aprovar!';errEl.style.display='block';return;}
  const btn=document.getElementById('btn-novo-enviar');btn.innerHTML='<span class="spin"></span>';btn.disabled=true;
  try{
    const exist=await SB.sel('usuarios',`email=eq.${encodeURIComponent(email)}`);
    if(exist&&exist.length>0)throw new Error('E-mail já cadastrado!');
    await SB.ins('usuarios',{nome,email,senha,cargo,ativo:false,aprovador_id:aprovadorId,status_aprovacao:'pendente'});
    const sel=document.getElementById('novo-aprovador'),aprovNome=sel.options[sel.selectedIndex].text;
    document.getElementById('novo-step1').style.display='none';document.getElementById('novo-step2').style.display='block';
    document.getElementById('novo-success-msg').textContent=`Solicitação enviada para ${aprovNome}. Aguarde aprovação.`;
    document.getElementById('novo-resumo').innerHTML=`<div style="display:flex;flex-direction:column;gap:7px;font-size:12px"><div style="display:flex;justify-content:space-between"><span style="color:var(--text-tertiary)">Nome</span><span style="font-weight:500">${nome}</span></div><div style="display:flex;justify-content:space-between"><span style="color:var(--text-tertiary)">E-mail</span><span>${email}</span></div><div style="display:flex;justify-content:space-between"><span style="color:var(--text-tertiary)">Cargo</span><span class="cargo-badge ${CARGO_STYLE[cargo]||'cb-cor'}">${cargo}</span></div><div style="display:flex;justify-content:space-between;margin-top:4px"><span style="color:var(--text-tertiary)">Status</span><span style="color:var(--orange);font-weight:500">Aguardando aprovação</span></div></div>`;
  }catch(e){errEl.textContent='Erro: '+e.message;errEl.style.display='block';}
  btn.innerHTML='Enviar solicitação';btn.disabled=false;
}

/* ── NAV ── */
