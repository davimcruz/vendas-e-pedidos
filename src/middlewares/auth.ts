import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../shared/AppError.js';

const tokenPayload = z.object({
  sub: z.coerce.number(),
  perfil: z.enum(['cliente', 'admin']),
});

export const authenticate: RequestHandler = (request, response, next) => {
  const token = request.headers.authorization?.replace('Bearer ', '') ?? '';
  try {
    const { sub, perfil } = tokenPayload.parse(jwt.verify(token, env.JWT_SECRET));
    request.user = { id: sub, perfil };
  } catch {
    throw new AppError(401, 'NAO_AUTORIZADO', 'Token ausente, inválido ou expirado.');
  }
  next();
};

export const requireAdmin: RequestHandler = (request, response, next) => {
  if (request.user.perfil !== 'admin') {
    throw new AppError(403, 'ACESSO_NEGADO', 'Você não possui permissão para esta operação.');
  }
  next();
};
