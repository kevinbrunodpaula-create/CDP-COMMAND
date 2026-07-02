/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CDP — COMMAND EVENTS ENGINE                                 ║
 * ║  CommandEventRepository                                      ║
 * ║  SPR-001 · KR7 Command                                       ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Responsável exclusivamente por operações de LEITURA na tabela
 * command_events do Supabase.
 *
 * REGRAS:
 *   - Este repositório NUNCA faz UPDATE nem DELETE.
 *   - INSERT é responsabilidade do CommandEventService.
 *   - Todas as queries retornam eventos em ordem cronológica DESC.
 *
 * TABELA ESPERADA NO SUPABASE:
 *
 *   create table command_events (
 *     id          uuid primary key default gen_random_uuid(),
 *     timestamp   timestamptz not null default now(),
 *     modulo      text not null,
 *     tipo        text not null,
 *     origem      text not null,
 *     usuario     text not null,
 *     consultor   text,
 *     lead        text,
 *     cliente     text,
 *     imovel      text,
 *     descricao   text not null,
 *     detalhes    text,
 *     metadata    text
 *   );
 *
 *   -- Política RLS: SELECT apenas para usuários autenticados
 *   -- INSERT apenas para usuários autenticados
 *   -- UPDATE: NENHUMA política (bloqueado)
 *   -- DELETE: NENHUMA política (bloqueado)
 */

'use strict';

const CommandEventRepository = (() => {

  const TABLE = 'command_events';
  const DEFAULT_LIMIT = 200;

  /* ─────────────────────────────────────────────
     HELPERS INTERNOS
  ───────────────────────────────────────────── */

  /**
   * Monta a query string de filtros para o Supabase REST API.
   * @param {object} filters
   * @returns {string}
   */
  function buildFilterQuery(filters = {}) {
    const parts = [`order=timestamp.desc`, `limit=${filters.limit || DEFAULT_LIMIT}`];

    if (filters.modulo)    parts.push(`modulo=eq.${encodeURIComponent(filters.modulo)}`);
    if (filters.tipo)      parts.push(`tipo=eq.${encodeURIComponent(filters.tipo)}`);
    if (filters.origem)    parts.push(`origem=eq.${encodeURIComponent(filters.origem)}`);
    if (filters.consultor) parts.push(`consultor=ilike.*${encodeURIComponent(filters.consultor)}*`);
    if (filters.lead)      parts.push(`lead=ilike.*${encodeURIComponent(filters.lead)}*`);
    if (filters.usuario)   parts.push(`usuario=ilike.*${encodeURIComponent(filters.usuario)}*`);

    if (filters.desde) {
      parts.push(`timestamp=gte.${filters.desde}`);
    }
    if (filters.ate) {
      parts.push(`timestamp=lte.${filters.ate}`);
    }

    return parts.join('&');
  }

  /* ─────────────────────────────────────────────
     API PÚBLICA
  ───────────────────────────────────────────── */

  /**
   * Busca eventos com filtros opcionais.
   *
   * @param {object} [filters]
   * @param {string} [filters.modulo]     - Filtrar por módulo
   * @param {string} [filters.tipo]       - Filtrar por tipo de evento
   * @param {string} [filters.origem]     - Filtrar por origem
   * @param {string} [filters.consultor]  - Busca parcial no campo consultor
   * @param {string} [filters.lead]       - Busca parcial no campo lead
   * @param {string} [filters.usuario]    - Busca parcial no campo usuario
   * @param {string} [filters.desde]      - ISO date string (timestamp >= desde)
   * @param {string} [filters.ate]        - ISO date string (timestamp <= ate)
   * @param {number} [filters.limit]      - Máximo de resultados (default 200)
   * @returns {Promise<Array>}
   */
  async function findAll(filters = {}) {
    try {
      const query = buildFilterQuery(filters);
      const data  = await SB.sel(TABLE, query);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('[CommandEventRepository] findAll error:', err);
      return [];
    }
  }

  /**
   * Busca um evento específico pelo ID.
   * @param {string} id - UUID do evento
   * @returns {Promise<object|null>}
   */
  async function findById(id) {
    try {
      const data = await SB.sel(TABLE, `id=eq.${id}&limit=1`);
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch (err) {
      console.error('[CommandEventRepository] findById error:', err);
      return null;
    }
  }

  /**
   * Busca os N eventos mais recentes de um determinado lead.
   * @param {string} leadNome - Nome ou ID do lead
   * @param {number} [limit=50]
   * @returns {Promise<Array>}
   */
  async function findByLead(leadNome, limit = 50) {
    return findAll({ lead: leadNome, limit });
  }

  /**
   * Busca eventos de um consultor específico.
   * @param {string} nomeConsultor
   * @param {number} [limit=100]
   * @returns {Promise<Array>}
   */
  async function findByConsultor(nomeConsultor, limit = 100) {
    return findAll({ consultor: nomeConsultor, limit });
  }

  /**
   * Conta eventos agrupados por tipo (para dashboard).
   * Retorna array [{tipo, count}] calculado client-side.
   * @param {object} [filters]
   * @returns {Promise<Array<{tipo:string, count:number}>>}
   */
  async function countByTipo(filters = {}) {
    const events = await findAll({ ...filters, limit: 1000 });
    const map = {};
    events.forEach(e => {
      map[e.tipo] = (map[e.tipo] || 0) + 1;
    });
    return Object.entries(map)
      .map(([tipo, count]) => ({ tipo, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Conta eventos agrupados por módulo.
   * @param {object} [filters]
   * @returns {Promise<Array<{modulo:string, count:number}>>}
   */
  async function countByModulo(filters = {}) {
    const events = await findAll({ ...filters, limit: 1000 });
    const map = {};
    events.forEach(e => {
      map[e.modulo] = (map[e.modulo] || 0) + 1;
    });
    return Object.entries(map)
      .map(([modulo, count]) => ({ modulo, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Insere um evento já validado pelo CommandEventService.
   * Chamado apenas pelo CommandEventService — nunca diretamente.
   * @param {object} payload - Resultado de CommandEventModel.toPayload()
   * @returns {Promise<object|null>}
   */
  async function insert(payload) {
    try {
      const result = await SB.ins(TABLE, payload);
      return Array.isArray(result) ? result[0] : result;
    } catch (err) {
      console.error('[CommandEventRepository] insert error:', err);
      return null;
    }
  }

  // ── Expõe apenas leitura + insert controlado ──
  return {
    findAll,
    findById,
    findByLead,
    findByConsultor,
    countByTipo,
    countByModulo,
    _insert: insert, // prefixo _ indica: use apenas via CommandEventService
  };

})();
