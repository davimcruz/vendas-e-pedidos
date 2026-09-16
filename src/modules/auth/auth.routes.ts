import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/auth.js';
import * as service from './auth.service.js';

const credentialsSchema = z.object({ email: z.string(), senha: z.string() });

const registrationSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.email(),
  senha: z.string().min(8).max(72),
});

export const authRouter = Router();

authRouter.post('/cadastro', async (request, response) => {
  const input = registrationSchema.parse(request.body);
  response.status(201).json(await service.register(input));
});

authRouter.post('/login', async (request, response) => {
  const input = credentialsSchema.parse(request.body);
  response.json(await service.login(input));
});

authRouter.get('/me', authenticate, async (request, response) => {
  response.json(await service.getCurrentClient(request.user.id));
});
