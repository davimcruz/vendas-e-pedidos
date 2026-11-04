import { Router, type Request } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/auth.js';
import { AppError } from '../../shared/AppError.js';
import { idSchema } from '../../shared/schemas.js';
import * as service from './order.service.js';

const statusSchema = z.enum(['aguardando_pagamento', 'pago', 'cancelado', 'enviado']);

const filtersSchema = z.object({
  status: statusSchema.nullable().default(null),
  clienteId: idSchema.nullable().default(null),
});

const orderUpdateSchema = z.object({
  itens: z
    .array(z.object({ produtoId: idSchema, quantidade: z.number().int().positive() }))
    .min(1)
    .refine((itens) => new Set(itens.map((item) => item.produtoId)).size === itens.length, {
      message: 'Produto repetido nos itens.',
    }),
  frete: z.number().nonnegative(),
  cupom: z.string().trim().nullish(),
});

const orderSchema = orderUpdateSchema.extend({ clienteId: idSchema });

export const orderRouter = Router();

orderRouter.use(authenticate);

const isAdmin = (request: Request) => request.user.perfil === 'admin';

/** Cliente só enxerga os próprios pedidos; para os demais a resposta é 404. */
async function loadOrder(request: Request) {
  const order = await service.get(idSchema.parse(request.params.id));
  if (!isAdmin(request) && order.clienteId !== request.user.id) {
    throw new AppError(404, 'PEDIDO_NAO_ENCONTRADO', 'Pedido não encontrado.');
  }
  return order;
}

orderRouter.get('/', async (request, response) => {
  const filters = filtersSchema.parse(request.query);
  if (!isAdmin(request)) {
    filters.clienteId = request.user.id;
  }
  response.json(await service.list(filters));
});

orderRouter.get('/:id', async (request, response) => {
  response.json(await loadOrder(request));
});

orderRouter.post('/', async (request, response) => {
  const input = orderSchema.parse(request.body);
  if (!isAdmin(request) && input.clienteId !== request.user.id) {
    throw new AppError(403, 'ACESSO_NEGADO', 'Você só pode criar pedidos para o seu cadastro.');
  }
  response.status(201).json(await service.create(input));
});

orderRouter.put('/:id', async (request, response) => {
  const { id } = await loadOrder(request);
  const input = orderUpdateSchema.parse(request.body);
  response.json(await service.update(id, input));
});

orderRouter.put('/:id/status', async (request, response) => {
  const { status } = z.object({ status: statusSchema }).parse(request.body);
  if (!isAdmin(request) && status !== 'cancelado') {
    throw new AppError(403, 'ACESSO_NEGADO', 'Apenas administradores podem usar este status.');
  }
  const { id } = await loadOrder(request);
  response.json(await service.updateStatus(id, status));
});

orderRouter.delete('/:id', async (request, response) => {
  const { id } = await loadOrder(request);
  await service.cancel(id);
  response.status(204).send();
});
