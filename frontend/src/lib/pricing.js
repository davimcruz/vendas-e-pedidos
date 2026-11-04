export function calculateTotals(subtotal, coupon, shipping) {
  let discount = 0;
  if (coupon) {
    discount = coupon.tipo === 'percentual' ? (subtotal * coupon.desconto) / 100 : coupon.desconto;
  }
  discount = Math.min(discount, subtotal);
  const frete = shipping ?? 0;
  return { subtotal, discount, frete, total: subtotal - discount + frete };
}

export function simulateShipping(cep) {
  return 12 + Number(cep[0]) * 3.5;
}
