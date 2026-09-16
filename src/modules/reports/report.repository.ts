import { sql } from '../../database/sql.js';
import type { DateRange, Sale, SalesFilters, SalesSummary } from './report.types.js';

function soldOrdersBetween(range: DateRange) {
  return sql`p.status IN ('pago', 'enviado')
    AND (${range.inicio}::date IS NULL OR p.criado_em >= ${range.inicio}::date)
    AND (${range.fim}::date IS NULL OR p.criado_em < ${range.fim}::date + INTERVAL '1 day')`;
}

export const reportRepository = {
  async list(filters: SalesFilters): Promise<{ rows: Sale[]; total: number }> {
    const rows = await sql<(Sale & { total: number })[]>`
      SELECT p.id, p.cliente_id, c.nome AS cliente_nome, p.subtotal, p.frete, p.desconto,
        p.valor_total, p.status, p.criado_em, COUNT(*) OVER()::int AS total
      FROM pedidos p JOIN clientes c ON c.id = p.cliente_id
      WHERE ${soldOrdersBetween(filters)}
      ORDER BY p.criado_em DESC
      LIMIT ${filters.limite} OFFSET ${(filters.pagina - 1) * filters.limite}`;
    return {
      rows: rows.map(({ total, ...sale }) => sale),
      total: rows[0]?.total ?? 0,
    };
  },

  async summary(range: DateRange): Promise<SalesSummary> {
    const [summary] = await sql<SalesSummary[]>`
      SELECT COUNT(*)::int AS quantidade_pedidos,
        COALESCE(SUM(p.valor_total), 0) AS valor_vendido,
        COALESCE(AVG(p.valor_total), 0) AS ticket_medio
      FROM pedidos p
      WHERE ${soldOrdersBetween(range)}`;
    return summary;
  },
};
