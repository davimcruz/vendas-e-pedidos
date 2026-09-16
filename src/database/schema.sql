CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  perfil VARCHAR(20) NOT NULL DEFAULT 'cliente' CHECK (perfil IN ('cliente', 'admin')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS produtos (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome VARCHAR(160) NOT NULL,
  descricao TEXT,
  preco NUMERIC(10, 2) NOT NULL CHECK (preco >= 0),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estoques (
  produto_id INTEGER PRIMARY KEY REFERENCES produtos(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cupons (
  codigo VARCHAR(20) PRIMARY KEY,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('percentual', 'fixo')),
  desconto NUMERIC(10, 2) NOT NULL CHECK (desconto >= 0),
  status VARCHAR(10) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  expira_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (tipo <> 'percentual' OR desconto <= 100)
);

CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  frete NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (frete >= 0),
  desconto NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (desconto >= 0),
  cupom_codigo VARCHAR(20) REFERENCES cupons(codigo),
  valor_total NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (valor_total >= 0),
  status VARCHAR(30) NOT NULL DEFAULT 'aguardando_pagamento'
    CHECK (status IN ('aguardando_pagamento', 'pago', 'cancelado', 'enviado')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itens_pedido (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario NUMERIC(10, 2) NOT NULL CHECK (preco_unitario >= 0),
  UNIQUE (pedido_id, produto_id)
);

CREATE TABLE IF NOT EXISTS pagamentos (
  id VARCHAR(20) PRIMARY KEY,
  pedido_id INTEGER NOT NULL UNIQUE REFERENCES pedidos(id),
  forma_pagamento VARCHAR(20) NOT NULL,
  valor NUMERIC(10, 2) NOT NULL CHECK (valor >= 0),
  status VARCHAR(20) NOT NULL,
  referencia_externa VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
