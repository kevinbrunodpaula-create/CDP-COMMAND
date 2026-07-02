# CDP — Guia de Arquitetura Técnica

## Fluxo de carregamento

```
index.html
  └─ Carrega CSS: assets/css/main.css, chat-ai.css
  └─ Carrega JS (em ordem):
       1. database/supabase.js    → SB, SURL, SKEY, AI_KEY
       2. services/permissions.js → PERMS, perm()
       3. services/auth.js        → doLogin(), loginBiometria()
       4. services/email.js       → EmailJS, enviarRecuperacao()
       5. services/import-export.js
       6. services/fila-leads.js
       7. services/conversa-ia.js
       8. utils/ui-helpers.js     → showToast(), openModal(), set()
       9. modules/*/              → lógica de cada módulo
      10. modules/command/ai/     → IA e CDP Assistant
      11. assets/js/app.js        → initApp() — último a rodar
```

## Padrão de módulo

Todo módulo deve seguir esta estrutura:

```
modules/nome-modulo/
  ├── index.html    ← <div class="page" id="page-nome">...</div>
  ├── nome.js       ← funções do módulo (render, filter, save, etc.)
  └── nome.css      ← (opcional) estilos específicos do módulo
```

## Comunicação entre módulos

**Correto:**
```js
// Via serviço compartilhado
const leads = await SB.sel('leads', 'select=*');
```

**Incorreto:**
```js
// Dependência direta entre módulos
renderKanban(leadsModule.getLeads());
```

## Convenção de nomes

- Funções de render: `renderNomeModulo(dados)`
- Funções de filtro: `filterNomeModulo()`
- Funções de save: `saveNomeModulo()`
- Funções de delete: `deleteNomeModulo(id)`
- IDs de página: `page-nome-modulo`
- IDs de modal: `modal-nome-acao`

## Adicionando um novo módulo

1. Criar pasta `modules/novo-modulo/`
2. Criar `novo-modulo.html` com `<div class="page" id="page-novo-modulo">`
3. Criar `novo-modulo.js` com funções `render`, `filter`, `save`
4. Adicionar `<script src="modules/novo-modulo/novo-modulo.js">` no `index.html`
5. Registrar a rota em `assets/js/app.js` na função `goTo()`
6. Adicionar item no menu lateral em `setupUI()` se necessário
