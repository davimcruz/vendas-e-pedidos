import { sql, type Database } from '../../database/sql.js';
import type { Stock } from './stock.types.js';

export const stockRepository = {
  async findByProduct(productId: number): Promise<Stock | undefined> {
    const [stock] = await sql<
      Stock[]
    >`SELECT p.id AS produto_id, p.nome, e.quantidade, e.atualizado_em
      FROM produtos p JOIN estoques e ON e.produto_id = p.id
      WHERE p.id = ${productId}`;
    return stock;
  },

  async set(productId: number, quantity: number): Promise<Stock | undefined> {
    const [stock] = await sql<Stock[]>`UPDATE estoques
      SET quantidade = ${quantity}, atualizado_em = NOW()
      WHERE produto_id = ${productId}
      RETURNING produto_id, quantidade, atualizado_em`;
    return stock;
  },

  async adjust(productId: number, delta: number, db: Database = sql): Promise<Stock | undefined> {
    const [stock] = await db<Stock[]>`UPDATE estoques
      SET quantidade = quantidade + ${delta}, atualizado_em = NOW()
      WHERE produto_id = ${productId} AND quantidade + ${delta} >= 0
      RETURNING produto_id, quantidade, atualizado_em`;
    return stock;
  },
};
