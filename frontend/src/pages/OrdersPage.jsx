import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import Loading from '../components/Loading';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { money } from '../lib/format';

export default function OrdersPage() {
  const { cliente } = useAuth();
  const { data: orders, error, loading } = useFetch(`/pedidos?clienteId=${cliente.id}`);

  let content;
  if (error) {
    content = <ErrorMessage error={error} />;
  } else if (loading) {
    content = <Loading />;
  } else if (orders.length === 0) {
    content = <EmptyState art={2} text="Você ainda não fez pedidos." action="Ver produtos" to="/" />;
  } else {
    content = orders.map((order) => (
      <Link key={order.id} className="order-row" to={`/pedido/${order.id}`}>
        <strong>Pedido #{order.id}</strong>
        <StatusBadge status={order.status} />
        <span className="order-total">{money(order.valorTotal)}</span>
      </Link>
    ));
  }

  return (
    <>
      <div className="page-head">
        <h1>Meus pedidos</h1>
      </div>
      {content}
    </>
  );
}
