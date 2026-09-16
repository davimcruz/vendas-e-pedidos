import postgres from 'postgres';
import { env } from '../config/env.js';

const numericTypeId = 1700;

export const sql = postgres(env.DATABASE_URL, {
  transform: postgres.camel,
  onnotice: () => {},
  types: {
    numeric: { to: numericTypeId, from: [numericTypeId], serialize: String, parse: Number },
  },
});

export type Database = postgres.Sql | postgres.TransactionSql;
