import { API_URL } from './constants';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function request(path, { token, method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const options = { method, headers };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(API_URL + path, options);
  } catch {
    throw new ApiError('Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.', 0);
  }

  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new ApiError(data?.erro?.mensagem ?? 'Algo deu errado.', response.status);
  }
  return data;
}
