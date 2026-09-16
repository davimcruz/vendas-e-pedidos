import { expect, test } from '@jest/globals';
import request from 'supertest';
import { app } from '../src/app.js';

test('GET /health responde sem depender do banco', async () => {
  const response = await request(app).get('/health');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: 'ok' });
});

test('GET /produtos exige autenticação', async () => {
  const response = await request(app).get('/produtos');
  expect(response.status).toBe(401);
  expect(response.body.erro.codigo).toBe('NAO_AUTORIZADO');
});

test('POST /auth/cadastro valida o corpo antes do banco', async () => {
  const response = await request(app).post('/auth/cadastro').send({ nome: 'A' });
  expect(response.status).toBe(400);
  expect(response.body.erro.codigo).toBe('DADOS_INVALIDOS');
});
