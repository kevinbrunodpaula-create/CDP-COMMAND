/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — STARTUP MANAGER                                       ║
 * ║  Release 2.9.1 · Hotfix Stability                            ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Captura todos os erros JavaScript antes que travem o sistema.
 * Garante que a splash screen NUNCA fique presa.
 * Fornece diagnóstico detalhado no console.
 */

'use strict';

/* ─────────────────────────────────────────────
   CAPTURA GLOBAL DE ERROS
───────────────────────────────────────────── */

window.onerror = function(message, source, lineno, colno, error) {
  console.error('[CDP STARTUP] ❌ Erro global capturado:');
  console.error('  Mensagem:', message);
  console.error('  Arquivo:', source);
  console.error('  Linha:', lineno, '| Coluna:', colno);
  if (error?.stack) console.error('  Stack:', error.stack);

  // Registra para o diagnóstico
  window._cdpErrors = window._cdpErrors || [];
  window._cdpErrors.push({ message, source, lineno, colno, stack: error?.stack });

  // Garante que a splash não fique travada
  _cdpForcarFecharSplash();
  return false; // não suprimir — deixar aparecer no console
};

window.onunhandledrejection = function(event) {
  const err = event.reason;
  console.error('[CDP STARTUP] ❌ Promise rejeitada sem handler:');
  console.error('  Motivo:', err?.message || err);
  if (err?.stack) console.error('  Stack:', err.stack);

  window._cdpErrors = window._cdpErrors || [];
  window._cdpErrors.push({ message: err?.message || String(err), stack: err?.stack, type: 'unhandledrejection' });

  _cdpForcarFecharSplash();
};

/* ─────────────────────────────────────────────
   GARANTIA ANTI-TRAVAMENTO DA SPLASH
───────────────────────────────────────────── */

function _cdpForcarFecharSplash() {
  try {
    const ld = document.getElementById('loading');
    if (ld && ld.style.display !== 'none') {
      console.warn('[CDP STARTUP] ⚠️ Forçando fechamento da splash screen por erro detectado.');
      ld.style.opacity = '0';
      setTimeout(() => { if (ld) ld.style.display = 'none'; }, 400);
    }
  } catch(e) { /* DOM pode não estar pronto ainda */ }
}

/* ─────────────────────────────────────────────
   TIMEOUT ANTI-TRAVAMENTO (failsafe)
   Se após 12 segundos a splash ainda estiver
   visível, fecha forçadamente.
───────────────────────────────────────────── */

window.addEventListener('DOMContentLoaded', function() {
  console.log('[CDP STARTUP] 🚀 Sistema iniciando...');

  const TIMEOUT_MS = 12000;
  const failsafeTimer = setTimeout(function() {
    const ld = document.getElementById('loading');
    if (ld && ld.style.display !== 'none') {
      console.error('[CDP STARTUP] ⏱️ TIMEOUT — splash ainda visível após ' + (TIMEOUT_MS/1000) + 's. Forçando fechamento.');
      _cdpForcarFecharSplash();

      // Mostra tela de diagnóstico se o app não abriu
      const app = document.getElementById('app');
      const loginScreen = document.getElementById('login-screen');
      if (app && app.style.display === 'none' && loginScreen && loginScreen.style.display === 'none') {
        _cdpMostrarTelaDiagnostico();
      }
    }
  }, TIMEOUT_MS);

  // Cancela failsafe se o sistema carregou normalmente
  window._cdpCancelFailsafe = function() {
    clearTimeout(failsafeTimer);
    console.log('[CDP STARTUP] ✅ Sistema carregado normalmente. Failsafe cancelado.');
  };
});

/* ─────────────────────────────────────────────
   STARTUP LOGGER — rastrea cada módulo
───────────────────────────────────────────── */

window.CDP_LOG = {
  _logs: [],
  start: function(modulo) {
    console.log('[CDP STARTUP] ⏳ Carregando ' + modulo + '...');
    this._logs.push({ modulo, status: 'loading', ts: Date.now() });
  },
  ok: function(modulo) {
    console.log('[CDP STARTUP] ✅ ' + modulo + ' OK');
    const entry = this._logs.findLast ? this._logs.findLast(l => l.modulo === modulo) : this._logs.slice().reverse().find(l => l.modulo === modulo);
    if (entry) entry.status = 'ok';
  },
  erro: function(modulo, err) {
    console.error('[CDP STARTUP] ❌ ' + modulo + ' ERRO:', err?.message || err);
    if (err?.stack) console.error(err.stack);
    const entry = this._logs.findLast ? this._logs.findLast(l => l.modulo === modulo) : this._logs.slice().reverse().find(l => l.modulo === modulo);
    if (entry) { entry.status = 'erro'; entry.error = err?.message; }
  },
  resumo: function() {
    const ok   = this._logs.filter(l => l.status === 'ok').length;
    const erros= this._logs.filter(l => l.status === 'erro').length;
    console.log('[CDP STARTUP] 📊 Resumo: ' + ok + ' OK, ' + erros + ' ERRO(S)');
    if (erros > 0) {
      console.error('[CDP STARTUP] Módulos com erro:');
      this._logs.filter(l => l.status === 'erro').forEach(l => console.error('  - ' + l.modulo + ':', l.error));
    }
  }
};

/* ─────────────────────────────────────────────
   TELA DE DIAGNÓSTICO
───────────────────────────────────────────── */

function _cdpMostrarTelaDiagnostico() {
  const erros = window._cdpErrors || [];
  const body = document.body;
  if (!body) return;

  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;inset:0;z-index:99999;background:var(--bg-panel);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;padding:24px;font-family:DM Sans,sans-serif;';
  div.innerHTML = `
    <div style="font-size:28px">⚠️</div>
    <div style="font-size:16px;font-weight:600;color:var(--text-primary);text-align:center">O CDP encontrou um problema durante a inicialização.</div>
    <div style="font-size:12px;color:var(--text-muted);text-align:center;max-width:340px;line-height:1.7">
      Isso pode ser causado por instabilidade na conexão com o servidor. Tente atualizar a página.
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:8px">
      <button onclick="location.reload()" style="padding:10px 22px;background:var(--green);color:#000;border:none;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;">
        🔄 Atualizar página
      </button>
      <button onclick="document.getElementById('cdp-diag-detail').style.display='block';this.style.display='none'" style="padding:10px 18px;background:transparent;color:var(--text-muted);border:1px solid rgba(255,255,255,0.1);border-radius:9px;font-size:13px;cursor:pointer;">
        🔍 Ver detalhes técnicos
      </button>
    </div>
    <div id="cdp-diag-detail" style="display:none;background:var(--bg-input);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:14px;max-width:500px;width:100%;max-height:200px;overflow-y:auto;margin-top:8px">
      <div style="font-size:10px;color:var(--text-muted);font-family:DM Mono,monospace;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px">Erros detectados (${erros.length})</div>
      ${erros.map(e => `
        <div style="font-size:11px;color:var(--red);margin-bottom:8px;line-height:1.5">
          <div style="font-weight:600">${e.message||'Erro desconhecido'}</div>
          ${e.source?`<div style="color:var(--text-muted)">${e.source}${e.lineno?':'+e.lineno:''}</div>`:''}
        </div>`).join('') || '<div style="font-size:11px;color:var(--text-muted)">Nenhum erro JavaScript capturado. O problema pode ser de rede ou Supabase.</div>'}
    </div>`;
  body.appendChild(div);
}

console.log('[CDP STARTUP] 🛡️ Startup Manager carregado. Monitorando inicialização...');
