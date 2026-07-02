/* ── CHAT IA ── */
// IA via Cloudflare Worker — sem chave exposta no frontend
let aiHistory=[];
let aiLeadCtx=null; // contexto do lead atual se aberto pelo card

function toggleAiPanel(){
  const p=document.getElementById('ai-panel');
  const isOpen=p.classList.contains('open');
  p.classList.toggle('open',!isOpen);
  if(!isOpen){
    if(aiHistory.length===0)aiBoasVindas();
    setTimeout(()=>document.getElementById('ai-inp').focus(),100);
  }
}

function aiBoasVindas(){
  const nome=currentUser?.nome?.split(' ')[0]||'';
  aiAddMsg('ai',`Olá${nome?' '+nome:''}! 👋 Sou o **CDP Assistente**, especializado em vendas imobiliárias.\n\nPosso te ajudar com:\n• **Sugestões de resposta** para clientes\n• **Scripts** de abordagem e fechamento\n• **Contorno de objeções** (preço, prazo, concorrência)\n• **Dicas** de negociação e follow-up\n\nUse os atalhos acima ou me pergunte o que quiser! 🚀`);
}

function aiAddMsg(role,text){
  const msgs=document.getElementById('ai-msgs');
  const initials=currentUser?.nome?.split(' ').map(n=>n[0]).slice(0,2).join('')||'U';
  const div=document.createElement('div');
  div.className=`ai-msg ${role}`;
  div.innerHTML=`
    <div class="ai-msg-avatar">${role==='ai'?'🤖':initials}</div>
    <div class="ai-bubble">${aiFormatText(text)}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop=msgs.scrollHeight;
}

function aiFormatText(t){
  return t
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,'<em>$1</em>')
    .replace(/\n/g,'<br>');
}

function aiShowTyping(){
  const msgs=document.getElementById('ai-msgs');
  const div=document.createElement('div');
  div.className='ai-msg ai';div.id='ai-typing-bubble';
  div.innerHTML=`<div class="ai-msg-avatar">🤖</div><div class="ai-bubble"><div class="ai-typing"><span></span><span></span><span></span></div></div>`;
  msgs.appendChild(div);msgs.scrollTop=msgs.scrollHeight;
}

function aiRemoveTyping(){
  const t=document.getElementById('ai-typing-bubble');
  if(t)t.remove();
}

function aiChip(texto){
  document.getElementById('ai-inp').value=texto;
  aiEnviar();
}

function aiKeyDown(e){
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();aiEnviar();}
}

function aiAutoResize(ta){
  ta.style.height='auto';
  ta.style.height=Math.min(ta.scrollHeight,90)+'px';
}

async function aiEnviar(){
  const inp=document.getElementById('ai-inp');
  const msg=inp.value.trim();
  if(!msg)return;
  inp.value='';inp.style.height='auto';
  document.getElementById('ai-send-btn').disabled=true;

  aiAddMsg('user',msg);
  aiHistory.push({role:'user',content:msg});

  aiShowTyping();

  // Monta contexto do sistema com dados reais do CRM
  const totalLeads=allLeads?.length||0;
  const leadsAtivos=allLeads?.filter(l=>l.status!=='Fechado'&&l.status!=='Perdido').length||0;
  const leadsFechados=allLeads?.filter(l=>l.status==='Fechado').length||0;

  const systemPrompt=`Você é o CDP Assistente — coach comercial especializado em vendas imobiliárias. Você opera com frameworks comprovados e psicologia de vendas aplicada ao mercado imobiliário. Seu papel é orientar corretores de forma direta, consultiva e prática.

## FRAMEWORK PRINCIPAL: LPN (Ligação Nota 10)
Base obrigatória ANTES de qualquer oferta. Nunca apresente imóvel antes de entender o cliente.

**L → Localização**
- Região desejada e motivo da preferência
- Rotina do cliente e deslocamento
- Afinidade com o bairro

**P → Produto**
- Tipo de imóvel, metragem, quartos
- O que gosta e não gosta
- Quem vai morar

**N → Negociação**
- Faixa de valor e forma de pagamento
- Momento de compra (urgência)
- Pronto vs planta

## SPIN SELLING (Neil Rackham)
Use para aprofundar a conversa sem parecer interrogatório:
- **S (Situação):** "Hoje você mora onde?"
- **P (Problema):** "O que te incomoda no imóvel atual?"
- **I (Implicação):** "E isso impacta como sua rotina?"
- **N (Necessidade):** "Se resolvesse isso hoje, faria sentido avançar?"

## FUNIL COMERCIAL
1. Prospecção → 2. Tentativa de contato → 3. Atendimento → 4. Qualificação → 5. Visita → 6. Proposta → 7. Venda
**Erro clássico:** tentar vender antes de qualificar.

## CONVERSÃO PARA VISITA
Use: rapport, escassez, novidade, autoridade, conexão emocional.
Regra: **visita não é turismo — visita é ferramenta de fechamento.**

## PLAYBOOK DE FOLLOW-UP (PFQP)
- Tentativa 1 → abertura
- Tentativa 2 → contexto
- Tentativa 3 → valor
- Tentativa 4 → decisão
- Tentativa 5 → break up elegante
Nunca mande "viu minha mensagem?". Sempre agregue valor.

## GESTÃO DE ROTINA (GTD — David Allen)
Capturar → Organizar → Priorizar → Executar → Revisar

## O QUE AVALIAR NUMA CONVERSA
- Excesso de informação sem direção
- Ausência de pergunta final
- Quebra de progressão
- Falta de conexão emocional
- Timing errado de oferta
- Ausência de qualificação
- Cliente analítico vs emocional
- Corretor "empurrando" vs conduzindo

## REGRA DE OURO
👉 "Nunca apresentar imóvel antes de entender o cliente."
👉 "Volume protege." — mais contatos, mais constância, mais previsibilidade comercial.

## CONTEXTO DO CRM AGORA
- Corretor: ${currentUser?.nome||'—'} (${currentUser?.cargo||'—'})
- Leads ativos: ${leadsAtivos} | Fechados: ${leadsFechados} | Total: ${totalLeads}
${aiLeadCtx?`- Lead em foco: ${aiLeadCtx.nome} | Status: ${aiLeadCtx.status} | Interesse: ${aiLeadCtx.interesse==='hot'?'🔥 Quente':aiLeadCtx.interesse==='warm'?'🟡 Morno':'🧊 Frio'} | Imóvel: ${aiLeadCtx.tipo_imovel||'não informado'} | Valor: ${aiLeadCtx.valor||'não informado'} | Bairro: ${aiLeadCtx.bairro||'não informado'}`:''}

## COMO RESPONDER
- Tom de coach experiente — direto, próximo, sem enrolação
- Máximo 5 linhas por resposta, exceto scripts completos
- Sempre indique em qual etapa LPN/Funil o corretor está
- Para objeções: acolha com empatia + ofereça duas opções concretas
- Para scripts: formate pronto para copiar no WhatsApp
- Português brasileiro, linguagem próxima e profissional`;


  try{
    const msgs=aiHistory.filter(m=>m.role!=='system');
    const resp=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':AI_KEY,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:1000,
        system:systemPrompt,
        messages:msgs,
      })
    });
    const data=await resp.json();
    const reply=data.content?.[0]?.text||'Não consegui gerar uma resposta. Tente novamente.';
    aiRemoveTyping();
    aiAddMsg('ai',reply);
    aiHistory.push({role:'assistant',content:reply});
    // mantém histórico em no máximo 20 mensagens
    if(aiHistory.length>20)aiHistory=aiHistory.slice(-20);
  }catch(e){
    aiRemoveTyping();
    aiAddMsg('ai','Erro ao conectar com a IA. Verifique sua conexão e tente novamente.');
  }
  document.getElementById('ai-send-btn').disabled=false;
  document.getElementById('ai-inp').focus();
}

/* ── CENTRAL DE LIGAÇÕES ── */
let discSessao={atendeu:0,nao:0,ag:0,decl:0,hist:[]};
let discFilaAtual=[];
let discIdxAtual=0;
let discTimerInterval=null;
let discTimerSeg=0;










// Abre central de ligações já com um lead selecionado

/* ══════════════════════════════════════════
   OFERTA ATIVA
   Storage keys (localStorage por usuário):
   cdp_oa_fila      — array de prospectos na fila
   cdp_oa_desc      — descartados
   cdp_oa_atv       — ativados (histórico)
   cdp_oa_sess      — contadores da sessão atual
══════════════════════════════════════════ */

/* ══════════════════════════════════════════
   OFERTA ATIVA — Supabase Edition
   Tabelas: oa_fila, oa_historico
══════════════════════════════════════════ */

// helpers Supabase para OA





function el(id){return document.getElementById(id);}










/* ── OA: Add manual ── */


/* ── OA: Importar CSV/Sheets ── */





