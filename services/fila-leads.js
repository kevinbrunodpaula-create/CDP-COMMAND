let importDados=[];
let filaLeads=JSON.parse(localStorage.getItem('cdp_fila')||'[]');
let roundRobinIdx=parseInt(localStorage.getItem('cdp_rr_idx')||'0');

function salvarFila(){localStorage.setItem('cdp_fila',JSON.stringify(filaLeads));}

function limparFila(){
  if(!confirm('Tem certeza? Isso remove todos os leads aguardando na fila. Leads já distribuídos não serão afetados.'))return;
  filaLeads=[];
  salvarFila();
  closeModal('fila');
  showToast('🗑 Fila limpa com sucesso!','success');
}

function abrirFila(){
  filaLeads=JSON.parse(localStorage.getItem('cdp_fila')||'[]');
  const total=filaLeads.length;
  const resumo=document.getElementById('fila-resumo');
  if(resumo)resumo.innerHTML=`<strong>${total} leads na fila</strong> aguardando distribuição.<br><span style="font-size:10px;opacity:.7">Importados mas ainda não atribuídos a nenhum corretor.</span>`;
  if(!total){showToast('Fila vazia! Importe uma lista primeiro.','error');return;}
  const lista=document.getElementById('fila-corretores');
  if(lista)lista.innerHTML=allCorretores.filter(c=>!['CEO','Kevin Bruno de Paula'].includes(c.nome)).map(c=>`
    <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary);cursor:pointer;flex:1">
        <input type="checkbox" value="${c.nome}" checked style="accent-color:var(--green)">
        <span>${c.nome.split(' ')[0]}</span>
      </label>
      <div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:10px;color:var(--text-tertiary)">Extra:</span>
        <input type="number" id="extra-${c.nome.replace(/\s/g,'_')}" min="0" value="0"
          style="width:50px;padding:4px 6px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:var(--text-primary);font-size:11px;text-align:center;outline:none">
      </div>
    </div>`).join('');
  openModal('fila');
}

function enviarParaFila(){
  if(!importDados.length)return;
  filaLeads=JSON.parse(localStorage.getItem('cdp_fila')||'[]');
  let novos=0,skip=0;
  for(const row of importDados){
    const dupl=filaLeads.some(f=>f.email&&row.email&&f.email===row.email)||
               allLeads.some(l=>l.email&&row.email&&l.email.toLowerCase()===row.email.toLowerCase());
    if(dupl){skip++;continue;}
    filaLeads.push({...row,_id:Date.now()+'_'+Math.random().toString(36).slice(2)});
    novos++;
  }
  salvarFila();
  closeModal('importar');
  showToast(`✅ ${novos} leads na fila${skip>0?` · ${skip} duplicados ignorados`:''}!`,'success');
}

async function distribuirDaFila(){
  filaLeads=JSON.parse(localStorage.getItem('cdp_fila')||'[]');
  const qtd=parseInt(document.getElementById('fila-qtd').value)||10;
  const corretoresSel=[...document.querySelectorAll('#fila-corretores input[type="checkbox"]:checked')].map(c=>c.value);
  if(!corretoresSel.length){showToast('Selecione ao menos 1 corretor!','error');return;}
  if(!filaLeads.length){showToast('Fila vazia!','error');return;}
  const btn=document.getElementById('btn-distribuir');
  btn.innerHTML='<span class="spin"></span>';btn.disabled=true;
  let idx=roundRobinIdx;
  const paraDistribuir=filaLeads.splice(0,qtd);
  const distribuidos=[];
  const agora=new Date().toISOString();
  for(let i=0;i<paraDistribuir.length;i++){
    const corretor=corretoresSel[idx%corretoresSel.length];
    idx++;
    distribuidos.push({...paraDistribuir[i],corretor});
  }
  // extras por corretor
  for(const nome of corretoresSel){
    const extraEl=document.getElementById('extra-'+nome.replace(/\s/g,'_'));
    const extra=parseInt(extraEl?.value||'0')||0;
    if(extra>0){
      const extras=filaLeads.splice(0,extra);
      extras.forEach(r=>distribuidos.push({...r,corretor:nome}));
    }
  }
  let ok=0,err=0;
  for(const row of distribuidos){
    try{
      await SB.ins('leads',[{
        nome:row.nome,email:row.email||null,cpf:row.cpf||null,
        renda_familiar:row.renda_familiar||null,telefone:row.telefone||null,
        corretor:row.corretor,status:'Lead Novo',interesse:'cold',origem:'Lista',created_at:agora,
      }]);ok++;
    }catch(e){err++;}
  }
  roundRobinIdx=idx;
  localStorage.setItem('cdp_rr_idx',String(idx));
  salvarFila();
  closeModal('fila');
  showToast(`🚀 ${ok} distribuídos${err>0?` · ${err} erros`:''}! Fila: ${filaLeads.length} restantes`,'success');
  await loadAll();
  btn.innerHTML='🚀 Distribuir agora';btn.disabled=false;
}

/* ── DISTRIBUIR LEADS DA LANDING (origem Google, sem corretor) ── */
function leadsLandingPendentes(){
  // leads vindos da campanha que ainda não têm dono
  return allLeads.filter(l=>l.origem==='Landing Page'&&(!l.corretor||l.corretor==='')&&l.status!=='Perdido');
}

function abrirFilaLanding(){
  const pend=leadsLandingPendentes();
  const resumo=document.getElementById('fila-land-resumo');
  if(resumo)resumo.innerHTML=`<strong>${pend.length} leads da landing</strong> aguardando distribuição.<br><span style="font-size:10px;opacity:.7">Vindos da landing page e ainda sem corretor.</span>`;
  if(!pend.length){showToast('Nenhum lead da landing pendente no momento.','error');return;}
  const lista=document.getElementById('fila-land-corretores');
  if(lista)lista.innerHTML=allCorretores.filter(c=>!['CEO','Kevin Bruno de Paula'].includes(c.nome)).map(c=>`
    <label style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:12px;color:var(--text-secondary);cursor:pointer">
      <input type="checkbox" value="${c.nome}" checked style="accent-color:var(--green)">
      <span>${c.nome.split(' ')[0]}</span>
    </label>`).join('');
  openModal('fila-landing');
}

async function distribuirLeadsLanding(){
  const pend=leadsLandingPendentes();
  const corretoresSel=[...document.querySelectorAll('#fila-land-corretores input[type="checkbox"]:checked')].map(c=>c.value);
  if(!corretoresSel.length){showToast('Selecione ao menos 1 corretor!','error');return;}
  if(!pend.length){showToast('Nenhum lead pendente!','error');return;}
  const btn=document.getElementById('btn-distribuir-land');
  btn.innerHTML='<span class="spin"></span>';btn.disabled=true;
  let idx=roundRobinIdx,ok=0,err=0;
  for(let i=0;i<pend.length;i++){
    const corretor=corretoresSel[idx%corretoresSel.length];
    idx++;
    try{
      await SB.upd('leads',{corretor},`id=eq.${pend[i].id}`);
      ok++;
    }catch(e){err++;}
  }
  roundRobinIdx=idx;
  localStorage.setItem('cdp_rr_idx',String(idx));
  closeModal('fila-landing');
  showToast(`🚀 ${ok} leads distribuídos${err>0?` · ${err} erros`:''}!`,'success');
  await loadAll();
  btn.innerHTML='🚀 Distribuir agora';btn.disabled=false;
}

