import { Link, useSearchParams } from 'react-router-dom';
import ChipLinks from '../../components/ChipLinks';
import { Cell, DataTable } from '../../components/DataTable';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import Loading from '../../components/Loading';
import StatusBadge from '../../components/StatusBadge';
import { useFetch } from '../../hooks/useFetch';
import { useOrderStatus } from '../../hooks/useOrderStatus';
import { NEXT_STATUS, STATUS_LABELS } from '../../lib/constants';
import { money } from '../../lib/format';
import { withParams } from '../../lib/query';
import AdminHead from './AdminHead';

const HEADERS = ['Pedido', 'Cliente', 'Total', 'Situação', 'Ações'];

function OrderRow({ order, onChangeStatus }) {
  return (
    <tr>
      <Cell label="Pedido">
        <Link to={`/pedido/${order.id}`}>
          <strong>#{order.id}</strong>
        </Link>
      </Cell>
      <Cell label="Cliente">Cliente #{order.clienteId}</Cell>
      <Cell label="Total">{money(order.valorTotal)}</Cell>
      <Cell label="Situação">
        <StatusBadge status={order.status} />
      </Cell>
      <Cell label="Ações">
        <div className="actions">
          <Link className="button" to={`/pedido/${order.id}`}>
            Ver
          </Link>
          {NEXT_STATUS[order.status].map((next) => (
            <button key={next.status} type="button" onClick={() => onChangeStatus(order.id, next.status)}>
              {next.label}
            </button>
          ))}
        </div>
      </Cell>
    </tr>
  );
}

export default function AdminOrdersPage() {
  const [params] = useSearchParams();
  const changeStatus = useOrderStatus();
  const status = params.get('status');
  const suffix = status ? `?status=${status}` : '';
  const { data: orders, error, loading, reload } = useFetch(`/pedidos${suffix}`);

  const filters = [{ id: null, label: 'Todos' }, ...Object.entries(STATUS_LABELS).map(([id, label]) => ({ id, label }))];
  const chips = filters.map((filter) => ({
    label: filter.label,
    to: `?${withParams(params, { status: filter.id })}`,
    active: filter.id === status,
  }));

  async function handleChangeStatus(orderId, nextStatus) {
    if (await changeStatus(orderId, nextStatus)) {
      reload();
    }
  }

  function renderTable() {
    if (error) {
      return <ErrorMessage error={error} />;
    }
    if (loading) {
      return <Loading />;
    }
    if (orders.length === 0) {
      return <EmptyState text="Nenhum pedido nesta situação." />;
    }
    return (
      <DataTable headers={HEADERS}>
        {orders.map((order) => (
          <OrderRow key={order.id} order={order} onChangeStatus={handleChangeStatus} />
        ))}
      </DataTable>
    );
  }

  return (
    <>
      <AdminHead title="Pedidos" />
      <ChipLinks label="Filtrar por situação" items={chips} />
      {renderTable()}
    </>
  );
}
