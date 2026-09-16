export type DateRange = { inicio: string | null; fim: string | null };

export type SalesFilters = DateRange & { pagina: number; limite: number };

export type Sale = {
  id: number;
  clienteId: number;
  clienteNome: string;
  subtotal: number;
  frete: number;
  desconto: number;
  valorTotal: number;
  status: string;
  criadoEm: Date;
};

export type SalesSummary = {
  quantidadePedidos: number;
  valorVendido: number;
  ticketMedio: number;
};
