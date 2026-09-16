import { sql, type Database } from '../../database/sql.js';
import { AppError } from '../../shared/AppError.js';
import { roundMoney } from '../../shared/money.js';
import { clientRepository } from '../auth/client.repository.js';
import { calculateDiscount, findCouponForOrder } from '../coupons/coupon.service.js';
import { productRepository } from '../products/product.repository.js';
import { stockRepository } from '../stock/stock.repository.js';
import { orderRepository } from './order.repository.js';
import type {
  ItemInput,
  Order,
  OrderFilters,
  OrderInput,
  OrderItem,
  OrderStatus,
  OrderTotals,
  OrderUpdate,
} from './order.types.js';

async function priceItems(items: ItemInput[], db: Database): Promise<OrderItem[]> {
  const productIds = items.map((item) => item.produtoId);
  const products = await productRepository.findForOrder(productIds, db);

  return items.map((item) => {
    const product = products.find((candidate) => candidate.id === item.produtoId);
    if (!product?.ativo) {
      throw new AppError(
        404,
        'PRODUTO_NAO_ENCONTRADO',
        `Produto ${item.produtoId} não encontrado.`,
      );
    }
    if (item.quantidade > product.quantidadeEstoque) {
      throw new AppError(
        400,
        'PRODUTO_SEM_ESTOQUE',
        `Produto ${item.produtoId} sem estoque suficiente.`,
      );
    }
    return { ...item, precoUnitario: product.preco };
  });
}

async function calculateTotals(
  items: OrderItem[],
  input: OrderUpdate,
  db: Database,
): Promise<OrderTotals> {
  const itemsTotal = items.reduce((sum, item) => sum + item.precoUnitario * item.quantidade, 0);
  const subtotal = roundMoney(itemsTotal);

  if (!input.cupom) {
    return {
      subtotal,
      frete: input.frete,
      desconto: 0,
      cupom: null,
      valorTotal: roundMoney(subtotal + input.frete),
    };
  }

  const coupon = await findCouponForOrder(input.cupom, db);
  const desconto = calculateDiscount(coupon, subtotal);
  return {
    subtotal,
    frete: input.frete,
    desconto,
    cupom: coupon.codigo,
    valorTotal: roundMoney(subtotal + input.frete - desconto),
  };
}

export function list(filters: OrderFilters) {
  return orderRepository.list(filters);
}

export async function get(id: number): Promise<Order> {
  const order = await orderRepository.findById(id);
  if (!order) {
    throw new AppError(404, 'PEDIDO_NAO_ENCONTRADO', 'Pedido não encontrado.');
  }
  return order;
}

export async function create(input: OrderInput): Promise<Order> {
  const client = await clientRepository.findById(input.clienteId);
  if (!client) {
    throw new AppError(404, 'CLIENTE_NAO_ENCONTRADO', 'Cliente não encontrado.');
  }

  return sql.begin(async (db) => {
    const items = await priceItems(input.itens, db);
    const totals = await calculateTotals(items, input, db);
    return orderRepository.create(input.clienteId, totals, items, db);
  });
}

export async function update(id: number, input: OrderUpdate): Promise<Order> {
  return sql.begin(async (db) => {
    const order = await orderRepository.lock(id, db);
    if (!order) {
      throw new AppError(404, 'PEDIDO_NAO_ENCONTRADO', 'Pedido não encontrado.');
    }
    if (order.status !== 'aguardando_pagamento') {
      throw new AppError(409, 'PEDIDO_FINALIZADO', 'Pedido já finalizado.');
    }

    const items = await priceItems(input.itens, db);
    const totals = await calculateTotals(items, input, db);
    return orderRepository.update(id, totals, items, db);
  });
}

const allowedStatusChanges: Record<OrderStatus, OrderStatus[]> = {
  aguardando_pagamento: ['pago', 'cancelado'],
  pago: ['enviado', 'cancelado'],
  enviado: [],
  cancelado: [],
};

/** Pagar baixa o estoque e cancelar um pedido pago devolve, na mesma transação. */
export async function updateStatus(id: number, status: OrderStatus) {
  return sql.begin(async (db) => {
    const order = await orderRepository.lock(id, db);
    if (!order) {
      throw new AppError(404, 'PEDIDO_NAO_ENCONTRADO', 'Pedido não encontrado.');
    }
    if (!allowedStatusChanges[order.status].includes(status)) {
      throw new AppError(
        409,
        'STATUS_NAO_PERMITIDO',
        `Não é possível mudar o pedido de ${order.status} para ${status}.`,
      );
    }

    const items = await orderRepository.findItems(id, db);
    if (status === 'pago') {
      for (const item of items) {
        const stock = await stockRepository.adjust(item.produtoId, -item.quantidade, db);
        if (!stock) {
          throw new AppError(
            400,
            'PRODUTO_SEM_ESTOQUE',
            `Produto ${item.produtoId} sem estoque suficiente.`,
          );
        }
      }
    }
    if (order.status === 'pago' && status === 'cancelado') {
      for (const item of items) {
        await stockRepository.adjust(item.produtoId, item.quantidade, db);
      }
    }

    await orderRepository.setStatus(id, status, db);
    return { id, status };
  });
}

export async function cancel(id: number): Promise<void> {
  await updateStatus(id, 'cancelado');
}
