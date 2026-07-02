function calcPctComissao(ordemVenda){
  if(ordemVenda===1)return 1.2;
  if(ordemVenda===2)return 1.4;
  return 1.6;
}

function parseMoeda(v){
  if(!v)return 0;
  const n=parseFloat(String(v).replace(/[^\d,.]/g,'').replace(/\./g,'').replace(',','.'));
  return isNaN(n)?0:n;
}

// Preview de distribuição no formulário do lead
function calcDistLead(){
  const vgv=parseMoeda(document.getElementById('new-valor')?.value);
  const pctKR7=parseFloat(document.getElementById('new-pct-fat')?.value)||0;
  const pctImob=parseFloat(document.getElementById('new-pct-imob')?.value)||0;
  const pctCom=parseFloat(document.getElementById('new-pct-com')?.value)||0;
  const pctKevin=parseFloat(document.getElementById('new-pct-kevin')?.value)||0;
  const pctTanner=parseFloat(document.getElementById('new-pct-tanner')?.value)||0;
  const prev=document.getElementById('dist-lead-preview');
  if(!prev)return;
  const fmt=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const fp=v=>parseFloat(v.toFixed(2));
  const totalDist=pctImob+pctCom+pctKevin+pctTanner;
  const teto=pctKR7;
  const vlKR7=(pctKR7/100)*vgv;
  const vlImob=(pctImob/100)*vgv;
  const vlCom=(pctCom/100)*vgv;
  const vlKevin=(pctKevin/100)*vgv;
  const vlTanner=(pctTanner/100)*vgv;
  const vlDist=(totalDist/100)*vgv;
  if(!pctKR7&&!totalDist){prev.innerHTML='<span style="color:var(--text-muted)">Preencha os campos para ver a distribuição.</span>';return;}
  const ok=fp(totalDist)<=fp(teto);
  const diff=fp(teto-totalDist);
  const cor=ok?'var(--green)':'var(--red)';
  const icon=ok?'✅':'⛔';
  const sobraTxt = ok
    ? ' · Sobra: ' + fmt(vlKR7-vlDist) + ' (' + diff + '%)'
    : ' · EXCEDE em ' + fmt(vlDist-vlKR7) + ' (' + fp(totalDist-teto) + '%)';
  prev.innerHTML=`
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;">
      ${pctImob?`<span style="background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.2);border-radius:5px;padding:3px 7px;font-size:11px;color:var(--purple)">🏢 ${fmt(vlImob)} (${pctImob}%)</span>`:''}
      ${pctCom?`<span style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:5px;padding:3px 7px;font-size:11px;color:var(--green)">🤝 ${fmt(vlCom)} (${pctCom}%)</span>`:''}
      ${pctKevin?`<span style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);border-radius:5px;padding:3px 7px;font-size:11px;color:var(--purple)">👤 Kevin ${fmt(vlKevin)} (${pctKevin}%)</span>`:''}
      ${pctTanner?`<span style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:5px;padding:3px 7px;font-size:11px;color:var(--orange)">👤 Tanner ${fmt(vlTanner)} (${pctTanner}%)</span>`:''}
    </div>
    <div style="font-size:11px;color:${cor}">${icon} Total distribuído: ${fmt(vlDist)} (${fp(totalDist)}% do VGV) · Teto KR7: ${fmt(vlKR7)} (${pctKR7}%)${sobraTxt}</div>
  `;
}

function getVendasComComissao(){
  const norm=n=>(n||'').trim().toLowerCase();
  const fechados=[...allLeadsRanking].sort((a,b)=>new Date(a.fechado_em||a.created_at)-new Date(b.fechado_em||b.created_at));
  const mapMes={};
  fechados.forEach(l=>{
    const c=norm(l.corretor)||'sem corretor';
    const d=new Date(l.fechado_em||l.created_at);
    const mk=`${c}_${d.getFullYear()}_${d.getMonth()}`;
    if(!mapMes[mk])mapMes[mk]=0;
    mapMes[mk]++;
    l._ordemVenda=mapMes[mk];
    l._vgv=parseMoeda(l.valor);
    // % corretor: manual ou régua automática
    l._pctCorretor=parseFloat(l.pct_comissao_manual)||calcPctComissao(l._ordemVenda);
    // Todos os % são sobre o VGV
    l._pctKR7=parseFloat(l.pct_faturamento)||0;
    l._pctImob=parseFloat(l.pct_imobiliaria)||0;
    l._pctKevin=parseFloat(l.pct_kevin)||0;
    l._pctTanner=parseFloat(l.pct_tanner)||0;
    // Valores monetários — tudo sobre VGV
    l._vlKR7=(l._pctKR7/100)*l._vgv;
    l._vlCorretor=(l._pctCorretor/100)*l._vgv;
    l._vlImob=(l._pctImob/100)*l._vgv;
    l._vlKevin=l._pctKevin?(l._pctKevin/100)*l._vgv:0;
    l._vlTanner=l._pctTanner?(l._pctTanner/100)*l._vgv:0;
    // Validação: soma distribuída não deve exceder faturamento KR7
    l._totalDist=l._vlImob+l._vlCorretor+l._vlKevin+l._vlTanner;
    l._excede=l._pctKR7&&(l._totalDist>l._vlKR7+0.01);
    // _valorComissao mantido para compatibilidade
    l._valorComissao=l._vlCorretor;
    l._faturamento=l._pctKR7?l._vlKR7:null;
  });
  return fechados
    .filter(l=>l._pctCorretor||l._pctKR7)
    .sort((a,b)=>new Date(b.fechado_em||b.created_at)-new Date(a.fechado_em||a.created_at));
}

function irParaMesAtualComissao(){
  const mesEl=document.getElementById('com-filter-mes');
  if(!mesEl)return;
  const mesAtual=(()=>{const n=new Date();return`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;})();
  if(mesEl.querySelector(`option[value="${mesAtual}"]`))mesEl.value=mesAtual;
  renderComissoes();
}

function renderComissoes(){
  const fmt=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const filterMes=document.getElementById('com-filter-mes')?.value||''
  const filterCorr=document.getElementById('com-filter-corr')?.value||''
  const filterSt=document.getElementById('com-filter-status')?.value||''
  const mesEl=document.getElementById('com-filter-mes');
  const mesAtual=(()=>{const n=new Date();return`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;})();
  if(mesEl&&mesEl.options.length<=1){
    const meses=new Set();
    allLeadsRanking.forEach(l=>{const d=new Date(l.fechado_em||l.created_at);meses.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);});
    [...meses].sort().reverse().forEach(m=>{const[y,mo]=m.split('-');const opt=document.createElement('option');opt.value=m;opt.textContent=new Date(y,mo-1).toLocaleString('pt-BR',{month:'long',year:'numeric'});mesEl.appendChild(opt);});
    if(mesEl.querySelector(`option[value="${mesAtual}"]`))mesEl.value=mesAtual;
  }
  const mesLabel=document.getElementById('com-mes-label');
  if(mesLabel){
    if(filterMes){
      const[y,mo]=filterMes.split('-');
      const nomeMes=new Date(y,mo-1).toLocaleString('pt-BR',{month:'long',year:'numeric'});
      mesLabel.textContent=`📅 Exibindo: ${nomeMes.charAt(0).toUpperCase()+nomeMes.slice(1)}${filterMes===mesAtual?' · Mês atual':''}`;
    } else {
      mesLabel.textContent='📅 Exibindo: Todos os meses';
    }
  }
  const corrEl=document.getElementById('com-filter-corr');
  const isCEODir=['CEO','Diretor'].includes(currentUser.cargo);
  const isCorretor=currentUser.cargo==='Corretor';
  if(corrEl){
    corrEl.style.display=isCorretor?'none':'';
    if(corrEl.options.length<=1)allCorretores.forEach(c=>{const opt=document.createElement('option');opt.value=c.nome;opt.textContent=c.nome;corrEl.appendChild(opt);});
  }
  let lista=getVendasComComissao();
  if(isCorretor)lista=lista.filter(l=>(l.corretor||'').trim().toLowerCase()===currentUser.nome.trim().toLowerCase());
  if(filterMes)lista=lista.filter(l=>{const d=new Date(l.fechado_em||l.created_at);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`===filterMes;});
  if(filterCorr&&!isCorretor)lista=lista.filter(l=>l.corretor===filterCorr);
  if(filterSt)lista=lista.filter(l=>(l.status_comissao||'pendente')===filterSt);
  const thFat=document.getElementById('com-th-fat');
  if(thFat)thFat.style.display=isCEODir?'':'none';
  const thCorr=document.getElementById('com-th-corretor');
  if(thCorr)thCorr.style.display=isCorretor?'none':'';
  const totalVGV=lista.reduce((a,l)=>a+l._vgv,0);
  const totalKR7=lista.reduce((a,l)=>a+l._vlKR7,0);
  const totalCorretor=lista.reduce((a,l)=>a+l._vlCorretor,0);
  const totalImob=lista.reduce((a,l)=>a+l._vlImob,0);
  const totalKevin=lista.reduce((a,l)=>a+l._vlKevin,0);
  const totalTanner=lista.reduce((a,l)=>a+l._vlTanner,0);
  const pago=lista.filter(l=>l.status_comissao==='pago').reduce((a,l)=>a+l._vlCorretor,0);
  const pendente=lista.filter(l=>(l.status_comissao||'pendente')!=='pago').reduce((a,l)=>a+l._vlCorretor,0);
  const resumo=document.getElementById('com-resumo');
  if(resumo)resumo.innerHTML=`
    <div class="com-kpi"><div class="com-kpi-val">${fmt(totalCorretor)}</div><div class="com-kpi-lbl">Total comissões corretores</div></div>
    <div class="com-kpi"><div class="com-kpi-val" style="color:var(--green)">${fmt(pago)}</div><div class="com-kpi-lbl">✅ Pago</div></div>
    <div class="com-kpi"><div class="com-kpi-val" style="color:var(--orange)">${fmt(pendente)}</div><div class="com-kpi-lbl">⏳ A pagar</div></div>
    ${isCEODir?`<div class="com-kpi" style="grid-column:1/-1;background:rgba(34,197,94,0.07);border-color:rgba(34,197,94,0.15)"><div class="com-kpi-val" style="color:var(--green)">${fmt(totalKR7)}</div><div class="com-kpi-lbl">💼 Faturamento total KR7</div></div>`:''}
    ${isCorretor?`<div class="com-kpi" style="grid-column:1/-1;background:rgba(99,102,241,0.07);border-color:rgba(99,102,241,0.2)"><div class="com-kpi-val" style="color:var(--purple)">${fmt(totalCorretor)}</div><div class="com-kpi-lbl">💰 Minhas comissões no período</div></div>`:''}
    ${isCEODir?`<div class="com-kpi" style="grid-column:1/-1;background:rgba(168,85,247,0.06);border-color:rgba(168,85,247,0.18)"><div class="com-kpi-val" style="color:var(--purple)">${fmt(totalVGV)}</div><div class="com-kpi-lbl">🏗️ VGV do período</div></div>`:''}
  `;
  if(isCEODir)renderDistribuicao(lista,totalVGV,totalKR7,totalCorretor,totalImob,totalKevin,totalTanner);
  const tbody=document.getElementById('com-tbody');
  if(!tbody)return;
  if(!lista.length){tbody.innerHTML=`<tr><td colspan="${isCEODir?8:7}" style="text-align:center;padding:40px;color:var(--text-muted)">Nenhuma comissão encontrada</td></tr>`;return;}
  const si={pendente:'⏳',pago:'✅',parcial:'🔵'};
  tbody.innerHTML=lista.map(l=>{
    const st=l.status_comissao||'pendente';
    const cor=st==='pago'?'var(--green)':st==='parcial'?'var(--green)':'var(--orange)';
    const pctManual=l.pct_comissao_manual?`<span style="font-size:9px;color:var(--orange)" title="% manual">✏️</span>`:''
    const dataRef=l.data_assinatura||l.fechado_em||l.created_at;
    const dataLabel=l.data_assinatura
      ?`✍️ ${new Date(l.data_assinatura+'T00:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}`
      :`📅 ${new Date(dataRef).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}`;
    const excWarn=l._excede?`<span style="color:var(--red);font-size:9px" title="Distribuição excede faturamento KR7"> ⛔</span>`:'';
    const distCell=l._pctKR7
      ?`<span style="color:var(--green);font-size:11px">${fmt(l._vlKR7)}</span><span style="font-size:9px;color:var(--text-muted);margin-left:3px">(${l._pctKR7}%)</span>${excWarn}`
      :`<span style="color:var(--text-muted)">—</span>`;
    return`<tr>
      <td>
        <div style="font-weight:500;color:var(--text-primary);font-size:12px">${l.nome}</div>
        <div style="font-size:10px;color:var(--text-muted)">${l._ordemVenda}ª assinatura · ${dataLabel}</div>
      </td>
      ${!isCorretor?`<td style="font-size:11px">${(l.corretor||'—').split(' ')[0]}</td>`:''}
      <td style="font-size:11px;font-weight:500">${fmt(l._vgv)}</td>
      <td>
        <span class="com-pct">${l._pctCorretor}%${pctManual}</span>
        ${isCEODir?`<button onclick="editarPctComissao('${l.id}','${l._pctCorretor}')" style="background:none;border:none;cursor:pointer;color:var(--text-tertiary);font-size:10px;padding:0 3px" title="Alterar %">✏️</button>`:''}
      </td>
      <td style="font-weight:600;color:${cor};font-size:12px">${fmt(l._vlCorretor)}</td>
      ${isCEODir?`<td style="font-size:11px">${distCell}</td>`:''}
      <td><span class="com-st ${st}" ${isCEODir?`onclick="abrirModalComissao('${l.id}','${l.nome.replace(/'/g,'')}','${(l.corretor||'').replace(/'/g,'')}','${fmt(l._vlCorretor)}','${st}')"`:''} style="${isCorretor?'cursor:default':''}">${si[st]||'⏳'} ${st}</span></td>
      <td style="color:var(--text-tertiary);font-size:11px">${new Date(dataRef).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'2-digit'})}</td>
    </tr>`;
  }).join('');
}

function renderDistribuicao(lista,totalVGV,totalKR7,totalCorretor,totalImob,totalKevin,totalTanner){
  const panel=document.getElementById('com-distribuicao-panel');
  if(!panel)return;
  panel.style.display='block';
  const fmt=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const fp=v=>parseFloat(v.toFixed(2));
  const totalDist=totalImob+totalCorretor+totalKevin+totalTanner;
  const excede=lista.filter(l=>l._excede).length;
  const semKR7=lista.filter(l=>!l._pctKR7).length;
  let alertas='';
  if(excede)alertas+=`<div style="background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2);border-radius:6px;padding:7px 10px;font-size:11px;color:var(--red);margin-top:8px">⛔ ${excede} venda${excede>1?'s':''} com distribuição excedendo o faturamento KR7 — verifique os %.</div>`;
  if(semKR7)alertas+=`<div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.18);border-radius:6px;padding:7px 10px;font-size:11px;color:var(--orange);margin-top:6px">⚠️ ${semKR7} venda${semKR7>1?'s':''} sem % KR7 preenchida.</div>`;
  const res=document.getElementById('dist-resultados');
  if(!res)return;
  const base=Math.max(totalKR7,1);
  res.innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-top:10px;">
      <div style="background:rgba(168,85,247,0.07);border:1px solid rgba(168,85,247,0.18);border-radius:10px;padding:12px;">
        <div style="font-size:10px;color:var(--text-tertiary);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">🏢 Imobiliária</div>
        <div style="font-size:17px;font-weight:700;color:var(--purple);letter-spacing:-0.03em">${fmt(totalImob)}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${fp(totalVGV?totalImob/totalVGV*100:0)}% do VGV</div>
      </div>
      <div style="background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.18);border-radius:10px;padding:12px;">
        <div style="font-size:10px;color:var(--text-tertiary);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">👤 Kevin</div>
        <div style="font-size:17px;font-weight:700;color:var(--purple);letter-spacing:-0.03em">${fmt(totalKevin)}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${fp(totalVGV?totalKevin/totalVGV*100:0)}% do VGV</div>
      </div>
      <div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.18);border-radius:10px;padding:12px;">
        <div style="font-size:10px;color:var(--text-tertiary);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">👤 Tanner</div>
        <div style="font-size:17px;font-weight:700;color:var(--orange);letter-spacing:-0.03em">${fmt(totalTanner)}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${fp(totalVGV?totalTanner/totalVGV*100:0)}% do VGV</div>
      </div>
      <div style="background:rgba(34,197,94,0.07);border:1px solid rgba(34,197,94,0.18);border-radius:10px;padding:12px;">
        <div style="font-size:10px;color:var(--text-tertiary);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">🤝 Corretores</div>
        <div style="font-size:17px;font-weight:700;color:var(--green);letter-spacing:-0.03em">${fmt(totalCorretor)}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${fp(totalVGV?totalCorretor/totalVGV*100:0)}% do VGV</div>
      </div>
    </div>
    <div style="height:6px;border-radius:99px;background:rgba(255,255,255,0.06);overflow:hidden;display:flex;margin-top:10px;">
      <div style="width:${fp(totalImob/base*100)}%;background:var(--purple);transition:width .3s;"></div>
      <div style="width:${fp(totalKevin/base*100)}%;background:var(--purple);transition:width .3s;"></div>
      <div style="width:${fp(totalTanner/base*100)}%;background:var(--orange);transition:width .3s;"></div>
      <div style="width:${fp(totalCorretor/base*100)}%;background:var(--green);transition:width .3s;"></div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:6px;">
      <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-tertiary)"><span style="width:8px;height:8px;border-radius:50%;background:var(--purple);display:inline-block"></span>Imobiliária</span>
      <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-tertiary)"><span style="width:8px;height:8px;border-radius:50%;background:var(--purple);display:inline-block"></span>Kevin</span>
      <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-tertiary)"><span style="width:8px;height:8px;border-radius:50%;background:var(--orange);display:inline-block"></span>Tanner</span>
      <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-tertiary)"><span style="width:8px;height:8px;border-radius:50%;background:var(--green);display:inline-block"></span>Corretores</span>
    </div>
    <div style="border-top:1px solid rgba(255,255,255,0.05);margin-top:10px;padding-top:8px;font-size:11px;color:var(--text-muted);display:flex;flex-wrap:wrap;gap:12px;">
      <span>VGV: <strong style="color:var(--purple)">${fmt(totalVGV)}</strong></span>
      <span>Faturamento KR7: <strong style="color:var(--green)">${fmt(totalKR7)}</strong></span>
      <span>Total distribuído: <strong style="color:var(--text-primary)">${fmt(totalDist)}</strong></span>
      <span>Saldo: <strong style="color:${totalKR7-totalDist>=0?'var(--green)':'var(--red)'}">${fmt(totalKR7-totalDist)}</strong></span>
    </div>
    ${alertas}
  `;
}

function editarPctComissao(leadId,pctAtual){
  const nova=prompt(`Alterar % de comissão (atual: ${pctAtual}%)\nEx: 0.8 para parceria, 1.6 para bonificado:`,pctAtual);
  if(nova===null)return;
  const val=parseFloat(nova);
  if(isNaN(val)||val<0||val>100){showToast('% inválido!','error');return;}
  SB.upd('leads',{pct_comissao_manual:val},`id=eq.${leadId}`)
    .then(()=>{showToast(`% alterado para ${val}%`,'success');loadAll().then(renderComissoes);})
    .catch(e=>showToast('Erro: '+e.message,'error'));
}

function abrirModalComissao(leadId,nome,corretor,valor,status){
  document.getElementById('com-lead-id').value=leadId;
  document.getElementById('com-novo-status').value=status;
  document.getElementById('com-obs').value='';
  document.getElementById('com-modal-info').innerHTML=`<strong style="color:var(--text-primary)">${nome}</strong><br>Corretor: ${corretor.split(' ')[0]} · Comissão: <strong style="color:var(--green)">${valor}</strong>`;
  openModal('comissao');
}

async function salvarComissao(){
  const leadId=document.getElementById('com-lead-id').value;
  const status=document.getElementById('com-novo-status').value;
  const obs=document.getElementById('com-obs').value;
  const nomeLead=document.getElementById('com-lead-nome')?.textContent||leadId;
  try{
    await SB.upd('leads',{status_comissao:status,obs_comissao:obs||null},`id=eq.${leadId}`);
    closeModal('comissao');showToast('Comissão atualizada!','success');
    // ── COMMAND EVENT ──────────────────────────
    CommandEventService.record({
      modulo    : CommandEventModule.FINANCEIRO,
      tipo      : CommandEventType.COMMAND_ACTION,
      origem    : CommandEventOrigin.USER,
      lead      : nomeLead,
      descricao : `Comissão atualizada: ${nomeLead}`,
      detalhes  : `Novo status: ${status}${obs?' · '+obs:''}`,
    });
    // ──────────────────────────────────────────
    await loadAll();
  }catch(e){showToast('Erro: '+e.message,'error');}
}

