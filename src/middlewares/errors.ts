import type { ErrorRequestHandler, RequestHandler } from 'express';
import postgres from 'postgres';
import { ZodError } from 'zod';
import { AppError } from '../shared/AppError.js';

export const notFound: RequestHandler = (request) => {
  throw new AppError(
    404,
    'ROTA_NAO_ENCONTRADA',
    `Rota ${request.method} ${request.originalUrl} não encontrada.`,
  );
};

export const errorHandler: ErrorRequestHandler = (error, request, response, next) => {
  if (error instanceof AppError) {
    response
      .status(error.statusCode)
      .json({ erro: { codigo: error.code, mensagem: error.message } });
    return;
  }
  if (error instanceof ZodError) {
    response.status(400).json({
      erro: {
        codigo: 'DADOS_INVALIDOS',
        mensagem: 'Os dados enviados são inválidos.',
        detalhes: error.issues,
      },
    });
    return;
  }
  const isInvalidJson = error instanceof SyntaxError;
  const isCheckViolation = error instanceof postgres.PostgresError && error.code === '23514';
  if (isInvalidJson || isCheckViolation) {
    response
      .status(400)
      .json({ erro: { codigo: 'DADOS_INVALIDOS', mensagem: 'Os dados enviados são inválidos.' } });
    return;
  }
  if (error instanceof postgres.PostgresError && error.code === '23505') {
    response
      .status(409)
      .json({ erro: { codigo: 'REGISTRO_DUPLICADO', mensagem: 'O registro já existe.' } });
    return;
  }
  console.error(error);
  response
    .status(500)
    .json({ erro: { codigo: 'ERRO_INTERNO', mensagem: 'Erro interno do servidor.' } });
};
