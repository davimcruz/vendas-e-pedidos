import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../../middlewares/auth.js';
import { idSchema, paginationSchema } from '../../shared/schemas.js';
import * as service from './product.service.js';

const name = z.string().trim().min(2).max(160);
const description = z.string().trim().nullable();
const price = z.number().nonnegative();

const filtersSchema = paginationSchema.extend({
  busca: z.string().trim().nullable().default(null),
  precoMin: z.coerce.number().nullable().default(null),
  precoMax: z.coerce.number().nullable().default(null),
  incluirInativos: z.stringbool().default(false),
});

const productSchema = z.object({
  nome: name,
  descricao: description.default(null),
  preco: price,
  quantidadeEstoque: z.number().int().nonnegative().default(0),
});

const productUpdateSchema = z.object({
  nome: name.optional(),
  descricao: description.optional(),
  preco: price.optional(),
  ativo: z.boolean().optional(),
});

export const productRouter = Router();

productRouter.use(authenticate);

productRouter.get('/', async (request, response) => {
  const filters = filtersSchema.parse(request.query);
  response.json(await service.list(filters, request.user.perfil === 'admin'));
});

productRouter.get('/:id', async (request, response) => {
  const id = idSchema.parse(request.params.id);
  response.json(await service.get(id, request.user.perfil === 'admin'));
});

productRouter.post('/', requireAdmin, async (request, response) => {
  const input = productSchema.parse(request.body);
  response.status(201).json(await service.create(input));
});

productRouter.put('/:id', requireAdmin, async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const input = productUpdateSchema.parse(request.body);
  response.json(await service.update(id, input));
});

productRouter.delete('/:id', requireAdmin, async (request, response) => {
  await service.deactivate(idSchema.parse(request.params.id));
  response.status(204).send();
});
