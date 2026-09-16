export type Coupon = {
  codigo: string;
  tipo: 'percentual' | 'fixo';
  desconto: number;
  status: 'ativo' | 'inativo';
  expiraEm: Date | null;
};

export type CouponUpdate = Partial<Omit<Coupon, 'codigo'>>;
