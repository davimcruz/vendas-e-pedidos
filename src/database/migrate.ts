import { readFile } from 'node:fs/promises';
import { sql } from './sql.js';

await sql.unsafe(await readFile('src/database/schema.sql', 'utf8'));
await sql.end();
console.log('Schema aplicado.');
