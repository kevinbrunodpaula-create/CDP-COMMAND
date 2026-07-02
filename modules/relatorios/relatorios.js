function renderRelatorio(leads){
  const tbody=document.getElementById('rel-tbody');if(!tbody)return;
  tbody.innerHTML=leads.map(l=>`<tr><td><strong style="font-weight:500">${l.nome}</strong></td><td style="color:var(--text-tertiary)">${l.telefone||'—'}</td><td style="color:var(--text-tertiary)">${l.tipo_imovel||'—'}</td><td style="color:var(--green)">${l.valor||'—'}</td><td style="color:var(--text-tertiary)">${l.origem||'—'}</td><td style="color:var(--text-tertiary)">${l.corretor||'—'}</td><td><span style="font-size:10px;padding:3px 8px;border-radius:6px;background:var(--bg-input);border:1px solid rgba(255,255,255,0.05);color:var(--text-tertiary)">${l.status}</span></td><td><span class="tag ${INT_C[l.interesse]||'tc'}">${INT_L[l.interesse]||'—'}</span></td></tr>`).join('');
}

/* ── AGENDA ── */
let calDate=new Date();
