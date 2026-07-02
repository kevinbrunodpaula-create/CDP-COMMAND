# CDP — COMMAND DNA ENGINE

**Sprint:** SPR-004  
**Módulo:** `modules/command/dna/`  
**Status:** ✅ Implementado

---

## Objetivo

Descobrir automaticamente o perfil comercial de cada consultor usando os dados existentes no CRM. O DNA Comercial identifica especialidades, forças, padrões de comportamento e gera sugestões personalizadas.

**Esta Sprint:** apenas análise e apresentação. Sem automações.

---

## Arquitetura

```
modules/command/dna/
  ├── DNACalculator.js   ← Funções puras: métricas, especialidades, forças, perfil, gráfico
  ├── DNARepository.js   ← Cache de sessão (15 min) + histórico via Events Engine
  ├── DNAService.js      ← Orquestrador: calcular, cachear, filtrar
  ├── dna.js             ← Lógica da tela: grid, detail panel, gráfico de evolução
  ├── dna.css            ← Estilos (tema teal)
  ├── dna.html           ← Template HTML de referência
  └── README.md          ← Este arquivo
```

---

## O que o DNA analisa

### Métricas comerciais
| Métrica | Como é calculada |
|---------|-----------------|
| Tempo médio de resposta | `created_at` → `ultimo_contato` (horas) |
| Taxa de conversão | Fechados / Total |
| Ciclo de venda | `created_at` → `fechado_em` (dias) |
| Total de follow-ups | Entradas em `historico_contatos` |
| Visitas | Leads em Visita Marcada, Proposta, Documentação, Fechado |
| Propostas | Leads em Proposta, Documentação, Fechado |
| Vendas | Leads com status Fechado |
| Leads perdidos | Leads com status Perdido |
| Leads recuperados | Follow-Up com contato < 7 dias |

### Especialidades (quando há dados suficientes, mín. 3 leads)
- **Bairro** com maior taxa de conversão
- **Cidade** com maior taxa de conversão
- **Faixa de preço** (< 200k / 200k–400k / 400k–700k / 700k–1M / > 1M)
- **Tipo de imóvel** com maior conversão
- **Origem** dos leads com maior conversão
- **Melhor horário** (Manhã / Tarde / Noite)
- **Melhor dia** da semana

---

## Integração com SPR-003 (Score Engine)

O card de DNA exibe automaticamente o Score do consultor calculado pelo Score Engine (quando disponível), integrando os dois módulos visualmente.

## Integração com Events Engine (SPR-001)

Cada análise registra `COMMAND_DNA_UPDATED` em `command_events`:

```js
CommandEventService.recordDNAUpdated('Maria Santos', {
  taxaConversao: 28,
  vendas: 4,
  especialidadePrincipal: 'Apartamento',
  regiaoDestaque: 'Centro',
  distribuicaoHints: { tipoPreferido: 'Apartamento', bairroPreferido: 'Centro', ... }
});
```

---

## Preparação para Distribuição Inteligente (futura Sprint)

Cada resultado de DNA contém `distribuicaoHints`:

```js
const dna = await DNAService.getDNADeConsultor('João Silva');
const hints = dna.distribuicaoHints;
// hints.tipoPreferido    → 'Apartamento'
// hints.bairroPreferido  → 'São José dos Pinhais'
// hints.faixaPreferida   → 'R$ 200k–400k'
// hints.origemMelhor     → 'WhatsApp'
// hints.melhorHorario    → 'Manhã'
// hints.melhorDia        → 'Ter'
```

O módulo de Distribuição Inteligente usará esses hints para rotear leads ao consultor mais adequado ao perfil do lead.

---

## API

```js
// Calcular toda a equipe (com eventos)
await DNAService.calcularEquipe();

// Com cache (sem eventos)
await DNAService.obterDNA();

// Forçar recálculo
await DNAService.reprocessar();

// DNA de um consultor
const d = await DNAService.getDNADeConsultor('Maria Santos');
console.log(d.perfil);        // texto gerado pelo COMMAND
console.log(d.espPrincipal);  // 'Apartamento Popular'
console.log(d.forcas);        // array de { icone, texto }
console.log(d.sugestoes);     // array de strings
```
