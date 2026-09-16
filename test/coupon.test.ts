import { expect, test } from '@jest/globals';
import { calculateDiscount } from '../src/modules/coupons/coupon.service.js';

test('calcula desconto percentual', () => {
  expect(calculateDiscount({ tipo: 'percentual', desconto: 10 }, 3500)).toBe(350);
});

test('limita desconto fixo ao valor do pedido', () => {
  expect(calculateDiscount({ tipo: 'fixo', desconto: 100 }, 50)).toBe(50);
});
