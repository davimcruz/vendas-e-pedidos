import { AppError } from '../../shared/AppError.js';
import { productRepository } from './product.repository.js';
import type { Product, ProductFilters, ProductInput, ProductUpdate } from './product.types.js';

export async function list(filters: ProductFilters, isAdmin: boolean) {
  const { rows, total } = await productRepository.list({
    ...filters,
    incluirInativos: isAdmin && filters.incluirInativos,
  });
  return { dados: rows, paginacao: { pagina: filters.pagina, limite: filters.limite, total } };
}

export async function get(id: number, includeInactive: boolean): Promise<Product> {
  const product = await productRepository.findById(id, includeInactive);
  if (!product) {
    throw new AppError(404, 'PRODUTO_NAO_ENCONTRADO', 'Produto não encontrado.');
  }
  return product;
}

export function create(input: ProductInput): Promise<Product> {
  return productRepository.create(input);
}

export async function update(id: number, input: ProductUpdate): Promise<Product> {
  const current = await get(id, true);
  await productRepository.update({ ...current, ...input });
  return get(id, true);
}

export async function deactivate(id: number): Promise<void> {
  await get(id, true);
  await productRepository.deactivate(id);
}
