import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/AppError.js';
import type { Client, Credentials, Registration, Session } from './auth.types.js';
import { clientRepository } from './client.repository.js';

function createSession(cliente: Client): Session {
  const token = jwt.sign({ perfil: cliente.perfil }, env.JWT_SECRET, {
    subject: String(cliente.id),
    expiresIn: '1d',
  });
  return { cliente, token };
}

export async function register(input: Registration): Promise<Session> {
  const passwordHash = await bcrypt.hash(input.senha, 12);
  const client = await clientRepository.create(input.nome, input.email, passwordHash);
  return createSession(client);
}

export async function login(input: Credentials): Promise<Session> {
  const client = await clientRepository.findByEmail(input.email);
  if (!client || !(await bcrypt.compare(input.senha, client.senhaHash))) {
    throw new AppError(401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha inválidos.');
  }
  const { senhaHash, ...cliente } = client;
  return createSession(cliente);
}

export async function getCurrentClient(id: number): Promise<Client> {
  const client = await clientRepository.findById(id);
  if (!client) {
    throw new AppError(404, 'CLIENTE_NAO_ENCONTRADO', 'Cliente não encontrado.');
  }
  return client;
}
