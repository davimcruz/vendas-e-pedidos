import { sql } from '../../database/sql.js';
import type { Client, ClientWithPassword } from './auth.types.js';

export const clientRepository = {
  async create(nome: string, email: string, senhaHash: string): Promise<Client> {
    const [client] = await sql<Client[]>`INSERT INTO clientes (nome, email, senha_hash)
      VALUES (${nome}, LOWER(${email}), ${senhaHash})
      RETURNING id, nome, email, perfil`;
    return client;
  },

  async findByEmail(email: string): Promise<ClientWithPassword | undefined> {
    const [client] = await sql<ClientWithPassword[]>`SELECT id, nome, email, perfil, senha_hash
      FROM clientes WHERE email = LOWER(${email})`;
    return client;
  },

  async findById(id: number): Promise<Client | undefined> {
    const [client] = await sql<Client[]>`SELECT id, nome, email, perfil
      FROM clientes WHERE id = ${id}`;
    return client;
  },
};
