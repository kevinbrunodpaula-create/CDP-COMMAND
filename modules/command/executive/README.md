# CDP — MORNING BRIEFING & WAR ROOM

**Sprint:** SPR-008  
**Módulo:** `modules/command/executive/`  
**Epic:** COMMAND EXECUTIVE  
**Status:** ✅ Implementado

---

## Objetivo

Painel executivo com Briefing Diário automático e Sala de Guerra (War Room) para CEO/Diretor. Analisa toda a operação e apresenta inteligência acionável.

---

## Arquitetura

```
modules/command/executive/
  ├── BriefingGenerator.js   ← Análise pura: 24h, meta/forecast, alertas, war room, insights
  ├── WarRoomEngine.js        ← Scoring de problemas/oportunidades, temperatura operacional
  ├── ExecutiveRepository.js  ← Cache sessão (30 min) + meta mensal (localStorage)
  ├── ExecutiveService.js     ← Orquestrador: gera, cacheia, registra eventos
  ├── executive.js            ← Tela completa: header, KPIs, previsão, alertas, war room, insights
  ├── executive.css           ← Estilos executivos
  └── README.md               ← Este arquivo
```

---

## Morning Briefing — O que analisa

### Resumo 24h
Leads recebidos · Atendimentos · Visitas · Propostas · Vendas · VGV · Recuperados · Perdidos · Delta vs ontem

### Previsão do Mês
Meta configurável · VGV realizado · % atingido · Projeção linear para fim do mês · Tendência (acelerando/estável/desacelerando) · Pipeline ativo

### Alertas Automáticos (7 tipos)
| Alerta | Critério |
|--------|----------|
| Leads sem 1º contato | > 6h sem atendimento |
| Leads críticos | 15–29 dias sem movimentação |
| Leads abandonados | 30+ dias sem movimento |
| Visitas não confirmadas | Visita marcada para hoje |
| Propostas sem retorno | Proposta sem resposta > 7 dias |
| Corretores sobrecarregados | > 15 leads ativos |
| ICC em queda | Tendência ↓ no Trust Engine |

---

## War Room

- **Top 10 Problemas** — ordenados por urgência/impacto
- **Top 10 Oportunidades** — ordenadas por potencial
- **Maior risco do dia** — problema #1 destacado
- **Maior oportunidade** — oportunidade #1 destacada
- **Temperatura operacional** — gauge 0–100 baseado em alertas críticos

---

## Insights Automáticos (até 6)

Exemplos gerados:
- "3 leads recebidos hoje — +2 em relação a ontem."
- "Meta do mês: 78% atingido. Projeção de fechamento: R$ 1,8M. Tendência: Acelerando."
- "Alta conversão em Centro (35%) — priorizar leads dessa região."
- "Destaque do dia: Maria Santos com 8 atendimentos."

---

## Integração

- **Trust Engine (SPR-005):** ICC em queda → alerta automático
- **Events Engine (SPR-001):** `COMMAND_BRIEFING_GENERATED`, `COMMAND_WARROOM_UPDATED`
- **Meta mensal:** configurável pelo gestor direto na tela (persiste em localStorage)

---

## API

```js
// Gerar briefing (30 min de cache)
const b = await ExecutiveService.obterBriefing();
// b.resumo24h, b.previsao, b.alertas, b.warRoom, b.insights

// Forçar atualização
const b = await ExecutiveService.atualizar();

// Configurar meta mensal
ExecutiveService.setMeta(2000000); // R$ 2M
```
