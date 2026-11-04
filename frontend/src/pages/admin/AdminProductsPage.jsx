import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Cell, DataTable } from '../../components/DataTable';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import Loading from '../../components/Loading';
import Pager from '../../components/Pager';
import StatusPill from '../../components/StatusPill';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { ADMIN_PAGE_SIZE } from '../../lib/constants';
import { money } from '../../lib/format';
import { withPage, withParams } from '../../lib/query';
import AdminHead from './AdminHead';
import ProductDialog from './ProductDialog';
import StockDialog from './StockDialog';

const HEADERS = ['Produto', 'Preço', 'Estoque', 'Situação', 'Ações'];

function ProductRow({ product, onEdit, onStock, onToggle }) {
  return (
    <tr>
      <Cell label="Produto">
        <strong>{product.nome}</strong>
        <br />
        <span className="hint">{product.descricao}</span>
      </Cell>
      <Cell label="Preço">{money(product.preco)}</Cell>
      <Cell label="Estoque">{product.quantidadeEstoque === 0 ? <span className="tag">Sem estoque</span> : product.quantidadeEstoque}</Cell>
      <Cell label="Situação">
        <StatusPill active={product.ativo} />
      </Cell>
      <Cell label="Ações">
        <div className="actions">
          <button type="button" onClick={onEdit}>
            Editar
          </button>
          <button type="button" onClick={onStock}>
            Estoque
          </button>
          <button type="button" onClick={onToggle}>
            {product.ativo ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      </Cell>
    </tr>
  );
}

export default function AdminProductsPage() {
  const [params, setParams] = useSearchParams();
  const { api } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [dialog, setDialog] = useState(null);
  const page = Number(params.get('pagina')) || 1;
  const showInactive = params.get('inativos') === '1';

  const query = new URLSearchParams({ pagina: page, limite: ADMIN_PAGE_SIZE, incluirInativos: showInactive });
  if (params.get('busca')) {
    query.set('busca', params.get('busca'));
  }
  const { data, error, loading, reload } = useFetch(`/produtos?${query}`);

  async function handleToggle(product) {
    try {
      if (product.ativo) {
        const confirmed = await confirm({
          title: `Desativar ${product.nome}?`,
          text: 'O produto some da loja, mas continua nos pedidos antigos. Você pode ativá-lo de novo depois.',
          label: 'Desativar',
        });
        if (!confirmed) {
          return;
        }
        await api(`/produtos/${product.id}`, { method: 'DELETE' });
        toast(`${product.nome} desativado.`);
      } else {
        await api(`/produtos/${product.id}`, { method: 'PUT', body: { ativo: true } });
        toast(`${product.nome} ativado.`);
      }
      reload();
    } catch (toggleError) {
      toast(toggleError.message);
    }
  }

  function renderTable() {
    if (error) {
      return <ErrorMessage error={error} />;
    }
    if (loading) {
      return <Loading />;
    }
    if (data.dados.length === 0) {
      return <EmptyState text="Nenhum produto encontrado." />;
    }
    return (
      <>
        <DataTable headers={HEADERS}>
          {data.dados.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              onEdit={() => setDialog({ type: 'product', product })}
              onStock={() => setDialog({ type: 'stock', product })}
              onToggle={() => handleToggle(product)}
            />
          ))}
        </DataTable>
        <Pager page={page} total={data.paginacao.total} limit={data.paginacao.limite} linkTo={(target) => `?${withPage(params, target)}`} />
      </>
    );
  }

  return (
    <>
      <AdminHead title="Produtos">
        <button type="button" className="primary" onClick={() => setDialog({ type: 'product', product: null })}>
          Novo produto
        </button>
      </AdminHead>
      <div className="toolbar">
        <form
          role="search"
          key={params.get('busca')}
          onSubmit={(event) => {
            event.preventDefault();
            setParams(withParams(params, { busca: new FormData(event.target).get('busca').trim() }));
          }}
        >
          <input type="search" name="busca" aria-label="Buscar produtos" placeholder="Buscar por nome ou descrição" defaultValue={params.get('busca') ?? ''} />
          <button type="submit">Buscar</button>
        </form>
        <label className="check">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(event) => setParams(withParams(params, { inativos: event.target.checked ? '1' : null }))}
          />
          Mostrar inativos
        </label>
      </div>
      {renderTable()}
      {dialog?.type === 'product' && <ProductDialog product={dialog.product} onClose={() => setDialog(null)} onSaved={reload} />}
      {dialog?.type === 'stock' && <StockDialog product={dialog.product} onClose={() => setDialog(null)} onSaved={reload} />}
    </>
  );
}
