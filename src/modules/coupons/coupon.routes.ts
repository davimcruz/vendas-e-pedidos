import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../../middlewares/auth.js';
import * as service from './coupon.service.js';

const couponType = z.enum(['percentual', 'fixo']);
const couponStatus = z.enum(['ativo', 'inativo']);
const expiration = z.coerce.date().nullable();

const couponSchema = z.object({
  codigo: z.string().trim().min(1).max(20),
  tipo: couponType,
  desconto: z.number().nonnegative(),
  status: couponStatus.default('ativo'),
  expiraEm: expiration.default(null),
});

const couponUpdateSchema = z.object({
  tipo: couponType.optional(),
  desconto: z.number().nonnegative().optional(),
  status: couponStatus.optional(),
  expiraEm: expiration.optional(),
});

export const couponRouter = Router();

couponRouter.use(authenticate);

couponRouter.post('/validar', async (request, response) => {
  const { codigo } = z.object({ codigo: z.string() }).parse(request.body);
  response.json(await service.validateCoupon(codigo));
});

couponRouter.get('/', requireAdmin, async (request, response) => {
  response.json(await service.list());
});

couponRouter.post('/', requireAdmin, async (request, response) => {
  const coupon = couponSchema.parse(request.body);
  response.status(201).json(await service.create(coupon));
});

couponRouter.put('/:codigo', requireAdmin, async (request, response) => {
  const input = couponUpdateSchema.parse(request.body);
  response.json(await service.update(z.string().parse(request.params.codigo), input));
});
