import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/auth.js';
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

orderRouter.get('/', async (request, response) => {
  response.json(await service.list(filtersSchema.parse(request.query)));
});

orderRouter.get('/:id', async (request, response) => {
  response.json(await service.get(idSchema.parse(request.params.id)));
});

orderRouter.post('/', async (request, response) => {
  const input = orderSchema.parse(request.body);
  response.status(201).json(await service.create(input));
});

orderRouter.put('/:id', async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const input = orderUpdateSchema.parse(request.body);
  response.json(await service.update(id, input));
});

orderRouter.put('/:id/status', async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const { status } = z.object({ status: statusSchema }).parse(request.body);
  response.json(await service.updateStatus(id, status));
});

orderRouter.delete('/:id', async (request, response) => {
  await service.cancel(idSchema.parse(request.params.id));
  response.status(204).send();
});
