const SURL='https://fjysqoqglqlpfxvxvvzt.supabase.co';
const SKEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeXNxb3FnbHFscGZ4dnh2dnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MzE2NzYsImV4cCI6MjA5MzMwNzY3Nn0.pSxDsgeiDQysBTyuR6YFbn0vPBgKmhJ1awSWBwJpAkI';
// ⚠️ Substitua pela sua chave da API Anthropic: https://console.anthropic.com/
const AI_KEY='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';

function dbReq(method,path,body){
  return new Promise((res,rej)=>{
    const x=new XMLHttpRequest();
    const fullUrl=SURL+'/rest/v1/'+path;
    x.open(method,fullUrl,true);
    x.setRequestHeader('apikey',SKEY);
    x.setRequestHeader('Authorization','Bearer '+SKEY);
    x.setRequestHeader('Content-Type','application/json');
    x.setRequestHeader('Accept','application/json');
    if(method==='POST'||method==='PATCH')x.setRequestHeader('Prefer','return=representation');
    x.onreadystatechange=function(){
      if(x.readyState!==4)return;
      try{const d=x.status===204?[]:JSON.parse(x.responseText);x.status>=400?rej(new Error(d.message||'Erro '+x.status)):res(d);}
      catch(e){console.error('❌ SUPABASE RESPOSTA INVÁLIDA:',method,fullUrl,'status:',x.status,'resp:',x.responseText.slice(0,200));rej(new Error('Resposta inválida'));}
    };
    x.ontimeout=()=>rej(new Error('Timeout'));x.timeout=10000;
    body?x.send(JSON.stringify(body)):x.send();
  });
}
const SB={
  sel:(t,f='')=>dbReq('GET',`${t}?select=*&${f}`),
  ins:(t,d)=>dbReq('POST',t,Array.isArray(d)?d:[d]),
  upd:(t,d,f)=>dbReq('PATCH',`${t}?${f}`,d),
  del:(t,f)=>dbReq('DELETE',`${t}?${f}`),
};

let allLeads=[],allLeadsRanking=[],allImoveis=[],allCorretores=[],allUsuarios=[],allPendentes=[];
let currentUser=null,draggedId=null,chartP=null,chartO=null;

const PODE_APROVAR={Diretor:['CEO'],Gerente:['CEO','Diretor'],Coordenador:['CEO','Diretor','Gerente'],Corretor:['CEO','Diretor','Gerente','Coordenador']};
const PERMS={
  CEO:         {verTodos:true,editarTodos:true,verConfig:true,verUsuarios:true,verRelatorio:true,aprovar:true,verEquipe:true,verCommand:true},
  Diretor:     {verTodos:true,editarTodos:true,verConfig:false,verUsuarios:true,verRelatorio:true,aprovar:true,verEquipe:true,verCommand:true},
  Gerente:     {verTodos:true,editarTodos:false,verConfig:false,verUsuarios:true,verRelatorio:true,aprovar:true,verEquipe:true,verCommand:true},
  Coordenador: {verTodos:true,editarTodos:false,verConfig:false,verUsuarios:false,verRelatorio:true,aprovar:false,verEquipe:true,verCommand:false},
  Corretor:    {verTodos:false,editarTodos:false,verConfig:false,verUsuarios:false,verRelatorio:false,aprovar:false,verEquipe:false,verCommand:false},
};
function perm(k){return currentUser&&PERMS[currentUser.cargo]?.[k]||false;}
