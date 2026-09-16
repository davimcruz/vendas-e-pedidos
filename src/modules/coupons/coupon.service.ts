import type { Database } from '../../database/sql.js';
import { AppError } from '../../shared/AppError.js';
import { roundMoney } from '../../shared/money.js';
import { couponRepository } from './coupon.repository.js';
import type { Coupon, CouponUpdate } from './coupon.types.js';

export function calculateDiscount(
  coupon: Pick<Coupon, 'tipo' | 'desconto'>,
  orderValue: number,
): number {
  if (coupon.tipo === 'fixo') {
    return Math.min(orderValue, coupon.desconto);
  }
  return Math.min(orderValue, roundMoney((orderValue * coupon.desconto) / 100));
}

function isUsable(coupon: Coupon): boolean {
  const isExpired = coupon.expiraEm !== null && coupon.expiraEm <= new Date();
  return coupon.status === 'ativo' && !isExpired;
}

export async function validateCoupon(code: string) {
  const coupon = await couponRepository.findByCode(code);
  if (!coupon) {
    throw new AppError(404, 'CUPOM_NAO_ENCONTRADO', 'Cupom não encontrado.');
  }
  if (!isUsable(coupon)) {
    throw new AppError(400, 'CUPOM_INVALIDO', 'Cupom inativo ou expirado.');
  }
  return { valido: true, codigo: coupon.codigo, tipo: coupon.tipo, desconto: coupon.desconto };
}

export async function findCouponForOrder(code: string, db: Database): Promise<Coupon> {
  const coupon = await couponRepository.findByCode(code, db);
  if (!coupon || !isUsable(coupon)) {
    throw new AppError(400, 'CUPOM_INVALIDO', 'Cupom inexistente, inativo ou expirado.');
  }
  return coupon;
}

export function list(): Promise<Coupon[]> {
  return couponRepository.list();
}

export function create(coupon: Coupon): Promise<Coupon> {
  return couponRepository.create(coupon);
}

export async function update(code: string, input: CouponUpdate): Promise<Coupon> {
  const current = await couponRepository.findByCode(code);
  if (!current) {
    throw new AppError(404, 'CUPOM_NAO_ENCONTRADO', 'Cupom não encontrado.');
  }
  return couponRepository.update({ ...current, ...input });
}
