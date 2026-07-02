/* ══════════════════════════════════════════════════════
   FILA IA — Fase 3 CDP Assistant
   Aprovação de conteúdo gerado via WhatsApp pelo corretor
══════════════════════════════════════════════════════ */

// ── Config ──────────────────────────────────────────
const RAILWAY_URL = 'https://SEU-SERVIDOR-RAILWAY.railway.app'; // ← Substitua após deploy
const SB_URL_IA   = typeof SURL !== "undefined" ? SURL : "";  // reutiliza variável global do CDP
const SB_KEY_IA   = typeof SKEY !== "undefined" ? SKEY : "";

let fiaFiltroAtual = 'aguardando_aprovacao';
let fiaItens = [];

// ── Filtro de abas ───────────────────────────────────
function fiaSetFiltro(status, btn) {
  fiaFiltroAtual = status;
  document.querySelectorAll('.fia-tab-btn').forEach(b => {
    b.style.background = 'transparent';
    b.style.color = '#64748B';
  });
  if (btn) {
    btn.style.background = 'rgba(34,197,94,0.12)';
    btn.style.color = '#86EFAC';
  }
  renderFilaIA();
}

// ── Carregar do Supabase ─────────────────────────────
async function carregarFilaIA() {
  document.getElementById('fia-loading').style.display = 'block';
  document.getElementById('fia-empty').style.display = 'none';
  document.getElementById('fia-grid').style.display = 'none';

  try {
    const res = await fetch(
      `${SB_URL_IA}/rest/v1/cdp_assistant_fila?select=*,leads(nome,status)&order=criado_em.desc`,
      { headers: { apikey: SB_KEY_IA, Authorization: `Bearer ${SB_KEY_IA}` } }
    );
    fiaItens = await res.json();
    if (!Array.isArray(fiaItens)) fiaItens = [];

    // Atualiza KPIs
    const hoje = new Date().toISOString().slice(0, 10);
    const pend  = fiaItens.filter(i => i.status === 'aguardando_aprovacao').length;
    const aprov = fiaItens.filter(i => i.status === 'aprovado' && i.aprovado_em?.startsWith(hoje)).length;
    const rej   = fiaItens.filter(i => i.status === 'rejeitado' && i.aprovado_em?.startsWith(hoje)).length;
    document.getElementById('fia-k-pend').textContent  = pend;
    document.getElementById('fia-k-aprov').textContent = aprov;
    document.getElementById('fia-k-rej').textContent   = rej;

    // Badge na sidebar
    const badge = document.getElementById('badge-fila-ia');
    if (badge) { badge.textContent = pend; badge.style.display = pend > 0 ? '' : 'none'; }
    document.getElementById('fia-count-pend').textContent = pend > 0 ? `(${pend})` : '';

    renderFilaIA();
  } catch (e) {
    showToast('Erro ao carregar fila IA: ' + e.message, 'error');
  } finally {
    document.getElementById('fia-loading').style.display = 'none';
  }
}

// ── Renderizar cards ─────────────────────────────────
function renderFilaIA() {
  const grid   = document.getElementById('fia-grid');
  const empty  = document.getElementById('fia-empty');
  const itens  = fiaItens.filter(i => i.status === fiaFiltroAtual);

  if (!itens.length) {
    grid.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  grid.style.display  = 'flex';

  grid.innerHTML = itens.map(item => {
    const isPost    = item.tipo === 'post';
    const isPend    = item.status === 'aguardando_aprovacao';
    const leadNome  = item.leads?.nome || null;
    const dataCriacao = new Date(item.criado_em).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });

    // Monta preview do conteúdo
    let preview = '';
    if (isPost) {
      try {
        const p = JSON.parse(item.rascunho);
        if (p.instagram) preview += `<div style="margin-bottom:10px;"><div style="font-size:10px;color:#A78BFA;font-weight:500;margin-bottom:4px;">📷 INSTAGRAM</div><div style="font-size:12px;color:#A7C4AE;line-height:1.7;white-space:pre-wrap;word-break:break-word;">${p.instagram.slice(0, 220)}${p.instagram.length > 220 ? '...' : ''}</div></div>`;
        if (p.whatsapp)  preview += `<div><div style="font-size:10px;color:#86EFAC;font-weight:500;margin-bottom:4px;">💬 WHATSAPP</div><div style="font-size:12px;color:#A7C4AE;line-height:1.7;white-space:pre-wrap;word-break:break-word;">${p.whatsapp.slice(0, 180)}${p.whatsapp.length > 180 ? '...' : ''}</div></div>`;
      } catch { preview = `<div style="font-size:12px;color:#A7C4AE;white-space:pre-wrap;">${item.rascunho.slice(0, 300)}</div>`; }
    } else {
      preview = `<div style="font-size:12.5px;color:#A7C4AE;line-height:1.8;white-space:pre-wrap;word-break:break-word;">${item.rascunho.slice(0, 300)}${item.rascunho.length > 300 ? '...' : ''}</div>`;
    }

    const statusBadge = {
      aguardando_aprovacao: `<span style="padding:2px 8px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.25);border-radius:20px;font-size:10px;color:#FCD34D;">⏳ Aguardando</span>`,
      aprovado:  `<span style="padding:2px 8px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:20px;font-size:10px;color:#86EFAC;">✅ Aprovado</span>`,
      rejeitado: `<span style="padding:2px 8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:20px;font-size:10px;color:#FCA5A5;">❌ Rejeitado</span>`,
    }[item.status] || '';

    return `
    <div style="background:var(--bg-card);border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;transition:border-color .2s;" onmouseover="this.style.borderColor='rgba(34,197,94,0.18)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.06)'">
      <!-- Header do card -->
      <div style="padding:14px 16px 10px;border-bottom:1px solid rgba(255,255,255,0.04);display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
        <div style="display:flex;align-items:center;gap:10px;min-width:0;">
          <div style="width:34px;height:34px;border-radius:10px;background:${isPost ? 'rgba(167,139,250,0.1)' : 'rgba(34,197,94,0.08)'};border:1px solid ${isPost ? 'rgba(167,139,250,0.2)' : 'rgba(34,197,94,0.15)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:15px;">${isPost ? '📢' : '💬'}</div>
          <div style="min-width:0;">
            <div style="font-size:12px;font-weight:600;color:#F0FDF4;margin-bottom:2px;">${isPost ? 'Post de Lançamento' : 'Follow-Up de Lead'}</div>
            <div style="font-size:10px;color:#64748B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              👤 ${item.nome_corretor || item.telefone_corretor || '—'} · ${dataCriacao}
              ${leadNome ? ` · 🏷️ ${leadNome}` : ''}
            </div>
          </div>
        </div>
        ${statusBadge}
      </div>

      <!-- Pedido original -->
      <div style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.03);background:rgba(255,255,255,0.01);">
        <div style="font-size:10px;color:#475569;font-weight:500;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Pedido do corretor</div>
        <div style="font-size:11px;color:#64748B;font-style:italic;">"${item.pedido_original || '—'}"</div>
      </div>

      <!-- Preview do rascunho -->
      <div style="padding:14px 16px;" id="fia-preview-${item.id}">
        ${preview}
      </div>

      <!-- Área de edição (aparece ao clicar em Editar) -->
      <div id="fia-edit-${item.id}" style="display:none;padding:0 16px 14px;">
        <div style="font-size:10px;color:#86EFAC;font-weight:500;margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em;">✏️ Editar antes de aprovar</div>
        <textarea id="fia-textarea-${item.id}" style="width:100%;background:var(--bg-input);border:1px solid rgba(34,197,94,0.2);border-radius:8px;padding:12px;color:#A7C4AE;font-size:12px;line-height:1.7;resize:vertical;min-height:100px;font-family:'DM Sans',sans-serif;outline:none;box-sizing:border-box;" onfocus="this.style.borderColor='rgba(34,197,94,0.4)'" onblur="this.style.borderColor='rgba(34,197,94,0.2)'">${isPost ? item.rascunho : item.rascunho}</textarea>
      </div>

      <!-- Ações -->
      ${isPend ? `
      <div style="padding:12px 16px;border-top:1px solid rgba(255,255,255,0.04);display:flex;gap:8px;flex-wrap:wrap;">
        <button onclick="fiaAprovar('${item.id}',false)" style="flex:1;min-width:90px;padding:8px 12px;background:#22C55E;color:#000;border:none;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:opacity .15s;" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
          ✅ Aprovar
        </button>
        <button onclick="fiaToggleEdit('${item.id}')" style="padding:8px 12px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.18);border-radius:8px;color:#86EFAC;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;cursor:pointer;" id="btn-edit-${item.id}">
          ✏️ Editar
        </button>
        <button onclick="fiaRejeitar('${item.id}')" style="padding:8px 12px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.15);border-radius:8px;color:#FCA5A5;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;cursor:pointer;" onmouseover="this.style.background='rgba(239,68,68,0.14)'" onmouseout="this.style.background='rgba(239,68,68,0.08)'">
          ❌ Rejeitar
        </button>
      </div>` : ''}
    </div>`;
  }).join('');
}

// ── Toggle edição ────────────────────────────────────
function fiaToggleEdit(id) {
  const editArea = document.getElementById('fia-edit-' + id);
  const btn      = document.getElementById('btn-edit-' + id);
  const preview  = document.getElementById('fia-preview-' + id);
  const visivel  = editArea.style.display !== 'none';
  editArea.style.display = visivel ? 'none' : 'block';
  preview.style.display  = visivel ? 'block' : 'none';
  btn.textContent = visivel ? '✏️ Editar' : '👁 Ver preview';
}

// ── Aprovar ──────────────────────────────────────────
async function fiaAprovar(id, comEdicao) {
  const textarea = document.getElementById('fia-textarea-' + id);
  const editado  = comEdicao && textarea ? textarea.value.trim() : null;

  try {
    const res = await fetch(`${RAILWAY_URL}/cdp/aprovar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, acao: 'aprovar', rascunhoEditado: editado }),
    });

    if (!res.ok) throw new Error('Falha na aprovação');
    showToast('✅ Aprovado! O corretor foi notificado no WhatsApp.', 'success');
    await carregarFilaIA();
  } catch (e) {
    // Fallback: atualiza direto no Supabase se Railway não estiver configurado
    await fetch(`${SB_URL_IA}/rest/v1/cdp_assistant_fila?id=eq.${id}`, {
      method: 'PATCH',
      headers: { apikey: SB_KEY_IA, Authorization: `Bearer ${SB_KEY_IA}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'aprovado', aprovado_em: new Date().toISOString(), rascunho_final: editado }),
    });
    showToast('✅ Aprovado no CRM (notificação WhatsApp requer servidor Railway configurado)', 'success');
    await carregarFilaIA();
  }
}

// ── Rejeitar ─────────────────────────────────────────
async function fiaRejeitar(id) {
  if (!confirm('Rejeitar este conteúdo e notificar o corretor?')) return;
  try {
    const res = await fetch(`${RAILWAY_URL}/cdp/aprovar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, acao: 'rejeitar' }),
    });
    if (!res.ok) throw new Error('Falha');
    showToast('Conteúdo rejeitado. Corretor notificado.', 'info');
    await carregarFilaIA();
  } catch {
    await fetch(`${SB_URL_IA}/rest/v1/cdp_assistant_fila?id=eq.${id}`, {
      method: 'PATCH',
      headers: { apikey: SB_KEY_IA, Authorization: `Bearer ${SB_KEY_IA}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'rejeitado', aprovado_em: new Date().toISOString() }),
    });
    showToast('Rejeitado no CRM (notificação WhatsApp requer Railway)', 'info');
    await carregarFilaIA();
  }
}

/* FIM FILA IA */
