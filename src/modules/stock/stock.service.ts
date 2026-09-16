import { AppError } from '../../shared/AppError.js';
import { stockRepository } from './stock.repository.js';
import type { Stock } from './stock.types.js';

export async function get(productId: number): Promise<Stock> {
  const stock = await stockRepository.findByProduct(productId);
  if (!stock) {
    throw new AppError(404, 'PRODUTO_NAO_ENCONTRADO', 'Produto não encontrado.');
  }
  return stock;
}

export async function set(productId: number, quantity: number): Promise<Stock> {
  const stock = await stockRepository.set(productId, quantity);
  if (!stock) {
    throw new AppError(404, 'PRODUTO_NAO_ENCONTRADO', 'Produto não encontrado.');
  }
  return stock;
}

export async function adjust(productId: number, delta: number): Promise<Stock> {
  const stock = await stockRepository.adjust(productId, delta);
  if (!stock) {
    await get(productId);
    throw new AppError(409, 'ESTOQUE_INSUFICIENTE', 'O ajuste deixaria o estoque negativo.');
  }
  return stock;
}
