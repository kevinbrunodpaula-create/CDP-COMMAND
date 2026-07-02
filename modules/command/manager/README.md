# CDP — COMMAND SCORE ENGINE

**Sprint:** SPR-003  
**Módulo:** `modules/command/manager/`  
**Status:** ✅ Implementado

---

## Objetivo

Calcular automaticamente um Score de 0–100 para cada consultor, com **explicação transparente** de cada critério. O Score será usado futuramente pelo Recovery e pela Distribuição Inteligente.

Esta Sprint: apenas calcula, apresenta e justifica. Sem ações automáticas.

---

## Arquitetura

```
modules/command/manager/
  ├── ScoreCalculator.js   ← Funções puras: 9 dimensões, sugestões, nível
  ├── ManagerRepository.js ← Cache de sessão + histórico via Events Engine
  ├── ManagerService.js    ← Orquestrador: calcular, cachear, filtrar, dashboard
  ├── manager.js           ← Lógica da tela: grid, team bar, detail panel
  ├── manager.html         ← Template HTML
  ├── manager.css          ← Estilos dedicados (tema roxo)
  └── README.md            ← Este arquivo
```

---

## Pontuação (0–100)

| Critério | Pontos | Como é medido |
|----------|--------|---------------|
| Tempo de resposta | 0–20 | Média de dias entre lead criado e primeiro contato |
| Atualização do CRM | 0–15 | % de leads ativos sem contato há > 7 dias |
| Follow-ups | 0–15 | Registros em `historico_contatos` nos últimos 30 dias |
| Visitas agendadas | 0–10 | Leads em "Visita Marcada" + com `visita_data` recente |
| Visitas realizadas | 0–10 | Leads avançados para Proposta / Documentação / Fechado |
| Propostas | 0–10 | Leads em Proposta, Documentação ou Fechado |
| Vendas | 0–15 | Leads com status Fechado |
| Leads abandonados | −15 a 0 | Leads ativos com 30+ dias sem movimentação |
| Leads recuperados | 0–10 | Leads em Follow-Up com contato nos últimos 7 dias |

---

## Níveis de Classificação

| Score | Nível | Emoji |
|-------|-------|-------|
| 95–100 | Elite | ⭐ |
| 80–94 | Excelente | 🏆 |
| 65–79 | Bom | 👍 |
| 50–64 | Atenção | ⚠️ |
| 0–49 | Crítico | 🚨 |

---

## Integração com Events Engine (SPR-001)

Cada cálculo registra um evento `COMMAND_SCORE_UPDATED` por consultor:

```js
CommandEventService.recordScoreUpdated(
  'Maria Santos',   // nome
  78,               // score
  'Bom',            // nível
  { leads: 14, vendas: 2, criticos: 3 }
);
```

---

## API

```js
// Calcular toda a equipe (com evento)
const scores = await ManagerService.calcularEquipe();

// Obter com cache (sem evento)
const scores = await ManagerService.obterScores();

// Forçar recálculo
const scores = await ManagerService.reprocessar();

// Score de um consultor
const s = await ManagerService.scoreDeConsultor('João Silva');
console.log(s.score, s.nivel, s.sugestoes);

// Dados para o dashboard
const data = await ManagerService.getDashboardData();
// → { scores, scoreMedia, top5, atencao, total }

// Funções puras (sem async)
const score = calcularScore(corretor, allLeads);
const nivel = getScoreLevel(82); // → 'Excelente'
```

---

## Restrições desta Sprint

- ✗ Não redistribui leads
- ✗ Não altera o responsável por nenhum lead
- ✗ Não executa ações automáticas
- ✓ Apenas calcula, apresenta e justifica — decisão sempre humana
