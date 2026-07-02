const EJ={
  publicKey:  '-BgIY00qUkNCioW64',
  serviceId:  'service_dfym0v5',
  tplRecupera:'template_1ipw2hd',
  tplLeadWarm:'template_ssqytek',
};
// Detecta se está configurado
const EJ_OK=()=>!EJ.publicKey.startsWith('SEU');

function ejInit(){
  try{
    if(EJ_OK()&&typeof emailjs!=='undefined')emailjs.init({publicKey:EJ.publicKey});
  }catch(e){console.warn('EmailJS não carregou:',e);}
}
ejInit();

function showEjHelp(){
  alert('Como configurar o EmailJS:\n\n1. Acesse https://www.emailjs.com e crie uma conta gratuita\n2. Em "Email Services", conecte seu Gmail\n3. Em "Email Templates", crie 2 templates:\n   - Recuperação: variáveis {{to_email}}, {{reset_link}}, {{nome}}\n   - Lead Amarelo: variáveis {{to_email}}, {{corretor}}, {{lead_nome}}, {{lead_tel}}, {{dias}}\n4. Cole os IDs no topo do script (variável EJ)\n\nSuporte: https://www.emailjs.com/docs/');
}

/* ── LOGIN ── */

/* ── TOKENS DE RECUPERAÇÃO (armazenados no Supabase) ── */
