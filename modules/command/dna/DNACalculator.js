/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — COMMAND DNA ENGINE                                    ║
 * ║  DNACalculator.js                                            ║
 * ║  SPR-004 · KR7 Command DNA                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Funções PURAS de análise do DNA Comercial de cada consultor.
 * Zero dependências externas — testável isoladamente.
 *
 * Analisa os dados já existentes no CRM para descobrir
 * automaticamente o perfil comercial de cada consultor.
 *
 * PREPARADO para futura integração com Distribuição Inteligente.
 *
 * RESTRIÇÕES SPR-004:
 *   ✗ Não redistribui leads
 *   ✗ Não altera responsáveis
 *   ✓ Apenas analisa e apresenta
 */

'use strict';

/* ─────────────────────────────────────────────
   HELPERS INTERNOS
───────────────────────────────────────────── */

var _norm = s => (s || '').trim().toLowerCase();

var _leadsDeCorretor = (allLeads, nome) => {
  const n = _norm(nome);
  return allLeads.filter(l => _norm(l.corretor) === n);
};

var _diasEntre = (iso1, iso2) => {
  if (!iso1 || !iso2) return null;
  return Math.abs(new Date(iso2).getTime() - new Date(iso1).getTime()) / 86_400_000;
};

var _diasDesde = iso => {
  if (!iso) return null;
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
};

var _parseValor = v => {
  if (!v) return 0;
  const s = String(v).replace(/[^\d,.]/g, '');
  const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

var _fmtBRL = v => v > 0
  ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  : '—';

/** Agrupa array por campo e retorna [{valor, total, fechados, conv}] ordenado por conversão */
function _agrupar(leads, campo) {
  const map = {};
  leads.forEach(l => {
    const v = l[campo];
    if (!v) return;
    if (!map[v]) map[v] = { valor: v, total: 0, fechados: 0 };
    map[v].total++;
    if (l.status === 'Fechado') map[v].fechados++;
  });
  return Object.values(map)
    .filter(g => g.total >= 2)                          // mínimo 2 leads para ser relevante
    .map(g => ({ ...g, conv: Math.round((g.fechados / g.total) * 100) }))
    .sort((a, b) => b.conv - a.conv || b.total - a.total);
}

/** Encontra o melhor item de um agrupamento */
function _melhor(grupos) {
  return grupos.length > 0 ? grupos[0] : null;
}

/* ─────────────────────────────────────────────
   MÉTRICAS COMERCIAIS
───────────────────────────────────────────── */

/**
 * Calcula todas as métricas comerciais de um consultor.
 * @param {Array} leads — leads do consultor
 * @returns {object} metricas
 */
function calcularMetricas(leads) {
  const total     = leads.length;
  const fechados  = leads.filter(l => l.status === 'Fechado');
  const perdidos  = leads.filter(l => l.status === 'Perdido');
  const ativos    = leads.filter(l => l.status !== 'Fechado' && l.status !== 'Perdido');
  const vendas    = fechados.length;

  // Taxa de conversão
  const taxaConversao = total > 0 ? Math.round((vendas / total) * 100) : 0;

  // Tempo médio de resposta (created_at → ultimo_contato)
  const temposResposta = leads
    .filter(l => l.ultimo_contato && l.created_at)
    .map(l => {
      const horas = (new Date(l.ultimo_contato) - new Date(l.created_at)) / 3_600_000;
      return Math.max(0, horas);
    })
    .filter(h => h < 720); // descarta outliers > 30 dias
  const tempoMedioResposta = temposResposta.length > 0
    ? Math.round(temposResposta.reduce((a, b) => a + b, 0) / temposResposta.length)
    : null;

  // Tempo médio até venda (created_at → fechado_em)
  const temposVenda = fechados
    .filter(l => l.fechado_em && l.created_at)
    .map(l => _diasEntre(l.created_at, l.fechado_em))
    .filter(d => d !== null && d < 365);
  const tempoMedioVenda = temposVenda.length > 0
    ? Math.round(temposVenda.reduce((a, b) => a + b, 0) / temposVenda.length)
    : null;

  // Follow-ups totais (histórico de contatos)
  let totalFollowUps = 0;
  leads.forEach(l => {
    try {
      const hist = l.historico_contatos ? JSON.parse(l.historico_contatos) : [];
      totalFollowUps += hist.length;
    } catch { /* malformado */ }
  });

  // Visitas, propostas
  const visitas  = leads.filter(l => ['Visita Marcada','Proposta','Documentação','Fechado'].includes(l.status)).length;
  const propostas = leads.filter(l => ['Proposta','Documentação','Fechado'].includes(l.status)).length;

  // Leads recuperados (Follow-Up com contato < 7 dias)
  const recuperados = ativos.filter(l =>
    l.status === 'Follow-Up' &&
    l.ultimo_contato &&
    _diasDesde(l.ultimo_contato) < 7
  ).length;

  // Ticket médio
  const valoresVendas = fechados.map(l => _parseValor(l.valor)).filter(v => v > 0);
  const ticketMedio = valoresVendas.length > 0
    ? Math.round(valoresVendas.reduce((a, b) => a + b, 0) / valoresVendas.length)
    : 0;

  // VGV total
  const vgvTotal = valoresVendas.reduce((a, b) => a + b, 0);

  return {
    total, vendas, perdidos: perdidos.length, ativos: ativos.length,
    taxaConversao, tempoMedioResposta, tempoMedioVenda,
    totalFollowUps, visitas, propostas, recuperados,
    ticketMedio, vgvTotal,
  };
}

/* ─────────────────────────────────────────────
   ESPECIALIDADES
───────────────────────────────────────────── */

/**
 * Identifica especialidades do consultor pelos dados de conversão.
 * Requer mínimo de dados para ser confiável.
 * @param {Array} leads
 * @returns {object} especialidades
 */
function calcularEspecialidades(leads) {
  // Só analisa se tiver dados suficientes
  const MIN_LEADS = 3;
  if (leads.length < MIN_LEADS) {
    return {
      suficiente      : false,
      mensagem        : `Dados insuficientes (${leads.length} leads). Mínimo: ${MIN_LEADS}.`,
      bairro          : null, cidade: null, faixaPreco: null,
      tipoImovel      : null, origem: null,
      melhorHorario   : null, melhorDia: null,
    };
  }

  // Faixa de preço (categorização)
  const leadsComValor = leads.map(l => ({ ...l, _faixa: _faixaPreco(_parseValor(l.valor)) }))
    .filter(l => l._faixa);
  const faixaGrupos = _agrupar(leadsComValor, '_faixa');

  // Melhor horário de atendimento (baseado em ultimo_contato)
  const horarios = {};
  const dias = {};
  leads.forEach(l => {
    const ref = l.ultimo_contato;
    if (!ref) return;
    const d   = new Date(ref);
    const h   = d.getHours();
    const dia = d.getDay(); // 0=Dom … 6=Sáb
    const periodo = h < 12 ? 'Manhã' : h < 18 ? 'Tarde' : 'Noite';
    horarios[periodo] = (horarios[periodo] || 0) + (l.status === 'Fechado' ? 3 : 1);
    const nomeDia = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][dia];
    dias[nomeDia] = (dias[nomeDia] || 0) + (l.status === 'Fechado' ? 3 : 1);
  });
  const melhorHorario = Object.keys(horarios).length > 0
    ? Object.entries(horarios).sort((a,b) => b[1]-a[1])[0][0]
    : null;
  const melhorDia = Object.keys(dias).length > 0
    ? Object.entries(dias).sort((a,b) => b[1]-a[1])[0][0]
    : null;

  return {
    suficiente    : true,
    bairro        : _melhor(_agrupar(leads, 'bairro')),
    cidade        : _melhor(_agrupar(leads, 'cidade')),
    faixaPreco    : _melhor(faixaGrupos),
    tipoImovel    : _melhor(_agrupar(leads, 'tipo_imovel')),
    origem        : _melhor(_agrupar(leads, 'origem')),
    melhorHorario,
    melhorDia,
    // Top 3 para o detalhe
    topBairros    : _agrupar(leads, 'bairro').slice(0, 3),
    topTipos      : _agrupar(leads, 'tipo_imovel').slice(0, 3),
    topOrigens    : _agrupar(leads, 'origem').slice(0, 3),
  };
}

/** Classifica valor em faixa de preço */
function _faixaPreco(valor) {
  if (!valor || valor <= 0) return null;
  if (valor < 200_000)  return 'Até R$ 200k';
  if (valor < 400_000)  return 'R$ 200k–400k';
  if (valor < 700_000)  return 'R$ 400k–700k';
  if (valor < 1_000_000) return 'R$ 700k–1M';
  return 'Acima de R$ 1M';
}

/* ─────────────────────────────────────────────
   DADOS PARA GRÁFICO DE EVOLUÇÃO
───────────────────────────────────────────── */

/**
 * Gera dados dos últimos 6 meses para o gráfico de evolução.
 * @param {Array} leads
 * @returns {Array<{mes, leads, vendas, followups}>}
 */
function calcularEvolucao(leads) {
  const meses = [];
  const agora = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const ini = d.toISOString();
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

    const leadsDoMes  = leads.filter(l => l.created_at >= ini && l.created_at < fim).length;
    const vendasDoMes = leads.filter(l =>
      l.status === 'Fechado' &&
      (l.fechado_em || l.created_at) >= ini &&
      (l.fechado_em || l.created_at) < fim
    ).length;

    let fuMes = 0;
    leads.forEach(l => {
      try {
        const hist = l.historico_contatos ? JSON.parse(l.historico_contatos) : [];
        fuMes += hist.filter(h => h.data >= ini && h.data < fim).length;
      } catch { /* */ }
    });

    meses.push({ mes: label, leads: leadsDoMes, vendas: vendasDoMes, followups: fuMes });
  }

  return meses;
}

/* ─────────────────────────────────────────────
   FORÇAS E PONTOS DE MELHORIA
───────────────────────────────────────────── */

function calcularForcas(metricas, especialidades) {
  const forcas = [];
  const melhorias = [];

  // Tempo de resposta
  if (metricas.tempoMedioResposta !== null) {
    if (metricas.tempoMedioResposta <= 4)
      forcas.push({ icone: '⚡', texto: `Tempo de resposta excelente: ${metricas.tempoMedioResposta}h em média.` });
    else if (metricas.tempoMedioResposta <= 24)
      forcas.push({ icone: '⏱', texto: `Responde em até ${metricas.tempoMedioResposta}h em média.` });
    else
      melhorias.push({ icone: '⏱', texto: `Tempo de resposta alto: ${metricas.tempoMedioResposta}h. Meta: menos de 4h.` });
  }

  // Taxa de conversão
  if (metricas.taxaConversao >= 20)
    forcas.push({ icone: '🎯', texto: `Taxa de conversão de ${metricas.taxaConversao}% — acima da média.` });
  else if (metricas.taxaConversao >= 10)
    forcas.push({ icone: '📈', texto: `Conversão de ${metricas.taxaConversao}% — no patamar esperado.` });
  else if (metricas.total >= 5)
    melhorias.push({ icone: '🎯', texto: `Conversão de ${metricas.taxaConversao}% — abaixo da meta de 15%.` });

  // Follow-ups
  if (metricas.totalFollowUps > 0) {
    const fuPorLead = metricas.total > 0 ? (metricas.totalFollowUps / metricas.total).toFixed(1) : 0;
    if (fuPorLead >= 3)
      forcas.push({ icone: '🔄', texto: `Média de ${fuPorLead} follow-ups por lead — cadência excelente.` });
    else if (fuPorLead < 1 && metricas.total >= 3)
      melhorias.push({ icone: '🔄', texto: `Média de ${fuPorLead} follow-up por lead — aumentar cadência.` });
  }

  // Vendas
  if (metricas.vendas >= 5)
    forcas.push({ icone: '🏆', texto: `${metricas.vendas} vendas fechadas — performance elite.` });
  else if (metricas.vendas >= 2)
    forcas.push({ icone: '✅', texto: `${metricas.vendas} venda${metricas.vendas > 1 ? 's' : ''} fechada${metricas.vendas > 1 ? 's' : ''}.` });
  else if (metricas.total >= 5)
    melhorias.push({ icone: '💼', texto: 'Foco em fechar mais vendas — priorize leads quentes.' });

  // Especialidades
  if (especialidades.suficiente) {
    if (especialidades.tipoImovel?.conv >= 30)
      forcas.push({ icone: '🏠', texto: `Especialidade em ${especialidades.tipoImovel.valor} (${especialidades.tipoImovel.conv}% de conversão).` });
    if (especialidades.origem?.conv >= 25)
      forcas.push({ icone: '📣', texto: `Alta conversão de leads via ${especialidades.origem.valor} (${especialidades.origem.conv}%).` });
    if (especialidades.bairro?.conv >= 30)
      forcas.push({ icone: '📍', texto: `Destaque em ${especialidades.bairro.valor} (${especialidades.bairro.conv}% de conversão).` });
  }

  // Leads perdidos
  if (metricas.total > 0) {
    const pctPerdidos = Math.round((metricas.perdidos / metricas.total) * 100);
    if (pctPerdidos >= 40 && metricas.total >= 5)
      melhorias.push({ icone: '❌', texto: `${pctPerdidos}% dos leads marcados como perdidos — revisar qualificação.` });
  }

  // Tempo até venda
  if (metricas.tempoMedioVenda !== null) {
    if (metricas.tempoMedioVenda <= 14)
      forcas.push({ icone: '🚀', texto: `Ciclo de venda rápido: ${metricas.tempoMedioVenda} dias em média.` });
    else if (metricas.tempoMedioVenda > 60)
      melhorias.push({ icone: '📅', texto: `Ciclo de venda longo: ${metricas.tempoMedioVenda} dias. Trabalhar objeções.` });
  }

  return {
    forcas   : forcas.slice(0, 5),
    melhorias: melhorias.slice(0, 4),
  };
}

/* ─────────────────────────────────────────────
   SUGESTÕES DO COMMAND
───────────────────────────────────────────── */

function gerarSugestoesDNA(metricas, especialidades) {
  const s = [];

  if (metricas.tempoMedioResposta !== null && metricas.tempoMedioResposta > 8)
    s.push('Responder novos leads em menos de 4h aumenta a conversão em até 3x.');

  if (metricas.taxaConversao < 15 && metricas.total >= 3)
    s.push('Foque em qualificar melhor os leads antes de avançar no funil.');

  if (especialidades.suficiente && especialidades.tipoImovel)
    s.push(`Priorize leads de ${especialidades.tipoImovel.valor} — sua taxa de conversão é superior nesse segmento.`);

  if (especialidades.suficiente && especialidades.melhorHorario)
    s.push(`Concentre atendimentos no período da ${especialidades.melhorHorario.toLowerCase()} — melhor taxa de resposta.`);

  if (metricas.totalFollowUps > 0 && metricas.total > 0 && (metricas.totalFollowUps / metricas.total) < 2)
    s.push('Aumentar follow-ups: meta de 2–3 por lead ativo por semana.');

  if (especialidades.suficiente && especialidades.bairro?.conv >= 25)
    s.push(`Região ${especialidades.bairro.valor} apresenta alta conversão. Priorize leads desse bairro.`);

  if (s.length === 0)
    s.push('Continue mantendo a cadência atual. Solicite novos leads para expandir sua carteira.');

  return s.slice(0, 3);
}

/* ─────────────────────────────────────────────
   PERFIL TEXTUAL DO COMMAND
───────────────────────────────────────────── */

/**
 * Gera o texto de resumo do perfil comercial.
 * @param {string} nome
 * @param {object} metricas
 * @param {object} especialidades
 * @returns {string}
 */
function gerarPerfilTextual(nome, metricas, especialidades) {
  const partes = [];
  const primeiroNome = nome.split(' ')[0];

  // Característica principal
  if (metricas.taxaConversao >= 25 && metricas.vendas >= 3)
    partes.push(`${primeiroNome} demonstra alto poder de conversão.`);
  else if (metricas.totalFollowUps > 0 && metricas.total > 0 && (metricas.totalFollowUps / metricas.total) >= 3)
    partes.push(`${primeiroNome} possui excelente cadência de follow-up.`);
  else if (metricas.tempoMedioResposta !== null && metricas.tempoMedioResposta <= 4)
    partes.push(`${primeiroNome} responde rapidamente a novos leads.`);
  else if (metricas.total === 0)
    return `Perfil de ${primeiroNome} em construção. Sem leads suficientes para análise.`;
  else
    partes.push(`${primeiroNome} está construindo sua carteira de clientes.`);

  // Especialidade de tipo
  if (especialidades.suficiente && especialidades.tipoImovel?.conv >= 20)
    partes.push(`Alta conversão em ${especialidades.tipoImovel.valor.toLowerCase()} (${especialidades.tipoImovel.conv}%).`);

  // Região
  if (especialidades.suficiente && especialidades.bairro)
    partes.push(`Destaque na região de ${especialidades.bairro.valor}.`);

  // Velocidade
  if (metricas.tempoMedioResposta !== null)
    partes.push(`Tempo médio de resposta: ${metricas.tempoMedioResposta < 1 ? 'menos de 1h' : metricas.tempoMedioResposta + 'h'}.`);

  // Origem
  if (especialidades.suficiente && especialidades.origem)
    partes.push(`Maior conversão via ${especialidades.origem.valor}.`);

  // Follow-up
  if (metricas.totalFollowUps > 5)
    partes.push(`Excelente índice de follow-up: ${metricas.totalFollowUps} registros no total.`);

  return partes.join(' ');
}

/* ─────────────────────────────────────────────
   ESPECIALIDADE PRINCIPAL (para o card)
───────────────────────────────────────────── */

function especialidadePrincipal(especialidades) {
  if (!especialidades.suficiente) return null;
  if (especialidades.tipoImovel?.conv >= 25) return especialidades.tipoImovel.valor;
  if (especialidades.bairro?.conv >= 25) return `Região ${especialidades.bairro.valor}`;
  if (especialidades.origem?.conv >= 25) return `Via ${especialidades.origem.valor}`;
  return especialidades.tipoImovel?.valor || null;
}

/* ─────────────────────────────────────────────
   FUNÇÃO PRINCIPAL — calcularDNA
───────────────────────────────────────────── */

/**
 * Calcula o DNA Comercial completo de um consultor.
 * @param {object} corretor
 * @param {Array}  allLeads
 * @returns {DNAResult}
 */
function calcularDNA(corretor, allLeads) {
  const leads         = _leadsDeCorretor(allLeads, corretor.nome);
  const metricas      = calcularMetricas(leads);
  const especialidades = calcularEspecialidades(leads);
  const evolucao      = calcularEvolucao(leads);
  const { forcas, melhorias } = calcularForcas(metricas, especialidades);
  const sugestoes     = gerarSugestoesDNA(metricas, especialidades);
  const perfil        = gerarPerfilTextual(corretor.nome, metricas, especialidades);
  const espPrincipal  = especialidadePrincipal(especialidades);

  return {
    corretor,
    metricas,
    especialidades,
    evolucao,
    forcas,
    melhorias,
    sugestoes,
    perfil,
    espPrincipal,
    // Helpers formatados para exibição
    fmt: {
      taxaConversao    : `${metricas.taxaConversao}%`,
      tempoResposta    : metricas.tempoMedioResposta !== null
        ? (metricas.tempoMedioResposta < 1 ? '< 1h' : `${metricas.tempoMedioResposta}h`)
        : '—',
      tempoVenda       : metricas.tempoMedioVenda !== null ? `${metricas.tempoMedioVenda} dias` : '—',
      ticketMedio      : _fmtBRL(metricas.ticketMedio),
      vgvTotal         : _fmtBRL(metricas.vgvTotal),
      regiaoDestaque   : especialidades.bairro?.valor || especialidades.cidade?.valor || '—',
      tipoDestaque     : especialidades.tipoImovel?.valor || '—',
    },
    // Para integração futura com Distribuição Inteligente
    distribuicaoHints: {
      tipoPreferido    : especialidades.tipoImovel?.valor || null,
      bairroPreferido  : especialidades.bairro?.valor || null,
      faixaPreferida   : especialidades.faixaPreco?.valor || null,
      origemMelhor     : especialidades.origem?.valor || null,
      melhorHorario    : especialidades.melhorHorario || null,
      melhorDia        : especialidades.melhorDia || null,
    },
  };
}

/**
 * Calcula DNA de toda a equipe.
 * @param {Array} allCorretores
 * @param {Array} allLeads
 * @returns {DNAResult[]}
 */
function calcularDNAEquipe(allCorretores, allLeads) {
  return allCorretores
    .filter(c => c.nome && !['CEO','Diretor'].includes(c.cargo))
    .map(c => calcularDNA(c, allLeads))
    .sort((a, b) => b.metricas.taxaConversao - a.metricas.taxaConversao);
}
