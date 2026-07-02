# CDP — COMMAND TRUST ENGINE (ICC)

**Sprint:** SPR-005  
**Módulo:** `modules/command/trust/`  
**Status:** ✅ Implementado

---

## Objetivo

Calcular o **Índice de Confiança do Corretor (ICC)** — um índice de 0 a 100 que representa o nível de confiança do COMMAND em cada consultor. Toda alteração tem justificativa automática gerada pelo sistema.

---

## Arquitetura

```
modules/command/trust/
  ├── TrustCalculator.js  ← 8 critérios puros + tendência + justificativa + distribuicaoWeight
  ├── TrustHistory.js     ← Histórico local (localStorage) para gráfico de evolução
  ├── TrustRepository.js  ← Cache de sessão + histórico de eventos
  ├── TrustService.js     ← Orquestrador + rankings + getDistribuicaoWeights()
  ├── trust.js            ← Tela: gauge SVG, grid, filtros, painel lateral
  ├── trust.css           ← Estilos (tema índigo)
  └── README.md           ← Este arquivo
```

---

## Critérios do ICC

| # | Critério | Peso | Como é medido |
|---|----------|------|---------------|
| 1 | Tempo de resposta | 20% | Horas entre `created_at` e `ultimo_contato` |
| 2 | Atualização do CRM | 15% | % leads ativos sem atualização há > 7 dias |
| 3 | Follow-ups realizados | 15% | Entradas em `historico_contatos` em 30 dias |
| 4 | Comparecimento | 10% | Taxa visitas agendadas → avançadas no funil |
| 5 | Taxa de conversão | 20% | Fechados / Total leads |
| 6 | Qualidade dos registros | 10% | % campos preenchidos (tel, email, valor, bairro, origem, interesse) |
| 7 | Leads abandonados | −15% (pen.) | Ativos com 30+ dias sem movimentação |
| 8 | Leads recuperados | +10% (bônus) | Follow-Up com contato nos últimos 7 dias |

---

## Níveis

| ICC | Nível | Emoji |
|-----|-------|-------|
| 95–100 | COMMANDER | ⭐ |
| 85–94 | ALTA CONFIANÇA | 🏆 |
| 70–84 | CONFIÁVEL | ✅ |
| 50–69 | EM OBSERVAÇÃO | ⚠️ |
| 0–49 | CRÍTICO | 🚨 |

---

## Tendência

Compara os últimos 30 dias com o período anterior (30–60 dias atrás):
- **↑ Evoluindo** — delta ≥ +3 pontos
- **→ Estável** — delta entre −2 e +2
- **↓ Em queda** — delta ≤ −3 pontos

---

## Justificativa automática

Exemplo gerado pelo COMMAND:
> "O ICC de Maria é 88/100. Pontos positivos: tempo de resposta, atualização do crm. Pontos de atenção: leads abandonados."

---

## Integração com Events Engine (SPR-001)

```js
// COMMAND_TRUST_UPDATED — registrado por consultor a cada cálculo
CommandEventService.recordTrustUpdated(nome, iccAnterior, iccAtual, nivel, justificativa, breakdown);

// COMMAND_TRUST_ALERT — disparado quando ICC < 50
CommandEventService.recordTrustAlert(nome, icc, motivo);
```

---

## Preparação para SPR-006 — Distribuição Inteligente

```js
const weights = await TrustService.getDistribuicaoWeights();
// [{nome, icc, nivel, prioridade:'alta'|'normal'|'baixa'|'suspensa', confiavel:bool}]

// No painel de detalhamento já aparece:
// Prioridade: ALTA
// Elegível para distribuição: Sim
```

Consultores com ICC < 50 têm `prioridade:'suspensa'` e `confiavel:false` — a Distribuição Inteligente poderá usá-lo para não enviar leads a esses consultores automaticamente.

---

## API

```js
// Calcular toda a equipe (com eventos)
await TrustService.calcularEquipe();

// Com cache
await TrustService.obterICC();

// Forçar recálculo
await TrustService.reprocessar();

// ICC de um consultor
const r = await TrustService.iccDeConsultor('João Silva');
console.log(r.icc, r.nivel, r.justificativa, r.tendencia);

// Rankings para o dashboard
const data = await TrustService.getDashboardData();
// data.top5, data.top5Evolucao, data.emQueda, data.criticos, data.mediaICC

// Pesos para distribuição
const weights = await TrustService.getDistribuicaoWeights();
```
