export const API_URL = import.meta.env.VITE_API_URL ?? 'https://vendas-e-pedidos.onrender.com';

export const COLORS = ['Azul', 'Preto', 'Branco'];
export const SIZES = ['P', 'M', 'G', 'GG'];
export const CATALOG_PAGE_SIZE = 18;
export const ADMIN_PAGE_SIZE = 15;

export const PRICE_RANGES = [
  { label: 'Todos', min: null, max: null },
  { label: 'Até R$ 100', min: null, max: 100 },
  { label: 'R$ 100 a R$ 500', min: 100, max: 500 },
  { label: 'Acima de R$ 500', min: 500, max: null },
];

export const PAYMENTS = [
  { id: 'cartao', label: 'Cartão de crédito', icon: 'card' },
  { id: 'boleto', label: 'Dinheiro / Boleto', icon: 'barcode' },
];

export const STATUS_LABELS = {
  aguardando_pagamento: 'Aguardando pagamento',
  pago: 'Pago',
  enviado: 'Enviado',
  cancelado: 'Cancelado',
};

export const NEXT_STATUS = {
  aguardando_pagamento: [
    { status: 'pago', label: 'Marcar como pago' },
    { status: 'cancelado', label: 'Cancelar' },
  ],
  pago: [
    { status: 'enviado', label: 'Marcar como enviado' },
    { status: 'cancelado', label: 'Cancelar' },
  ],
  enviado: [],
  cancelado: [],
};

export const ORDER_PROGRESS = ['aguardando_pagamento', 'pago', 'enviado'];
