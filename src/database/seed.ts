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
const products = [
  { nome: 'Notebook', descricao: 'Produto de exemplo para testes', preco: 3500, estoque: 1000 },
  { nome: 'Mouse sem fio', descricao: 'Mouse óptico 2.4 GHz com 1600 DPI', preco: 89.9, estoque: 150 },
  { nome: 'Teclado mecânico', descricao: 'Teclado ABNT2 com switches azuis e iluminação', preco: 289.9, estoque: 80 },
  { nome: 'Monitor 24"', descricao: 'Monitor Full HD IPS de 24 polegadas', preco: 899, estoque: 40 },
  { nome: 'Headset gamer', descricao: 'Headset com microfone removível e som estéreo', preco: 199.9, estoque: 100 },
  { nome: 'Webcam Full HD', descricao: 'Webcam 1080p com microfone embutido', preco: 159.9, estoque: 60 },
  { nome: 'SSD 480 GB', descricao: 'SSD SATA de 480 GB, leitura de até 500 MB/s', preco: 229.9, estoque: 120 },
  { nome: 'Hub USB-C', descricao: 'Hub com 4 portas USB 3.0 e entrada HDMI', preco: 119.9, estoque: 90 },
  { nome: 'Cadeira ergonômica', descricao: 'Cadeira de escritório com apoio lombar e altura ajustável', preco: 749, estoque: 25 },
  { nome: 'Mochila para notebook', descricao: 'Mochila impermeável para notebooks de até 15,6 polegadas', preco: 139.9, estoque: 70 },
  { nome: 'Caixa de som Bluetooth', descricao: 'Caixa portátil à prova d\'água com 12 horas de bateria', preco: 179.9, estoque: 55 },
  { nome: 'Carregador rápido 65W', descricao: 'Carregador USB-C GaN com duas portas', preco: 149.9, estoque: 0 },
];

for (const product of products) {
  await sql`WITH produto AS (
      INSERT INTO produtos (nome, descricao, preco)
      SELECT ${product.nome}::text, ${product.descricao}::text, ${product.preco}::numeric
      WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = ${product.nome}::text)
      RETURNING id
    )
    INSERT INTO estoques (produto_id, quantidade) SELECT id, ${product.estoque}::int FROM produto`;
}
await sql.end();
console.log(`Seed concluído. Administrador local: ${email}`);
