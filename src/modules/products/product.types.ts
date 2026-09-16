export type Product = {
  id: number;
  nome: string;
  descricao: string | null;
  preco: number;
  ativo: boolean;
  quantidadeEstoque: number;
};

export type ProductInput = Omit<Product, 'id' | 'ativo'>;

export type ProductUpdate = Partial<Omit<Product, 'id' | 'quantidadeEstoque'>>;

export type ProductFilters = {
  busca: string | null;
  precoMin: number | null;
  precoMax: number | null;
  pagina: number;
  limite: number;
  incluirInativos: boolean;
};
