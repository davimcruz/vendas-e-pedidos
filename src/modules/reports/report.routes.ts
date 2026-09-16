import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../../middlewares/auth.js';
import { paginationSchema } from '../../shared/schemas.js';
import * as service from './report.service.js';

const dateRangeSchema = z.object({
  inicio: z.iso.date().nullable().default(null),
  fim: z.iso.date().nullable().default(null),
});

const salesFiltersSchema = dateRangeSchema.extend(paginationSchema.shape);

export const reportRouter = Router();

reportRouter.use(authenticate, requireAdmin);

reportRouter.get('/vendas', async (request, response) => {
  response.json(await service.list(salesFiltersSchema.parse(request.query)));
});

reportRouter.get('/vendas/resumo', async (request, response) => {
  response.json(await service.summary(dateRangeSchema.parse(request.query)));
});
