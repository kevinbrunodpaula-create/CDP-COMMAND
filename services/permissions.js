/**
 * CDP — Permissions, Constants & Login Screen
 * As variáveis globais (allLeads, currentUser, PERMS) estão em database/supabase.js
 * Este arquivo contém apenas as constantes de UI e funções de login
 */

/* ── CONSTANTES DE UI ── */
const COLS=['Lead Novo','Primeiro Contato','Em Atendimento','Qualificado','Visita Marcada','Proposta','Documentação','Follow-Up','Fechado','Perdido'];
const COL_DOT={'Lead Novo':'#22C55E','Primeiro Contato':'#6EE7B7','Em Atendimento':'#F59E0B','Qualificado':'#4ADE80','Visita Marcada':'#FBBF24','Proposta':'#A78BFA','Documentação':'#34D399','Follow-Up':'#10B981','Fechado':'#22C55E','Perdido':'#EF4444'};
const COL_ACC={'Lead Novo':'rgba(34,197,94,0.8)','Primeiro Contato':'rgba(22,163,74,0.6)','Em Atendimento':'rgba(245,158,11,0.6)','Qualificado':'rgba(34,197,94,0.6)','Visita Marcada':'rgba(251,191,36,0.6)','Proposta':'rgba(148,163,184,0.6)','Documentação':'rgba(52,211,153,0.6)','Follow-Up':'rgba(16,185,129,0.6)','Fechado':'rgba(34,197,94,0.8)','Perdido':'rgba(239,68,68,0.6)'};
const INT_C={hot:'th',warm:'tw',cold:'tc'};
const INT_L={hot:'🔥 Quente',warm:'🟡 Morno',cold:'🧊 Frio'};
const ORI_C={Instagram:'oi',Facebook:'of',Google:'og','Indicação':'on2',Site:'os',WhatsApp:'oz'};
const IM_E={Apartamento:'🏢',Casa:'🏡',Kitnet:'🏠',Terreno:'🌿',Comercial:'🏪'};
const CARGO_STYLE={CEO:'cb-ceo',Diretor:'cb-dir',Gerente:'cb-ger',Coordenador:'cb-coord',Corretor:'cb-cor'};
const NIVEL_CFG={
  CEO:       {badge:'cb-ceo',accent:'rgba(245,158,11,0.5)',dot:'#F59E0B',online:true},
  Diretor:   {badge:'cb-dir',accent:'rgba(22,163,74,0.4)',dot:'#16A34A',online:true},
  Gerente:   {badge:'cb-ger',accent:'rgba(14,165,233,0.4)',dot:'#0EA5E9',online:false},
  Coordenador:{badge:'cb-coord',accent:'rgba(99,102,241,0.35)',dot:'#6366F1',online:false},
  Corretor:  {badge:'cb-cor',accent:'rgba(34,197,94,0.35)',dot:'#22C55E',online:false},
  Assistente:{badge:'cb-ast',accent:'rgba(148,163,184,0.3)',dot:'#64748B',online:false},
};

function getNivel(cargo){
  if(!cargo)return 'Corretor';
  const c=cargo.trim();
  if(c==='CEO')return 'CEO';
  if(c==='Diretor')return 'Diretor';
  if(c==='Gerente'||c==='Gestor')return 'Gerente';
  if(c==='Coordenador')return 'Coordenador';
  if(c.toLowerCase().includes('assist'))return 'Assistente';
  return 'Corretor';
}

/* ── LOGIN SCREEN ── */
function showScreen(s){
  document.getElementById('login-main').style.display=s==='main'?'flex':'none';
  document.getElementById('login-novo').style.display=s==='novo'?'flex':'none';
  document.getElementById('login-recuperar').style.display=s==='recuperar'?'flex':'none';
  document.getElementById('login-redefine').style.display=s==='redefine'?'flex':'none';
  if(s==='novo'){
    document.getElementById('novo-step1').style.display='block';
    document.getElementById('novo-step2').style.display='none';
    document.getElementById('novo-err').style.display='none';
  }
  if(s==='recuperar'){
    document.getElementById('rec-step1').style.display='block';
    if(document.getElementById('rec-step2'))document.getElementById('rec-step2').style.display='none';
  }
}
