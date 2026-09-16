import 'dotenv/config';
import { z } from 'zod';

export const env = z
  .object({
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string(),
    JWT_SECRET: z.string().min(16),
    CORS_ORIGIN: z.string().default('*'),
  })
  .parse(process.env);
