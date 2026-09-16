/** Arredonda um valor monetário para duas casas decimais. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
