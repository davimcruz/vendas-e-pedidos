import { Link, useSearchParams } from 'react-router-dom';
import { Cell, DataTable } from '../../components/DataTable';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import Loading from '../../components/Loading';
import Pager from '../../components/Pager';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { ADMIN_PAGE_SIZE } from '../../lib/constants';
import { formatDate, money, pluralize } from '../../lib/format';
import { withPage, withParams } from '../../lib/query';
import { exportSalesCsv } from '../../lib/salesCsv';
import AdminHead from './AdminHead';

const HEADERS = ['Pedido', 'Cliente', 'Data', 'Subtotal', 'Frete', 'Desconto', 'Total', 'Situação'];

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SaleRow({ sale }) {
  return (
    <tr>
      <Cell label="Pedido">
        <Link to={`/pedido/${sale.id}`}>
          <strong>#{sale.id}</strong>
        </Link>
      </Cell>
      <Cell label="Cliente">{sale.clienteNome}</Cell>
      <Cell label="Data">{formatDate(sale.criadoEm)}</Cell>
      <Cell label="Subtotal">{money(sale.subtotal)}</Cell>
      <Cell label="Frete">{money(sale.frete)}</Cell>
      <Cell label="Desconto">{money(sale.desconto)}</Cell>
      <Cell label="Total">
        <strong>{money(sale.valorTotal)}</strong>
      </Cell>
      <Cell label="Situação">
        <StatusBadge status={sale.status} />
      </Cell>
    </tr>
  );
}

function RangeForm({ params, onApply }) {
  return (
    <form className="toolbar" key={`${params.get('inicio')}-${params.get('fim')}`} onSubmit={onApply}>
      <div>
        <label htmlFor="inicio">De</label>
        <input id="inicio" name="inicio" type="date" defaultValue={params.get('inicio') ?? ''} />
      </div>
      <div>
        <label htmlFor="fim">Até</label>
        <input id="fim" name="fim" type="date" defaultValue={params.get('fim') ?? ''} />
      </div>
      <button type="submit" className="primary">
        Aplicar período
      </button>
      <Link className="button" to="">
        Limpar
      </Link>
    </form>
  );
}

export default function AdminReportsPage() {
  const [params, setParams] = useSearchParams();
  const { api } = useAuth();
  const toast = useToast();
  const page = Number(params.get('pagina')) || 1;

  const range = new URLSearchParams();
  ['inicio', 'fim'].forEach((key) => {
    if (params.get(key)) {
      range.set(key, params.get(key));
    }
  });
  const listQuery = new URLSearchParams(range);
  listQuery.set('pagina', page);
  listQuery.set('limite', ADMIN_PAGE_SIZE);

  const summary = useFetch(`/relatorios/vendas/resumo?${range}`);
  const sales = useFetch(`/relatorios/vendas?${listQuery}`);

  function handleApply(event) {
    event.preventDefault();
    const data = new FormData(event.target);
    setParams(withParams(params, { inicio: data.get('inicio'), fim: data.get('fim') }));
  }

  async function handleExport() {
    try {
      const count = await exportSalesCsv(api, range);
      toast(`${pluralize(count, 'venda exportada', 'vendas exportadas')}.`);
    } catch (exportError) {
      toast(exportError.message);
    }
  }

  function renderReport() {
    const failure = summary.error ?? sales.error;
    if (failure) {
      return <ErrorMessage error={failure} />;
    }
    if (summary.loading || sales.loading) {
      return <Loading />;
    }
    return (
      <>
        <div className="cards">
          <Stat label="Pedidos vendidos" value={summary.data.quantidadePedidos} />
          <Stat label="Valor vendido" value={money(summary.data.valorVendido)} />
          <Stat label="Ticket médio" value={money(summary.data.ticketMedio)} />
        </div>
        <p className="hint">Considera pedidos pagos e enviados no período.</p>
        {sales.data.dados.length === 0 && <EmptyState text="Nenhuma venda no período." />}
        {sales.data.dados.length > 0 && (
          <DataTable headers={HEADERS}>
            {sales.data.dados.map((sale) => (
              <SaleRow key={sale.id} sale={sale} />
            ))}
          </DataTable>
        )}
        <Pager
          page={page}
          total={sales.data.paginacao.total}
          limit={sales.data.paginacao.limite}
          linkTo={(target) => `?${withPage(params, target)}`}
        />
      </>
    );
  }

  return (
    <>
      <AdminHead title="Relatórios">
        <button type="button" onClick={handleExport}>
          Exportar CSV
        </button>
      </AdminHead>
      <RangeForm params={params} onApply={handleApply} />
      {renderReport()}
    </>
  );
}
