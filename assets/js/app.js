/* initApp defined in auth.js */



/* ═══════════════════════════════════════════════════════
   ROTEAMENTO — goTo, openModal, closeModal, setView, set
═══════════════════════════════════════════════════════ */
function goTo(page,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const p=document.getElementById('page-'+page);if(p)p.classList.add('active');if(el)el.classList.add('active');
  const titles={
    dashboard:'Dashboard',leads:'Leads',imoveis:'Imóveis',corretores:'Corretores',
    agenda:'Agenda',relatorios:'Relatórios',usuarios:'Usuários',config:'Configurações',
    comissoes:'Comissões','fila-ia':'✨ Fila IA',ligacoes:'Central de Ligações',
    'oferta-ativa':'Oferta Ativa','command-events':'⚡ Command Events',
    'command-recovery':'🔄 Command Recovery','command-manager':'⭐ Score Engine',
    'command-dna':'🧬 DNA Comercial','command-trust':'🔐 Índice de Confiança',
    'command-distribution':'🎯 Distribuição Inteligente',
    'command-missions':'⚡ Missões do Dia',
    'command-corretor':'⚡ Meu COMMAND','command-coordenador':'⚡ COMMAND','command-home':'⚡ COMMAND',
    'command-executive':'📊 Morning Briefing',
    'command-intelligence':'🧠 Intelligence',
  };
  document.getElementById('page-title').textContent=titles[page]||page;
  const primBtns={
    leads:'+ Lead',imoveis:'+ Imóvel',corretores:'+ Membro',dashboard:'+ Lead',
    agenda:'',relatorios:'',usuarios:'',config:'',comissoes:'','fila-ia':'',
    ligacoes:'','oferta-ativa':'','command-events':'','command-recovery':'',
    'command-manager':'','command-dna':'','command-trust':'','command-distribution':'',
    'command-corretor':'','command-coordenador':'','command-missions':'','command-executive':'','command-intelligence':'',
  };
  const primActions={
    leads:()=>openModal('add-lead'),imoveis:()=>openModal('add-imovel'),
    corretores:()=>openModal('add-corretor'),dashboard:()=>openModal('add-lead'),
  };
  const btn=document.getElementById('topbar-primary');
  if(primBtns[page]){
    btn.innerHTML=`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> ${primBtns[page]}`;
    btn.style.display='';btn.onclick=primActions[page]||null;
  } else {btn.style.display='none';}
  if(page==='relatorios'){renderRelatorio(allLeads);setTimeout(initRelCharts,100);}
  if(page==='agenda'){renderCalendar();renderEvents();}
  if(page==='comissoes'){
    const mesEl=document.getElementById('com-filter-mes');
    if(mesEl){
      const mesAtual=(()=>{const n=new Date();return`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;})();
      while(mesEl.options.length>1)mesEl.remove(1);
    }
    renderComissoes();
  }
  closeSidebar();
}

function openModal(id){
  if(id==='add-lead'&&!document.getElementById('edit-lead-id').value)resetLeadForm();
  document.getElementById('modal-'+id).classList.add('open');
}
function closeModal(id){document.getElementById('modal-'+id).classList.remove('open');}

/* ═══════════════════════════════════════════════════════
   LOAD ALL — Carrega todos os dados do Supabase
═══════════════════════════════════════════════════════ */
async function loadAll(){
  try{
    const[leads,imoveis,corretores,usuarios,pendentes]=await Promise.all([
      SB.sel('leads','order=created_at.desc'),
      SB.sel('imoveis','order=created_at.desc'),
      SB.sel('corretores','order=nome.asc'),
      SB.sel('usuarios','ativo=eq.true&order=nome.asc'),
      SB.sel('usuarios','ativo=eq.false&order=created_at.desc'),
    ]);
    const normNome=s=>(s||'').trim().toLowerCase();
    allLeads=currentUser.cargo==='Corretor'?leads.filter(l=>normNome(l.corretor)===normNome(currentUser.nome)):leads;
    allLeadsRanking=leads;
    allImoveis=imoveis;allCorretores=corretores;allUsuarios=usuarios;
    allPendentes=perm('aprovar')?pendentes.filter(p=>(PODE_APROVAR[p.cargo]||[]).includes(currentUser.cargo)):[];
    updateDashboard();renderKanban(allLeads);renderLeadsList(allLeads);renderImoveis(allImoveis);
    renderCorretores(allCorretores);renderUsuarios(allUsuarios);renderPendentes(allPendentes);
    updateBadges();updateFilters();initCharts(allLeads);renderCalendar();renderEvents();
    if(typeof checarLeadsAmarelos === 'function') checarLeadsAmarelos(allLeads);
    // Atualiza badge do Recovery com críticos + abandonados
    try {
      const { resumo } = analisarCarteira(allLeads);
      const alertas = resumo.critico + resumo.abandonado;
      const badgeRec = document.getElementById('badge-recovery');
      if (badgeRec) {
        if (alertas > 0) { badgeRec.textContent = alertas; badgeRec.style.display = ''; }
        else             { badgeRec.style.display = 'none'; }
      }
    } catch(e) { /* silencioso */ }
    // Badge Recovery
    try {
      if (typeof analisarCarteira === 'function') {
        const { resumo } = analisarCarteira(allLeads);
        const alertas = (resumo.critico||0) + (resumo.abandonado||0);
        const bRec = document.getElementById('badge-recovery');
        if (bRec) { bRec.textContent = alertas; bRec.style.display = alertas>0?'':'none'; }
      }
    } catch {}
    // Badge Landing Page
    try {
      const nLanding = allLeads.filter(l=>l.origem==='Landing Page'&&(!l.corretor||l.corretor==='')&&l.status!=='Perdido').length;
      const badgeLand = document.getElementById('badge-landing');
      if (badgeLand) {
        if (nLanding > 0) { badgeLand.textContent = nLanding; badgeLand.style.display = ''; }
        else              { badgeLand.style.display = 'none'; }
      }
    } catch(e) { /* silencioso */ }
    // Atualiza badge do Manager com consultores Críticos (score < 50)
    try {
      const scoresCache = ManagerRepository.loadCache();
      if (scoresCache) {
        const criticos = scoresCache.filter(s => s.score < 50).length;
        const badgeMg = document.getElementById('badge-manager');
        if (badgeMg) {
          if (criticos > 0) { badgeMg.textContent = criticos; badgeMg.style.display = ''; }
          else              { badgeMg.style.display = 'none'; }
        }
      }
    } catch(e) { /* silencioso */ }
    // Atualiza badge do Trust com consultores ICC Crítico
    try {
      const trustCache = TrustRepository.loadCache();
      if (trustCache) {
        const iccCrit = trustCache.filter(r => r.icc < 50).length;
        const badgeTr = document.getElementById('badge-trust');
        if (badgeTr) {
          if (iccCrit > 0) { badgeTr.textContent = iccCrit; badgeTr.style.display = ''; }
          else             { badgeTr.style.display = 'none'; }
        }
      }
    } catch(e) { /* silencioso */ }
    // Atualiza badge do Distribution com leads sem corretor
    try {
      const semCorretor = allLeads.filter(l =>
        (!l.corretor || !l.corretor.trim()) &&
        !['Fechado','Perdido'].includes(l.status)
      ).length;
      const badgeDist = document.getElementById('badge-dist');
      if (badgeDist) {
        if (semCorretor > 0) { badgeDist.textContent = semCorretor; badgeDist.style.display = ''; }
        else                 { badgeDist.style.display = 'none'; }
      }
    } catch(e) { /* silencioso */ }
    // Atualiza badge das Missões com missões críticas pendentes do usuário
    try {
      const msMapa = MissionRepository.loadMissions();
      if (msMapa && currentUser?.nome) {
        const minhas = msMapa[currentUser.nome] || [];
        const crit   = minhas.filter(m => m.prioridade === 'CRITICA' && m.status === 'PENDENTE').length;
        const badgeMs = document.getElementById('badge-missions');
        if (badgeMs) {
          if (crit > 0) { badgeMs.textContent = crit; badgeMs.style.display = ''; }
          else          { badgeMs.style.display = 'none'; }
        }
      }
    } catch(e) { /* silencioso */ }
    // Badge Executive: alertas críticos do briefing
    try {
      const briefCache = ExecutiveRepository.loadCache();
      if (briefCache) {
        const criticos = briefCache.meta?.alertasCriticos || 0;
        const badgeEx  = document.getElementById('badge-executive');
        if (badgeEx) {
          if (criticos > 0) { badgeEx.textContent = '!'; badgeEx.style.display = ''; }
          else              { badgeEx.style.display = 'none'; }
        }
      }
    } catch(e) { /* silencioso */ }
    // Flush eventos pendentes em background
    CommandEventService.flushQueue().catch(()=>{});
  }catch(e){showToast('Erro: '+e.message,'error');console.error(e);}
}

/* ═══════════════════════════════════════════════════════
   SIDEBAR / LAYOUT
═══════════════════════════════════════════════════════ */
function toggleCollapse(){const sb=document.getElementById('sidebar'),mc=document.getElementById('main-content');sb.classList.toggle('collapsed');const collapsed=sb.classList.contains('collapsed');mc.style.marginLeft=collapsed?'52px':'220px';mc.style.width=collapsed?'calc(100vw - 52px)':'calc(100vw - 220px)';}
function toggleSidebar(){const sb=document.getElementById('sidebar'),ov=document.getElementById('sb-overlay');sb.classList.toggle('open');ov.classList.toggle('open');}
function closeSidebar(){document.getElementById('sidebar').classList.remove('open');document.getElementById('sb-overlay').classList.remove('open');}

/* ═══════════════════════════════════════════════════════
   CRUD ACTIONS
═══════════════════════════════════════════════════════ */
async function aprovarUser(id,nome){if(!confirm(`Aprovar "${nome}"?`))return;await SB.upd('usuarios',{ativo:true,status_aprovacao:'aprovado'},`id=eq.${id}`);showToast(`"${nome}" aprovado`,'success');await loadAll();}
async function recusarUser(id,nome){if(!confirm(`Recusar "${nome}"?`))return;await SB.del('usuarios',`id=eq.${id}`);showToast('Solicitação recusada','info');await loadAll();}
async function deleteUsuario(id,nome){if(!confirm(`Remover "${nome}"?`))return;await SB.upd('usuarios',{ativo:false,status_aprovacao:'removido'},`id=eq.${id}`);showToast(`"${nome}" removido`,'success');await loadAll();}
async function deleteLead(id,nome){if(!confirm(`Excluir "${nome}"?`))return;await SB.del('leads',`id=eq.${id}`);showToast('Lead excluído','success');await loadAll();}
async function deleteImovel(id,nome){if(!confirm(`Excluir "${nome}"?`))return;await SB.del('imoveis',`id=eq.${id}`);showToast('Imóvel excluído','success');await loadAll();}
async function deleteCorretor(id,nome){if(!confirm(`Excluir "${nome}"?`))return;await SB.del('corretores',`id=eq.${id}`);showToast('Membro excluído','success');await loadAll();}
function openWpp(tel){if(!tel){showToast('Sem telefone','error');return;}window.open(`https://wa.me/55${tel.replace(/\D/g,'')}`, '_blank');}

/* ═══════════════════════════════════════════════════════
   FILTROS DE LEADS / BADGES
═══════════════════════════════════════════════════════ */
function filterLeads(){
  const q=(document.getElementById('search-lead')?.value||'').toLowerCase(),corr=document.getElementById('filter-corr')?.value||'',intval=document.getElementById('filter-int')?.value||'';
  const f=allLeads.filter(l=>(!q||l.nome.toLowerCase().includes(q)||(l.telefone||'').includes(q))&&(!corr||l.corretor===corr)&&(!intval||l.interesse===intval));
  renderKanban(f);renderLeadsList(f);
}
function updateFilters(){
  const corr=document.getElementById('filter-corr');
  if(corr){const v=corr.value;corr.innerHTML='<option value="">Todos corretores</option>'+[...new Set(allLeads.map(l=>l.corretor).filter(Boolean))].sort().map(c=>`<option value="${c}">${c}</option>`).join('');corr.value=v;}
}
function updateBadges(){
  const bl=document.getElementById('badge-leads');if(bl)bl.textContent=allLeads.length;
  const bp=document.getElementById('badge-pend');if(bp){bp.textContent=allPendentes.length;bp.style.display=allPendentes.length>0?'':'none';}
}

/* ═══════════════════════════════════════════════════════
   INICIALIZAÇÃO
═══════════════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  CDP_LOG.start('Sistema');
  // Verifica reset de senha via URL token
  if(typeof verificarTokenReset === 'function') verificarTokenReset();
  // Verifica biometria disponível
  if(typeof verificarBioDisponivel === 'function') verificarBioDisponivel();
  // Loading screen — fecha após 600ms (mostra o login)
  const ld=document.getElementById('loading');
  setTimeout(()=>{
    if(ld){ld.style.opacity='0';setTimeout(()=>{ld.style.display='none';},300);}
    // Cancela o failsafe do Startup Manager — o sistema chegou até aqui
    if(typeof window._cdpCancelFailsafe === 'function') window._cdpCancelFailsafe();
    CDP_LOG.ok('Sistema');
    CDP_LOG.resumo();
  },600);
});

/* ── K-MENU (Lead card 3 dots menu) ── */
function toggleKMenu(id,e){
  e.stopPropagation();
  const menu=document.getElementById(id);
  if(!menu)return;
  const isOpen=menu.classList.contains('open');
  closeKMenus();
  if(!isOpen){
    const btn=e.currentTarget;
    const rect=btn.getBoundingClientRect();
    menu.style.top=(rect.bottom+4)+'px';
    menu.style.left=Math.min(rect.right-170,window.innerWidth-180)+'px';
    menu.classList.add('open');
  }
}
function closeKMenus(){
  document.querySelectorAll('.k-menu-dropdown.open').forEach(m=>m.classList.remove('open'));
}
document.addEventListener('click',()=>closeKMenus());

/* ── FUNÇÕES RESTAURADAS DO CRM ORIGINAL ── */
function openFollowUp(id){
  document.getElementById('fu-lead-id').value=id;
  document.getElementById('fu-motivo').value='';
  document.getElementById('fu-motivo-outro').value='';
  document.getElementById('fu-motivo-outro-wrap').style.display='none';
  document.getElementById('fu-data').value='';
  document.getElementById('fu-obs').value='';
  document.getElementById('fu-obs-counter').textContent='0/10 mín';
  document.getElementById('fu-obs-counter').style.color='#334155';
  document.getElementById('fu-obs').oninput=function(){
    const l=this.value.length;
    const c=document.getElementById('fu-obs-counter');
    c.textContent=l+'/10 mín';
    c.style.color=l>=10?'#22C55E':'#334155';
  };
  document.getElementById('fu-motivo').onchange=function(){
    document.getElementById('fu-motivo-outro-wrap').style.display=this.value==='Outro'?'block':'none';
  };
  openModal('followup');
}

/* ── FUNÇÕES RECUPERADAS: Login e Perfil ── */
async function enviarRecuperacao(){
  const email=document.getElementById('rec-email').value.trim();
  const errEl=document.getElementById('rec-err');
  const okEl=document.getElementById('rec-ok');
  errEl.style.display='none';okEl.style.display='none';
  if(!email){errEl.textContent='Informe o e-mail!';errEl.style.display='block';return;}
  if(!EJ_OK()){errEl.textContent='EmailJS não configurado. Siga as instruções acima.';errEl.style.display='block';return;}
  const btn=document.getElementById('btn-rec-enviar');btn.innerHTML='<span class="spin"></span>';btn.disabled=true;
  try{
    const data=await SB.sel('usuarios',`email=eq.${encodeURIComponent(email)}&ativo=eq.true`);
    if(!data||!data.length){
      // Por segurança, não revela se e-mail existe ou não
      document.getElementById('rec-step1').style.display='none';
      document.getElementById('rec-step2').style.display='block';
      btn.innerHTML='Enviar link de recuperação';btn.disabled=false;return;
    }
    const usuario=data[0];
    const token=Math.random().toString(36).slice(2)+Date.now().toString(36);
    const expira=new Date(Date.now()+30*60*1000).toISOString();
    await SB.upd('usuarios',{reset_token:token,reset_expira:expira},`id=eq.${usuario.id}`);
    const link=`${location.href.split('?')[0]}?reset=${token}`;
    await emailjs.send(EJ.serviceId,EJ.tplRecupera,{
      to_email:email,
      nome:usuario.nome||'',
      reset_link:link,
    });
    document.getElementById('rec-step1').style.display='none';
    document.getElementById('rec-step2').style.display='block';
  }catch(e){errEl.textContent='Erro ao enviar: '+e.text||e.message;errEl.style.display='block';}
  btn.innerHTML='Enviar link de recuperação';btn.disabled=false;
}

function previewFoto(url){
  const prev=document.getElementById('im-foto-preview');
  const img=document.getElementById('im-foto-img');
  if(url&&(url.startsWith('http')||url.startsWith('data:'))){img.src=url;prev.style.display='block';}
  else{prev.style.display='none';}
}

async function redefinirSenha(){
  const senha=document.getElementById('redef-senha').value;
  const confirm=document.getElementById('redef-confirm').value;
  const errEl=document.getElementById('redef-err');
  const okEl=document.getElementById('redef-ok');
  errEl.style.display='none';okEl.style.display='none';
  if(senha.length<6){errEl.textContent='Senha mínimo 6 caracteres!';errEl.style.display='block';return;}
  if(senha!==confirm){errEl.textContent='As senhas não coincidem!';errEl.style.display='block';return;}
  const userId=sessionStorage.getItem('reset_user_id');
  if(!userId){errEl.textContent='Sessão expirada. Solicite um novo link.';errEl.style.display='block';return;}
  const btn=document.getElementById('btn-redef');btn.innerHTML='<span class="spin"></span>';btn.disabled=true;
  try{
    await SB.upd('usuarios',{senha,reset_token:null,reset_expira:null},`id=eq.${userId}`);
    okEl.textContent='Senha redefinida com sucesso!';okEl.style.display='block';
    sessionStorage.removeItem('reset_user_id');
    history.replaceState({},'',location.pathname);
    setTimeout(()=>showScreen('main'),2000);
  }catch(e){errEl.textContent='Erro: '+e.message;errEl.style.display='block';}
  btn.innerHTML='Salvar nova senha';btn.disabled=false;
}


/* ── RESET LEAD FORM ── */
function resetLeadForm(){
  const el=id=>document.getElementById(id);
  if(el('edit-lead-id'))el('edit-lead-id').value='';
  if(el('modal-lead-title'))el('modal-lead-title').textContent='Novo Lead';
  if(el('btn-save-lead'))el('btn-save-lead').textContent='Salvar Lead';
  if(el('visita-fields'))el('visita-fields').style.display='none';
  if(el('financeiro-fields'))el('financeiro-fields').style.display='none';
  if(el('match-alert'))el('match-alert').style.display='none';
  ['new-nome','new-tel','new-email','new-valor','new-bairro','new-obs','new-visita-data',
   'new-visita-hora','new-visita-local','new-assinatura','new-pct-fat','new-pct-imob',
   'new-pct-com','new-pct-kevin','new-pct-tanner','new-quartos','new-renda'
  ].forEach(id=>{const e=el(id);if(e)e.value='';});
}

/* ── TOGGLE SENHA ── */
function toggleSenha(id,btn){
  const el=document.getElementById(id);
  if(!el)return;
  el.type=el.type==='password'?'text':'password';
  if(btn)btn.textContent=el.type==='password'?'👁':'🙈';
}
