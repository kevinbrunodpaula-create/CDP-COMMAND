/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — COMMAND RECOVERY ENGINE                               ║
 * ║  recovery.js — Lógica da tela Recovery                       ║
 * ║  SPR-002 · KR7 Command Recovery                              ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Controla toda a UI da tela Command Recovery:
 *   - Execução de análise via RecoveryService
 *   - Renderização dos KPIs de resumo
 *   - Preenchimento dos selects de filtro
 *   - Tabela / cards com resultados
 *   - Filtros interativos (incluindo click nos KPIs)
 *   - Histórico de análises anteriores
 */

'use strict';

/* ─────────────────────────────────────────────
   ESTADO LOCAL DA TELA
───────────────────────────────────────────── */
let rcResultados    = [];  // todos os resultados da última análise
let rcFiltroAtivo   = '';  // classificação filtrada pelo KPI clicado
let rcAnalisadoEm   = null;

/* ─────────────────────────────────────────────
   PONTO DE ENTRADA — chamado pelo sidebar / goTo
───────────────────────────────────────────── */
async function initCommandRecovery() {
  rcMostrarEstado('loading');
  try {
    const analise = await RecoveryService.obterAnalise();
    rcAplicarAnalise(analise);
    rcCarregarHistorico();
  } catch (err) {
    console.error('[Recovery] initCommandRecovery error:', err);
    rcMostrarEstado('error', err?.message || String(err));
  }
}

/* ─────────────────────────────────────────────
   EXECUTAR ANÁLISE (botão)
───────────────────────────────────────────── */
async function rcExecutarAnalise() {
  const btn = document.getElementById('rc-btn-analisar');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="rc-spinner" style="width:13px;height:13px;border-width:2px"></span> Analisando...`;
  }
  rcMostrarEstado('loading');

  try {
    const analise = await RecoveryService.reprocessar();
    rcAplicarAnalise(analise);
    rcCarregarHistorico();
    showToast(`✅ Análise concluída — ${analise.resumo.total} leads processados`, 'success');
  } catch (err) {
    rcMostrarEstado('error', err?.message || String(err));
    showToast('Erro na análise: ' + err?.message || String(err), 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Executar Análise`;
    }
  }
}

/* ─────────────────────────────────────────────
   APLICAR RESULTADO DA ANÁLISE NA TELA
───────────────────────────────────────────── */
function rcAplicarAnalise(analise) {
  rcResultados  = analise.resultados;
  rcAnalisadoEm = analise.resumo.analisadoEm;
  rcFiltroAtivo = '';

  rcRenderResumo(analise.resumo);
  rcPopularFiltros(analise.resultados);
  rcRenderTabela(analise.resultados);
  rcAtualizarMeta(analise.resumo);
  rcMostrarEstado(null);
}

/* ─────────────────────────────────────────────
   CARDS DE RESUMO (KPIs)
───────────────────────────────────────────── */
function rcRenderResumo(resumo) {
  const kpis = [
    { cls: 'SAUDAVEL',   emoji: '🟢', label: 'Saudável',   range: '< 3 dias',  valor: resumo.saudavel   },
    { cls: 'ATENCAO',    emoji: '🟡', label: 'Atenção',    range: '3–6 dias',  valor: resumo.atencao    },
    { cls: 'EM_RISCO',   emoji: '🟠', label: 'Em Risco',   range: '7–14 dias', valor: resumo.risco      },
    { cls: 'CRITICO',    emoji: '🔴', label: 'Crítico',    range: '15–29 dias',valor: resumo.critico    },
    { cls: 'ABANDONADO', emoji: '⚫', label: 'Abandonado', range: '30+ dias',  valor: resumo.abandonado },
  ];

  const grid = document.getElementById('rc-summary');
  if (!grid) return;

  grid.innerHTML = kpis.map(k => `
    <div class="rc-kpi rc-kpi-${k.cls.toLowerCase().replace('_','-')} rc-kpi-${k.cls}"
         id="rc-kpi-${k.cls}"
         onclick="rcFiltrarPorKPI('${k.cls}')"
         title="Filtrar por ${k.label}">
      <div class="rc-kpi-emoji">${k.emoji}</div>
      <div class="rc-kpi-value">${k.valor}</div>
      <div class="rc-kpi-label">${k.label}</div>
      <div class="rc-kpi-range">${k.range}</div>
    </div>`).join('');
}

/** Filtra a tabela ao clicar num KPI. Clique duplo remove o filtro. */
function rcFiltrarPorKPI(cls) {
  if (rcFiltroAtivo === cls) {
    // Remove filtro ativo
    rcFiltroAtivo = '';
    document.querySelectorAll('.rc-kpi').forEach(el => el.classList.remove('active'));
  } else {
    rcFiltroAtivo = cls;
    document.querySelectorAll('.rc-kpi').forEach(el => {
      el.classList.toggle('active', el.id === `rc-kpi-${cls}`);
    });
  }
  // Sincroniza o select de classificação
  const sel = document.getElementById('rc-f-classificacao');
  if (sel) sel.value = rcFiltroAtivo;
  rcAplicarFiltros();
}

/* ─────────────────────────────────────────────
   POPULAR SELECTS DE FILTRO
───────────────────────────────────────────── */
function rcPopularFiltros(resultados) {
  const consultores = [...new Set(resultados.map(r => r.corretor).filter(c => c && c !== '—'))].sort();
  const origens     = [...new Set(resultados.map(r => r.origem).filter(o => o && o !== '—'))].sort();
  const statuses    = [...new Set(resultados.map(r => r.status).filter(s => s && s !== '—'))].sort();

  rcSetOptions('rc-f-consultor', consultores);
  rcSetOptions('rc-f-origem',    origens);
  rcSetOptions('rc-f-status',    statuses);
}

function rcSetOptions(selectId, values) {
  const el = document.getElementById(selectId);
  if (!el) return;
  const current = el.value;
  while (el.options.length > 1) el.remove(1);
  values.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    el.appendChild(opt);
  });
  if (values.includes(current)) el.value = current;
}

/* ─────────────────────────────────────────────
   COLETAR FILTROS DO FORMULÁRIO
───────────────────────────────────────────── */
function rcColetarFiltros() {
  const g = id => (document.getElementById(id)?.value || '').trim();
  const filtros = {};
  const consultor    = g('rc-f-consultor');
  const origem       = g('rc-f-origem');
  const status       = g('rc-f-status');
  const classificacao= g('rc-f-classificacao') || rcFiltroAtivo;
  const diasMin      = parseInt(g('rc-f-dias')) || null;
  const busca        = g('rc-f-busca');

  if (consultor)     filtros.consultor     = consultor;
  if (origem)        filtros.origem        = origem;
  if (status)        filtros.status        = status;
  if (classificacao) filtros.classificacao = classificacao;
  if (diasMin)       filtros.diasMin       = diasMin;
  if (busca)         filtros.busca         = busca;
  return filtros;
}

function rcAplicarFiltros() {
  const filtros   = rcColetarFiltros();
  const filtrados = RecoveryService.aplicarFiltros(rcResultados, filtros);
  rcRenderTabela(filtrados);

  // Sincroniza KPI ativo com select
  const cls = filtros.classificacao || '';
  if (cls !== rcFiltroAtivo) {
    rcFiltroAtivo = cls;
    document.querySelectorAll('.rc-kpi').forEach(el => {
      el.classList.toggle('active', cls ? el.id === `rc-kpi-${cls}` : false);
    });
  }
}

function rcLimparFiltros() {
  ['rc-f-consultor','rc-f-origem','rc-f-status','rc-f-classificacao','rc-f-dias'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const b = document.getElementById('rc-f-busca'); if (b) b.value = '';
  rcFiltroAtivo = '';
  document.querySelectorAll('.rc-kpi').forEach(el => el.classList.remove('active'));
  rcRenderTabela(rcResultados);
}

/* ─────────────────────────────────────────────
   RENDERIZAR TABELA (desktop) + CARDS (mobile)
───────────────────────────────────────────── */
function rcRenderTabela(resultados) {
  // Contador
  const count = document.getElementById('rc-result-count');
  if (count) {
    count.textContent = resultados.length > 0
      ? `${resultados.length} lead${resultados.length !== 1 ? 's' : ''}`
      : '0 leads';
  }

  // Desktop: tabela
  const tbody = document.getElementById('rc-tbody');
  if (tbody) {
    if (resultados.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#374151;font-size:12px">
        Nenhum lead encontrado com os filtros aplicados.
      </td></tr>`;
    } else {
      tbody.innerHTML = resultados.map(r => `
        <tr>
          <td>
            <div style="font-weight:500;color:#D1FAE5;margin-bottom:2px">${escRc(r.nome)}</div>
            ${r.telefone
              ? `<div style="font-size:10px;color:#475569;cursor:pointer" onclick="rcAbrirWpp('${escRc(r.telefone)}')">${escRc(r.telefone)}</div>`
              : '<div style="font-size:10px;color:#374151">sem telefone</div>'}
          </td>
          <td>${escRc(r.corretor)}</td>
          <td>${escRc(r.origem)}</td>
          <td>
            <span style="font-size:10px;padding:2px 7px;border-radius:5px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);color:#94A3B8">
              ${escRc(r.status)}
            </span>
          </td>
          <td>
            <span class="rc-dias ${rcDiasCls(r.classificacao)}">${rcFormatDias(r.diasParadoNum)}</span>
          </td>
          <td>
            <span class="rc-badge rc-badge-${r.classificacao}">
              ${r.cfg.emoji} ${r.cfg.label}
            </span>
          </td>
          <td><div class="rc-motivo">${escRc(r.motivo)}</div></td>
          <td><span class="rc-acao">${escRc(r.acao)}</span></td>
        </tr>`).join('');
    }
  }

  // Mobile: cards
  const cards = document.getElementById('rc-cards-mobile');
  if (cards) {
    if (resultados.length === 0) {
      cards.innerHTML = `<div class="rc-state"><div class="rc-state-title">Nenhum lead encontrado.</div></div>`;
    } else {
      cards.innerHTML = resultados.map(r => `
        <div class="rc-lead-card">
          <div style="font-size:22px;line-height:1;flex-shrink:0;margin-top:2px">${r.cfg.emoji}</div>
          <div class="rc-lead-card-body">
            <div class="rc-lead-card-nome">${escRc(r.nome)}</div>
            <div class="rc-lead-card-meta">
              ${r.corretor !== '—' ? `Corretor: ${escRc(r.corretor)}<br>` : ''}
              ${r.status ? `Status: ${escRc(r.status)}<br>` : ''}
              <span class="rc-dias ${rcDiasCls(r.classificacao)}">${rcFormatDias(r.diasParadoNum)}</span>
            </div>
            <div class="rc-lead-card-tags">
              <span class="rc-badge rc-badge-${r.classificacao}">${r.cfg.label}</span>
              <span class="rc-acao">${escRc(r.acao)}</span>
            </div>
            <div class="rc-motivo" style="margin-top:6px">${escRc(r.motivo)}</div>
          </div>
        </div>`).join('');
    }
  }
}

/* ─────────────────────────────────────────────
   HISTÓRICO DE ANÁLISES
───────────────────────────────────────────── */
async function rcCarregarHistorico() {
  const wrap = document.getElementById('rc-history-list');
  if (!wrap) return;

  try {
    const eventos = await RecoveryRepository.findLastAnalyses(5);
    if (!eventos || eventos.length === 0) {
      wrap.innerHTML = `<div class="rc-history-item"><span class="rc-history-desc">Nenhuma análise anterior registrada.</span></div>`;
      return;
    }

    wrap.innerHTML = eventos.map(ev => {
      const ts = ev.timestamp ? rcFmtTs(ev.timestamp) : '—';
      return `
        <div class="rc-history-item">
          <div class="rc-history-ts">${ts}</div>
          <div>
            <div class="rc-history-desc">${escRc(ev.descricao)}</div>
            ${ev.detalhes ? `<div class="rc-history-detail">${escRc(ev.detalhes)}</div>` : ''}
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    wrap.innerHTML = `<div class="rc-history-item"><span class="rc-history-desc" style="color:#374151">Histórico indisponível.</span></div>`;
  }
}

/* ─────────────────────────────────────────────
   HELPERS VISUAIS
───────────────────────────────────────────── */

function rcDiasCls(cls) {
  return { SAUDAVEL:'rc-dias-ok', ATENCAO:'rc-dias-warn', EM_RISCO:'rc-dias-risco', CRITICO:'rc-dias-crit', ABANDONADO:'rc-dias-aband' }[cls] || '';
}

function rcFormatDias(n) {
  if (n === 9999) return '∞ dias';
  if (n === 0)    return 'Hoje';
  if (n === 1)    return '1 dia';
  return `${n} dias`;
}

function rcFmtTs(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const hh = String(d.getHours()).padStart(2,'0');
    const mi = String(d.getMinutes()).padStart(2,'0');
    return `${dd}/${mm} ${hh}:${mi}`;
  } catch { return ts; }
}

function rcAtualizarMeta(resumo) {
  const el = document.getElementById('rc-header-meta');
  if (!el || !resumo.analisadoEm) return;
  el.textContent = `Última análise: ${rcFmtTs(resumo.analisadoEm)} · ${resumo.total} leads ativos`;
}

function rcAbrirWpp(tel) {
  if (!tel) return;
  const num = tel.replace(/\D/g, '');
  window.open(`https://wa.me/55${num}`, '_blank');
}

function escRc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─────────────────────────────────────────────
   ESTADOS DA TELA
───────────────────────────────────────────── */
function rcMostrarEstado(estado, msg) {
  const ids = ['rc-state-loading','rc-state-empty','rc-state-error'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  const conteudo = document.getElementById('rc-conteudo');
  if (conteudo) conteudo.style.display = estado ? 'none' : 'block';

  if (estado === 'loading') {
    const el = document.getElementById('rc-state-loading');
    if (el) el.style.display = 'flex';
  } else if (estado === 'empty') {
    const el = document.getElementById('rc-state-empty');
    if (el) el.style.display = 'flex';
  } else if (estado === 'error') {
    const el = document.getElementById('rc-state-error');
    const msg_el = document.getElementById('rc-error-msg');
    if (el) el.style.display = 'flex';
    if (msg_el && msg) msg_el.textContent = msg;
  }
}
