import { sql, type Database } from '../../database/sql.js';
import type { Coupon } from './coupon.types.js';

const couponColumns = sql`codigo, tipo, desconto, status, expira_em`;

export const couponRepository = {
  async findByCode(code: string, db: Database = sql): Promise<Coupon | undefined> {
    const [coupon] = await db<Coupon[]>`SELECT ${couponColumns}
      FROM cupons WHERE codigo = UPPER(${code})`;
    return coupon;
  },

  list(): Promise<Coupon[]> {
    return sql<Coupon[]>`SELECT ${couponColumns} FROM cupons ORDER BY criado_em DESC`;
  },

  async create(coupon: Coupon): Promise<Coupon> {
    const [created] = await sql<
      Coupon[]
    >`INSERT INTO cupons (codigo, tipo, desconto, status, expira_em)
      VALUES (UPPER(${coupon.codigo}), ${coupon.tipo}, ${coupon.desconto}, ${coupon.status}, ${coupon.expiraEm})
      RETURNING ${couponColumns}`;
    return created;
  },

  async update(coupon: Coupon): Promise<Coupon> {
    const [updated] = await sql<Coupon[]>`UPDATE cupons
      SET tipo = ${coupon.tipo}, desconto = ${coupon.desconto}, status = ${coupon.status}, expira_em = ${coupon.expiraEm}
      WHERE codigo = ${coupon.codigo}
      RETURNING ${couponColumns}`;
    return updated;
  },
};
