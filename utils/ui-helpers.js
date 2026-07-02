function setView(v,el){document.querySelectorAll('.vb').forEach(b=>b.classList.remove('active'));el.classList.add('active');document.getElementById('leads-kanban').style.display=v==='kanban'?'block':'none';document.getElementById('leads-lista').style.display=v==='lista'?'block':'none';}
function set(id,val){const el=document.getElementById(id);if(el)el.textContent=val;}
function showToast(msg,type='success'){
  const wrap=document.getElementById('toast-wrap');
  const t=document.createElement('div');t.className=`toast ${type}`;
  const dot=type==='success'?'var(--green)':type==='error'?'var(--red)':'var(--blue)';
  t.innerHTML=`<span style="width:6px;height:6px;border-radius:50%;background:${dot};flex-shrink:0;display:inline-block"></span><span style="color:var(--text-tertiary)">${msg}</span>`;
  wrap.appendChild(t);setTimeout(()=>t.remove(),3200);
}

window.addEventListener('load',()=>{
  setTimeout(()=>{
    const ld=document.getElementById('loading');ld.style.opacity='0';ld.style.transition='opacity .4s';
    setTimeout(()=>ld.style.display='none',400);
    // verifica se é um link de reset de senha
    if(location.search.includes('reset=')){verificarTokenReset();return;}
    verificarBioDisponivel();
    const saved=sessionStorage.getItem('cdpuser');
    if(saved){try{currentUser=JSON.parse(saved);initApp();}catch(e){sessionStorage.removeItem('cdpuser');}}
  },1800);
});
document.addEventListener('click',e=>{if(e.target.classList.contains('modal-ov'))e.target.classList.remove('open');});

function setSelectVal(id,val){
  const sel=document.getElementById(id);
  if(!sel||!val)return;
  for(let i=0;i<sel.options.length;i++){
    if(sel.options[i].value===val||sel.options[i].text===val){sel.selectedIndex=i;break;}
  }
}
