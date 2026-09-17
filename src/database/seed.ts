import bcrypt from 'bcryptjs';
import { sql } from './sql.js';

const email = process.env.ADMIN_EMAIL ?? 'admin@upshoop.local';
const password = process.env.ADMIN_PASSWORD ?? 'Admin123!';
const passwordHash = await bcrypt.hash(password, 12);

await sql`INSERT INTO clientes (nome, email, senha_hash, perfil)
  VALUES ('Administrador', LOWER(${email}), ${passwordHash}, 'admin')
  ON CONFLICT (email) DO NOTHING`;
await sql`INSERT INTO cupons (codigo, tipo, desconto)
  VALUES ('DESCONTO10', 'percentual', 10)
  ON CONFLICT (codigo) DO NOTHING`;
await sql`WITH produto AS (
    INSERT INTO produtos (nome, descricao, preco)
    SELECT 'Notebook', 'Produto de exemplo para testes', 3500
    WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Notebook')
    RETURNING id
  )
  INSERT INTO estoques (produto_id, quantidade) SELECT id, 1000 FROM produto`;
await sql.end();
console.log(`Seed concluído. Administrador local: ${email}`);
