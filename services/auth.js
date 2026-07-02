const BIO_KEY='cdp_bio_user';
const SAVED_KEY='cdp_saved_user';

function mostrarFormSenha(){
  document.getElementById('bio-wrap').style.display='none';
  const wrap=document.getElementById('senha-form-wrap');
  wrap.style.display='block';
  // foca no primeiro campo vazio para o usuário poder digitar
  setTimeout(()=>{
    const email=document.getElementById('lg-email');
    const pass=document.getElementById('lg-pass');
    if(email&&!email.value){email.focus();}else if(pass){pass.focus();}
  },50);
}

function verificarBioDisponivel(){
  // só mostra biometria se: tem credencial salva + biometria REGISTRADA + navegador suporta
  const saved=localStorage.getItem(SAVED_KEY);
  const bio=localStorage.getItem(BIO_KEY);
  if(!saved)return;
  // sempre preenche o e-mail salvo (mesmo que o campo esteja oculto)
  try{
    const userData=JSON.parse(saved);
    const emailEl=document.getElementById('lg-email');
    if(emailEl)emailEl.value=userData.email||'';
  }catch(e){localStorage.removeItem(SAVED_KEY);return;}
  // sem biometria registrada → mantém o formulário de senha visível
  if(!bio||!window.PublicKeyCredential)return;
  const bioWrap=document.getElementById('bio-wrap');
  const senhaWrap=document.getElementById('senha-form-wrap');
  bioWrap.style.display='block';
  senhaWrap.style.display='none';
}

async function registrarBiometria(userId,email){
  if(!window.PublicKeyCredential)return;
  try{
    const challenge=new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const credential=await navigator.credentials.create({
      publicKey:{
        challenge,
        rp:{name:'CDP CRM',id:location.hostname||'localhost'},
        user:{
          id:new TextEncoder().encode(userId),
          name:email,
          displayName:email,
        },
        pubKeyCredParams:[{alg:-7,type:'public-key'},{alg:-257,type:'public-key'}],
        authenticatorSelection:{
          authenticatorAttachment:'platform',
          userVerification:'required',
        },
        timeout:60000,
      }
    });
    if(credential){
      localStorage.setItem(BIO_KEY,JSON.stringify({
        id:credential.id,
        rawId:Array.from(new Uint8Array(credential.rawId)),
      }));
      showToast('Biometria registrada! Próximo login será mais rápido 🔒','success');
    }
  }catch(e){
    // usuário cancelou ou dispositivo não suporta — silencioso
    console.log('Biometria não registrada:',e.message);
  }
}

async function loginBiometria(){
  const saved=localStorage.getItem(SAVED_KEY);
  const bioData=localStorage.getItem(BIO_KEY);
  if(!saved||!bioData){mostrarFormSenha();return;}
  const btn=document.getElementById('btn-bio');
  btn.innerHTML='<span class="spin"></span>';btn.disabled=true;
  try{
    const challenge=new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const bioInfo=JSON.parse(bioData);
    const assertion=await navigator.credentials.get({
      publicKey:{
        challenge,
        rpId:location.hostname||'localhost',
        allowCredentials:[{
          id:new Uint8Array(bioInfo.rawId),
          type:'public-key',
        }],
        userVerification:'required',
        timeout:60000,
      }
    });
    if(assertion){
      // autenticação biométrica ok — faz login com credenciais salvas
      const userData=JSON.parse(saved);
      const data=await SB.sel('usuarios',`email=eq.${encodeURIComponent(userData.email)}&senha=eq.${encodeURIComponent(userData.senha)}&ativo=eq.true`);
      if(data&&data.length){
        currentUser=data[0];
        sessionStorage.setItem('cdpuser',JSON.stringify(data[0]));
        // ── COMMAND EVENT ──────────────────────────
        CommandEventService.recordLogin(data[0].nome).catch(()=>{});
        // ──────────────────────────────────────────
        await initApp();
      } else {
        showToast('Sessão expirada. Use sua senha.','error');
        localStorage.removeItem(SAVED_KEY);
        localStorage.removeItem(BIO_KEY);
        mostrarFormSenha();
      }
    }
  }catch(e){
    showToast('Biometria falhou. Use sua senha.','error');
    mostrarFormSenha();
  }
  btn.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Entrar com Biometria';
  btn.disabled=false;
}

async function doLogin(){
  const email=document.getElementById('lg-email').value.trim();
  const senha=document.getElementById('lg-pass').value;
  const salvar=document.getElementById('lg-salvar').checked;
  const btn=document.getElementById('btn-entrar'),err=document.getElementById('lg-err');
  err.style.display='none';
  if(!email||!senha){err.textContent='Preencha e-mail e senha!';err.style.display='block';return;}
  btn.innerHTML='<span class="spin"></span>';btn.disabled=true;
  try{
    const data=await SB.sel('usuarios',`email=eq.${encodeURIComponent(email)}&senha=eq.${encodeURIComponent(senha)}&ativo=eq.true`);
    if(!data||!data.length){err.textContent='E-mail ou senha incorretos.';err.style.display='block';btn.innerHTML='Entrar';btn.disabled=false;return;}
    currentUser=data[0];
    sessionStorage.setItem('cdpuser',JSON.stringify(data[0]));
    // salvar credenciais se marcado
    if(salvar){
      localStorage.setItem(SAVED_KEY,JSON.stringify({email,senha,nome:data[0].nome}));
      // oferecer biometria se disponível e ainda não registrada
      if(window.PublicKeyCredential&&!localStorage.getItem(BIO_KEY)){
        setTimeout(()=>registrarBiometria(data[0].id,email),1500);
      }
    }
    // ── COMMAND EVENT ──────────────────────────
    CommandEventService.recordLogin(data[0].nome).catch(()=>{});
    // ──────────────────────────────────────────
    await initApp();
  }catch(e){err.textContent='Erro: '+e.message;err.style.display='block';}
  btn.innerHTML='Entrar';btn.disabled=false;
}

async function initApp(){
  const ls=document.getElementById('login-screen');
  ls.style.opacity='0';ls.style.transition='opacity .35s';
  setTimeout(async()=>{
    ls.style.display='none';
    document.getElementById('app').style.display='flex';
    document.getElementById('ai-fab').style.display='flex';
    setupUI();await loadAll();showToast(`Bem-vindo, ${currentUser.nome}`,'success');
  },350);
}

function setupUI(){
  document.getElementById('sb-av-txt').textContent=currentUser.nome.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('sb-nome').textContent=currentUser.nome;
  document.getElementById('sb-cargo').textContent=currentUser.cargo;
  const cb=document.getElementById('cargo-badge-top');
  cb.className=`user-info-badge cargo-badge ${CARGO_STYLE[currentUser.cargo]||'cb-cor'}`;cb.textContent=currentUser.cargo;
  const nav=document.getElementById('sb-nav');
  const ic={
    dash:`<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    leads:`<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
    im:`<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    corr:`<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>`,
    ag:`<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    rel:`<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    usr:`<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    cfg:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  };
  let h=`<div class="nav-sec"><span class="nav-sec-label">Principal</span></div>
    <div class="nav-sec"><span class="nav-sec-label">// CRM</span></div><div class="nav-item active" onclick="goTo('dashboard',this)"><span class="nav-ic">${ic.dash}</span><span class="nav-label">Dashboard</span></div>
    <div class="nav-item" onclick="goTo('leads',this)"><span class="nav-ic">${ic.leads}</span><span class="nav-label">Leads</span><span class="nav-badge" id="badge-leads">0</span></div>`;
  if(perm('verTodos'))h+=`<div class="nav-sep"></div><div class="nav-sec"><span class="nav-sec-label">// Equipe</span></div><div class="nav-item" onclick="goTo('imoveis',this)"><span class="nav-ic">${ic.im}</span><span class="nav-label">Imóveis</span></div><div class="nav-item" onclick="goTo('corretores',this)"><span class="nav-ic">${ic.corr}</span><span class="nav-label">Corretores</span></div>`;
  h+=`<div class="nav-sep"></div><div class="nav-sec"><span class="nav-sec-label">// Gestão</span></div><div class="nav-item" onclick="goTo('agenda',this)"><span class="nav-ic">${ic.ag}</span><span class="nav-label">Agenda</span></div>`;
  if(perm('verRelatorio'))h+=`<div class="nav-item" onclick="goTo('relatorios',this)"><span class="nav-ic">${ic.rel}</span><span class="nav-label">Relatórios</span></div>`;
  h+=`<div class="nav-item" onclick="goTo('comissoes',this)"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v2m0 8v2M9 9h4a2 2 0 010 4H9a2 2 0 000 4h5"/></svg></span><span class="nav-label">Comissões</span></div>`;
  h+=`<div class="nav-item" onclick="goTo('ligacoes',this);renderDiscagem()"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.82 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg></span><span class="nav-label">Ligações</span></div>`;
  h+=`<div class="nav-item" onclick="goTo('oferta-ativa',this);renderOA()" style="position:relative"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span><span class="nav-label">Oferta Ativa</span>${(()=>{const d=JSON.parse(localStorage.getItem('cdp_oa_fila')||'[]');return d.length>0?`<span class="nav-badge" style="background:rgba(245,158,11,0.15);color:#FCD34D;border:1px solid rgba(245,158,11,0.2)">${d.length}</span>`:''})()}</div>`;
  // Exportar/Importar CSV para gestores
  if(perm('verTodos'))h+=`<div class="nav-item" onclick="exportarCSV('leads')"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span><span class="nav-label">Exportar CSV</span></div>`;
  if(perm('verTodos'))h+=`<div class="nav-item" onclick="abrirImportar()"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="3" x2="12" y2="15"/></svg></span><span class="nav-label">Importar Lista</span></div>`;
  if(perm('verTodos'))h+=`<div class="nav-item" onclick="abrirFila()" style="position:relative"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.95-1.57L23 6H6"/></svg></span><span class="nav-label">Distribuir Fila${(()=>{const f=JSON.parse(localStorage.getItem('cdp_fila')||'[]');return f.length>0?` (${f.length})`:''})()}</span></div>`;
  if(perm('verTodos'))h+=`<div class="nav-item" onclick="abrirFilaLanding()" style="position:relative"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 11-5.8-1.6"/></svg></span><span class="nav-label">Leads da Landing</span>${(()=>{const n=allLeads.filter(l=>l.origem==='Landing Page'&&(!l.corretor||l.corretor==='')&&l.status!=='Perdido').length;return n>0?`<span class="nav-badge" style="background:rgba(255,111,53,0.15);color:#FFB494;border:1px solid rgba(255,111,53,0.25)">${n}</span>`:''})()}</div>`;
  // Fila IA — visível só pra CEO e Diretor
  if(perm('verTodos'))h+=`<div class="nav-item" id="nav-fila-ia" onclick="goTo('fila-ia',this);carregarFilaIA()" style="position:relative"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg></span><span class="nav-label">Fila IA</span><span class="nav-badge" id="badge-fila-ia" style="display:none;background:rgba(34,197,94,0.15);color:#86EFAC;border:1px solid rgba(34,197,94,0.25)">0</span></div>`;
  if(perm('verUsuarios'))h+=`<div class="nav-sep"></div><div class="nav-sec"><span class="nav-sec-label">Administração</span></div><div class="nav-item" onclick="goTo('usuarios',this)"><span class="nav-ic">${ic.usr}</span><span class="nav-label">Usuários</span><span class="nav-badge" id="badge-pend" style="display:none">0</span></div>`;
  if(perm('verConfig'))h+=`<div class="nav-item" onclick="goTo('config',this)"><span class="nav-ic">${ic.cfg}</span><span class="nav-label">Configurações</span></div>`;
  // ══ KR7 COMMAND ══
  const cargo = currentUser.cargo;
  const isGestor = ['CEO','Diretor','Gerente'].includes(cargo);
  const isCoord  = cargo === 'Coordenador';
  const isCorr   = cargo === 'Corretor';
  h += '<div class="nav-sep"></div>';
  if (isGestor) {
    h += `<div class="nav-sec"><span class="nav-sec-label" style="color:rgba(34,197,94,0.9);letter-spacing:0.16em">// KR7 COMMAND</span></div>`;
    h += `<div class="nav-item" onclick="goTo('command-home',this);initCommandHome()" style="background:linear-gradient(135deg,rgba(34,197,94,0.07),transparent);border:1px solid rgba(34,197,94,0.12);border-radius:9px"><span class="nav-ic" style="color:#22C55E"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span><span class="nav-label" style="font-weight:700;color:#86EFAC">⚡ COMMAND</span></div>`;
    h += `<div class="nav-item" onclick="goTo('command-intelligence',this);initCommandIntelligence()"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg></span><span class="nav-label">Intelligence</span></div>`;
    h += `<div class="nav-item" onclick="goTo('command-executive',this);initCommandExecutive()"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></span><span class="nav-label">Executive</span></div>`;
    h += `<div class="nav-item" onclick="goTo('command-missions',this);initCommandMissions()" style="position:relative"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span><span class="nav-label">Missões</span><span class="nav-badge" id="badge-missions" style="display:none;background:rgba(245,158,11,0.1);color:#FCD34D;border:1px solid rgba(245,158,11,0.2);font-size:9px">0</span></div>`;
    h += `<div class="nav-item" onclick="goTo('command-distribution',this);initCommandDistribution()" style="position:relative"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></span><span class="nav-label">Distribuição</span><span class="nav-badge" id="badge-dist" style="display:none;background:rgba(14,165,233,0.1);color:#7DD3FC;border:1px solid rgba(14,165,233,0.2);font-size:9px">0</span></div>`;
    h += `<div class="nav-item" onclick="goTo('command-trust',this);initCommandTrust()"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span><span class="nav-label">Índice de Confiança</span></div>`;
    h += `<div class="nav-item" onclick="goTo('command-dna',this);initCommandDNA()"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg></span><span class="nav-label">DNA Comercial</span></div>`;
    h += `<div class="nav-item" onclick="goTo('command-recovery',this);initCommandRecovery()" style="position:relative"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></span><span class="nav-label">Recovery</span><span class="nav-badge" id="badge-recovery" style="display:none;background:rgba(249,115,22,0.1);color:#FDBA74;border:1px solid rgba(249,115,22,0.2);font-size:9px">0</span></div>`;
    h += `<div class="nav-item" onclick="goTo('command-manager',this);initCommandManager()"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></span><span class="nav-label">Consultores</span></div>`;
    h += `<div class="nav-item" onclick="goTo('command-events',this);initCommandEvents()"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span><span class="nav-label">Events</span></div>`;
  } else if (isCoord) {
    h += `<div class="nav-sec"><span class="nav-sec-label" style="color:rgba(99,102,241,0.9);letter-spacing:0.16em">// KR7 COMMAND</span></div>`;
    h += `<div class="nav-item" onclick="goTo('command-coordenador',this);initCoordenadorView()" style="background:linear-gradient(135deg,rgba(99,102,241,0.07),transparent);border:1px solid rgba(99,102,241,0.12);border-radius:9px"><span class="nav-ic" style="color:#6366F1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span><span class="nav-label" style="font-weight:700;color:#A5B4FC">⚡ COMMAND</span></div>`;
    h += `<div class="nav-item" onclick="goTo('command-recovery',this);initCommandRecovery()"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></span><span class="nav-label">Recovery</span></div>`;
    h += `<div class="nav-item" onclick="goTo('command-dna',this);initCommandDNA()"><span class="nav-ic">🧬</span><span class="nav-label">DNA Comercial</span></div>`;
  } else if (isCorr) {
    // CORRETOR: 9 módulos permitidos APENAS
    // BLOQUEADO: Executivo, Receita, Ranking, ICC colegas, DNA colegas,
    //            Recovery Geral, Usuários, Configurações, Distribuição, Financeiro
    h = ''; // Reset sidebar — Corretor tem layout exclusivo

    h += `<div class="nav-sec"><span class="nav-sec-label" style="color:rgba(34,197,94,0.9);letter-spacing:0.16em">// MEU COMMAND</span></div>`;
    h += `<div class="nav-item" onclick="goTo('command-corretor',this);initCorretorView()" style="background:linear-gradient(135deg,rgba(34,197,94,0.07),transparent);border:1px solid rgba(34,197,94,0.12);border-radius:9px"><span class="nav-ic" style="color:#22C55E"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span><span class="nav-label" style="font-weight:700;color:#86EFAC">⚡ COMMAND</span></div>`;

    h += `<div class="nav-sep"></div><div class="nav-sec"><span class="nav-sec-label">// MEU CRM</span></div>`;
    h += `<div class="nav-item" onclick="goTo('leads',this)"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></span><span class="nav-label">👥 Meus Leads</span><span class="nav-badge" id="badge-leads">0</span></div>`;
    h += `<div class="nav-item" onclick="goTo('agenda',this)"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span><span class="nav-label">📅 Agenda</span></div>`;
    h += `<div class="nav-item" onclick="goTo('imoveis',this)"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></span><span class="nav-label">🏡 Imóveis</span></div>`;

    h += `<div class="nav-sep"></div><div class="nav-sec"><span class="nav-sec-label" style="color:rgba(34,197,94,0.7)">// MEU DESEMPENHO</span></div>`;
    h += `<div class="nav-item" onclick="goTo('command-dna',this);initCommandDNA()"><span class="nav-ic">🧬</span><span class="nav-label">🧬 Meu DNA</span></div>`;
    h += `<div class="nav-item" onclick="goTo('command-trust',this);initCommandTrust()"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span><span class="nav-label">⭐ Meu ICC</span></div>`;
    h += `<div class="nav-item" onclick="goTo('command-recovery',this);initCommandRecovery()"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></span><span class="nav-label">🔄 Meu Recovery</span></div>`;
    h += `<div class="nav-item" onclick="goTo('command-manager',this);initCommandManager()"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></span><span class="nav-label">📊 Meu Desempenho</span></div>`;

    h += `<div class="nav-sep"></div>`;
    h += `<div class="nav-item" onclick="goTo('config',this)"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg></span><span class="nav-label">⚙ Meu Perfil</span></div>`;
  }
  nav.innerHTML=h;
}

function doLogout(){
  if(!confirm('Deseja sair?'))return;
  currentUser=null;sessionStorage.removeItem('cdpuser');
  document.getElementById('app').style.display='none';
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('login-screen').style.opacity='1';
  document.getElementById('lg-email').value='';document.getElementById('lg-pass').value='';
  showScreen('main');
}

