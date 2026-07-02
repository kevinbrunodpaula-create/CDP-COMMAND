function abrirAnaliseConversa(leadId){
  const lead=allLeads.find(l=>l.id===leadId);if(!lead)return;
  document.getElementById('conv-lead-id').value=leadId;
  document.getElementById('conv-lead-info').innerHTML=`<strong>${lead.nome}</strong> · ${lead.status} · ${lead.corretor||'Sem corretor'}`;
  document.getElementById('conv-texto').value='';
  document.getElementById('conv-resultado').style.display='none';
  document.getElementById('conv-loading').style.display='none';
  document.getElementById('btn-salvar-conv').style.display='none';
  document.getElementById('btn-analisar-conv').style.display='flex';
  openModal('conversa');
  setTimeout(()=>document.getElementById('conv-texto').focus(),100);
}

async function analisarConversa(){
  const texto=document.getElementById('conv-texto').value.trim();
  if(texto.length<50){showToast('Cole uma conversa com pelo menos 50 caracteres!','error');return;}
  const leadId=document.getElementById('conv-lead-id').value;
  const lead=allLeads.find(l=>l.id===leadId);
  const btnAn=document.getElementById('btn-analisar-conv');
  btnAn.innerHTML='<span class="spin"></span>';btnAn.disabled=true;
  document.getElementById('conv-loading').style.display='block';
  document.getElementById('conv-resultado').style.display='none';

  const prompt=`Você é um coach de vendas imobiliárias especializado nos frameworks LPN, SPIN Selling e PFQP. Analise a conversa de WhatsApp abaixo entre um corretor e um cliente.

Lead: ${lead?.nome||'Cliente'}
Status no CRM: ${lead?.status||'—'}
Interesse: ${lead?.interesse==='hot'?'🔥 Quente':lead?.interesse==='warm'?'🟡 Morno':'🧊 Frio'}
Valor pretendido: ${lead?.valor||'não informado'}
Bairro: ${lead?.bairro||'não informado'}

Conversa:
${texto}

Analise com base nos frameworks:
- LPN (Localização, Produto, Negociação) — o corretor qualificou?
- SPIN Selling — houve perguntas de Situação, Problema, Implicação, Necessidade?
- Funil — em qual etapa o lead está e se avançou
- Follow-up PFQP — o corretor conduziu bem ou empurrou?

Responda APENAS em JSON válido, sem markdown, sem texto extra:
{
  "sentimento": "animado|interessado|hesitante|frio|indeciso",
  "sentimento_emoji": "😄|🙂|😐|😕|🤔",
  "sentimento_cor": "var(--green)|var(--orange)|var(--text-tertiary)|var(--red)|var(--orange)",
  "resumo": "resumo de 2-3 linhas sobre o atendimento, o que o corretor fez bem e o que pode melhorar",
  "objecoes": ["objeção identificada 1", "objeção 2"] ou [],
  "proxima_acao": "próxima ação específica baseada no framework LPN/SPIN — o que exatamente fazer agora",
  "score_ajuste": número entre -10 e 20
}`;

  try{
    const resp=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':AI_KEY,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:600,
        messages:[{role:'user',content:prompt}]
      })
    });
    const data=await resp.json();
    const raw=data.content?.[0]?.text||'';
    const clean=raw.replace(/```json|```/g,'').trim();
    const result=JSON.parse(clean);

    // Exibir resultado
    document.getElementById('conv-loading').style.display='none';
    document.getElementById('conv-resultado').style.display='block';

    // Sentimento
    document.getElementById('conv-sentimento').style.background=`${result.sentimento_cor}15`;
    document.getElementById('conv-sentimento').style.border=`1px solid ${result.sentimento_cor}30`;
    document.getElementById('conv-sentimento').style.color=result.sentimento_cor;
    document.getElementById('conv-sentimento').innerHTML=`<span style="font-size:20px">${result.sentimento_emoji}</span><strong style="text-transform:capitalize">${result.sentimento}</strong>`;

    // Resumo
    document.getElementById('conv-resumo').innerHTML=result.resumo;

    // Objeções
    if(result.objecoes&&result.objecoes.length>0){
      document.getElementById('conv-objecoes-wrap').style.display='block';
      document.getElementById('conv-objecoes').innerHTML=result.objecoes.map(o=>`• ${o}`).join('<br>');
    } else {
      document.getElementById('conv-objecoes-wrap').style.display='none';
    }

    // Próxima ação
    document.getElementById('conv-proxima').innerHTML=result.proxima_acao;

    // Mostrar botão salvar
    document.getElementById('btn-salvar-conv').style.display='flex';
    document.getElementById('btn-salvar-conv').dataset.result=JSON.stringify(result);

  }catch(e){
    document.getElementById('conv-loading').style.display='none';
    showToast('Erro na análise. Suba o sistema online para usar a IA.','error');
  }
  btnAn.innerHTML='🤖 Analisar com IA';btnAn.disabled=false;
}

async function salvarConversa(){
  const leadId=document.getElementById('conv-lead-id').value;
  const texto=document.getElementById('conv-texto').value.trim();
  const resultRaw=document.getElementById('btn-salvar-conv').dataset.result;
  const result=resultRaw?JSON.parse(resultRaw):{};
  const lead=allLeads.find(l=>l.id===leadId);
  if(!lead)return;
  const agora=new Date().toISOString();
  // Monta entrada no histórico
  const histAtual=lead.historico_contatos?JSON.parse(lead.historico_contatos):[];
  const resumoHist=`💬 Conversa WhatsApp analisada: ${result.resumo||'sem resumo'} | Sentimento: ${result.sentimento||'—'} | Próxima ação: ${result.proxima_acao||'—'}`;
  histAtual.unshift({data:agora,obs:resumoHist,autor:currentUser.nome,tipo:'conversa'});
  // Salva conversa e histórico
  try{
    await SB.upd('leads',{
      ultima_conversa:texto.slice(0,2000), // primeiros 2000 chars
      ultima_analise_ia:JSON.stringify(result),
      historico_contatos:JSON.stringify(histAtual),
      ultimo_contato:agora,
    },`id=eq.${leadId}`);
    showToast('Conversa salva e análise registrada no histórico!','success');
    closeModal('conversa');
    await loadAll();
  }catch(e){showToast('Erro ao salvar: '+e.message,'error');}
}
