import { Link, useParams, useSearchParams } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage';
import Icon from '../components/Icon';
import Loading from '../components/Loading';
import OrderSteps from '../components/OrderSteps';
import StatusBadge from '../components/StatusBadge';
import SummaryRow from '../components/SummaryRow';
import Thumb from '../components/Thumb';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useFetch';
import { useOrderStatus } from '../hooks/useOrderStatus';
import { NEXT_STATUS } from '../lib/constants';
import { money } from '../lib/format';

function OrderItems({ items }) {
  return (
    <div>
      {items.map((item) => (
        <div className="cart-line" key={item.produtoId}>
          <Thumb id={item.produtoId} />
          <div>
            <strong>{item.nome}</strong>
            <br />
            <span className="hint">
              {item.quantidade} × {money(item.precoUnitario)}
            </span>
          </div>
          <div className="price right">{money(item.quantidade * item.precoUnitario)}</div>
        </div>
      ))}
    </div>
  );
}

function AdminActions({ order, onChangeStatus }) {
  return NEXT_STATUS[order.status].map((next) => (
    <button
      key={next.status}
      type="button"
      className={next.status === 'cancelado' ? undefined : 'primary'}
      onClick={() => onChangeStatus(next.status)}
    >
      {next.label}
    </button>
  ));
}

function CustomerActions({ order, onCancel }) {
  return (
    <>
      <Link className="button" to={`/pedido/${order.id}/editar`}>
        Editar itens
      </Link>
      <button type="button" onClick={onCancel}>
        Cancelar pedido
      </button>
    </>
  );
}

export default function OrderPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { api, isAdmin } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const changeStatus = useOrderStatus();
  const { data: order, error, loading, reload } = useFetch(`/pedidos/${id}`);

  if (error) {
    return <ErrorMessage error={error} />;
  }
  if (loading) {
    return <Loading />;
  }

  const isWaiting = order.status === 'aguardando_pagamento';

  function refresh() {
    setParams({}, { replace: true });
    reload();
  }

  async function handleChangeStatus(status) {
    if (await changeStatus(order.id, status)) {
      refresh();
    }
  }

  async function handleCancel() {
    const confirmed = await confirm({
      title: `Cancelar pedido #${order.id}?`,
      text: 'Este cancelamento não pode ser desfeito.',
      label: 'Cancelar pedido',
    });
    if (!confirmed) {
      return;
    }
    try {
      await api(`/pedidos/${order.id}`, { method: 'DELETE' });
      toast(`Pedido #${order.id} cancelado.`);
      refresh();
    } catch (cancelError) {
      toast(cancelError.message);
    }
  }

  return (
    <>
      <Link className="back" to={isAdmin ? '/admin/pedidos' : '/pedidos'}>
        ← Voltar aos pedidos
      </Link>
      {params.get('novo') && (
        <div className="banner">
          <Icon name="check" />
          Pedido registrado! Acompanhe o andamento por aqui.
        </div>
      )}
      <div className="page-head">
        <h1>Pedido #{order.id}</h1>
        <StatusBadge status={order.status} />
      </div>
      <OrderSteps status={order.status} />
      <div className="order-layout">
        <OrderItems items={order.itens} />
        <aside className="block">
          <h2>Resumo</h2>
          <SummaryRow label="Subtotal" value={money(order.subtotal)} />
          <SummaryRow label={order.cupom ? `Desconto (${order.cupom})` : 'Desconto'} value={`− ${money(order.desconto)}`} />
          <SummaryRow label="Frete" value={money(order.frete)} />
          <SummaryRow total label="Total" value={money(order.valorTotal)} />
          {!isAdmin && isWaiting && <p className="hint">Aguardando a confirmação do pagamento pela loja.</p>}
          <div className="actions">
            {isAdmin && <AdminActions order={order} onChangeStatus={handleChangeStatus} />}
            {!isAdmin && isWaiting && <CustomerActions order={order} onCancel={handleCancel} />}
          </div>
        </aside>
      </div>
    </>
  );
}
