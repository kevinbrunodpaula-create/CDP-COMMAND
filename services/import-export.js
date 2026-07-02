function abrirImportar(){
  importDados=[];
  const fi=document.getElementById('imp-file');if(fi)fi.value='';
  const su=document.getElementById('imp-sheets-url');if(su)su.value='';
  const pv=document.getElementById('imp-preview');if(pv)pv.style.display='none';
  const bi=document.getElementById('btn-importar');if(bi)bi.disabled=true;
  openModal('importar');
}








/* ── DISTRIBUIR LEADS DA LANDING (origem Google, sem corretor) ── */



function normHeader(h){
  return(h||'').toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]/g,'');
}

function parseCSV(text){
  const lines=text.trim().split('\n');
  if(lines.length<2)return[];
  const sep=lines[0].includes(';')?';':',';
  const headers=lines[0].split(sep).map(h=>h.replace(/"/g,'').trim());
  return lines.slice(1).filter(l=>l.trim()).map(line=>{
    const vals=line.split(sep).map(v=>v.replace(/"/g,'').trim());
    const obj={};
    headers.forEach((h,i)=>obj[normHeader(h)]=vals[i]||'');
    return obj;
  });
}

function mapearLead(row){
  const get=(...keys)=>{for(const k of keys){const nk=normHeader(k);for(const rk of Object.keys(row)){if(normHeader(rk)===nk&&row[rk])return row[rk];}}return'';};
  const tel=get('telefone','fone','celular','whatsapp','phone','tel').replace(/'+/g,'').trim();
  const rendaRaw=get('renda','rendafamiliar','renda familiar','rendamensal','renda mensal','income','salario','salário');
  if(!rendaRaw&&Object.keys(row).length)console.log('[CDP] row keys:',Object.keys(row),'| row sample:',JSON.stringify(row).slice(0,200));
  const renda=rendaRaw.replace(/R\$\s*/i,'').replace(/\./g,'').replace(',','.').trim();
  return{
    nome:get('nome','name','cliente','contato'),
    email:get('email','e-mail','mail'),
    cpf:get('cpf','documento','doc'),
    renda_familiar:renda||null,
    telefone:tel||null,
  };
}

async function previewImport(input){
  const file=input.files[0];if(!file)return;
  let rows=[];
  if(file.name.endsWith('.csv')){
    const text=await file.text();
    rows=parseCSV(text);
  } else if(file.name.endsWith('.xlsx')||file.name.endsWith('.xls')){
    // usa SheetJS via CDN
    try{
      const XLSX=await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs');
      const buf=await file.arrayBuffer();
      const wb=XLSX.read(buf);
      const ws=wb.Sheets[wb.SheetNames[0]];
      rows=XLSX.utils.sheet_to_json(ws,{defval:''});
    }catch(e){
      showToast('Instale o SheetJS ou use CSV','error');return;
    }
  }
  if(!rows.length){showToast('Arquivo vazio ou formato inválido','error');return;}
  importDados=rows.map(mapearLead).filter(r=>r.nome);
  mostrarPreview();
}

async function buscarSheets(){
  const url=document.getElementById('imp-sheets-url').value.trim();
  if(!url){showToast('Cole o link da planilha!','error');return;}
  // Extrai ID da planilha
  const match=url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if(!match){showToast('Link inválido!','error');return;}
  const id=match[1];
  const csvUrl=`https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
  try{
    showToast('Buscando planilha...','success');
    const resp=await fetch(csvUrl);
    if(!resp.ok)throw new Error('Planilha não acessível — verifique o compartilhamento');
    const text=await resp.text();
    const rows=parseCSV(text);
    importDados=rows.map(mapearLead).filter(r=>r.nome);
    mostrarPreview();
  }catch(e){showToast('Erro: '+e.message,'error');}
}

// Adicionar evento no campo URL do Sheets
setTimeout(()=>{
  const el=document.getElementById('imp-sheets-url');
  if(el)el.addEventListener('change',buscarSheets);
},2000);

function mostrarPreview(){
  if(!importDados.length)return;
  const prev=document.getElementById('imp-preview');
  const table=document.getElementById('imp-preview-table');
  const stats=document.getElementById('imp-stats');
  const sample=importDados.slice(0,5);
  table.innerHTML=`<table style="width:100%;border-collapse:collapse;font-size:10px">
    <tr style="background:rgba(255,255,255,0.04)">${['Nome','Telefone','CPF','Renda'].map(h=>`<th style="padding:6px 8px;text-align:left;color:var(--text-tertiary)">${h}</th>`).join('')}</tr>
    ${sample.map(r=>`<tr style="border-top:1px solid rgba(255,255,255,0.04)">${[r.nome,r.telefone,r.cpf,r.renda_familiar].map(v=>`<td style="padding:6px 8px;color:var(--text-secondary);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${v||'—'}</td>`).join('')}</tr>`).join('')}
  </table>`;
  const dupls=importDados.filter(r=>r.telefone&&allLeads.some(l=>l.telefone&&l.telefone.replace(/\D/g,'')===r.telefone.replace(/\D/g,''))).length;
  stats.innerHTML=`<span style="color:var(--green)">✅ ${importDados.length} leads encontrados</span>${dupls>0?`<span style="color:var(--orange);margin-left:10px">⚠ ${dupls} possíveis duplicados</span>`:''}${importDados.length>5?`<span style="color:var(--text-tertiary);margin-left:10px">+${importDados.length-5} não exibidos</span>`:''}`;
  prev.style.display='block';
  document.getElementById('btn-importar').disabled=false;
}

async function executarImport(){
  const corretoresSel=[...document.querySelectorAll('#imp-corretores-list input:checked')].map(c=>c.value);
  if(!corretoresSel.length){showToast('Selecione ao menos 1 corretor!','error');return;}
  if(!importDados.length){showToast('Nenhum dado para importar!','error');return;}
  const btn=document.getElementById('btn-importar');
  btn.innerHTML='<span class="spin"></span>';btn.disabled=true;
  let ok=0,skip=0,idx=roundRobinIdx;
  const agora=new Date().toISOString();
  for(const row of importDados){
    // verifica duplicidade por email
    const dupl=allLeads.find(l=>l.email&&row.email&&l.email.toLowerCase()===row.email.toLowerCase());
    if(dupl){skip++;continue;}
    const corretor=corretoresSel[idx%corretoresSel.length];
    idx++;
    try{
      await SB.ins('leads',[{
        nome:row.nome,
        email:row.email||null,
        cpf:row.cpf||null,
        renda_familiar:row.renda_familiar||null,
        telefone:row.telefone||null,
        corretor,
        status:'Lead Novo',
        interesse:'cold',
        origem:'Lista',
        created_at:agora,
      }]);
      ok++;
    }catch(e){skip++;}
  }
  roundRobinIdx=idx;
  localStorage.setItem('cdp_rr_idx',String(idx));
  closeModal('importar');
  showToast(`✅ ${ok} leads importados${skip>0?` · ${skip} ignorados`:''}!`,'success');
  // ── COMMAND EVENT ──────────────────────────
  if(ok>0){
    CommandEventService.record({
      modulo    : CommandEventModule.IMPORT,
      tipo      : CommandEventType.LEAD_IMPORTED,
      origem    : CommandEventOrigin.IMPORT,
      descricao : `${ok} lead${ok>1?'s':''} importado${ok>1?'s':''} via CSV/Sheets`,
      detalhes  : `Corretores: ${corretoresSel.join(', ')}${skip>0?' · '+skip+' ignorados':''}`,
      metadata  : { importados: ok, ignorados: skip, corretores: corretoresSel },
    });
  }
  // ──────────────────────────────────────────
  await loadAll();
  btn.innerHTML='📥 Importar leads';btn.disabled=false;
}
function exportarCSV(tipo='leads'){
  const fmt=v=>v?`"${String(v).replace(/"/g,'""')}"`:''
  let rows,headers;
  if(tipo==='leads'){
    headers=['Nome','Telefone','Email','Status','Interesse','Tipo','Valor','Bairro','Origem','Corretor','Renda','Quartos','Programa','Cadastrado'];
    rows=allLeads.map(l=>[l.nome,l.telefone,l.email,l.status,l.interesse==='hot'?'Quente':l.interesse==='warm'?'Morno':'Frio',l.tipo_imovel,l.valor,l.bairro,l.origem,l.corretor,l.renda_familiar,l.quartos_desejados,l.programa_interesse,l.created_at?new Date(l.created_at).toLocaleDateString('pt-BR'):''].map(fmt).join(','));
  } else if(tipo==='comissoes'){
    const lista=getVendasComComissao();
    headers=['Lead','Corretor','Valor Venda','% Comissão','Valor Comissão','% Faturamento','Faturamento','Status Pagamento','Data'];
    rows=lista.map(l=>{
      const pv=v=>{const s=String(v||'').replace(/[^\d,.]/g,'');const n=parseFloat(s.replace(/\./g,'').replace(',','.'));return isNaN(n)?0:n;};
      return[l.nome,l.corretor,l.valor,l._pctComissao+'%',l._valorComissao.toFixed(2),l.pct_faturamento?(l.pct_faturamento+'%'):'',l._faturamento?l._faturamento.toFixed(2):'',l.status_comissao||'pendente',new Date(l.fechado_em||l.created_at).toLocaleDateString('pt-BR')].map(fmt).join(',');
    });
  }
  const csv=[headers.map(fmt).join(','),...rows].join('\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=`CDP_${tipo}_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`${tipo==='leads'?'Leads':'Comissões'} exportado!`,'success');
}
