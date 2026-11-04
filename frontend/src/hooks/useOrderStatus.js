import { STATUS_LABELS } from '../lib/constants';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';

const WARNINGS = {
  pago: 'Ao marcar como pago, a quantidade dos itens sai do estoque.',
  cancelado: 'Pedidos pagos devolvem os itens ao estoque. Este cancelamento não pode ser desfeito.',
};

export function useOrderStatus() {
  const { api } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();

  return async function changeStatus(orderId, status) {
    const warning = WARNINGS[status];
    if (warning) {
      const confirmed = await confirm({
        title: `${STATUS_LABELS[status]}: pedido #${orderId}`,
        text: warning,
        label: 'Confirmar',
      });
      if (!confirmed) {
        return false;
      }
    }
    try {
      await api(`/pedidos/${orderId}/status`, { method: 'PUT', body: { status } });
      toast(`Pedido #${orderId} atualizado: ${STATUS_LABELS[status].toLowerCase()}.`);
      return true;
    } catch (error) {
      toast(error.message);
      return false;
    }
  };
}
