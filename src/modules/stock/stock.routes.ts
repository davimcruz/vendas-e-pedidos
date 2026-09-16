import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../../middlewares/auth.js';
import { idSchema } from '../../shared/schemas.js';
import * as service from './stock.service.js';

const quantitySchema = z.object({ quantidade: z.number().int().nonnegative() });
const adjustmentSchema = z.object({ ajuste: z.number().int() });

export const stockRouter = Router();

stockRouter.use(authenticate);

stockRouter.get('/:produtoId', async (request, response) => {
  response.json(await service.get(idSchema.parse(request.params.produtoId)));
});

stockRouter.put('/:produtoId', requireAdmin, async (request, response) => {
  const productId = idSchema.parse(request.params.produtoId);
  const { quantidade } = quantitySchema.parse(request.body);
  response.json(await service.set(productId, quantidade));
});

stockRouter.patch('/:produtoId', requireAdmin, async (request, response) => {
  const productId = idSchema.parse(request.params.produtoId);
  const { ajuste } = adjustmentSchema.parse(request.body);
  response.json(await service.adjust(productId, ajuste));
});
