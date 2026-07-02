# CDP — COMMAND INTELLIGENCE

**Release:** 2.9  
**Módulo:** `modules/command/intelligence/`  
**Epic:** COMMAND INTELLIGENCE  
**Status:** ✅ Implementado

---

## Objetivo

Transformar dados em decisões. Centraliza toda a inteligência operacional do KR7 COMMAND em 4 engines especializadas, integradas a todos os módulos anteriores.

---

## 4 Engines

### 1. Predictor Engine
6 probabilidades automáticas por lead (0–100%):

| Predição | Fatores usados |
|----------|----------------|
| Venda | ICC + DNA + dias parado + status |
| Proposta | ICC + status + valor informado |
| Visita | ICC + bairro + tipo + status |
| Desistência | Dias parado + telefone + corretor |
| Financiamento | Valor + interesse |
| Recuperação | Dias parado + ICC + telefone |

Cada predição retorna: percentual, estrelas (★★★★★), motivos utilizados.

### 2. Coach Engine
Treinador virtual por consultor:
- Análise de hábitos (tempo resposta, FU, visitas, propostas, qualidade CRM)
- Score de maturidade comercial 0–100
- Pontos fortes e fracos (até 4 cada)
- Plano de evolução com prazo e meta
- Sugestões personalizadas do Coach
- Treinamentos recomendados

### 3. Performance Engine
- Metas inteligentes: diária, semanal, mensal, anual (calculadas por histórico)
- Ranking da equipe com score 0–100
- Gráfico de evolução semanal (6 semanas)
- Métricas detalhadas por período

### 4. Automation Engine (Motor de Regras — sem IA)
8 regras automáticas, sem execução automática — apenas sugestões para o gestor:

| Trigger | Ação sugerida |
|---------|---------------|
| Lead parado (7–30d) | Criar missão + avisar gestor |
| Visita hoje/amanhã | Lembrete de confirmação |
| ICC em queda | Alerta + coaching |
| Lead crítico (15–30d) | Recovery + missão urgente |
| Proposta expirada (7d+) | Acompanhamento |
| Lead sem corretor | Distribuição inteligente |
| Corretor sobrecarregado (15+) | Balancear carteira |
| Meta atingida (5+ vendas) | Conquista |

---

## Integração com módulos anteriores

| Módulo | Sprint | Como usa |
|--------|--------|----------|
| Trust Engine (ICC) | SPR-005 | Fator principal nas predições e coach |
| DNA Comercial | SPR-004 | DNA hints nas predições de venda/visita |
| Recovery | SPR-002 | Referência nas regras de automação |
| Distribution | SPR-006 | Sugestão nas regras de lead sem corretor |
| Events Engine | SPR-001 | 4 novos eventos de inteligência |

---

## Eventos

```js
COMMAND_PREDICTION_CREATED   // Por análise de lead
COMMAND_COACH_UPDATED        // Por geração de coach
COMMAND_PERFORMANCE_UPDATED  // Por cálculo de ranking
COMMAND_AUTOMATION_EXECUTED  // Por aprovação de regra
```

---

## API

```js
// Predictor
const pred = await IntelligenceService.obterPredicoes();
// pred[i].predicoes[0] → { tipo:'Venda', pct:72, estrelas:4, motivos:[], cor:'#22C55E' }

// Coach
const coach = await IntelligenceService.obterCoach();
// coach[i].maturidade, coach[i].fortes, coach[i].plano, coach[i].sugestoes

// Performance
const perf = await IntelligenceService.obterPerformance();
// perf[i].score, perf[i].metas, perf[i].evolucao

// Automation
const auto = await IntelligenceService.obterAutomacoes();
// auto.regras[], auto.resumo.criticas

// Reprocessar tudo de uma vez
await IntelligenceService.reprocessarTudo();
```
