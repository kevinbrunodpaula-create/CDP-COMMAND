# CDP — SMART LEAD DISTRIBUTION ENGINE

**Sprint:** SPR-006  
**Módulo:** `modules/command/distribution/`  
**Epic:** COMMAND INTELLIGENCE  
**Status:** ✅ Implementado

---

## Objetivo

Motor inteligente que analisa todos os leads ativos e recomenda qual consultor tem maior probabilidade de conversão para cada um, com justificativa completa e ranking dos 5 melhores. A decisão final é sempre do gestor.

---

## Arquitetura

```
modules/command/distribution/
  ├── DistributionRules.js    ← 10 regras puras de scoring (lead ↔ consultor)
  ├── DistributionEngine.js   ← Motor: mapas ICC/DNA, ranking, simulação, dashboard
  ├── DistributionRepository.js ← Cache sessão (5 min) + histórico de eventos
  ├── DistributionService.js  ← Orquestrador: carrega dependências, executa, filtra
  ├── distribution.js         ← Tela: tabela, filtros, painel detalhado, simulação
  ├── distribution.css        ← Estilos (tema laranja)
  └── README.md               ← Este arquivo
```

---

## Integrações com sprints anteriores

| Módulo | Sprint | Como usa |
|--------|--------|----------|
| Trust Engine (ICC) | SPR-005 | Pontuação principal (25 pts) + `distribuicaoWeight` |
| DNA Comercial | SPR-004 | Especialidade tipo, região, faixa de preço, origem, conversão |
| Events Engine | SPR-001 | `COMMAND_DISTRIBUTION_ANALYZED`, `COMMAND_DISTRIBUTION_RECOMMENDED` |

---

## Critérios de análise (10 regras, total ~110 pts)

| # | Regra | Peso | Dados usados |
|---|-------|------|--------------|
| 1 | ICC do consultor | 25 | TrustService |
| 2 | Especialidade — tipo de imóvel | 15 | DNA `tipoPreferido` vs lead `tipo_imovel` |
| 3 | Região / Bairro | 12 | DNA `bairroPreferido` vs lead `bairro` |
| 4 | Faixa de preço | 10 | DNA `faixaPreferida` vs lead `valor` |
| 5 | Origem do lead | 8 | DNA `origemMelhor` vs lead `origem` |
| 6 | Carga de trabalho | 12 | Leads ativos do corretor |
| 7 | Tempo sem lead | 8 | Data do último lead recebido |
| 8 | Conversão histórica | 10 | DNA `taxaConversao` |
| 9 | Tempo de resposta | 10 | ICC `tempoMedioResposta` |
| 10 | Leads críticos | −8 (pen.) | ICC `stats.abandonados` |

A pontuação bruta é normalizada para 0–100% (probabilidade de conversão, teto 97%).

---

## Níveis de confiança

- **Alta** — probabilidade ≥ 70%
- **Média** — probabilidade 45–69%
- **Baixa** — probabilidade < 45%

---

## API

```js
// Analisar carteira completa
const analises = await DistributionService.analisar();

// Com cache (sem eventos)
const analises = await DistributionService.obterAnalise();

// Forçar recálculo
const analises = await DistributionService.reprocessar();

// Analisar lead específico
const analise = await DistributionService.analisarLead(lead);
// analise.recomendado.corretor.nome
// analise.recomendado.probabilidade
// analise.top5[0..4]
// analise.justificativa

// Simulação de impacto
const sim = await DistributionService.simular();
// sim.probGeral, sim.equilibrio, sim.distribuicao
// sim.sobrecarregados, sim.disponiveis

// Dashboard do COMMAND
const data = await DistributionService.getDashboardData();
// data.totalRecomendados, data.topIndicados
// data.sobrecarregados, data.disponiveis
```

---

## Preparação para sprints futuras

A estrutura está pronta para:
- **Distribuição Automática** — aplicar `recomendado` diretamente ao `corretor` do lead
- **Distribuição Manual** — gestor aprova individualmente pelo painel
- **Distribuição Programada** — executar em horário definido
- **Distribuição por IA** — enriquecer os dados com LLM antes do match

O campo `distribuicaoWeight` do Trust Engine (SPR-005) já integra com o critério R1.

---

## Restrições SPR-006

- ✗ Não altera o corretor de nenhum lead
- ✗ Não executa redistribuição automática
- ✓ Apenas analisa, recomenda e simula — decisão é sempre do gestor
