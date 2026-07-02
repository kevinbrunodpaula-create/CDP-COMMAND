# CDP — COMMAND RECOVERY

**Sprint:** SPR-002  
**Módulo:** `modules/command/recovery/`  
**Status:** ✅ Implementado

---

## Objetivo

Monitorar, classificar e recomendar ações para leads inativos na carteira. O COMMAND Recovery **não redistribui**, **não altera responsável** e **não executa ações automáticas** — apenas analisa e sugere.

---

## Arquitetura

```
modules/command/recovery/
  ├── RecoveryRules.js       ← Regras de classificação e ações (funções puras)
  ├── RecoveryRepository.js  ← Cache de sessão + acesso ao histórico de eventos
  ├── RecoveryService.js     ← Orquestrador: análise, cache, reprocessamento, filtros
  ├── recovery.js            ← Lógica da tela (render, filtros, KPI click)
  ├── recovery.html          ← Template HTML da tela
  ├── recovery.css           ← Estilos dedicados
  └── README.md              ← Este arquivo
```

---

## Classificações

| Emoji | Nome | Critério |
|-------|------|----------|
| 🟢 | Saudável | < 3 dias sem contato |
| 🟡 | Atenção | 3–6 dias sem contato |
| 🟠 | Em Risco | 7–14 dias sem contato |
| 🔴 | Crítico | 15–29 dias sem contato |
| ⚫ | Abandonado | 30+ dias sem contato |

A data de referência é `ultimo_contato → updated_at → created_at` (nessa ordem).

---

## Ações Recomendadas

| Situação | Ação |
|----------|------|
| Lead Novo / sem contato | Primeiro contato |
| Visita Marcada | Realizar ligação |
| Saudável | Agendar visita |
| Atenção (com telefone) | Enviar WhatsApp |
| Em Risco / Crítico | Realizar ligação |
| Abandonado | Avaliar redistribuição |

---

## Integração com Events Engine (SPR-001)

Cada vez que "Executar Análise" é clicado, um evento `COMMAND_RECOVERY_ANALYSIS` é registrado automaticamente em `command_events`:

```js
// Disparado por RecoveryService.executarAnalise()
CommandEventService.recordRecoveryAnalysis({
  total: 42,
  saudavel: 15,
  atencao: 8,
  risco: 10,
  critico: 6,
  abandonado: 3,
  analisadoEm: '2026-06-26T...'
});
```

O histórico das últimas 5 análises aparece na parte inferior da tela.

---

## Como usar em código

```js
// Análise completa (com cache de 5 min)
const { resultados, resumo } = await RecoveryService.obterAnalise();

// Forçar reprocessamento
const analise = await RecoveryService.reprocessar();

// Filtrar resultados já analisados
const criticos = RecoveryService.aplicarFiltros(resultados, {
  classificacao: 'CRITICO',
  consultor: 'Maria Santos',
});

// Regras isoladas (sem deps)
const cls  = classificarLead(lead);     // → 'CRITICO'
const acao = acaoRecomendada(cls, lead); // → 'Realizar ligação'
```

---

## Restrições desta Sprint

- ✗ Não redistribui leads automaticamente
- ✗ Não altera o corretor responsável
- ✗ Não executa ações (WhatsApp, ligações, etc.)
- ✓ Apenas classifica e sugere — decisão sempre humana
