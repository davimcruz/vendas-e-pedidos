import { sql, type Database } from '../../database/sql.js';
import type { Product, ProductFilters, ProductInput } from './product.types.js';

const productColumns = sql`p.id, p.nome, p.descricao, p.preco, p.ativo,
  COALESCE(e.quantidade, 0) AS quantidade_estoque`;

export const productRepository = {
  async list(filters: ProductFilters): Promise<{ rows: Product[]; total: number }> {
    const rows = await sql<(Product & { total: number })[]>`
      SELECT ${productColumns}, COUNT(*) OVER()::int AS total
      FROM produtos p LEFT JOIN estoques e ON e.produto_id = p.id
      WHERE (${filters.incluirInativos} OR p.ativo)
        AND (${filters.busca}::text IS NULL
          OR p.nome ILIKE '%' || ${filters.busca}::text || '%'
          OR p.descricao ILIKE '%' || ${filters.busca}::text || '%')
        AND (${filters.precoMin}::numeric IS NULL OR p.preco >= ${filters.precoMin})
        AND (${filters.precoMax}::numeric IS NULL OR p.preco <= ${filters.precoMax})
      ORDER BY p.id DESC
      LIMIT ${filters.limite} OFFSET ${(filters.pagina - 1) * filters.limite}`;
    return {
      rows: rows.map(({ total, ...product }) => product),
      total: rows[0]?.total ?? 0,
    };
  },

  async findById(id: number, includeInactive: boolean): Promise<Product | undefined> {
    const [product] = await sql<Product[]>`SELECT ${productColumns}
      FROM produtos p LEFT JOIN estoques e ON e.produto_id = p.id
      WHERE p.id = ${id} AND (${includeInactive} OR p.ativo)`;
    return product;
  },

  findForOrder(ids: number[], db: Database): Promise<Product[]> {
    return db<Product[]>`SELECT ${productColumns}
      FROM produtos p LEFT JOIN estoques e ON e.produto_id = p.id
      WHERE p.id IN ${db(ids)}`;
  },

  create(input: ProductInput): Promise<Product> {
    return sql.begin(async (db) => {
      const [product] = await db<Omit<Product, 'quantidadeEstoque'>[]>`
        INSERT INTO produtos (nome, descricao, preco)
        VALUES (${input.nome}, ${input.descricao}, ${input.preco})
        RETURNING id, nome, descricao, preco, ativo`;
      await db`INSERT INTO estoques (produto_id, quantidade)
        VALUES (${product.id}, ${input.quantidadeEstoque})`;
      return { ...product, quantidadeEstoque: input.quantidadeEstoque };
    });
  },

  async update(product: Omit<Product, 'quantidadeEstoque'>): Promise<void> {
    await sql`UPDATE produtos
      SET nome = ${product.nome}, descricao = ${product.descricao}, preco = ${product.preco},
        ativo = ${product.ativo}, atualizado_em = NOW()
      WHERE id = ${product.id}`;
  },

  async deactivate(id: number): Promise<void> {
    await sql`UPDATE produtos SET ativo = FALSE, atualizado_em = NOW() WHERE id = ${id}`;
  },
};
