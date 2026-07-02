function renderCalendar(){
  const grid=document.getElementById('cal-grid'),title=document.getElementById('cal-title');if(!grid)return;
  const months=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  title.textContent=`${months[calDate.getMonth()]} ${calDate.getFullYear()}`;
  const first=new Date(calDate.getFullYear(),calDate.getMonth(),1).getDay(),dim=new Date(calDate.getFullYear(),calDate.getMonth()+1,0).getDate(),prev=new Date(calDate.getFullYear(),calDate.getMonth(),0).getDate();
  grid.innerHTML='';const today=new Date();
  for(let i=0;i<first;i++){const d=document.createElement('div');d.className='cal-day oth';d.textContent=prev-first+1+i;grid.appendChild(d);}
  for(let d=1;d<=dim;d++){const el=document.createElement('div');el.className='cal-day';if(d===today.getDate()&&calDate.getMonth()===today.getMonth()&&calDate.getFullYear()===today.getFullYear())el.classList.add('today');el.textContent=d;grid.appendChild(el);}
}
function prevMonth(){calDate.setMonth(calDate.getMonth()-1);renderCalendar();}
function nextMonth(){calDate.setMonth(calDate.getMonth()+1);renderCalendar();}
function renderEvents(){
  const el=document.getElementById('events-list');if(!el)return;
  const visitas=allLeads.filter(l=>l.status==='Visita Marcada').slice(0,8);
  if(!visitas.length){el.innerHTML='<div style="text-align:center;color:var(--text-muted);font-size:12px;padding:20px">Nenhuma visita marcada</div>';return;}
  // ordena por data da visita
  visitas.sort((a,b)=>{
    const da=a.visita_data||'9999';const db=b.visita_data||'9999';
    return da.localeCompare(db);
  });
  el.innerHTML=visitas.map(l=>{
    const dataFmt=l.visita_data?new Date(l.visita_data+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}):'—';
    const hora=l.visita_hora?l.visita_hora.slice(0,5):'—';
    return`<div class="evi" style="cursor:pointer" onclick="showDetail('${l.id}')">
      <div style="min-width:48px;text-align:center">
        <div style="font-size:13px;font-weight:600;color:var(--green)">${dataFmt}</div>
        <div style="font-size:10px;color:var(--text-tertiary)">${hora}</div>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:500;color:var(--text-primary)">${l.nome}</div>
        <div style="font-size:11px;color:var(--text-tertiary);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l.visita_local||l.bairro||'—'} · ${l.corretor||'—'}</div>
      </div>
    </div>`;
  }).join('');
}

/* ── NOVO ACESSO ── */
