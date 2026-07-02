-- ╔══════════════════════════════════════════════════════════════╗
-- ║  CDP — COMMAND EVENTS ENGINE                                 ║
-- ║  Migration: command_events table                             ║
-- ║  SPR-001 · KR7 Command                                       ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- Execute este script no SQL Editor do Supabase.
-- Menu: Database → SQL Editor → New Query
--
-- IMPORTANTE:
--   Após criar a tabela, aplicar as políticas RLS abaixo.
--   Nunca criar política de UPDATE ou DELETE — os eventos são imutáveis.

-- ─────────────────────────────────────────────────────────
-- 1. TABELA
-- ─────────────────────────────────────────────────────────

create table if not exists public.command_events (
  id          uuid        primary key default gen_random_uuid(),
  timestamp   timestamptz not null    default now(),
  modulo      text        not null,
  tipo        text        not null,
  origem      text        not null,
  usuario     text        not null,
  consultor   text,
  lead        text,
  cliente     text,
  imovel      text,
  descricao   text        not null,
  detalhes    text,
  metadata    text
);

-- ─────────────────────────────────────────────────────────
-- 2. COMENTÁRIOS (documentação inline)
-- ─────────────────────────────────────────────────────────

comment on table  public.command_events is 'Registro imutável de todos os eventos do CDP. Nunca editar nem deletar registros.';
comment on column public.command_events.id         is 'Identificador único UUID gerado automaticamente';
comment on column public.command_events.timestamp  is 'Momento exato do evento em UTC';
comment on column public.command_events.modulo     is 'Módulo de origem: leads, imoveis, auth, etc.';
comment on column public.command_events.tipo       is 'Tipo do evento: LEAD_CREATED, PHONE_CALL, etc.';
comment on column public.command_events.origem     is 'Quem gerou: USER, SYSTEM, COMMAND, LANDING_PAGE, IMPORT, API';
comment on column public.command_events.usuario    is 'Nome do usuário logado no momento do evento';
comment on column public.command_events.consultor  is 'Corretor relacionado ao evento (quando aplicável)';
comment on column public.command_events.lead       is 'Nome ou referência do lead (quando aplicável)';
comment on column public.command_events.cliente    is 'Nome ou referência do cliente (quando aplicável)';
comment on column public.command_events.imovel     is 'Nome ou referência do imóvel (quando aplicável)';
comment on column public.command_events.descricao  is 'Texto legível descrevendo o que aconteceu';
comment on column public.command_events.detalhes   is 'Contexto adicional em texto livre';
comment on column public.command_events.metadata   is 'JSON stringificado com dados estruturados extras';

-- ─────────────────────────────────────────────────────────
-- 3. ÍNDICES (performance em filtros frequentes)
-- ─────────────────────────────────────────────────────────

create index if not exists idx_command_events_timestamp  on public.command_events (timestamp desc);
create index if not exists idx_command_events_tipo       on public.command_events (tipo);
create index if not exists idx_command_events_modulo     on public.command_events (modulo);
create index if not exists idx_command_events_origem     on public.command_events (origem);
create index if not exists idx_command_events_consultor  on public.command_events (consultor);
create index if not exists idx_command_events_lead       on public.command_events (lead);
create index if not exists idx_command_events_usuario    on public.command_events (usuario);

-- ─────────────────────────────────────────────────────────
-- 4. RLS — ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────

-- Habilita RLS na tabela
alter table public.command_events enable row level security;

-- Política de SELECT: qualquer usuário autenticado pode ler
create policy "command_events_select"
  on public.command_events
  for select
  using (true);

-- Política de INSERT: qualquer usuário autenticado pode registrar eventos
create policy "command_events_insert"
  on public.command_events
  for insert
  with check (true);

-- ⛔ NÃO criar políticas de UPDATE ou DELETE.
--    A ausência de política = operação bloqueada pelo RLS.

-- ─────────────────────────────────────────────────────────
-- 5. VERIFICAÇÃO
-- ─────────────────────────────────────────────────────────

-- Rode esta query para confirmar que a tabela foi criada:
-- select count(*) from public.command_events;

-- Insira um evento de teste:
-- insert into public.command_events
--   (modulo, tipo, origem, usuario, descricao)
-- values
--   ('system', 'COMMAND_ACTION', 'SYSTEM', 'Admin', 'Tabela command_events criada com sucesso');
