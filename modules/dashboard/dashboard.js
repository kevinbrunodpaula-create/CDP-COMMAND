function updateDashboard(){
  // Saudação
  const nomeEl=document.getElementById('db-greeting-nome');
  if(nomeEl&&currentUser)nomeEl.textContent=currentUser.nome.split(' ')[0];
  const dateEl=document.getElementById('db-greeting-date');
  if(dateEl){
    const now=new Date();
    const dias=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const meses=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    dateEl.textContent=`${dias[now.getDay()]} · ${now.getDate()} ${meses[now.getMonth()]} · ${now.getFullYear()}`;
  }
  const hoje=new Date().toDateString();
  const total=allLeads.length;
  const fechados=allLeads.filter(l=>l.status==='Fechado').length;
  const quentes=allLeads.filter(l=>l.interesse==='hot').length;
  const propostas=allLeads.filter(l=>l.status==='Proposta').length;
  const leadsHoje=allLeads.filter(l=>new Date(l.created_at).toDateString()===hoje).length;
  const conv=total>0?((fechados/total)*100).toFixed(1):'0.0';
  const parados=allLeads.filter(l=>{
    if(l.status==='Fechado'||l.status==='Perdido')return false;
    const ref=l.ultimo_contato||l.updated_at||l.created_at;
    return Math.floor((Date.now()-new Date(ref))/(864e5))>=7;
  }).length;
  const cc={};
  const parseValor=v=>{if(!v)return 0;const s=String(v).replace(/[^\d,.]/g,'');const n=parseFloat(s.replace(/\./g,'').replace(',','.'));return isNaN(n)?0:n;};
  const fmtBRL=v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const inicioMesR=new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString();
  const fimMesR=new Date(new Date().getFullYear(),new Date().getMonth()+1,0,23,59,59).toISOString();
  allLeadsRanking.filter(l=>l.corretor).forEach(l=>{
    const dv=l.fechado_em||l.created_at;
    if(dv>=inicioMesR&&dv<=fimMesR)cc[l.corretor]=(cc[l.corretor]||0)+parseValor(l.valor);
  });

  // KPIs — preenche cada card individualmente
  const kpis=[
    {id:'kpi-leads',  bg:'rgba(34,197,94,0.12)',stroke:'#22C55E',path:`<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>`,val:total,    lbl:'Total de leads',  delta:leadsHoje>0?`+${leadsHoje} hoje`:'—',            tag:leadsHoje>0?'up':'neu'},
    {id:'kpi-conv',   bg:'rgba(34,197,94,0.12)', stroke:'#22C55E',path:`<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>`,          val:conv+'%', lbl:'Taxa de conversão',delta:parseFloat(conv)>=15?'Meta atingida':'Abaixo da meta',tag:parseFloat(conv)>=15?'up':'down'},
    {id:'kpi-vendas', bg:'rgba(34,197,94,0.12)', stroke:'#22C55E',path:`<rect x="2" y="7" width="20" height="5"/><polyline points="20 12 20 22 4 22 4 12"/>`,            val:fechados, lbl:'Vendas fechadas',  delta:`${propostas} em proposta`,                    tag:'neu'},
    {id:'kpi-quentes',bg:'rgba(245,158,11,0.12)',stroke:'#FCD34D',path:`<path d="M12 2c0 6-6 8-6 13a6 6 0 0012 0c0-5-6-7-6-13z"/>`,                                     val:quentes,  lbl:'Leads quentes',   delta:quentes>0?'Prioridade':'—',                    tag:quentes>0?'up':'neu'},
    {id:'kpi-parados',bg:'rgba(239,68,68,0.12)', stroke:'#FCA5A5',path:`<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,val:parados,lbl:'Leads parados',delta:parados>0?'+7 dias':'Tudo em dia',tag:parados>0?'down':'up'},
  ];
  kpis.forEach(k=>{
    const el=document.getElementById(k.id);
    if(el)el.innerHTML=`
      <div class="db-kpi-icon" style="background:${k.bg}">
        <svg viewBox="0 0 24 24" fill="none" stroke="${k.stroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${k.path}</svg>
      </div>
      <div class="db-kpi-val">${k.val}</div>
      <div class="db-kpi-lbl">${k.lbl}</div>
      <span class="db-kpi-tag db-tag-${k.tag}">${k.delta}</span>`;
  });

  // Ranking
  const sorted=Object.entries(cc).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const posC=['#F59E0B','#9CA3AF','#D97706','#6B7280','#6B7280'];
  const medals=['🥇','🥈','🥉'];
  const rk=document.getElementById('dash-ranking');
  if(rk)rk.innerHTML=sorted.length>0
    ?sorted.map(([n,v],i)=>`<div class="db-rank-item"><span class="db-rank-pos" style="color:${posC[i]};display:flex;align-items:center;gap:3px;width:auto">${i<3?`<span style="font-size:13px;line-height:1">${medals[i]}</span>`:''}${i>=3?`<span style="color:${posC[i]}">${i+1}</span>`:''}</span><div class="db-rank-av">${n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div><span class="db-rank-nome">${n.split(' ')[0]}</span><span class="db-rank-val">${v>0?fmtBRL(v):'Sem valor'}</span></div>`).join('')
    :'<div style="color:var(--text-muted);font-size:12px;padding:20px 0;text-align:center">Nenhuma venda registrada</div>';

  // Funil visual melhorado
  const fC=['#22C55E','#3B82F6','#16A34A','#F59E0B','#F59E0B','#9CA3AF','#14B8A6','#22C55E','#EF4444'];
  const mx=Math.max(...COLS.map(c=>allLeads.filter(l=>l.status===c).length),1);
  const fu=document.getElementById('dash-pipeline');
  if(fu)fu.innerHTML=COLS.map((c,i)=>{
    const n=allLeads.filter(l=>l.status===c).length;
    const pct=Math.round((n/mx)*100);
    const showTxt=pct>15;
    return`<div class="db-funil-item">
      <div class="db-funil-lbl">${c.split(' ')[0]}</div>
      <div class="db-funil-bar-bg">
        <div class="db-funil-bar" style="width:${pct}%;background:linear-gradient(90deg,${fC[i]},${fC[i]}99)">${showTxt?n:''}</div>
      </div>
      <div class="db-funil-n" style="color:${n>0?fC[i]:'#6B7280'}">${n}</div>
    </div>`;
  }).join('');

  // Central Inteligente
  const ci=document.getElementById('dash-ci');
  if(ci){
    const ativos=allLeads.filter(l=>l.status!=='Fechado'&&l.status!=='Perdido');
    const topLeads=[...ativos].sort((a,b)=>calcLeadScore(b)-calcLeadScore(a)).slice(0,3);
    const topHtml=topLeads.map(l=>{
      const score=calcLeadScore(l);
      const{cls,label}=getScoreInfo(score);
      const sug=getSugestaoAcao(l);
      return`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer" onclick="showDetail('${l.id}')">
        <div style="width:36px;height:36px;border-radius:10px;background:rgba(34,197,94,0.1);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">${sug.icon}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:500;color:var(--text-primary);margin-bottom:2px">${l.nome}</div>
          <div style="font-size:10px;color:var(--text-tertiary)">${sug.txt.replace(/<[^>]*>/g,'')}</div>
        </div>
        <span class="k-score ${cls}" style="flex-shrink:0">${label}</span>
      </div>`;
    }).join('');
    ci.innerHTML=`<div class="db-ci-list">
      <div class="db-ci-item db-ci-green"><div class="db-ci-dot" style="background:#22C55E"></div><div><div class="db-ci-label">Oportunidade</div><div class="db-ci-txt">${quentes} lead${quentes!==1?'s':''} quente${quentes!==1?'s':''} aguardando follow-up.</div></div></div>
      <div class="db-ci-item db-ci-red"><div class="db-ci-dot" style="background:#EF4444"></div><div><div class="db-ci-label">Atenção</div><div class="db-ci-txt">${parados>0?`${parados} lead${parados!==1?'s':''} sem contato há +7 dias.`:'Nenhum lead parado.'}</div></div></div>
      <div class="db-ci-item db-ci-blue"><div class="db-ci-dot" style="background:#16A34A"></div><div><div class="db-ci-label">IA sugere</div><div class="db-ci-txt">Conversão em ${conv}%. ${parseFloat(conv)<15?'Qualifique os leads antes de avançar.':'Performance acima da média.'}</div></div></div>
    </div>
    ${topLeads.length?`<div style="margin-top:12px"><div style="font-size:10px;font-weight:500;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">🎯 Top prioridades agora</div>${topHtml}</div>`:''}`;
  }

  renderMetaMensal(parseValor,fmtBRL);
}

/* ── META MENSAL ── */
function renderMetaMensal(parseValor,fmtBRL){
  const wrap=document.getElementById('meta-mensal-wrap');
  if(!wrap)return;

  const mesAtual=new Date();
  const mes=mesAtual.toLocaleString('pt-BR',{month:'long',year:'numeric'});
  const inicioMes=new Date(mesAtual.getFullYear(),mesAtual.getMonth(),1).toISOString();
  const fimMes=new Date(mesAtual.getFullYear(),mesAtual.getMonth()+1,0,23,59,59).toISOString();

  const pv=v=>{if(!v)return 0;const s=String(v).replace(/[^\d,.]/g,'');const n=parseFloat(s.replace(/\./g,'').replace(',','.'));return isNaN(n)?0:n;};
  const fmt=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const normNome=n=>n?.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

  // filtra apenas vendas fechadas NO MÊS ATUAL
  const vendasMes={};
  allLeadsRanking.filter(l=>l.corretor).forEach(l=>{
    const dataVenda=l.fechado_em||l.created_at;
    if(dataVenda>=inicioMes&&dataVenda<=fimMes){
      vendasMes[normNome(l.corretor)]=(vendasMes[normNome(l.corretor)]||0)+pv(l.valor);
    }
  });

  const comMeta=allCorretores.filter(c=>c.meta&&parseFloat(c.meta)>0);
  const minhaMeta=allCorretores.find(c=>normNome(c.nome)===normNome(currentUser.nome));
  let minhaBarra='';

  if(minhaMeta&&parseFloat(minhaMeta.meta)>0){
    const metaVal=parseFloat(minhaMeta.meta);
    const atual=vendasMes[normNome(currentUser.nome)]||0;
    const pct=Math.min(Math.round((atual/metaVal)*100),100);
    const cor=pct>=100?'#22C55E':pct>=60?'#F59E0B':'#EF4444';
    const diasMes=new Date(mesAtual.getFullYear(),mesAtual.getMonth()+1,0).getDate();
    const diaAtual=mesAtual.getDate();
    const progEsperado=Math.round((diaAtual/diasMes)*100);
    const statusTxt=pct>=100?'🎉 Meta batida!':pct>=progEsperado?'✅ No ritmo certo':'⚡ Precisa acelerar';
    minhaBarra=`<div class="meta-minha">
      <div class="meta-minha-top">
        <div><div class="meta-minha-label">Minha meta — ${mes}</div><div class="meta-minha-sub">${statusTxt}</div></div>
        <div style="text-align:right"><div class="meta-minha-pct" style="color:${cor}">${pct}%</div><div class="meta-minha-sub">${fmt(atual)} / ${fmt(metaVal)}</div></div>
      </div>
      <div class="meta-big-bar"><div class="meta-big-fill" style="width:${pct}%;background:linear-gradient(90deg,${cor},${cor}aa)"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted)">
        <span>Dia ${diaAtual}/${diasMes}</span>
        <span>Falta ${fmt(Math.max(metaVal-atual,0))}</span>
      </div>
    </div>`;
  }

  let equipeBarra='';
  if(perm('verTodos')&&comMeta.length>0){
    const rows=comMeta.map(c=>{
      const metaVal=parseFloat(c.meta);
      const atual=vendasMes[normNome(c.nome)]||0;
      const pct=Math.min(Math.round((atual/metaVal)*100),100);
      const cor=pct>=100?'#22C55E':pct>=60?'#F59E0B':'#EF4444';
      const cls=pct>=100?'ok':pct>=60?'warn':'danger';
      const initials=c.nome.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const bgAv=pct>=100?'rgba(34,197,94,0.3)':pct>=60?'rgba(245,158,11,0.3)':'rgba(239,68,68,0.3)';
      return`<div class="meta-row">
        <div class="meta-av" style="background:${bgAv}">${initials}</div>
        <div class="meta-info">
          <div class="meta-nome">${c.nome.split(' ')[0]}</div>
          <div class="meta-bar-wrap"><div class="meta-bar" style="width:${pct}%;background:${cor}"></div></div>
          <div class="meta-nums">
            <span class="meta-atual">${fmt(atual)}</span>
            <span class="meta-pct ${cls}">${pct}%</span>
          </div>
        </div>
      </div>`;
    }).join('');
    equipeBarra=`<div class="meta-card">
      <div class="meta-hd">
        <div class="meta-title">Metas da equipe</div>
        <div class="meta-mes">${mes}</div>
      </div>
      ${rows}
    </div>`;
  }

  if(minhaBarra||equipeBarra)wrap.innerHTML=minhaBarra+equipeBarra;
}

/* ── CHARTS ── */
function initCharts(leads){
  Chart.defaults.font.family="'DM Sans',system-ui,sans-serif";
  const gc='rgba(255,255,255,0.04)',tc='#6B7280';
  const cM=document.getElementById('ch-pipeline');
  if(cM){if(chartP)chartP.destroy();chartP=new Chart(cM,{type:'bar',data:{labels:COLS.map(c=>c.split(' ')[0]),datasets:[{data:COLS.map(c=>leads.filter(l=>l.status===c).length),backgroundColor:'rgba(34,197,94,0.15)',borderColor:'rgba(34,197,94,0.5)',borderWidth:1,borderRadius:3}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{grid:{color:gc},ticks:{color:tc,font:{size:10}}},y:{grid:{color:gc},ticks:{color:tc,font:{size:10}}}}}});}
  const ori={};leads.forEach(l=>{if(l.origem)ori[l.origem]=(ori[l.origem]||0)+1;});
  const cO=document.getElementById('ch-origem');
  if(cO){if(chartO)chartO.destroy();chartO=new Chart(cO,{type:'doughnut',data:{labels:Object.keys(ori),datasets:[{data:Object.values(ori),backgroundColor:['rgba(34,197,94,.7)','rgba(14,165,233,.7)','rgba(239,68,68,.7)','rgba(245,158,11,.7)','rgba(22,163,74,.7)','rgba(52,211,153,.6)'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#9CA3AF',font:{size:10}},position:'bottom'}},cutout:'60%'}});}
}
function initRelCharts(){
  Chart.defaults.font.family="'DM Sans',system-ui,sans-serif";
  const gc='rgba(255,255,255,0.04)',tc='#6B7280';
  const ori={},st={},ints={},co={};
  allLeads.forEach(l=>{if(l.origem)ori[l.origem]=(ori[l.origem]||0)+1;if(l.status)st[l.status]=(st[l.status]||0)+1;if(l.interesse)ints[l.interesse]=(ints[l.interesse]||0)+1;if(l.corretor)co[l.corretor]=(co[l.corretor]||0)+1;});
  const mk=(id,type,labels,data,colors)=>{const el=document.getElementById(id);if(el&&!el._c){el._c=true;new Chart(el,{type,data:{labels,datasets:[{data,backgroundColor:colors||'rgba(34,197,94,0.15)',borderColor:colors?undefined:'rgba(34,197,94,0.4)',borderWidth:1,borderRadius:type!=='doughnut'?3:undefined}]},options:{responsive:true,plugins:{legend:{display:type==='doughnut',labels:{color:'#9CA3AF',font:{size:10}},position:'bottom'}},cutout:type==='doughnut'?'55%':undefined,scales:type!=='doughnut'?{x:{grid:{color:gc},ticks:{color:tc,font:{size:10}}},y:{grid:{color:gc},ticks:{color:tc}}}:undefined}});}};
  mk('ch-r-origem','bar',Object.keys(ori),Object.values(ori));mk('ch-r-status','bar',Object.keys(st),Object.values(st));mk('ch-r-int','doughnut',['Quente','Morno','Frio'],[ints.hot||0,ints.warm||0,ints.cold||0],['rgba(239,68,68,.6)','rgba(245,158,11,.6)','rgba(14,165,233,.6)']);mk('ch-r-corr','bar',Object.keys(co),Object.values(co));
}

function getPerfilBadge(l){
  if(l.status==='Fechado'||l.status==='Perdido'||l.status==='Follow-Up')return'';
  const falta=[];
  if(!l.valor)falta.push('valor');
  if(!l.bairro)falta.push('bairro');
  if(!l.quartos_desejados)falta.push('quartos');
  if(!l.renda_familiar)falta.push('renda');
  if(!falta.length)return'<div style="display:inline-flex;align-items:center;gap:4px;padding:2px 7px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.15);border-radius:6px;font-size:9px;color:#22C55E;margin-bottom:4px">\u2713 Perfil completo</div>';
  return'<div style="display:inline-flex;align-items:center;gap:4px;padding:2px 7px;background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.15);border-radius:6px;font-size:9px;color:#FCD34D;margin-bottom:4px;cursor:pointer" onclick="editLead(\''+l.id+'\')" title="Clique para completar">\u26a0 Falta: '+falta.join(', ')+'</div>';
}

