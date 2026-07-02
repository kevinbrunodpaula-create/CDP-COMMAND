/**
 * CDP — COMMAND DNA 2.0
 * DNAQuestionnaire.js — Questionário de 20 perguntas
 * SPR-013 · KR7 Command DNA Inteligente
 */

'use strict';

const DNA_QUESTIONNAIRE_KEY = 'cdp_dna_q_';

/* ─────────────────────────────────────────────
   20 PERGUNTAS CATEGORIZADAS
───────────────────────────────────────────── */
const DNA_PERGUNTAS = [
  // Perfil Comercial
  { id:'p01', cat:'Perfil Comercial', icon:'🎯',
    texto:'Como você se define como consultor?',
    opcoes:['Focado em volume (muitos leads)', 'Focado em qualidade (poucos leads certeiros)', 'Equilibrado entre volume e qualidade', 'Ainda estou descobrindo meu estilo'] },
  { id:'p02', cat:'Perfil Comercial', icon:'🏆',
    texto:'Qual é o seu maior diferencial no atendimento?',
    opcoes:['Velocidade de resposta', 'Conhecimento técnico do produto', 'Relacionamento e empatia', 'Negociação e fechamento'] },

  // Comunicação
  { id:'p03', cat:'Comunicação', icon:'💬',
    texto:'Como você prefere se comunicar com os leads?',
    opcoes:['WhatsApp predominantemente', 'Ligação telefônica', 'E-mail e mensagem formal', 'Presencial sempre que possível'] },
  { id:'p04', cat:'Comunicação', icon:'⏱',
    texto:'Em quanto tempo você costuma responder um novo lead?',
    opcoes:['Em até 10 minutos', 'Em até 1 hora', 'No mesmo dia', 'No próximo dia útil'] },

  // Negociação
  { id:'p05', cat:'Negociação', icon:'🤝',
    texto:'Como você conduz uma negociação difícil?',
    opcoes:['Cedo rapidamente para fechar', 'Mantenho o preço mas ofereço benefícios', 'Negocio parcialmente mantendo margem', 'Prefiro perder a venda a perder margem'] },
  { id:'p06', cat:'Negociação', icon:'💰',
    texto:'Qual é o seu ponto forte em fechamentos?',
    opcoes:['Criação de urgência', 'Construção de valor percebido', 'Comparação com concorrência', 'Suporte ao financiamento'] },

  // Disponibilidade
  { id:'p07', cat:'Disponibilidade', icon:'📅',
    texto:'Quando você está mais disponível para atender?',
    opcoes:['Manhã (8h-12h)', 'Tarde (12h-18h)', 'Noite (18h-21h)', 'Disponível o dia todo'] },
  { id:'p08', cat:'Disponibilidade', icon:'📆',
    texto:'Você atende nos finais de semana?',
    opcoes:['Sábado e domingo o dia todo', 'Apenas sábado', 'Sábado pela manhã', 'Prefiro não atender no fim de semana'] },

  // Especialidade
  { id:'p09', cat:'Especialidade', icon:'🏢',
    texto:'Em qual tipo de imóvel você tem mais experiência?',
    opcoes:['Apartamentos', 'Casas', 'Terrenos', 'Imóveis Comerciais'] },
  { id:'p10', cat:'Especialidade', icon:'🎖',
    texto:'Qual é o seu perfil de especialização?',
    opcoes:['MCMV / Econômico', 'Padrão Médio', 'Alto Padrão / Luxo', 'Geral — atendo todos os perfis'] },

  // Regiões
  { id:'p11', cat:'Regiões', icon:'📍',
    texto:'Em quais regiões você prefere atuar?',
    opcoes:['Centro e região central', 'Bairros consolidados', 'Novos loteamentos / periferia', 'Atendo em toda a cidade'] },
  { id:'p12', cat:'Regiões', icon:'🗺',
    texto:'Como você conhece as regiões onde atua?',
    opcoes:['Muito bem — moro ou já morei lá', 'Bem — visito frequentemente', 'Superficialmente — pesquiso conforme necessário', 'Estou aprendendo ainda'] },

  // Tipos de imóvel
  { id:'p13', cat:'Tipos de Imóvel', icon:'🏠',
    texto:'Qual tipo de produto você tem mais facilidade de vender?',
    opcoes:['Lançamentos na planta', 'Imóveis prontos para morar', 'Usados / revenda', 'Indiferente'] },
  { id:'p14', cat:'Tipos de Imóvel', icon:'🔑',
    texto:'Qual é o número de dormitórios mais comum nas suas vendas?',
    opcoes:['Kitnet / Studio', '2 dormitórios', '3 dormitórios', '4 dormitórios ou mais'] },

  // Faixa de preço
  { id:'p15', cat:'Faixa de Preço', icon:'💵',
    texto:'Qual é a faixa de preço que você mais vende?',
    opcoes:['Até R$300 mil', 'R$300k a R$600k', 'R$600k a R$1 milhão', 'Acima de R$1 milhão'] },
  { id:'p16', cat:'Faixa de Preço', icon:'📊',
    texto:'Como você lida com leads de ticket muito alto (acima de R$1M)?',
    opcoes:['Me sinto confortável e confiante', 'Atendo mas ainda estou aprendendo', 'Prefiro focar em tickets menores', 'Nunca atendi este perfil'] },

  // Perfil do cliente preferido
  { id:'p17', cat:'Perfil do Cliente', icon:'👤',
    texto:'Qual perfil de cliente você tem mais facilidade de atender?',
    opcoes:['Primeiro comprador / Jovem', 'Família em busca de upgrade', 'Investidor / Multi-imóvel', 'Empresário / Comercial'] },
  { id:'p18', cat:'Perfil do Cliente', icon:'🎯',
    texto:'Como você prefere receber leads?',
    opcoes:['Leads quentes já interessados', 'Leads frios para desenvolver', 'Indicações de clientes', 'Qualquer origem'] },

  // Canal de atendimento
  { id:'p19', cat:'Canal de Atendimento', icon:'📱',
    texto:'Qual canal traz mais resultados para você?',
    opcoes:['WhatsApp / Redes Sociais', 'Telefone / Ligação', 'E-mail Marketing', 'Atendimento presencial / Plantão'] },
  { id:'p20', cat:'Canal de Atendimento', icon:'🌐',
    texto:'Como você prefere fazer follow-up?',
    opcoes:['Mensagem no WhatsApp', 'Ligação telefônica', 'E-mail personalizado', 'Visita presencial'] },
];

/* ─────────────────────────────────────────────
   SALVAR / CARREGAR RESPOSTAS
───────────────────────────────────────────── */
function dnaQSalvar(nomeCorretor, respostas) {
  try {
    const key = DNA_QUESTIONNAIRE_KEY + btoa(unescape(encodeURIComponent(nomeCorretor))).slice(0,20);
    localStorage.setItem(key, JSON.stringify({ respostas, preenchidoEm: new Date().toISOString() }));
    return true;
  } catch { return false; }
}

function dnaQCarregar(nomeCorretor) {
  try {
    const key = DNA_QUESTIONNAIRE_KEY + btoa(unescape(encodeURIComponent(nomeCorretor))).slice(0,20);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function dnaQFoiPreenchido(nomeCorretor) {
  return dnaQCarregar(nomeCorretor) !== null;
}

/* ─────────────────────────────────────────────
   EXTRAIR DADOS DO QUESTIONÁRIO PARA O DNA
───────────────────────────────────────────── */
function dnaQExtrairPerfil(nomeCorretor) {
  const dados = dnaQCarregar(nomeCorretor);
  if (!dados) return null;
  const r = dados.respostas;

  // Mapeia respostas para scores/hints
  const comunicacao = r.p04 === 0 ? 100 : r.p04 === 1 ? 80 : r.p04 === 2 ? 55 : 30;

  const canalPref = ['WhatsApp','Telefone','E-mail','Presencial'][r.p19 ?? 0] || 'WhatsApp';

  const tipoImovelPref = ['Apartamento','Casa','Terreno','Comercial'][r.p09 ?? 0] || null;

  const faixaPref = ['Econômico (até R$300k)','Médio (R$300k–R$600k)','Alto (R$600k–R$1M)','Alto Padrão (acima R$1M)'][r.p15 ?? 1] || null;

  const dispFimDeSemana = r.p08 !== undefined && r.p08 < 3;

  const perfilCliente = ['Primeiro comprador','Família upgrade','Investidor','Empresário'][r.p17 ?? 0] || null;

  return { comunicacao, canalPref, tipoImovelPref, faixaPref, dispFimDeSemana, perfilCliente, respostas:r };
}
