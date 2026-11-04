import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../src/app.js';
import { env } from '../src/config/env.js';
import { sql } from '../src/database/sql.js';

// Integração com o banco de testes: precisa do Postgres (docker compose up -d postgres).
let productId: number;
let ana: { id: number; token: string };
let bruno: { id: number; token: string };
const adminToken = jwt.sign({ sub: 0, perfil: 'admin' }, env.JWT_SECRET);
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function register(nome: string) {
  const email = `${nome}-${Date.now()}@teste.com`;
  const response = await request(app).post('/auth/cadastro').send({ nome, email, senha: 'senha1234' });
  return { id: response.body.cliente.id as number, token: response.body.token as string };
}

async function createOrder(client: { id: number; token: string }, quantidade = 2) {
  const response = await request(app)
    .post('/pedidos')
    .set(auth(client.token))
    .send({ clienteId: client.id, itens: [{ produtoId: productId, quantidade }], frete: 10 });
  return response.body.id as number;
}

const stockOf = async () => (await sql`SELECT quantidade FROM estoques WHERE produto_id = ${productId}`)[0].quantidade;

beforeAll(async () => {
  await sql.unsafe(readFileSync('src/database/schema.sql', 'utf8'));
  ana = await register('Ana');
  bruno = await register('Bruno');
  const [product] = await sql`INSERT INTO produtos (nome, descricao, preco) VALUES ('Produto de teste', 'x', 100) RETURNING id`;
  productId = product.id;
  await sql`INSERT INTO estoques (produto_id, quantidade) VALUES (${productId}, 10)`;
});

afterAll(async () => {
  await sql.end();
});

test('cliente lista apenas os próprios pedidos, mesmo pedindo o filtro de outro', async () => {
  const anaOrder = await createOrder(ana);
  await createOrder(bruno);
  const response = await request(app).get(`/pedidos?clienteId=${bruno.id}`).set(auth(ana.token));
  expect(response.status).toBe(200);
  expect(response.body.every((order: { clienteId: number }) => order.clienteId === ana.id)).toBe(true);
  expect(response.body.map((order: { id: number }) => order.id)).toContain(anaOrder);
});

test('cliente não vê, edita nem cancela pedido de outro cliente', async () => {
  const orderId = await createOrder(ana);
  const body = { itens: [{ produtoId: productId, quantidade: 1 }], frete: 0 };
  expect((await request(app).get(`/pedidos/${orderId}`).set(auth(bruno.token))).status).toBe(404);
  expect((await request(app).put(`/pedidos/${orderId}`).set(auth(bruno.token)).send(body)).status).toBe(404);
  expect((await request(app).delete(`/pedidos/${orderId}`).set(auth(bruno.token))).status).toBe(404);
});

test('cliente não cria pedido em nome de outro cliente', async () => {
  const response = await request(app)
    .post('/pedidos')
    .set(auth(bruno.token))
    .send({ clienteId: ana.id, itens: [{ produtoId: productId, quantidade: 1 }], frete: 0 });
  expect(response.status).toBe(403);
});

test('cliente cancela o próprio pedido, mas não o marca como pago', async () => {
  const orderId = await createOrder(ana);
  const pay = await request(app).put(`/pedidos/${orderId}/status`).set(auth(ana.token)).send({ status: 'pago' });
  expect(pay.status).toBe(403);
  const cancel = await request(app).delete(`/pedidos/${orderId}`).set(auth(ana.token));
  expect(cancel.status).toBe(204);
});

test('detalhe do pedido traz os itens com nome e preço', async () => {
  const orderId = await createOrder(ana, 3);
  const response = await request(app).get(`/pedidos/${orderId}`).set(auth(ana.token));
  expect(response.status).toBe(200);
  expect(response.body.itens).toEqual([
    { produtoId: productId, nome: 'Produto de teste', quantidade: 3, precoUnitario: 100 },
  ]);
  expect(response.body.valorTotal).toBe(310);
});

test('admin marca como pago (baixa estoque) e cancelar devolve o estoque', async () => {
  const orderId = await createOrder(ana, 4);
  const before = await stockOf();
  const pay = await request(app).put(`/pedidos/${orderId}/status`).set(auth(adminToken)).send({ status: 'pago' });
  expect(pay.status).toBe(200);
  expect(await stockOf()).toBe(before - 4);
  await request(app).put(`/pedidos/${orderId}/status`).set(auth(adminToken)).send({ status: 'cancelado' });
  expect(await stockOf()).toBe(before);
});

test('pedido pago não aceita edição de itens (RN)', async () => {
  const orderId = await createOrder(ana);
  await request(app).put(`/pedidos/${orderId}/status`).set(auth(adminToken)).send({ status: 'pago' });
  const response = await request(app)
    .put(`/pedidos/${orderId}`)
    .set(auth(ana.token))
    .send({ itens: [{ produtoId: productId, quantidade: 1 }], frete: 0 });
  expect(response.status).toBe(409);
});

test('quantidade acima do estoque é recusada (RN02)', async () => {
  const response = await request(app)
    .post('/pedidos')
    .set(auth(ana.token))
    .send({ clienteId: ana.id, itens: [{ produtoId: productId, quantidade: 9999 }], frete: 0 });
  expect(response.status).toBe(400);
  expect(response.body.erro.codigo).toBe('PRODUTO_SEM_ESTOQUE');
});

test('pedido sem itens é recusado (RN03)', async () => {
  const response = await request(app).post('/pedidos').set(auth(ana.token)).send({ clienteId: ana.id, itens: [], frete: 0 });
  expect(response.status).toBe(400);
});
