# CHANGELOG — CDP Central de Performance

---

## [2.9.0] — Release 2.9: COMMAND INTELLIGENCE

**Data:** 2026-06-28
**Release:** 2.9 · KR7 Command Intelligence
**Epic:** COMMAND INTELLIGENCE
**Tipo:** Novo módulo — Inteligência operacional com 4 engines especializadas

### Objetivo
Centralizar toda a inteligência operacional do KR7 COMMAND. Transforma dados em decisões através de 4 engines: Predictor (probabilidades), Coach (treinamento virtual), Performance (metas e ranking) e Automation (motor de regras sem IA).

---

### Arquivos criados (9)

| Arquivo | Linhas | Função |
|---------|--------|--------|
| `PredictionEngine.js` | 230 | 6 predições puras por lead (venda/proposta/visita/desistência/financiamento/recuperação) |
| `CoachEngine.js` | 210 | Coach virtual: hábitos, fortes, fracos, plano de evolução, sugestões, treinamentos |
| `PerformanceEngine.js` | 130 | Metas inteligentes 4 períodos, ranking, gráfico semanal |
| `AutomationEngine.js` | 200 | 8 regras sem IA: triggers + ações sugeridas para aprovação do gestor |
| `IntelligenceRepository.js` | 70 | Cache sessão 10 min (4 engines independentes) |
| `IntelligenceService.js` | 135 | Orquestrador: carrega ICC/DNA, gera, cacheia, filtra |
| `intelligence.js` | 490 | Tela 4 abas completa: Predictor/Coach/Performance/Automation |
| `intelligence.css` | 250 | Estilos (tema índigo), tabs, cards, detail panel, gráficos |
| `README.md` | 120 | Documentação + 4 engines + API |

### Arquivos modificados (4)

| Arquivo | Alteração |
|---------|-----------|
| `CommandEventModel.js` | + 4 tipos de evento + módulo `INTELLIGENCE` |
| `CommandEventService.js` | + `recordPredictionCreated/CoachUpdated/PerformanceUpdated/AutomationExecuted` |
| `index.html` | + `intelligence.css` + 7 scripts + página `page-command-intelligence` |
| `assets/js/app.js` | + "Intelligence" 1º item COMMAND com badge NEW + rota |

---

### Engines implementadas

**Predictor** — 6 probabilidades por lead, com estrelas (★★★★★), percentual e motivos detalhados. Integra ICC (SPR-005) + DNA (SPR-004) + status do funil + dados temporais.

**Coach** — Score de maturidade 0–100 por consultor. Análise de: tempo resposta, follow-ups, visitas, propostas, qualidade do CRM, leads abandonados. Gera plano de evolução com prazo e meta + 3 treinamentos recomendados.

**Performance** — Metas inteligentes (diária/semanal/mensal/anual) calculadas do histórico real. Ranking com score 0–100. Gráfico de evolução por semana (6 semanas).

**Automation** — 8 regras puras (sem IA): lead parado, visita hoje, ICC em queda, lead crítico, proposta expirada, sem corretor, sobrecarregado, meta atingida. Gestor aprova ou rejeita cada sugestão. Zero execução automática.

---

### Critérios de aceite ✅
- ✅ Predictor com 6 probabilidades + estrelas + motivos por lead
- ✅ Coach virtual com análise completa por consultor
- ✅ Performance com metas 4 períodos + ranking + gráfico semanal
- ✅ Automation com 8 regras + aprovação manual do gestor
- ✅ 4 tabs integradas numa única tela
- ✅ Eventos `COMMAND_PREDICTION_CREATED/COACH_UPDATED/PERFORMANCE_UPDATED/AUTOMATION_EXECUTED`
- ✅ Integra Trust Engine (ICC) + DNA Comercial em todas as engines
- ✅ Painel de detalhes do Predictor com breakdown completo
- ✅ Código 100% modular — zero alteração em módulos anteriores

---



## [2.8.0] — SPR-008: Morning Briefing & War Room

**Data:** 2026-06-27
**Sprint:** SPR-008 · KR7 Command Executive
**Epic:** COMMAND EXECUTIVE
**Tipo:** Novo módulo — Painel executivo com briefing diário e sala de guerra

### Objetivo
Criar o painel executivo do KR7 COMMAND com Morning Briefing automático, Sala de Guerra (War Room) e insights inteligentes. Analisa toda a operação e apresenta inteligência acionável para CEO e Diretor.

---

### Arquivos criados (7)

| Arquivo | Linhas | Função |
|---------|--------|--------|
| `BriefingGenerator.js` | 350 | Análise pura: resumo 24h, meta/forecast, 7 tipos de alertas, war room, 6 insights automáticos |
| `WarRoomEngine.js` | 65 | Scoring de problemas/oportunidades, temperatura operacional (0–100) |
| `ExecutiveRepository.js` | 70 | Cache sessão 30 min + meta mensal em localStorage |
| `ExecutiveService.js` | 60 | Orquestrador: gera, cacheia, registra eventos |
| `executive.js` | 320 | Render completo: header, KPIs, previsão, alertas, war room, prioridades, insights, produtividade, modal de meta |
| `executive.css` | 210 | Estilos executivos: briefing header, gauge de temperatura, war room grid |
| `README.md` | 100 | Documentação + alertas + API |

### Arquivos modificados (4)

| Arquivo | Alteração |
|---------|-----------|
| `CommandEventModel.js` | + `COMMAND_BRIEFING_GENERATED`, `COMMAND_WARROOM_UPDATED`; + módulo `EXECUTIVE` |
| `CommandEventService.js` | + `recordBriefingGenerated()`, `recordWarRoomUpdated()` |
| `index.html` | + `executive.css`, + 5 scripts, + página `page-command-executive` |
| `assets/js/app.js` | + "Executive" 1º item COMMAND, + rota, + badge alertas críticos |

---

### O que o Briefing analisa

**Resumo 24h:** 8 KPIs com delta vs ontem (leads, atendimentos, visitas, propostas, vendas, VGV, recuperados, perdidos)

**Previsão do mês:** Meta configurável · VGV realizado · % atingido · Projeção linear · Tendência · Pipeline ativo

**7 tipos de alerta:** sem 1º contato (6h+) · críticos · abandonados · visitas hoje · propostas vencidas · sobrecarregados · ICC em queda

**War Room:** Top 10 problemas + Top 10 oportunidades + Temperatura operacional (0–100) + Maior risco + Maior oportunidade

**Insights automáticos:** até 6 insights contextuais baseados nos dados reais

---

### Critérios de aceite ✅
- ✅ Briefing executivo gerado automaticamente ao abrir a tela
- ✅ 8 KPIs das últimas 24h com delta vs ontem
- ✅ Previsão do mês com meta configurável e barra de progresso
- ✅ 7 tipos de alertas automáticos (Crítico/Alto/Médio)
- ✅ War Room com Top 10 problemas e oportunidades
- ✅ Temperatura operacional (gauge 0–100)
- ✅ Maior risco e maior oportunidade em destaque
- ✅ 5 prioridades do dia
- ✅ 6 insights automáticos contextuais
- ✅ Atividade da equipe: mais ativos vs sem atividade
- ✅ Modal para definir meta mensal (persiste em localStorage)
- ✅ Cache de 30 min com botão "Atualizar Briefing"
- ✅ Eventos `COMMAND_BRIEFING_GENERATED` e `COMMAND_WARROOM_UPDATED`
- ✅ Badge no sidebar com alertas críticos
- ✅ Integra Trust Engine (ICC em queda → alerta)
- ✅ Zero alteração em funcionalidades existentes

---



## [2.7.0] — SPR-007: Smart Missions Engine

**Data:** 2026-06-27
**Sprint:** SPR-007 · KR7 Command Operation
**Epic:** COMMAND OPERATION
**Tipo:** Novo módulo — Sistema de Missões Inteligentes com Gamificação

### Objetivo
Gerar automaticamente tarefas diárias priorizadas para cada consultor com base na situação da carteira. Sistema de gamificação com XP, pontos e 5 níveis (Bronze → Elite KR7). Painel do gestor com ranking e taxa de conclusão da equipe.

---

### Arquivos criados (7)

| Arquivo | Linhas | Função |
|---------|--------|--------|
| `MissionRules.js` | 310 | 10 regras puras + constantes MissionType/Priority/Status/Gamification |
| `MissionEngine.js` | 115 | Expiração, conclusão, cancelamento, stats da equipe |
| `MissionRepository.js` | 120 | localStorage: missões do dia (reset diário), XP/pontos permanentes, histórico |
| `MissionService.js` | 135 | Orquestrador: gerar (com ICC), concluir, cancelar, stats, filtros |
| `missions.js` | 460 | View consultor (XP bar, cards, filtros) + view gestor (ranking, atrasados) + XP popup + resumo diário |
| `missions.css` | 200 | Tema amarelo, XP bar animada, gamification levels, popup, painel gestor |
| `README.md` | 110 | Documentação + 10 tipos + gamificação + API |

### Arquivos modificados (4)

| Arquivo | Alteração |
|---------|-----------|
| `CommandEventModel.js` | + `MISSION_CREATED/COMPLETED/EXPIRED/CANCELLED` + módulo `MISSIONS` |
| `CommandEventService.js` | + `recordMissionCreated/Completed/Expired()` |
| `index.html` | + `missions.css`, + 5 scripts, + página `page-command-missions` |
| `assets/js/app.js` | + "Missões" 1º item COMMAND, + rota, + badge críticas pendentes |

---

### 10 Regras de Geração

| Regra | Tipo de missão | Prioridade |
|-------|----------------|------------|
| Lead Novo sem contato | Primeiro contato | 🔴 Crítica |
| Lead 15–29 dias parado | Realizar ligação | 🔴 Crítica |
| Visita hoje/amanhã | Confirmar visita | 🔴/🟠 |
| Proposta > 3 dias sem resposta | Finalizar negociação | 🔴/🟠 |
| Lead 7–14 dias parado | Follow-up urgente | 🟠 Alta |
| Lead 30+ dias abandonado | Recuperar Lead | 🟠 Alta |
| Lead em atendimento avançado | Enviar proposta | 🟠 Alta |
| Follow-Up > 3 dias sem contato | Responder WhatsApp | 🟠/🟡 |
| Lead qualificado sem visita | Agendar visita | 🟡 Média |
| 3+ leads desatualizados (>5d) | Atualizar CRM | 🟠/🟡 |

### Gamificação — 5 Níveis
`🥉 Bronze (0)` → `🥈 Prata (200)` → `🥇 Ouro (500)` → `💎 Diamante (1.000)` → `⭐ Elite KR7 (2.000)`

### Pontuação por Prioridade
`🔴 Crítica: 40 pts / 60 XP` · `🟠 Alta: 25 pts / 38 XP` · `🟡 Média: 15 pts / 23 XP` · `🟢 Baixa: 8 pts / 12 XP`

---

### Critérios de aceite ✅
- ✅ Engine gerada com 10 regras automáticas baseadas na carteira real
- ✅ View do consultor: XP bar, nível, KPIs, filtros, cards com concluir/ignorar
- ✅ View do gestor: KPIs equipe, top 5, consultores atrasados, ranking XP
- ✅ Gamificação: 5 níveis, XP persistente, popup de recompensa ao concluir
- ✅ Resumo diário: missões, XP ganho, pontos, nível atual
- ✅ Missões críticas pendentes exibidas no badge do sidebar
- ✅ Eventos `MISSION_CREATED/COMPLETED/EXPIRED` registrados
- ✅ Missões do dia resetam automaticamente a cada novo dia
- ✅ Integra ICC (SPR-005) para calibrar prioridades
- ✅ Zero alteração em funcionalidades existentes

---



## [2.6.0] — SPR-006: Smart Lead Distribution Engine

**Data:** 2026-06-27
**Sprint:** SPR-006 · KR7 Command Intelligence
**Epic:** COMMAND INTELLIGENCE
**Tipo:** Novo módulo — Motor Inteligente de Distribuição de Leads

### Objetivo
Criar o motor que analisa todos os leads e recomenda qual consultor tem maior probabilidade de conversão para cada um, com justificativa detalhada, ranking dos 5 melhores e simulação de impacto. A decisão final é sempre do gestor.

---

### Arquivos criados (7)

| Arquivo | Linhas | Função |
|---------|--------|--------|
| `DistributionRules.js` | 270 | 10 regras puras de scoring lead↔consultor (R1–R10) |
| `DistributionEngine.js` | 195 | Motor: builds ICC/DNA maps, ranking, simulação, dashboard data |
| `DistributionRepository.js` | 80 | Cache sessão 5 min + eventos |
| `DistributionService.js` | 165 | Orquestrador: carrega ICC/DNA, analisa, simula, filtra |
| `distribution.js` | 415 | Tela: tabela, filtros, painel detalhado, modal de simulação |
| `distribution.css` | 230 | Estilos (tema laranja), tabela, badges prob., simulação |
| `README.md` | 120 | Documentação + 10 critérios + API + prep próximas sprints |

### Arquivos modificados (4)

| Arquivo | Alteração |
|---------|-----------|
| `modules/command/events/CommandEventModel.js` | + `COMMAND_DISTRIBUTION_ANALYZED`, `COMMAND_DISTRIBUTION_RECOMMENDED`; + módulo `DISTRIBUTION` |
| `modules/command/events/CommandEventService.js` | + `recordDistributionAnalyzed()`, `recordDistributionRecommended()` |
| `index.html` | + `distribution.css`, + 5 scripts, + página `page-command-distribution` |
| `assets/js/app.js` | + item "Distribuição" no sidebar (1º do COMMAND), + rota, + badge leads sem corretor |

---

### 10 Critérios de análise

| # | Regra | Peso | Fonte de dados |
|---|-------|------|----------------|
| 1 | ICC do consultor | 25 pts | TrustService (SPR-005) |
| 2 | Tipo de imóvel | 15 pts | DNA `tipoPreferido` (SPR-004) |
| 3 | Região / Bairro | 12 pts | DNA `bairroPreferido` |
| 4 | Faixa de preço | 10 pts | DNA `faixaPreferida` |
| 5 | Origem do lead | 8 pts | DNA `origemMelhor` |
| 6 | Carga de trabalho | 12 pts | Leads ativos do corretor |
| 7 | Tempo sem lead | 8 pts | Data do último lead recebido |
| 8 | Conversão histórica | 10 pts | DNA `taxaConversao` |
| 9 | Tempo de resposta | 10 pts | ICC `tempoMedioResposta` |
| 10 | Leads críticos | −8 pts (pen.) | ICC `stats.abandonados` |

### Resultado por lead
- Consultor recomendado + probabilidade de conversão (0–97%)
- Nível de confiança: Alta / Média / Baixa
- Justificativa detalhada em texto
- Top 5 ranking de consultores com motivos

### Simulação
- Probabilidade de conversão prevista para a equipe
- Índice de equilíbrio da carteira
- Consultores sobrecarregados e disponíveis
- Gráfico de distribuição por consultor

---

### Critérios de aceite ✅
- ✅ Engine criada com 10 critérios de matching
- ✅ Integra ICC (SPR-005) + DNA (SPR-004) + dados do CRM
- ✅ Ranking dos 5 melhores consultores por lead
- ✅ Justificativa detalhada por recomendação
- ✅ Painel de análise com breakdown de todos os fatores
- ✅ Simulação de distribuição com impacto esperado
- ✅ Filtros: busca, status, probabilidade mínima, sem corretor
- ✅ KPIs: recomendações, prob. média, alta prob., sem corretor
- ✅ Eventos `COMMAND_DISTRIBUTION_ANALYZED` e `COMMAND_DISTRIBUTION_RECOMMENDED`
- ✅ Badge no sidebar com leads sem corretor
- ✅ Preparado para: distribuição automática, manual, programada e por IA
- ✅ Zero alteração em funcionalidades existentes

---



## [2.5.0] — SPR-005: COMMAND Trust Engine (ICC)

**Data:** 2026-06-27
**Sprint:** SPR-005 · KR7 Command Trust
**Tipo:** Novo módulo — Índice de Confiança do Corretor

### Objetivo
Criar o ICC (Índice de Confiança do Corretor), substituindo o conceito genérico de Score. O ICC representa o nível de confiança do COMMAND em cada consultor, com justificativa automática para toda alteração e preparação completa para a Distribuição Inteligente (SPR-006).

---

### Arquivos criados (7)

| Arquivo | Linhas | Função |
|---------|--------|--------|
| `modules/command/trust/TrustCalculator.js` | 320 | 8 critérios puros + tendência + justificativa automática + `distribuicaoWeight` |
| `modules/command/trust/TrustHistory.js` | 105 | Histórico localStorage (até 12 snapshots por consultor) para gráfico de evolução |
| `modules/command/trust/TrustRepository.js` | 95 | Cache de sessão (10 min) + acesso ao histórico de eventos |
| `modules/command/trust/TrustService.js` | 145 | Orquestrador: calcular, cachear, rankings, `getDistribuicaoWeights()` |
| `modules/command/trust/trust.js` | 360 | Grid com gauge SVG, filtros, painel lateral completo, gráfico de evolução |
| `modules/command/trust/trust.css` | 220 | Estilos (tema índigo), gauge arco SVG, cards, painel deslizante |
| `modules/command/trust/README.md` | 125 | Documentação + critérios + API + prep SPR-006 |

### Arquivos modificados (4)

| Arquivo | Alteração |
|---------|-----------|
| `modules/command/events/CommandEventModel.js` | + `COMMAND_TRUST_UPDATED`, `COMMAND_TRUST_ALERT`; + módulo `TRUST` |
| `modules/command/events/CommandEventService.js` | + `recordTrustUpdated()`, `recordTrustAlert()` |
| `index.html` | + `trust.css`, + 5 scripts Trust, + página `page-command-trust` |
| `assets/js/app.js` | + item "Índice de Confiança" no sidebar, + rota `command-trust`, + badge ICC críticos |

---

### Critérios do ICC (8 dimensões)

| Critério | Peso | Dados usados |
|----------|------|--------------|
| Tempo de resposta | 20% | `created_at` → `ultimo_contato` |
| Atualização do CRM | 15% | % leads ativos sem update > 7 dias |
| Follow-ups | 15% | `historico_contatos` últimos 30 dias |
| Comparecimento | 10% | Visitas agendadas → avançadas no funil |
| Taxa de conversão | 20% | Fechados / Total |
| Qualidade dos registros | 10% | % campos preenchidos |
| Leads abandonados | −15 (pen.) | Ativos com 30+ dias sem movimento |
| Leads recuperados | +10 (bônus) | Follow-Up com contato < 7 dias |

### Níveis: COMMANDER (95+) · ALTA CONFIANÇA (85+) · CONFIÁVEL (70+) · EM OBSERVAÇÃO (50+) · CRÍTICO (<50)

### Tendência: ↑ Evoluindo · → Estável · ↓ Em queda (comparando últimos 30d vs período anterior)

---

### Diferenciais do ICC vs Score (SPR-003)

| | Score (SPR-003) | ICC (SPR-005) |
|-|-----------------|---------------|
| Histórico | Apenas eventos | localStorage com gráfico |
| Justificativa | Genérica | Específica por delta e critérios |
| Tendência | Não | ↑ → ↓ automática |
| Gauge visual | Barra linear | Arco SVG semi-circular |
| Prep distribuição | Não | `distribuicaoWeight` completo |
| Alertas | Não | `COMMAND_TRUST_ALERT` se ICC < 50 |

---

### Preparação SPR-006 — Distribuição Inteligente

```js
const weights = await TrustService.getDistribuicaoWeights();
// [{nome, icc, nivel, prioridade:'alta'|'normal'|'baixa'|'suspensa', confiavel:bool}]
```
ICC < 50 → `prioridade:'suspensa'`, `confiavel:false` → não recebe leads automaticamente.

---

### Critérios de aceite ✅
- ✅ ICC 0–100 calculado com 8 critérios + penalidade + bônus
- ✅ 5 níveis: COMMANDER → ALTA CONFIANÇA → CONFIÁVEL → EM OBSERVAÇÃO → CRÍTICO
- ✅ Tendência ↑→↓ automática comparando 30 dias vs período anterior
- ✅ Justificativa automática por consultor
- ✅ Histórico em localStorage com gráfico de evolução
- ✅ Gauge SVG semi-circular por card
- ✅ Painel de detalhamento: gauge, justificativa, gráfico, breakdown, fortes, fracos, sugestões, eventos
- ✅ Filtros: nível, tendência, busca por nome
- ✅ Eventos `COMMAND_TRUST_UPDATED` e `COMMAND_TRUST_ALERT` registrados automaticamente
- ✅ Badge no sidebar com consultores ICC Crítico
- ✅ `distribuicaoWeight` preparado para SPR-006
- ✅ Zero alteração em funcionalidades existentes

---



## [2.4.0] — SPR-004: COMMAND DNA Engine

**Data:** 2026-06-27
**Sprint:** SPR-004 · KR7 Command DNA
**Tipo:** Novo módulo — Perfil comercial automático de consultores

### Objetivo
Descobrir automaticamente o perfil comercial de cada consultor usando os dados do CRM: especialidades por região, tipo de imóvel, faixa de preço, horários de maior conversão. Prepara a estrutura para Distribuição Inteligente em sprints futuras.

---

### Arquivos criados (7)

| Arquivo | Linhas | Função |
|---------|--------|--------|
| `modules/command/dna/DNACalculator.js` | 390 | Funções puras: métricas, especialidades, forças, sugestões, perfil textual, gráfico, `calcularDNA`, `calcularDNAEquipe` |
| `modules/command/dna/DNARepository.js` | 95 | Cache de sessão (15 min) + acesso ao histórico de eventos |
| `modules/command/dna/DNAService.js` | 105 | Orquestrador: `calcularEquipe`, `obterDNA`, `reprocessar`, `getDNADeConsultor`, `aplicarFiltros` |
| `modules/command/dna/dna.js` | 295 | Grid de cards, detail panel, gráfico de evolução CSS, especialidades |
| `modules/command/dna/dna.css` | 260 | Estilos (tema teal), cards, painel deslizante, chart CSS |
| `modules/command/dna/dna.html` | 65 | Template HTML de referência |
| `modules/command/dna/README.md` | 115 | Documentação + API + preparação para Distribuição Inteligente |

### Arquivos modificados (4)

| Arquivo | Alteração |
|---------|-----------|
| `modules/command/events/CommandEventModel.js` | + `COMMAND_DNA_UPDATED` em `CommandEventType`; + `DNA` em `CommandEventModule` |
| `modules/command/events/CommandEventService.js` | + `recordDNAUpdated(nome, summary)` |
| `index.html` | + `dna.css`, + 4 scripts DNA, + página `page-command-dna` |
| `assets/js/app.js` | + item "DNA Comercial" no sidebar COMMAND, + rota `command-dna` |

---

### O que o DNA analisa

**Métricas (9):** tempo de resposta · conversão · ciclo de venda · follow-ups · visitas · propostas · vendas · perdidos · recuperados

**Especialidades (7, quando há dados suficientes):** bairro destaque · cidade · faixa de preço · tipo de imóvel · origem dos leads · melhor horário · melhor dia

**Outputs:** perfil textual gerado pelo COMMAND · forças (máx. 5) · pontos de melhoria (máx. 4) · sugestões (máx. 3) · gráfico de evolução 6 meses · VGV total

---

### Preparação para Distribuição Inteligente

Cada DNAResult contém `distribuicaoHints`:
```js
{ tipoPreferido, bairroPreferido, faixaPreferida, origemMelhor, melhorHorario, melhorDia }
```
O futuro módulo de Distribuição usará esses hints para rotear leads ao consultor mais compatível.

### Integração SPR-003 (Score Engine)
O card de DNA exibe automaticamente o Score do consultor quando o Score Engine já calculou os dados em memória.

---

### Critérios de aceite ✅
- ✅ DNA Engine criada com análise de 9 métricas + 7 especialidades
- ✅ Tela DNA Comercial com grid de cards (taxa de conversão, especialidade, métricas rápidas, perfil textual)
- ✅ Painel de detalhamento com métricas completas, gráfico evolução 6 meses, especialidades, forças, melhorias, sugestões, VGV, histórico
- ✅ Perfil comercial textual gerado automaticamente pelo COMMAND
- ✅ Evento `COMMAND_DNA_UPDATED` registrado por consultor a cada análise
- ✅ `distribuicaoHints` preparado para futura Distribuição Inteligente
- ✅ Integração visual com Score Engine (SPR-003)
- ✅ Zero alteração em funcionalidades existentes
- ✅ README e CHANGELOG atualizados

---



## [2.3.0] — SPR-003: COMMAND Score Engine

**Data:** 2026-06-26
**Sprint:** SPR-003 · KR7 Command Manager
**Tipo:** Novo módulo — Sistema de pontuação de consultores

### Objetivo
Score automático 0–100 por consultor, com cálculo transparente de 9 dimensões, painel de detalhamento, ranking da equipe e registro de eventos.

---

### Arquivos criados (7)

| Arquivo | Linhas | Função |
|---------|--------|--------|
| `modules/command/manager/ScoreCalculator.js` | 280 | 9 funções puras de cálculo + `getScoreLevel` + `gerarSugestoes` + `calcularScoreEquipe` |
| `modules/command/manager/ManagerRepository.js` | 100 | Cache de sessão (10 min) + histórico via Events Engine |
| `modules/command/manager/ManagerService.js` | 136 | Orquestrador: calcular, cachear, reprocessar, dashboard |
| `modules/command/manager/manager.js` | 280 | Grid de cards, team bar, detail panel, histórico |
| `modules/command/manager/manager.css` | 310 | Estilos (tema roxo, cards, gauge, painel lateral) |
| `modules/command/manager/manager.html` | 80 | Template HTML de referência |
| `modules/command/manager/README.md` | 112 | Documentação completa |

### Arquivos modificados (4)

| Arquivo | Alteração |
|---------|-----------|
| `modules/command/events/CommandEventModel.js` | + `COMMAND_SCORE_UPDATED` em `CommandEventType`; + `MANAGER` em `CommandEventModule` |
| `modules/command/events/CommandEventService.js` | + `recordScoreUpdated(nome, score, nivel, breakdown)` |
| `index.html` | + `manager.css`, + 4 scripts Manager, + página `page-command-manager` |
| `assets/js/app.js` | + item Consultores no sidebar COMMAND, + rota `command-manager`, + badge automático com score Crítico |

---

### Dimensões do Score (9 critérios, total 100 pts)

| # | Critério | Máx | Lógica |
|---|----------|-----|--------|
| 1 | Tempo de resposta | 20 | Média dias entre lead criado e primeiro contato |
| 2 | Atualização CRM | 15 | % ativos sem contato há > 7 dias |
| 3 | Follow-ups | 15 | Entradas em `historico_contatos` nos últimos 30 dias |
| 4 | Visitas agendadas | 10 | Leads em Visita Marcada + visita_data recente |
| 5 | Visitas realizadas | 10 | Leads em Proposta / Documentação / Fechado |
| 6 | Propostas | 10 | Leads em Proposta ou além |
| 7 | Vendas | 15 | Leads com status Fechado |
| 8 | Leads abandonados | −15 | Ativos com 30+ dias sem movimentação |
| 9 | Leads recuperados | +10 | Follow-Up com contato nos últimos 7 dias |

### Níveis: Elite (95+) · Excelente (80+) · Bom (65+) · Atenção (50+) · Crítico (<50)

---

### Critérios de aceite ✅

- ✅ Score automático 0–100 por consultor com 9 dimensões
- ✅ Tela Score Engine com grid de cards e barra de performance da equipe
- ✅ Painel de detalhamento ao clicar no card (score grande + breakdown + positivos/negativos)
- ✅ Sugestões automáticas do COMMAND (máx. 3 por consultor)
- ✅ Score médio da equipe com barra visual
- ✅ Filtros por nível e por nome
- ✅ Evento `COMMAND_SCORE_UPDATED` registrado por consultor a cada cálculo
- ✅ Histórico de scores no painel de detalhamento
- ✅ Badge no sidebar com consultores em nível Crítico
- ✅ Código 100% modular — zero alteração no CRM existente
- ✅ README e CHANGELOG atualizados

---



## [2.2.0] — SPR-002: COMMAND Recovery Engine

**Data:** 2026-06-26
**Sprint:** SPR-002 · KR7 Command Recovery
**Tipo:** Novo módulo — Monitoramento e classificação de carteira

### Objetivo
Criar o COMMAND RECOVERY: monitora todos os leads ativos, classifica automaticamente por tempo de inatividade e recomenda ações. Sem redistribuição automática — apenas análise e sugestão.

---

### Arquivos criados (7)

| Arquivo | Descrição |
|---------|-----------|
| `modules/command/recovery/RecoveryRules.js` | Funções puras: `classificarLead`, `acaoRecomendada`, `motivoClassificacao`, `analisarCarteira` |
| `modules/command/recovery/RecoveryRepository.js` | Cache de sessão (5 min) + acesso ao histórico via Events Engine |
| `modules/command/recovery/RecoveryService.js` | Orquestrador: `executarAnalise`, `obterAnalise`, `reprocessar`, `aplicarFiltros` |
| `modules/command/recovery/recovery.js` | Lógica da tela: KPIs clicáveis, filtros reativos, tabela+cards, histórico |
| `modules/command/recovery/recovery.html` | Template HTML de referência |
| `modules/command/recovery/recovery.css` | 340 linhas de estilos dedicados (tema laranja, tabela, cards mobile) |
| `modules/command/recovery/README.md` | Documentação do módulo |

### Arquivos modificados (4)

| Arquivo | Alteração |
|---------|-----------|
| `modules/command/events/CommandEventModel.js` | + `COMMAND_RECOVERY_ANALYSIS` em `CommandEventType`; + `RECOVERY` em `CommandEventModule` |
| `modules/command/events/CommandEventService.js` | + `recordRecoveryAnalysis(summary)` na API pública |
| `index.html` | + `recovery.css`, + scripts Recovery, + página `page-command-recovery` |
| `assets/js/app.js` | + item Recovery no sidebar COMMAND, + rota `command-recovery`, + badge automático com críticos+abandonados |

---

### Classificações implementadas

| Classificação | Critério | Ação recomendada padrão |
|---------------|----------|------------------------|
| 🟢 Saudável | < 3 dias | Agendar visita |
| 🟡 Atenção | 3–6 dias | Enviar WhatsApp |
| 🟠 Em Risco | 7–14 dias | Realizar ligação |
| 🔴 Crítico | 15–29 dias | Realizar ligação |
| ⚫ Abandonado | 30+ dias | Avaliar redistribuição |

### Filtros disponíveis (6)
Consultor · Origem · Etapa do funil · Classificação · Mínimo de dias · Busca por nome

### Integração com SPR-001
Cada análise gera automaticamente um evento `COMMAND_RECOVERY_ANALYSIS` na tabela `command_events`. O histórico das últimas 5 análises aparece na tela Recovery.

### Badge no sidebar
O badge do item Recovery exibe automaticamente a contagem de leads Críticos + Abandonados após cada `loadAll()`.

---

### Critérios de aceite ✅
- ✅ Recovery funcionando com dados reais do `allLeads`
- ✅ 5 classificações automáticas por tempo de inatividade
- ✅ Tela com header, KPIs, filtros, tabela (desktop) e cards (mobile)
- ✅ KPIs clicáveis filtram a tabela instantaneamente
- ✅ 6 filtros independentes e combináveis
- ✅ Evento `COMMAND_RECOVERY_ANALYSIS` registrado a cada análise
- ✅ Histórico das últimas análises na tela
- ✅ Badge no sidebar com alertas críticos
- ✅ Código 100% modular — zero alteração no CRM existente
- ✅ README e CHANGELOG atualizados

---



## [2.1.0] — SPR-001: COMMAND Events Engine

**Data:** 2026-06-26
**Sprint:** SPR-001 · KR7 Command
**Tipo:** Nova funcionalidade — Camada de auditoria inteligente

### Objetivo
Criar o COMMAND EVENTS ENGINE: uma camada de auditoria que registra automaticamente todos os acontecimentos importantes do sistema em eventos imutáveis.

---

### Arquivos criados

#### Engine principal
| Arquivo | Descrição |
|---------|-----------|
| `modules/command/events/CommandEventModel.js` | Modelo de dados + constantes `CommandEventType`, `CommandEventOrigin`, `CommandEventModule` |
| `modules/command/events/CommandEventRepository.js` | Acesso ao Supabase — SELECT e INSERT controlado. Nunca UPDATE/DELETE |
| `modules/command/events/CommandEventService.js` | API pública para registrar eventos + fila de retry com localStorage |
| `modules/command/events/events.js` | Lógica da tela Events — carregar, filtrar, paginar, renderizar |
| `modules/command/events/events.html` | Template HTML da tela (referência) |
| `modules/command/events/events.css` | Estilos dedicados da tela Events |

#### Database
| Arquivo | Descrição |
|---------|-----------|
| `database/migration_command_events.sql` | Script SQL para criar `command_events` no Supabase, índices e políticas RLS |

#### Modificados
| Arquivo | Alteração |
|---------|-----------|
| `index.html` | + CSS `events.css`, + scripts da engine, + página `page-command-events` inline |
| `assets/js/app.js` | + Seção KR7 COMMAND na sidebar com item Events |
| `README.md` | + Documentação completa do módulo COMMAND Events Engine |

---

### Tipos de Evento (23 tipos)

```
LEAD_CREATED · LEAD_UPDATED · LEAD_IMPORTED · LEAD_ASSIGNED
LEAD_TRANSFERRED · LEAD_RECOVERED · FIRST_CONTACT · PHONE_CALL
WHATSAPP_SENT · EMAIL_SENT · FOLLOWUP · VISIT_SCHEDULED
VISIT_COMPLETED · PROPOSAL_SENT · SALE_COMPLETED · SALE_LOST
CLIENT_CREATED · PROPERTY_CREATED · LOGIN · LOGOUT
USER_CREATED · COMMAND_ALERT · COMMAND_ACTION
```

### Origens (6 origens)
```
USER · SYSTEM · COMMAND · LANDING_PAGE · IMPORT · API
```

### Módulos rastreáveis (15 módulos)
```
leads · imoveis · corretores · agenda · financeiro · configuracoes
usuarios · dashboard · relatorios · auth · import · ligacoes
oferta_ativa · command · system
```

---

### Critérios de aceite ✅

- ✅ Engine criada (`CommandEventModel`, `CommandEventRepository`, `CommandEventService`)
- ✅ Tela Events criada com filtros por módulo, tipo, origem, consultor, lead e período
- ✅ Eventos imutáveis (sem UPDATE/DELETE no Supabase)
- ✅ Fila de retry com localStorage para eventos que falharam
- ✅ API pública `CommandEventService.record()` pronta para integração gradual
- ✅ Atalhos prontos: `recordLogin`, `recordLogout`, `recordLeadCreated`, `recordLeadUpdated`, `recordSaleCompleted`, `recordCommandAlert`
- ✅ Tela acessível no sidebar em KR7 COMMAND → Events (apenas CEO/Diretor)
- ✅ Nenhuma funcionalidade existente alterada
- ✅ Documentação atualizada (README + CHANGELOG)
- ✅ Migration SQL criada para setup no Supabase

---

### Setup necessário no Supabase
Execute `database/migration_command_events.sql` no SQL Editor do Supabase para criar a tabela e as políticas RLS antes de usar o módulo.

---



## [2.0.0] — Reestruturação Arquitetural

**Data:** 2026-06-26
**Tipo:** Refatoração arquitetural completa (sem alteração de funcionalidades)

### Objetivo
Transformar o CDP de um arquivo único (`index.html` com ~6.000 linhas) em uma plataforma modular, organizada por responsabilidade, preparada para crescimento profissional.

---

### Estrutura anterior
```
index.html   ← ~6.038 linhas (CSS + HTML + JS tudo junto)
```

### Estrutura nova
```
CDP/
├── index.html              ← ~250 linhas (shell + loader)
├── assets/css/             ← 2 arquivos CSS separados
├── assets/js/              ← Core da aplicação
├── modules/                ← 9 módulos principais + command
├── services/               ← 6 serviços compartilhados
├── database/               ← Camada de acesso a dados
├── utils/                  ← Helpers UI reutilizáveis
├── docs/                   ← Documentação técnica
└── changelog/              ← Este arquivo
```

---

### Arquivos criados

#### Assets
| Arquivo | Origem | Conteúdo |
|---------|--------|----------|
| `assets/css/main.css` | index.html L17-752 | Estilos globais do sistema |
| `assets/css/chat-ai.css` | index.html L4879-4929 | Estilos do painel de IA |
| `assets/js/app.js` | index.html L3513-3572 | initApp, setupUI, goTo, loadAll |

#### Database
| Arquivo | Origem | Conteúdo |
|---------|--------|----------|
| `database/supabase.js` | index.html L2314-2346 | Config Supabase + abstração SB |

#### Services
| Arquivo | Origem | Conteúdo |
|---------|--------|----------|
| `services/auth.js` | index.html L3373-3572 | Login, biometria, logout |
| `services/permissions.js` | index.html L2347-2365 | PERMS, PODE_APROVAR, perm() |
| `services/email.js` | index.html L2376-2400 | EmailJS (recuperação de senha) |
| `services/import-export.js` | index.html L2939-3247 | CSV, Google Sheets, exportação |
| `services/fila-leads.js` | index.html L2952-3089 | Fila de distribuição de leads |
| `services/conversa-ia.js` | index.html L3247-3373 | Análise de conversa com IA |

#### Módulos
| Módulo | HTML | JS | Funcionalidade |
|--------|------|----|----------------|
| `modules/dashboard/` | ✅ | ✅ | KPIs, gráficos, ranking, funil, Central Inteligente |
| `modules/leads/` | ✅ | ✅ | Kanban, lista, scoring, detail, CRUD, IA |
| `modules/leads/central-ligacoes` | ✅ | ✅ | Discagem, timer, histórico |
| `modules/leads/oferta-ativa` | ✅ | ✅ | Prospecção ativa, fila, ativação |
| `modules/imoveis/` | ✅ | ✅ | CRUD, vitrine, match leads |
| `modules/corretores/` | ✅ | ✅ | CRUD, perfis, filtros |
| `modules/agenda/` | ✅ | ✅ | Calendário, eventos |
| `modules/relatorios/` | ✅ | ✅ | Gráficos, exportação |
| `modules/financeiro/` | ✅ | ✅ | Comissões, distribuição VGV |
| `modules/configuracoes/` | ✅ | ✅ | Usuários, aprovações, solicitações |
| `modules/clientes/` | ✅ | ✅ | Reservado (implementação futura) |

#### Módulo COMMAND (estrutura)
| Submódulo | Status |
|-----------|--------|
| `command/ai/cdp-assistant.js` | ✅ Implementado (migrado) |
| `command/ai/chat-ia.js` | ✅ Implementado (migrado) |
| `command/ai/fila-ia.js` | ✅ Implementado (migrado) |
| `command/dashboard/` | 🔲 Estrutura criada |
| `command/recovery/` | 🔲 Estrutura criada |
| `command/manager/` | 🔲 Estrutura criada |
| `command/coach/` | 🔲 Estrutura criada |
| `command/intelligence/` | 🔲 Estrutura criada |
| `command/analytics/` | 🔲 Estrutura criada |

#### Documentação
| Arquivo | Conteúdo |
|---------|----------|
| `README.md` | Arquitetura, stack, guia de desenvolvimento |
| `changelog/CHANGELOG.md` | Este arquivo |

---

### O que NÃO foi alterado
- ✅ Nenhuma regra de negócio
- ✅ Nenhuma lógica de cálculo (comissões, scoring, funil)
- ✅ Nenhum layout visual
- ✅ Nenhuma identidade visual (cores, tipografia, ícones)
- ✅ Nenhuma funcionalidade removida
- ✅ Nenhuma integração alterada (Supabase, EmailJS, Anthropic)
- ✅ Comportamento idêntico ao sistema original

---

## [1.x.x] — Versões anteriores (monolítico)

Versões anteriores concentradas em `index.html` único.
Referência: arquivos `index9-8-1.html` e versões anteriores.

---

## [2.1.1] — SPR-001: Implementação Completa das Integrações

**Data:** 2026-06-26
**Tipo:** Integrações automáticas — sem instruções manuais

### Eventos integrados automaticamente

| Arquivo | Função | Evento gerado |
|---------|--------|---------------|
| `modules/leads/leads.js` | `registrarContato()` | `FOLLOWUP` |
| `modules/leads/leads.js` | `dropCard()` | `LEAD_UPDATED / SALE_COMPLETED / SALE_LOST / VISIT_SCHEDULED / PROPOSAL_SENT / FIRST_CONTACT` |
| `modules/leads/leads.js` | `saveLead()` | `LEAD_CREATED / LEAD_UPDATED / SALE_COMPLETED / VISIT_SCHEDULED / PROPOSAL_SENT / LEAD_TRANSFERRED` |
| `modules/leads/leads.js` | `confirmarPerda()` | `SALE_LOST` |
| `modules/leads/leads.js` | `confirmarTransferencia()` | `LEAD_TRANSFERRED` |
| `modules/leads/leads.js` | `salvarFollowUp()` | `FOLLOWUP` |
| `modules/imoveis/imoveis.js` | `saveImovel()` | `PROPERTY_CREATED / LEAD_UPDATED` |
| `modules/corretores/corretores.js` | `saveCorretor()` | `USER_CREATED / LEAD_UPDATED` |
| `modules/financeiro/comissoes.js` | `salvarComissao()` | `COMMAND_ACTION` |
| `services/auth.js` | `doLogin()` | `LOGIN` |
| `services/auth.js` | `loginBiometria()` | `LOGIN` |
| `services/import-export.js` | `distribuirDaFila()` | `LEAD_ASSIGNED` |
| `services/import-export.js` | `distribuirLeadsLanding()` | `LEAD_ASSIGNED` |
| `services/import-export.js` | `executarImport()` | `LEAD_IMPORTED` |
| `assets/js/app.js` | `doLogout()` | `LOGOUT` |
| `assets/js/app.js` | `loadAll()` | flush da fila de retry |

### Funções migradas para leads.js
- `saveLead()` — com eventos integrados
- `confirmarPerda()` — com evento SALE_LOST
- `confirmarTransferencia()` — com evento LEAD_TRANSFERRED
- `salvarFollowUp()` — com evento FOLLOWUP

### Rotas adicionadas
- `goTo('command-events')` → `page-command-events` → título "⚡ Command Events"

---

## [4.0.0] — Release 4.0: COMMAND EXPERIENCE

**Data:** 2026-07-01
**Release:** 4.0 · COMMAND EXPERIENCE
**Tipo:** Novo módulo — Cérebro operacional do CDP

### Objetivo
Transformar o COMMAND no centro de operações do CDP. CEO e Diretores entram direto no COMMAND HOME ao fazer login.

### Arquivos criados (2)

| Arquivo | Linhas | Função |
|---------|--------|--------|
| `modules/command/home/command-home.css` | 117 | Estilos completos da COMMAND HOME |
| `modules/command/home/command-home.js` | 694 | 9 componentes integrados |

### Arquivos modificados (3)

| Arquivo | Alteração |
|---------|-----------|
| `index.html` | + CSS + script + `page-command-home` |
| `assets/js/app.js` | + item ⚡ COMMAND no sidebar + redirect CEO → COMMAND HOME |
| `CommandEventModel.js` | + 4 novos tipos de evento |

### 9 Componentes implementados

1. **KPIs operacionais** — 8 métricas em tempo real (ativos, vendas, propostas, visitas, críticos, consultores, conversão, sem corretor)
2. **Saúde da Operação** — Score 0-100 calculado por 6 fatores (conversão, parados, tempo resposta, recovery, corretor, meta)
3. **Recomendações do COMMAND** — Até 6 recomendações automáticas priorizadas com motivo e ação direta
4. **Central de Alertas** — 3 níveis (crítico, aviso, informativo) gerados automaticamente
5. **Insights Automáticos** — 5 insights estatísticos (melhor tipo, melhor origem, top corretor, projeção de meta, recovery)
6. **Timeline da Operação** — 30 eventos mais recentes em ordem cronológica
7. **Botão INICIAR OPERAÇÃO** — Processa ICC + DNA + Intelligence + Missões + loadAll e reporta tempo + análises + recomendações
8. **Painel CEO** — 4 KPIs executivos (Pipeline, Vendas/Mês, VGV/Mês, Problemas) para CEO/Diretor
9. **COMMAND Assistant** — Chatbot por regras respondendo 7 categorias de perguntas operacionais

### Critérios de aceite ✅
- ✅ CEO/Diretor/Gerente entram no COMMAND HOME após login
- ✅ Saúde da operação com score 0-100
- ✅ Recomendações automáticas com motivo e prioridade
- ✅ Central de alertas 3 níveis
- ✅ Insights automáticos
- ✅ Timeline de eventos
- ✅ Botão INICIAR OPERAÇÃO integrado a todos os módulos
- ✅ COMMAND Assistant com 7 tipos de pergunta
- ✅ Painel CEO simplificado
- ✅ Zero alteração em módulos existentes

---

## [4.1.0] — Release 4.1: CODE AUDIT

**Data:** 2026-07-01
**Tipo:** Auditoria e estabilização — zero novas funcionalidades

### Problemas corrigidos (10)

| Severidade | Problema | Arquivo(s) |
|-----------|---------|-----------|
| 🔴 CRÍTICO | 3 scripts carregados 2x em index.html | `index.html` |
| 🔴 CRÍTICO | `initCommandDNA` declarada em 2 arquivos | `dna.js` |
| 🟠 ALTA | `openModal`/`closeModal` em 2 arquivos | `ui-helpers.js` |
| 🟠 ALTA | `showScreen` idêntica em 2 arquivos | `email.js` |
| 🟠 ALTA | `discRegistrarResultado` em 2 arquivos | `chat-ia.js` |
| 🟡 MÉDIA | `getNivel` em 2 arquivos | `MissionRules.js` |
| 🟡 MÉDIA | `fatorOrigem` em 2 arquivos | `PredictionEngine.js` |
| 🟡 MÉDIA | Silent catch vazio | `leads.js` |
| 🟡 MÉDIA | Bloco código órfão | `email.js` |

### Resultado
- **78 arquivos JS — 0 erros de sintaxe**
- Audit Report completo em `docs/AUDIT_REPORT.md`

---

## [5.0.0] — Release 5.0: COMMAND PROFILES + ENGINE

**Data:** 2026-07-01
**Tipo:** Novo módulo — Perfis personalizados por cargo + Motor central

### Novo cargo: Coordenador
Adicionado entre Gerente e Corretor.
Permissões: verTodos, verRelatorio, verEquipe. Sem: verConfig, verUsuarios, aprovar.

### Arquivos criados (5)
| Arquivo | Função |
|---------|--------|
| `modules/command/engine/CommandEngine.js` | Motor central: 10 funções de análise |
| `modules/command/engine/TempoComercial.js` | Registro automático de marcos comerciais |
| `modules/command/profiles/corretor-view.css` | Estilos da visão do Corretor |
| `modules/command/profiles/corretor-view.js` | Interface COMMAND personalizada para Corretor |
| `modules/command/profiles/coordenador-view.js` | Interface COMMAND para Coordenador |

### Comportamento por perfil após login
| Cargo | Redireciona para | Sidebar COMMAND |
|-------|-----------------|-----------------|
| CEO / Diretor / Gerente | ⚡ COMMAND HOME | 10 módulos completos |
| Coordenador | ⚡ COMMAND (equipe) | Recovery + DNA |
| Corretor | ⚡ MEU COMMAND (pessoal) | Minhas Missões |
