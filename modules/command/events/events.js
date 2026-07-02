/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — COMMAND EVENTS ENGINE                                 ║
 * ║  events.js — Lógica da tela Command Events                   ║
 * ║  SPR-001 · KR7 Command                                       ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Responsável por:
 *   - Carregar eventos via CommandEventRepository
 *   - Aplicar/limpar filtros
 *   - Renderizar cards de eventos
 *   - Paginar resultados (load more)
 *
 * Depende de: CommandEventRepository, CommandEventType,
 *             CommandEventOrigin, CommandEventModule
 */

'use strict';

/* ─────────────────────────────────────────────
   ESTADO LOCAL
───────────────────────────────────────────── */
let evEventos   = [];       // eventos carregados
let evOffset    = 0;        // paginação (futuro)
let evFiltros   = {};       // filtros ativos
const EV_LIMIT  = 100;      // eventos por carregamento

/* ─────────────────────────────────────────────
   MAPEAMENTOS VISUAIS
───────────────────────────────────────────── */

/** Emoji/ícone e classe de cor para cada tipo de evento */
const EV_TYPE_CFG = {
  LEAD_CREATED      : { emoji: '✨', cls: 'ev-tag-lead',    label: 'Lead Criado'       },
  LEAD_UPDATED      : { emoji: '✏️',  cls: 'ev-tag-lead',    label: 'Lead Atualizado'   },
  LEAD_IMPORTED     : { emoji: '📥', cls: 'ev-tag-import',  label: 'Lead Importado'    },
  LEAD_ASSIGNED     : { emoji: '👤', cls: 'ev-tag-lead',    label: 'Lead Atribuído'    },
  LEAD_TRANSFERRED  : { emoji: '↔️',  cls: 'ev-tag-lead',    label: 'Lead Transferido'  },
  LEAD_RECOVERED    : { emoji: '♻️',  cls: 'ev-tag-lead',    label: 'Lead Recuperado'   },
  FIRST_CONTACT     : { emoji: '👋', cls: 'ev-tag-contact', label: 'Primeiro Contato'  },
  PHONE_CALL        : { emoji: '📞', cls: 'ev-tag-contact', label: 'Ligação'           },
  WHATSAPP_SENT     : { emoji: '💬', cls: 'ev-tag-contact', label: 'WhatsApp'          },
  EMAIL_SENT        : { emoji: '📧', cls: 'ev-tag-contact', label: 'E-mail'            },
  FOLLOWUP          : { emoji: '🔄', cls: 'ev-tag-contact', label: 'Follow-Up'         },
  VISIT_SCHEDULED   : { emoji: '📅', cls: 'ev-tag-visit',   label: 'Visita Agendada'   },
  VISIT_COMPLETED   : { emoji: '🏠', cls: 'ev-tag-visit',   label: 'Visita Realizada'  },
  PROPOSAL_SENT     : { emoji: '📄', cls: 'ev-tag-visit',   label: 'Proposta Enviada'  },
  SALE_COMPLETED    : { emoji: '🏆', cls: 'ev-tag-sale',    label: 'Venda Fechada'     },
  SALE_LOST         : { emoji: '💔', cls: 'ev-tag-lost',    label: 'Venda Perdida'     },
  CLIENT_CREATED    : { emoji: '🤝', cls: 'ev-tag-lead',    label: 'Cliente Criado'    },
  PROPERTY_CREATED  : { emoji: '🏢', cls: 'ev-tag-lead',    label: 'Imóvel Criado'     },
  LOGIN             : { emoji: '🔑', cls: 'ev-tag-auth',    label: 'Login'             },
  LOGOUT            : { emoji: '🚪', cls: 'ev-tag-auth',    label: 'Logout'            },
  USER_CREATED      : { emoji: '👤', cls: 'ev-tag-auth',    label: 'Usuário Criado'    },
  COMMAND_ALERT     : { emoji: '⚡', cls: 'ev-tag-system',  label: 'Alerta Command'    },
  COMMAND_ACTION    : { emoji: '⚙️',  cls: 'ev-tag-system',  label: 'Ação Command'      },
};

/** Cor de fundo do ícone por categoria */
const EV_ICON_BG = {
  'ev-tag-lead'    : 'rgba(34,197,94,0.08)',
  'ev-tag-sale'    : 'rgba(34,197,94,0.18)',
  'ev-tag-lost'    : 'rgba(239,68,68,0.08)',
  'ev-tag-contact' : 'rgba(14,165,233,0.08)',
  'ev-tag-visit'   : 'rgba(245,158,11,0.08)',
  'ev-tag-auth'    : 'rgba(148,163,184,0.06)',
  'ev-tag-system'  : 'rgba(139,92,246,0.08)',
  'ev-tag-import'  : 'rgba(251,146,60,0.08)',
};

/* ─────────────────────────────────────────────
   FORMATAÇÃO DE DATA/HORA
───────────────────────────────────────────── */

function evFmtTimestamp(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d; // ms

    if (diff < 60_000)    return 'agora';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}min atrás`;
    if (diff < 86_400_000) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    const hh   = String(d.getHours()).padStart(2, '0');
    const mi   = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  } catch {
    return ts;
  }
}

/* ─────────────────────────────────────────────
   RENDER DE UM CARD DE EVENTO
───────────────────────────────────────────── */

function evRenderCard(ev) {
  const cfg     = EV_TYPE_CFG[ev.tipo] || { emoji: '📌', cls: 'ev-tag-system', label: ev.tipo };
  const iconBg  = EV_ICON_BG[cfg.cls]  || 'rgba(34,197,94,0.08)';
  const tsLabel = evFmtTimestamp(ev.timestamp);

  // Meta line (usuario, consultor, lead, imóvel)
  const metaParts = [];
  if (ev.usuario)   metaParts.push(`<span>${escHtml(ev.usuario)}</span>`);
  if (ev.consultor && ev.consultor !== ev.usuario)
                    metaParts.push(`<span>Corretor: ${escHtml(ev.consultor)}</span>`);
  if (ev.lead)      metaParts.push(`<span>Lead: ${escHtml(ev.lead)}</span>`);
  if (ev.imovel)    metaParts.push(`<span>Imóvel: ${escHtml(ev.imovel)}</span>`);

  const metaHtml = metaParts.length > 0
    ? `<div class="ev-card-meta">${metaParts.join('')}</div>`
    : '';

  const detalhesHtml = ev.detalhes
    ? `<div class="ev-card-details">${escHtml(ev.detalhes)}</div>`
    : '';

  return `
    <div class="ev-card">
      <div class="ev-card-icon" style="background:${iconBg}">
        ${cfg.emoji}
      </div>
      <div class="ev-card-body">
        <div class="ev-card-top">
          <div class="ev-card-desc">${escHtml(ev.descricao)}</div>
          <div class="ev-card-time" title="${ev.timestamp || ''}">${tsLabel}</div>
        </div>
        <div class="ev-card-tags">
          <span class="ev-tag ${cfg.cls}">${cfg.label}</span>
          <span class="ev-tag-modulo">${escHtml(ev.modulo || '—')}</span>
          <span class="ev-tag-origem">${escHtml(ev.origem || '—')}</span>
        </div>
        ${metaHtml}
        ${detalhesHtml}
      </div>
    </div>`;
}

/** Escapa HTML para evitar XSS nos dados vindos do banco */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─────────────────────────────────────────────
   ESTADOS DA TELA
───────────────────────────────────────────── */

function evShowState(state, msg) {
  const states = ['ev-state-loading', 'ev-state-empty', 'ev-state-error'];
  states.forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  document.getElementById('ev-list').innerHTML = '';
  document.getElementById('ev-load-more').style.display = 'none';

  if (state) {
    document.getElementById(state).style.display = 'flex';
    if (state === 'ev-state-error' && msg) {
      document.getElementById('ev-error-msg').textContent = msg;
    }
  }
}

function evUpdateCount(total) {
  const el = document.getElementById('ev-count-label');
  if (!el) return;
  el.textContent = total > 0
    ? `${total} evento${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`
    : '—';
}

/* ─────────────────────────────────────────────
   CARREGAR EVENTOS
───────────────────────────────────────────── */

async function evCarregar() {
  evShowState('ev-state-loading');

  try {
    const filtros = evColetarFiltros();
    evFiltros = filtros;

    evEventos = await CommandEventRepository.findAll({
      ...filtros,
      limit: EV_LIMIT,
    });

    evRenderLista(evEventos);

  } catch (err) {
    console.error('[Events] evCarregar error:', err);
    evShowState('ev-state-error', err.message || 'Erro desconhecido.');
  }
}

async function evAplicarFiltros() {
  await evCarregar();
}

async function evCarregarMais() {
  // Implementação futura: offset-based pagination
  // Por ora, aumenta o limit e recarrega
  const btn = document.getElementById('ev-load-more');
  if (btn) btn.style.display = 'none';
  // TODO: implementar cursor-based pagination com campo id ou timestamp
}

/* ─────────────────────────────────────────────
   COLETAR FILTROS DO FORMULÁRIO
───────────────────────────────────────────── */

function evColetarFiltros() {
  const get = id => (document.getElementById(id)?.value || '').trim();

  const filtros = {};
  const modulo    = get('ev-f-modulo');
  const tipo      = get('ev-f-tipo');
  const origem    = get('ev-f-origem');
  const consultor = get('ev-f-consultor');
  const lead      = get('ev-f-lead');
  const desde     = get('ev-f-desde');
  const ate       = get('ev-f-ate');

  if (modulo)    filtros.modulo    = modulo;
  if (tipo)      filtros.tipo      = tipo;
  if (origem)    filtros.origem    = origem;
  if (consultor) filtros.consultor = consultor;
  if (lead)      filtros.lead      = lead;
  if (desde)     filtros.desde     = new Date(desde).toISOString();
  if (ate) {
    // Até o final do dia selecionado
    const ateDate = new Date(ate);
    ateDate.setHours(23, 59, 59, 999);
    filtros.ate = ateDate.toISOString();
  }

  return filtros;
}

function evLimparFiltros() {
  ['ev-f-modulo','ev-f-tipo','ev-f-origem'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['ev-f-consultor','ev-f-lead','ev-f-desde','ev-f-ate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  evCarregar();
}

/* ─────────────────────────────────────────────
   RENDERIZAR LISTA
───────────────────────────────────────────── */

function evRenderLista(eventos) {
  const listEl   = document.getElementById('ev-list');
  const moreEl   = document.getElementById('ev-load-more');

  if (!eventos || eventos.length === 0) {
    evShowState('ev-state-empty');
    evUpdateCount(0);
    return;
  }

  // Esconde estados
  evShowState(null);

  // Renderiza cards
  listEl.innerHTML = eventos.map(evRenderCard).join('');

  // Atualiza contador
  evUpdateCount(eventos.length);

  // Load more: mostra se retornou o limite máximo (pode ter mais)
  if (moreEl) {
    moreEl.style.display = eventos.length >= EV_LIMIT ? 'flex' : 'none';
  }
}

/* ─────────────────────────────────────────────
   INICIALIZAÇÃO DA PÁGINA
   Chamada quando o usuário navega para a tela.
───────────────────────────────────────────── */

function initCommandEvents() {
  evCarregar();
}
