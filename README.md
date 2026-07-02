# CDP — Central de Performance

> CRM especializado em lançamentos imobiliários, desenvolvido para KR7 Imóveis.

---

## Visão Geral

O CDP é uma plataforma modular de gestão de performance comercial. Construída sobre **Supabase** como backend, com frontend em HTML/CSS/JS puro, sem frameworks externos além de Chart.js e EmailJS.

---

## Arquitetura

```
CDP/
│
├── index.html                  ← Carregador principal (shell + roteamento)
│
├── assets/
│   ├── css/
│   │   ├── main.css            ← Estilos globais do sistema
│   │   └── chat-ai.css         ← Estilos do painel IA
│   ├── js/
│   │   ├── app.js              ← Core: initApp, setupUI, loadAll, goTo
│   │   └── modais.html         ← Templates HTML de todos os modais
│   ├── images/                 ← Imagens e assets visuais
│   ├── icons/                  ← Ícones customizados
│   └── fonts/                  ← Fontes locais (se necessário)
│
├── modules/
│   ├── dashboard/
│   │   ├── dashboard.html      ← Template da página Dashboard
│   │   └── dashboard.js        ← KPIs, gráficos, ranking, funil
│   │
│   ├── leads/
│   │   ├── leads.html          ← Template Kanban + Lista
│   │   ├── leads.js            ← CRUD, Kanban, scoring, detail
│   │   ├── central-ligacoes.html
│   │   ├── central-ligacoes.js ← Módulo de discagem
│   │   ├── oferta-ativa.html
│   │   └── oferta-ativa.js     ← Oferta Ativa (prospecção ativa)
│   │
│   ├── clientes/               ← Reservado (pós-venda futuro)
│   │
│   ├── imoveis/
│   │   ├── imoveis.html        ← Template da página Imóveis
│   │   └── imoveis.js          ← CRUD, vitrine, match
│   │
│   ├── agenda/
│   │   ├── agenda.html         ← Template do calendário
│   │   └── agenda.js           ← Renderização de eventos
│   │
│   ├── corretores/
│   │   ├── corretores.html     ← Template da equipe
│   │   └── corretores.js       ← CRUD, filtros, perfis
│   │
│   ├── financeiro/
│   │   ├── comissoes.html      ← Template de comissões
│   │   └── comissoes.js        ← Cálculo e distribuição de comissões
│   │
│   ├── relatorios/
│   │   ├── relatorios.html     ← Template de relatórios
│   │   └── relatorios.js       ← Exportação CSV, gráficos
│   │
│   ├── configuracoes/
│   │   ├── configuracoes.html  ← Template de configurações
│   │   ├── configuracoes.js    ← Gestão de usuários e aprovações
│   │   └── usuarios.html       ← Template de usuários
│   │
│   └── command/                ← Painel de comando executivo (futuro)
│        ├── dashboard/         ← Visão executiva consolidada
│        ├── recovery/          ← Recuperação de leads inativos
│        ├── manager/           ← Gestão de equipe
│        ├── coach/             ← Coaching de corretores
│        ├── intelligence/      ← Inteligência de negócios
│        ├── analytics/         ← Análise avançada
│        └── ai/
│             ├── cdp-assistant.js  ← CDP Assistant (follow-up, posts)
│             ├── chat-ia.js        ← Chat IA em tempo real
│             ├── fila-ia.html      ← Template Fila IA
│             └── fila-ia.js        ← Aprovação de conteúdo gerado por IA
│
├── services/
│   ├── auth.js                 ← Login, biometria, logout, recuperação
│   ├── email.js                ← Integração EmailJS
│   ├── permissions.js          ← Controle de permissões por cargo
│   ├── import-export.js        ← Importação CSV/Sheets, exportação
│   ├── fila-leads.js           ← Fila de distribuição de leads
│   └── conversa-ia.js          ← Análise de conversa via IA
│
├── database/
│   └── supabase.js             ← Config Supabase + abstração SB (sel/upd/ins/del)
│
├── utils/
│   └── ui-helpers.js           ← Helpers UI: toast, modal, set(), goTo()
│
├── docs/                       ← Documentação técnica
├── changelog/                  ← Histórico de versões
└── README.md                   ← Este arquivo
```

---

## Stack Técnica

| Camada       | Tecnologia                            |
|--------------|---------------------------------------|
| Frontend     | HTML5 + CSS3 + JavaScript (ES6+)      |
| Backend      | Supabase (PostgreSQL + Auth + REST)   |
| Gráficos     | Chart.js 4.4.1                        |
| E-mail       | EmailJS (recuperação de senha)        |
| IA           | Anthropic Claude API                  |
| Hospedagem   | Netlify (landing) / qualquer servidor |

---

## Princípios de Desenvolvimento

### 1. Modularidade
Cada módulo é independente e responsável por seu próprio HTML, CSS e JS. Não deve depender diretamente de outros módulos — apenas dos serviços compartilhados.

### 2. Comunicação via Serviços
Módulos se comunicam através de `services/`. Nunca chame diretamente funções de outro módulo.

### 3. Banco de Dados via Abstração
Sempre use `SB.sel()`, `SB.ins()`, `SB.upd()`, `SB.del()` definidos em `database/supabase.js`. Nunca faça chamadas diretas ao Supabase fora dessa camada.

### 4. Permissões
Verifique permissões com `perm('chave')` de `services/permissions.js` antes de renderizar elementos restritos.

### 5. Novos Módulos
Todo novo desenvolvimento deve:
- Criar uma pasta em `modules/nome-do-modulo/`
- Ter seu próprio `.html`, `.css` (se necessário) e `.js`
- Ser registrado no `index.html` (script tag + rota em `app.js`)

---

## Configuração

### Supabase
Edite `database/supabase.js` com suas credenciais:
```js
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_KEY = 'sua-anon-key';
```

### EmailJS (recuperação de senha)
Edite `services/email.js` com suas chaves do EmailJS.

### Anthropic API
Chave configurada em `database/supabase.js` (variável `AI_KEY`).

---

## Módulo COMMAND

O módulo `command/` é o painel executivo do CDP. Seus submódulos (`dashboard`, `recovery`, `manager`, `coach`, `intelligence`, `analytics`, `ai`) estão com estrutura criada.

### COMMAND Events Engine (SPR-001)

O **Command Events Engine** é a camada de auditoria inteligente do CDP.

Toda ação relevante do sistema gera um evento imutável registrado na tabela `command_events` do Supabase.

**Arquitetura da engine:**

```
modules/command/events/
  ├── CommandEventModel.js      ← Modelo de dados + validações + constantes
  ├── CommandEventRepository.js ← Acesso ao Supabase (SELECT + INSERT)
  ├── CommandEventService.js    ← API pública para registrar eventos
  ├── events.js                 ← Lógica da tela Events (filtros, render)
  ├── events.html               ← Template da tela (referência)
  └── events.css                ← Estilos da tela

database/
  └── migration_command_events.sql ← Script SQL para criar a tabela
```

**Tipos de evento suportados:**

| Categoria | Tipos |
|-----------|-------|
| Leads | LEAD_CREATED, LEAD_UPDATED, LEAD_IMPORTED, LEAD_ASSIGNED, LEAD_TRANSFERRED, LEAD_RECOVERED |
| Interações | FIRST_CONTACT, PHONE_CALL, WHATSAPP_SENT, EMAIL_SENT, FOLLOWUP |
| Pipeline | VISIT_SCHEDULED, VISIT_COMPLETED, PROPOSAL_SENT, SALE_COMPLETED, SALE_LOST |
| Entidades | CLIENT_CREATED, PROPERTY_CREATED |
| Auth | LOGIN, LOGOUT, USER_CREATED |
| Sistema | COMMAND_ALERT, COMMAND_ACTION |

**Origens:** USER, SYSTEM, COMMAND, LANDING_PAGE, IMPORT, API

**Regra de imutabilidade:** Eventos nunca são editados ou deletados. O Supabase não tem políticas de UPDATE/DELETE para esta tabela.

**Como registrar um evento em qualquer módulo:**

```js
await CommandEventService.record({
  modulo    : CommandEventModule.LEADS,
  tipo      : CommandEventType.LEAD_CREATED,
  origem    : CommandEventOrigin.USER,
  descricao : 'Lead João Silva criado',
  lead      : 'João Silva',
  consultor : 'Maria Santos',
  detalhes  : 'Origem: Instagram',
  metadata  : { interesse: 'Apto 2q' },
});

// Atalhos disponíveis:
await CommandEventService.recordLeadCreated(nome, consultor, origemLead, meta);
await CommandEventService.recordLeadUpdated(nome, consultor, detalhe);
await CommandEventService.recordSaleCompleted(nome, consultor, imovel, vgv);
await CommandEventService.recordLogin(nomeUsuario);
await CommandEventService.recordLogout(nomeUsuario);
await CommandEventService.recordCommandAlert(descricao, meta);
```

**Setup no Supabase:** execute `database/migration_command_events.sql` no SQL Editor.

---

## Time

- **KR7 Imóveis** — Curitiba, Brasil
- **Kevin** — CEO
- **Tanner** — Diretor
