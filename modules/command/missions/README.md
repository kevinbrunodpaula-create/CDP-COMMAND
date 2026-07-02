# CDP — SMART MISSIONS ENGINE

**Sprint:** SPR-007  
**Módulo:** `modules/command/missions/`  
**Epic:** COMMAND OPERATION  
**Status:** ✅ Implementado

---

## Objetivo

Gerar automaticamente missões diárias para cada consultor com base na situação da sua carteira. Missões são priorizadas, têm prazo e pontuação — gamificando a produtividade da equipe.

---

## Arquitetura

```
modules/command/missions/
  ├── MissionRules.js     ← 10 regras puras de geração + constantes de missão/nível/gamificação
  ├── MissionEngine.js    ← Motor: expiração, conclusão, cancelamento, stats
  ├── MissionRepository.js ← localStorage: missões do dia, XP, histórico
  ├── MissionService.js   ← Orquestrador: gerar, concluir, cancelar, stats, filtros
  ├── missions.js         ← Tela: view consultor + view gestor + XP popup + resumo diário
  ├── missions.css        ← Estilos (tema amarelo), XP bar, cards, gamificação
  └── README.md           ← Este arquivo
```

---

## 10 Tipos de Missão

| Tipo | Prioridade padrão | Prazo |
|------|-------------------|-------|
| Primeiro contato | Crítica | 4h |
| Lead crítico → Ligar | Crítica | 6h |
| Confirmar visita | Crítica/Alta | 2–12h |
| Finalizar negociação | Crítica/Alta | 8h |
| Follow-up em risco | Alta | 12h |
| Recuperar lead | Alta | 24h |
| Enviar proposta | Alta | 24h |
| Follow-up atrasado | Alta/Média | 24h |
| Agendar visita | Média | 48h |
| Atualizar CRM | Alta/Média | 24h |

---

## Prioridades

| Emoji | Nível | Pontos | XP | Tempo estimado |
|-------|-------|--------|----|----------------|
| 🔴 | Crítica | 40 | 60 | 30 min |
| 🟠 | Alta | 25 | 38 | 60 min |
| 🟡 | Média | 15 | 23 | 120 min |
| 🟢 | Baixa | 8 | 12 | 240 min |

---

## Gamificação

| Nível | XP mínimo | Emoji |
|-------|-----------|-------|
| Bronze | 0 | 🥉 |
| Prata | 200 | 🥈 |
| Ouro | 500 | 🥇 |
| Diamante | 1.000 | 💎 |
| Elite KR7 | 2.000 | ⭐ |

XP e pontos ficam no localStorage — persistem entre sessões.

---

## Integração

- **Trust Engine (SPR-005):** ICC é usado para calibrar prioridades das missões
- **Events Engine (SPR-001):** `MISSION_CREATED`, `MISSION_COMPLETED`, `MISSION_EXPIRED`
- **allLeads / allCorretores:** geração automática com dados reais do CRM

---

## API

```js
// Gerar missões para a equipe
await MissionService.gerarParaEquipe();

// Obter (com cache do dia)
const mapa = await MissionService.obterMissoes();
// mapa['Maria Santos'] → Mission[]

// Missões de um consultor
const missoes = await MissionService.missoesDeCorretor('João', 'PENDENTE');

// Concluir missão
const { xp, pontos, nivel } = await MissionService.concluir('João', missionId);

// Stats para o gestor
const stats = await MissionService.getStatsEquipe();
// stats.top5, stats.atrasados, stats.taxaGeral

// XP e nível
const xpTotal = MissionRepository.getXP('João'); // → 850
const nivel   = getNivel(xpTotal);               // → { nome:'Ouro', emoji:'🥇' }
```

---

## Restrições SPR-007

- ✗ Não envia notificações
- ✗ Não executa automações
- ✓ Gera, acompanha e conclui missões — decisão sempre do consultor/gestor
