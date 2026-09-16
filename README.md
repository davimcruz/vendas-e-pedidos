# Vendas e Pedidos API

Backend TypeScript + Node.js + Express + PostgreSQL para autenticação, catálogo, estoque, cupons, pedidos e relatórios. O projeto não possui frontend, variantes de produto nem integrações externas de frete/pagamento.

## Execução rápida

```bash
docker compose up --build
```

A API estará em `http://localhost:3001`. O ambiente local cria um administrador (`admin@upshoop.local` / `Admin123!`), o cupom `DESCONTO10` (10% de desconto) e o produto `Notebook` (preço 3500, estoque 10). Troque as credenciais com `ADMIN_EMAIL` e `ADMIN_PASSWORD` fora do ambiente local.

## Fluxo de teste (Postman)

1. `POST /auth/login` com o administrador para obter o `token`.
2. `POST /auth/cadastro` para criar um cliente e obter o `clienteId`.
3. `GET /produtos` para obter o `produtoId` do `Notebook`.
4. `POST /pedidos` para criar o pedido (status `aguardando_pagamento`).
5. `PUT /pedidos/:id/status` com `pago` (baixa o estoque) e depois `enviado`.

## Endpoints do PDF

Estes contratos reproduzem a seção de APIs internas do documento. Com exceção de login e cadastro, todas exigem `Authorization: Bearer <token>`; sem token válido a resposta é `401`.

| Método | Rota                          | Resposta principal                                          | Códigos HTTP            |
| ------ | ----------------------------- | ----------------------------------------------------------- | ----------------------- |
| POST   | `/auth/login`                 | `{ cliente, token }` (token válido por 1 dia)               | 200, 400, 401           |
| POST   | `/auth/cadastro`              | `{ cliente, token }` com perfil `cliente`                   | 201, 400, 409           |
| GET    | `/produtos`                   | `{ dados, paginacao }`                                      | 200, 400, 401           |
| GET    | `/pedidos?status=&clienteId=` | Array com `id`, `clienteId`, `valorTotal` e `status`        | 200, 400, 401, 500      |
| GET    | `/pedidos/:id`                | Pedido com subtotal, frete, desconto, cupom, total e status | 200, 400, 401, 404, 500 |
| POST   | `/pedidos`                    | Pedido criado com status `aguardando_pagamento`             | 201, 400, 401, 404, 500 |
| PUT    | `/pedidos/:id`                | Pedido atualizado                                           | 200, 400, 401, 404, 409 |
| PUT    | `/pedidos/:id/status`         | `{ id, status }`                                            | 200, 400, 401, 404, 409 |
| DELETE | `/pedidos/:id`                | Sem conteúdo (`204`)                                        | 204, 400, 401, 404, 409 |
| POST   | `/cupons/validar`             | `{ valido, codigo, tipo, desconto }`                        | 200, 400, 401, 404      |

Todos os erros respondem `{ "erro": { "codigo", "mensagem" } }`; erros de validação (`DADOS_INVALIDOS`) também trazem `detalhes`.

### Regras dos pedidos

- `itens` precisa de pelo menos um item e não pode repetir o mesmo produto (`400`).
- Cupom inexistente, inativo ou expirado retorna `400` em `POST /pedidos` e `PUT /pedidos/:id`, e `404` (inexistente) ou `400` (inativo/expirado) em `POST /cupons/validar`.
- `PUT /pedidos/:id` só altera pedidos `aguardando_pagamento` (`409` nos demais). Itens, frete e cupom substituem os anteriores; `cupom` omitido ou `null` remove o cupom.
- Mudanças de status permitidas: `aguardando_pagamento` → `pago` ou `cancelado`; `pago` → `enviado` ou `cancelado`. `enviado` e `cancelado` são finais. Qualquer outra mudança, inclusive para o mesmo status, retorna `409`.
- Mudar para `pago` baixa o estoque; se faltar saldo, nada muda e a resposta é `400`. Cancelar um pedido `pago` devolve o estoque.
- `DELETE /pedidos/:id` é o mesmo que mudar o status para `cancelado`.

## Endpoints de suporte

| Método          | Rota                        | Acesso            | Finalidade                |
| --------------- | --------------------------- | ----------------- | ------------------------- |
| GET             | `/auth/me`                  | Autenticado       | Consultar sessão          |
| GET             | `/produtos/:id`             | Autenticado       | Detalhes e estoque        |
| POST/PUT/DELETE | `/produtos...`              | Admin             | Administrar catálogo      |
| GET/PUT/PATCH   | `/estoque/:produtoId`       | Autenticado/Admin | Consultar/alterar estoque |
| GET/POST/PUT    | `/cupons...`                | Admin             | Administrar cupons        |
| GET             | `/relatorios/vendas`        | Admin             | Exportar vendas           |
| GET             | `/relatorios/vendas/resumo` | Admin             | Indicadores agregados     |

Todas as rotas protegidas usam `Authorization: Bearer <token>`.

Cada módulo em `src/modules` segue o mesmo formato: `*.routes.ts` (HTTP e validação com zod), `*.service.ts` (regras), `*.repository.ts` (SQL) e `*.types.ts` (tipos).

## Banco de dados

O schema fica em `src/database/schema.sql`. As colunas usam `snake_case` e a API expõe os mesmos campos em `camelCase` (`cliente_id` → `clienteId`). A exceção é `pedidos.cupom_codigo`, exposto como `cupom`.

| Tabela         | Origem             | Observação                                                                  |
| -------------- | ------------------ | --------------------------------------------------------------------------- |
| `pedidos`      | Vendas e Pedidos   | Status: `aguardando_pagamento`, `pago`, `enviado`, `cancelado`              |
| `itens_pedido` | Vendas e Pedidos   | `preco_unitario` guarda o preço no momento da compra; um produto por pedido |
| `cupons`       | Vendas e Pedidos   | `expira_em` opcional; percentual até 100; código salvo em maiúsculas        |
| `pagamentos`   | Vendas e Pedidos   | Estrutura pronta; ainda não é preenchida (sem integração com Mercado Pago)  |
| `clientes`     | Módulo de Clientes | Cópia local; e-mail único em minúsculas; perfil `cliente` ou `admin`        |
| `produtos`     | Módulo de Produtos | Cópia local; remoção apenas marca `ativo = false`                           |
| `estoques`     | Módulo de Estoque  | Cópia local; um registro por produto; quantidade nunca negativa             |

## Desenvolvimento sem Docker para a API

```bash
docker compose up -d postgres
cp .env.example .env
corepack enable
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

`pnpm db:migrate` aplica `src/database/schema.sql`, que é idempotente.

## Verificações

```bash
pnpm test
pnpm lint
```
