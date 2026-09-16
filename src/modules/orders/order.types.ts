export type OrderStatus = 'aguardando_pagamento' | 'pago' | 'cancelado' | 'enviado';

export type Order = {
  id: number;
  clienteId: number;
  subtotal: number;
  frete: number;
  desconto: number;
  cupom: string | null;
  valorTotal: number;
  status: OrderStatus;
};

export type OrderSummary = Pick<Order, 'id' | 'clienteId' | 'valorTotal' | 'status'>;

export type OrderTotals = Pick<Order, 'subtotal' | 'frete' | 'desconto' | 'cupom' | 'valorTotal'>;

export type OrderFilters = { status: OrderStatus | null; clienteId: number | null };

export type ItemInput = { produtoId: number; quantidade: number };

export type OrderItem = ItemInput & { precoUnitario: number };

export type OrderUpdate = { itens: ItemInput[]; frete: number; cupom?: string | null };

export type OrderInput = OrderUpdate & { clienteId: number };
