/* ═══════════════════════════════════
   CDP ASSISTANT — FUNÇÕES
═══════════════════════════════════ */
let cdpaCurrentTab = 'followup';
let cdpaLeadCtx = null;

function openCdpAssistant(leadId) {
  cdpaLeadCtx = null;
  // limpar campos
  ['cdpa-fu-nome','cdpa-fu-imovel','cdpa-fu-ctx','cdpa-post-nome','cdpa-post-detalhes'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  document.getElementById('cdpa-fu-estagio').value='Lead Novo';
  document.getElementById('cdpa-fu-tom').value='consultivo';
  document.getElementById('cdpa-post-foco').value='lancamento';
  document.getElementById('cdpa-post-destino').value='instagram';
  // esconder resultados e loadings
  ['cdpa-fu-resultado','cdpa-fu-loading','cdpa-post-resultado','cdpa-post-loading'].forEach(id=>{
    document.getElementById(id).style.display='none';
  });

  // preencher select de imóveis
  const sel = document.getElementById('cdpa-post-imovel');
  sel.innerHTML = '<option value="">Selecione ou digite abaixo...</option>';
  if(allImoveis && allImoveis.length) {
    allImoveis.filter(i=>i.status!=='Vendido').forEach(im=>{
      const opt=document.createElement('option');
      opt.value=im.id;
      opt.textContent=im.nome+(im.bairro?' — '+im.bairro:'');
      opt.dataset.nome=im.nome; opt.dataset.bairro=im.bairro||''; opt.dataset.valor=im.valor||'';
      opt.dataset.quartos=im.quartos||''; opt.dataset.const=im.construtora||'';
      opt.dataset.desc=im.descricao||''; opt.dataset.prog=im.programa||'';
      sel.appendChild(opt);
    });
  }

  // se veio de um lead, preencher contexto
  if(leadId) {
    const lead = allLeads?.find(l=>l.id===leadId);
    if(lead) {
      cdpaLeadCtx = lead;
      document.getElementById('cdpa-fu-nome').value = lead.nome||'';
      document.getElementById('cdpa-fu-estagio').value = lead.status||'Lead Novo';
      document.getElementById('cdpa-fu-imovel').value = lead.tipo||'';
      const info=document.getElementById('cdpa-fu-lead-info');
      info.style.display='block';
      document.getElementById('cdpa-fu-lead-dados').innerHTML =
        `<strong style="color:#F0FDF4">${lead.nome}</strong> · ${lead.status||'—'} · ${lead.interesse==='hot'?'🔥 Quente':lead.interesse==='warm'?'🟡 Morno':'🧊 Frio'}`+
        (lead.valor?`<br>💰 Valor pretendido: ${lead.valor}`:'')+(lead.bairro?` · 📍 Bairro: ${lead.bairro}`:'')+(lead.obs?`<br>📝 ${lead.obs.slice(0,120)}...`:'');
      const ctx=document.getElementById('cdpa-lead-ctx');
      ctx.style.display='inline-flex'; ctx.textContent='📋 '+lead.nome;
    }
  } else {
    document.getElementById('cdpa-fu-lead-info').style.display='none';
    document.getElementById('cdpa-lead-ctx').style.display='none';
  }

  cdpaSetTab('followup');
  openModal('cdp-assistant');
}

function cdpaSetTab(tab) {
  cdpaCurrentTab = tab;
  const tabs=['followup','post'];
  tabs.forEach(t=>{
    const btn=document.getElementById('cdpa-tab-'+t);
    const panel=document.getElementById('cdpa-panel-'+t);
    const isActive=(t===tab);
    btn.style.background=isActive?'rgba(34,197,94,0.12)':'transparent';
    btn.style.color=isActive?'#86EFAC':'#64748B';
    btn.style.borderBottom=isActive?'2px solid #22C55E':'2px solid transparent';
    panel.style.display=isActive?'block':'none';
  });
}

function cdpaPreencherImovelPost(val) {
  if(!val) return;
  const sel=document.getElementById('cdpa-post-imovel');
  const opt=sel.querySelector(`option[value="${val}"]`);
  if(!opt) return;
  const nome=document.getElementById('cdpa-post-nome');
  nome.value=opt.dataset.nome||'';
  // montar detalhes automaticamente
  const detalhes=document.getElementById('cdpa-post-detalhes');
  let d='';
  if(opt.dataset.quartos) d+=opt.dataset.quartos+' quartos, ';
  if(opt.dataset.valor) d+='a partir de '+opt.dataset.valor+', ';
  if(opt.dataset.bairro) d+=opt.dataset.bairro+' — Curitiba, ';
  if(opt.dataset.const) d+='Construtora: '+opt.dataset.const+', ';
  if(opt.dataset.prog) d+=opt.dataset.prog+', ';
  if(opt.dataset.desc) d+=opt.dataset.desc;
  detalhes.value=d.replace(/,\s*$/,'');
}

async function cdpaGerarFollowUp() {
  const nome=document.getElementById('cdpa-fu-nome').value.trim();
  const estagio=document.getElementById('cdpa-fu-estagio').value;
  const imovel=document.getElementById('cdpa-fu-imovel').value.trim();
  const tom=document.getElementById('cdpa-fu-tom').value;
  const ctx=document.getElementById('cdpa-fu-ctx').value.trim();

  if(!nome) { showToast('Informe o nome do cliente','error'); return; }

  const tomMap={consultivo:'profissional e consultivo, focado em agregar valor',descontraido:'descontraído e amigável, como conversa natural de WhatsApp',urgencia:'que cria senso de urgência e escassez (oportunidade limitada)',curiosidade:'que abre com uma pergunta curiosa para engajar o cliente'};
  const prompt=`Você é um corretor de imóveis de lançamentos em Curitiba, Brasil, da imobiliária KR7 Imóveis. Gere UMA mensagem de WhatsApp de follow-up para o cliente.

DADOS:
- Nome do cliente: ${nome}
- Estágio no funil: ${estagio}
- Imóvel de interesse: ${imovel||'não informado'}
- Tom: ${tomMap[tom]||tom}
- Contexto adicional: ${ctx||'sem contexto adicional'}

REGRAS:
- Mensagem para WhatsApp, linguagem natural brasileira
- Máximo 5 linhas
- Não use emojis em excesso (máximo 2-3)
- Não seja genérico — mencione o nome e o contexto
- Termine com uma pergunta aberta ou CTA claro
- NÃO inclua saudação como "Bom dia/Boa tarde" — vá direto ao ponto
- Retorne APENAS a mensagem, sem explicações, sem aspas`;

  document.getElementById('cdpa-fu-loading').style.display='block';
  document.getElementById('cdpa-fu-resultado').style.display='none';
  document.getElementById('btn-cdpa-fu').disabled=true;
  document.getElementById('btn-cdpa-fu').style.opacity='0.5';

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'claude-sonnet-4-6',
        max_tokens:400,
        messages:[{role:'user',content:prompt}]
      })
    });
    const data = await resp.json();
    const text = data.content?.[0]?.text || '';
    document.getElementById('cdpa-fu-output').textContent = text;
    document.getElementById('cdpa-fu-resultado').style.display='block';
  } catch(e) {
    showToast('Erro ao gerar mensagem: '+e.message,'error');
  } finally {
    document.getElementById('cdpa-fu-loading').style.display='none';
    document.getElementById('btn-cdpa-fu').disabled=false;
    document.getElementById('btn-cdpa-fu').style.opacity='1';
  }
}

async function cdpaGerarPost() {
  const nomeSelect=document.getElementById('cdpa-post-imovel');
  const nomeInput=document.getElementById('cdpa-post-nome').value.trim();
  const destino=document.getElementById('cdpa-post-destino').value;
  const foco=document.getElementById('cdpa-post-foco').value;
  const detalhes=document.getElementById('cdpa-post-detalhes').value.trim();

  const nomeImovel = nomeInput || nomeSelect.options[nomeSelect.selectedIndex]?.dataset?.nome || '';
  if(!nomeImovel) { showToast('Informe o nome do empreendimento','error'); return; }

  const focoMap={lancamento:'destaque que é um lançamento / novidade no mercado',beneficios:'foque nos benefícios e diferenciais do empreendimento',financiamento:'facilidade de financiamento, entrada, parcelas acessíveis',localizacao:'valorize a localização e o bairro',urgencia:'crie urgência — últimas unidades, oportunidade limitada'};

  const gerarInsta = destino==='instagram'||destino==='ambos';
  const gerarWpp = destino==='whatsapp'||destino==='ambos';

  let prompt = `Você é especialista em marketing imobiliário de lançamentos em Curitiba, Brasil, para a KR7 Imóveis.
Empreendimento: ${nomeImovel}
Detalhes: ${detalhes||'não informado'}
Foco: ${focoMap[foco]||foco}

Gere o seguinte conteúdo em JSON puro (sem markdown, sem explicações):
{`;
  if(gerarInsta) prompt+=`
  "instagram": "legenda completa para Instagram com emojis, chamada para ação e 10 hashtags relevantes ao final (hashtags em linha separada)",`;
  if(gerarWpp) prompt+=`
  "whatsapp": "mensagem para grupo de WhatsApp de corretores ou clientes: direta, sem exagero de emojis, com link CTA no final (coloque [LINK])",`;
  prompt+=`
}
Retorne APENAS o JSON válido.`;

  document.getElementById('cdpa-post-loading').style.display='block';
  document.getElementById('cdpa-post-resultado').style.display='none';
  document.getElementById('btn-cdpa-post').disabled=true;
  document.getElementById('btn-cdpa-post').style.opacity='0.5';

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'claude-sonnet-4-6',
        max_tokens:800,
        messages:[{role:'user',content:prompt}]
      })
    });
    const data = await resp.json();
    let text = data.content?.[0]?.text || '{}';
    text = text.replace(/```json|```/g,'').trim();
    let parsed={};
    try { parsed=JSON.parse(text); } catch(e){ parsed={instagram:text,whatsapp:text}; }

    if(gerarInsta && parsed.instagram) {
      document.getElementById('cdpa-post-insta').textContent=parsed.instagram;
      document.getElementById('cdpa-post-insta-wrap').style.display='block';
    } else { document.getElementById('cdpa-post-insta-wrap').style.display='none'; }

    if(gerarWpp && parsed.whatsapp) {
      document.getElementById('cdpa-post-wpp').textContent=parsed.whatsapp;
      document.getElementById('cdpa-post-wpp-wrap').style.display='block';
    } else { document.getElementById('cdpa-post-wpp-wrap').style.display='none'; }

    document.getElementById('cdpa-post-resultado').style.display='block';
  } catch(e) {
    showToast('Erro ao gerar post: '+e.message,'error');
  } finally {
    document.getElementById('cdpa-post-loading').style.display='none';
    document.getElementById('btn-cdpa-post').disabled=false;
    document.getElementById('btn-cdpa-post').style.opacity='1';
  }
}

function cdpaCopiar(elId) {
  const el=document.getElementById(elId);
  const text=el.textContent||el.innerText;
  navigator.clipboard.writeText(text).then(()=>showToast('Copiado para área de transferência!','success')).catch(()=>{
    const ta=document.createElement('textarea');
    ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta); showToast('Copiado!','success');
  });
}

function cdpaNovaVersaoFU() {
  document.getElementById('cdpa-fu-resultado').style.display='none';
  cdpaGerarFollowUp();
}
function cdpaNovaVersaoPost() {
  document.getElementById('cdpa-post-resultado').style.display='none';
  cdpaGerarPost();
}
/* FIM CDP ASSISTANT */
