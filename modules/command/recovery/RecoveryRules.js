/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — COMMAND RECOVERY ENGINE                               ║
 * ║  RecoveryRules.js                                            ║
 * ║  SPR-002 · KR7 Command Recovery                              ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Contém APENAS as regras de classificação e ações recomendadas.
 * Zero dependências externas — funções puras.
 * Pode ser testado isoladamente sem DOM nem Supabase.
 */



/* ─────────────────────────────────────────────
   CLASSIFICAÇÕES (imutáveis)
───────────────────────────────────────────── */
const RecoveryClassification = Object.freeze({
  SAUDAVEL   : 'SAUDAVEL',
  ATENCAO    : 'ATENCAO',
  EM_RISCO   : 'EM_RISCO',
  CRITICO    : 'CRITICO',
  ABANDONADO : 'ABANDONADO',
});

/** Metadados visuais de cada classificação */
const RECOVERY_CLASS_CFG = Object.freeze({
  SAUDAVEL   : { label: 'Saudável',   emoji: '🟢', color: '#22C55E', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)',   diasMin: 0,  diasMax: 2  },
  ATENCAO    : { label: 'Atenção',    emoji: '🟡', color: '#EAB308', bg: 'rgba(234,179,8,0.08)',   border: 'rgba(234,179,8,0.2)',   diasMin: 3,  diasMax: 6  },
  EM_RISCO   : { label: 'Em Risco',   emoji: '🟠', color: '#F97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.2)',  diasMin: 7,  diasMax: 14 },
  CRITICO    : { label: 'Crítico',    emoji: '🔴', color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   diasMin: 15, diasMax: 29 },
  ABANDONADO : { label: 'Abandonado', emoji: '⚫', color: '#64748B', bg: 'rgba(100,116,139,0.06)', border: 'rgba(100,116,139,0.15)', diasMin: 30, diasMax: Infinity },
});

/* ─────────────────────────────────────────────
   AÇÕES RECOMENDADAS
───────────────────────────────────────────── */
const RecoveryAction = Object.freeze({
  PRIMEIRO_CONTATO      : 'Primeiro contato',
  ENVIAR_WHATSAPP       : 'Enviar WhatsApp',
  REALIZAR_LIGACAO      : 'Realizar ligação',
  AGENDAR_VISITA        : 'Agendar visita',
  SOLICITAR_ATUALIZACAO : 'Solicitar atualização',
  AVALIAR_REDISTRIBUICAO: 'Avaliar redistribuição',
});

/* ─────────────────────────────────────────────
   REGRAS PURAS
───────────────────────────────────────────── */

/**
 * Calcula quantos dias se passaram desde uma data ISO.
 * @param {string|null} isoDate
 * @returns {number} dias (Infinity se null)
 */
function diasDesde(isoDate) {
  if (!isoDate) return Infinity;
  const diff = Date.now() - new Date(isoDate).getTime();
  return Math.floor(diff / 86_400_000);
}

/**
 * Encontra a data de referência mais recente do lead.
 * Prioridade: ultimo_contato → updated_at → created_at
 * @param {object} lead
 * @returns {string|null}
 */
function dataReferencia(lead) {
  return lead.ultimo_contato || lead.updated_at || lead.created_at || null;
}

/**
 * Classifica um lead segundo as regras de negócio.
 * @param {object} lead
 * @returns {string} RecoveryClassification
 */
function classificarLead(lead) {
  const dias = diasDesde(dataReferencia(lead));

  if (dias < 3)  return RecoveryClassification.SAUDAVEL;
  if (dias < 7)  return RecoveryClassification.ATENCAO;
  if (dias < 15) return RecoveryClassification.EM_RISCO;
  if (dias < 30) return RecoveryClassification.CRITICO;
  return RecoveryClassification.ABANDONADO;
}

/**
 * Monta o motivo textual da classificação.
 * @param {string} classificacao
 * @param {number} dias
 * @param {object} lead
 * @returns {string}
 */
function motivoClassificacao(classificacao, dias, lead) {
  const semContato = dias === Infinity
    ? 'sem data de contato registrada'
    : dias === 0 ? 'contato hoje' : `${dias} dia${dias !== 1 ? 's' : ''} sem contato`;

  const motivos = {
    SAUDAVEL   : `Lead em dia — ${semContato}.`,
    ATENCAO    : `${semContato}. Requer atenção antes de esfriar.`,
    EM_RISCO   : `${semContato}. Risco de perder engajamento.`,
    CRITICO    : `${semContato}. Lead em estado crítico.`,
    ABANDONADO : `${semContato}. Lead possivelmente abandonado.`,
  };

  // Agrega contexto extra
  const extras = [];
  if (!lead.corretor)               extras.push('sem corretor');
  if (!lead.telefone)               extras.push('sem telefone');
  if (lead.status === 'Lead Novo')  extras.push('nunca contatado');

  return motivos[classificacao] + (extras.length ? ` (${extras.join(', ')})` : '');
}

/**
 * Determina a ação recomendada para o lead.
 * @param {string} classificacao
 * @param {object} lead
 * @returns {string} RecoveryAction
 */
function acaoRecomendada(classificacao, lead) {
  // Lead sem nenhum contato prévio → primeiro contato sempre
  if (lead.status === 'Lead Novo' || !lead.ultimo_contato) {
    return RecoveryAction.PRIMEIRO_CONTATO;
  }

  // Lead no estágio de visita marcada → confirmar por ligação
  if (lead.status === 'Visita Marcada') {
    return RecoveryAction.REALIZAR_LIGACAO;
  }

  switch (classificacao) {
    case RecoveryClassification.SAUDAVEL:
      return RecoveryAction.AGENDAR_VISITA;

    case RecoveryClassification.ATENCAO:
      return lead.telefone
        ? RecoveryAction.ENVIAR_WHATSAPP
        : RecoveryAction.SOLICITAR_ATUALIZACAO;

    case RecoveryClassification.EM_RISCO:
      return RecoveryAction.REALIZAR_LIGACAO;

    case RecoveryClassification.CRITICO:
      return RecoveryAction.REALIZAR_LIGACAO;

    case RecoveryClassification.ABANDONADO:
      return RecoveryAction.AVALIAR_REDISTRIBUICAO;

    default:
      return RecoveryAction.SOLICITAR_ATUALIZACAO;
  }
}

/**
 * Processa um lead completo e retorna seu objeto de análise.
 * @param {object} lead  — objeto completo do Supabase
 * @returns {object}     — RecoveryResult
 */
function analisarLead(lead) {
  const ref            = dataReferencia(lead);
  const dias           = diasDesde(ref);
  const classificacao  = classificarLead(lead);
  const cfg            = RECOVERY_CLASS_CFG[classificacao];
  const motivo         = motivoClassificacao(classificacao, dias, lead);
  const acao           = acaoRecomendada(classificacao, lead);

  return {
    // dados originais do lead
    id        : lead.id,
    nome      : lead.nome,
    corretor  : lead.corretor  || '—',
    origem    : lead.origem    || '—',
    status    : lead.status    || '—',
    telefone  : lead.telefone  || null,
    interesse : lead.interesse || null,

    // análise
    ultimoContato   : ref,
    diasParado      : dias === Infinity ? '∞' : dias,
    diasParadoNum   : dias === Infinity ? 9999 : dias,
    classificacao,
    cfg,
    motivo,
    acao,
  };
}

/**
 * Analisa um array de leads e retorna o resultado completo.
 * Filtra automaticamente leads Fechados e Perdidos.
 * @param {Array} leads
 * @returns {{ resultados: Array, resumo: object }}
 */
function analisarCarteira(leads) {
  const ativos = leads.filter(l =>
    l.status !== 'Fechado' && l.status !== 'Perdido'
  );

  const resultados = ativos
    .map(analisarLead)
    .sort((a, b) => b.diasParadoNum - a.diasParadoNum); // piores primeiro

  const resumo = {
    total      : resultados.length,
    saudavel   : resultados.filter(r => r.classificacao === 'SAUDAVEL').length,
    atencao    : resultados.filter(r => r.classificacao === 'ATENCAO').length,
    risco      : resultados.filter(r => r.classificacao === 'EM_RISCO').length,
    critico    : resultados.filter(r => r.classificacao === 'CRITICO').length,
    abandonado : resultados.filter(r => r.classificacao === 'ABANDONADO').length,
    analisadoEm: new Date().toISOString(),
  };

  return { resultados, resumo };
}
