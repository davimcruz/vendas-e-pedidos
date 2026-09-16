import { sql, type Database } from '../../database/sql.js';
import type {
  ItemInput,
  Order,
  OrderFilters,
  OrderItem,
  OrderStatus,
  OrderSummary,
  OrderTotals,
} from './order.types.js';

const orderColumns = sql`id, cliente_id, subtotal, frete, desconto, cupom_codigo AS cupom,
  valor_total, status`;

async function insertItems(orderId: number, items: OrderItem[], db: Database): Promise<void> {
  await db`INSERT INTO itens_pedido ${db(items.map((item) => ({ pedidoId: orderId, ...item })))}`;
}

export const orderRepository = {
  list(filters: OrderFilters): Promise<OrderSummary[]> {
    return sql<OrderSummary[]>`SELECT id, cliente_id, valor_total, status
      FROM pedidos
      WHERE (${filters.status}::text IS NULL OR status = ${filters.status})
        AND (${filters.clienteId}::int IS NULL OR cliente_id = ${filters.clienteId})
      ORDER BY id DESC`;
  },

  async findById(id: number): Promise<Order | undefined> {
    const [order] = await sql<Order[]>`SELECT ${orderColumns} FROM pedidos WHERE id = ${id}`;
    return order;
  },

  async lock(id: number, db: Database): Promise<Order | undefined> {
    const [order] = await db<Order[]>`SELECT ${orderColumns} FROM pedidos
      WHERE id = ${id} FOR UPDATE`;
    return order;
  },

  findItems(orderId: number, db: Database): Promise<ItemInput[]> {
    return db<ItemInput[]>`SELECT produto_id, quantidade FROM itens_pedido
      WHERE pedido_id = ${orderId}`;
  },

  async create(
    clienteId: number,
    totals: OrderTotals,
    items: OrderItem[],
    db: Database,
  ): Promise<Order> {
    const [order] = await db<Order[]>`INSERT INTO pedidos
      (cliente_id, subtotal, frete, desconto, cupom_codigo, valor_total)
      VALUES (${clienteId}, ${totals.subtotal}, ${totals.frete}, ${totals.desconto}, ${totals.cupom}, ${totals.valorTotal})
      RETURNING ${orderColumns}`;
    await insertItems(order.id, items, db);
    return order;
  },

  async update(id: number, totals: OrderTotals, items: OrderItem[], db: Database): Promise<Order> {
    await db`DELETE FROM itens_pedido WHERE pedido_id = ${id}`;
    await insertItems(id, items, db);
    const [order] = await db<Order[]>`UPDATE pedidos
      SET subtotal = ${totals.subtotal}, frete = ${totals.frete}, desconto = ${totals.desconto},
        cupom_codigo = ${totals.cupom}, valor_total = ${totals.valorTotal}, atualizado_em = NOW()
      WHERE id = ${id}
      RETURNING ${orderColumns}`;
    return order;
  },

  async setStatus(id: number, status: OrderStatus, db: Database): Promise<void> {
    await db`UPDATE pedidos SET status = ${status}, atualizado_em = NOW() WHERE id = ${id}`;
  },
};
