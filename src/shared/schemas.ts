import { z } from 'zod';

export const idSchema = z.coerce.number().int().positive();

export const paginationSchema = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});
