export type Profile = 'cliente' | 'admin';

export type Client = {
  id: number;
  nome: string;
  email: string;
  perfil: Profile;
};

export type ClientWithPassword = Client & { senhaHash: string };

export type AuthenticatedUser = Pick<Client, 'id' | 'perfil'>;

export type Credentials = { email: string; senha: string };

export type Registration = Credentials & { nome: string };

export type Session = { cliente: Client; token: string };
