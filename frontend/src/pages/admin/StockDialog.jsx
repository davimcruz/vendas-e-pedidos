import Field from '../../components/Field';
import Modal from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function StockDialog({ product, onClose, onSaved }) {
  const { api } = useAuth();
  const toast = useToast();

  async function handleSubmit(data) {
    const value = Number(data.valor);
    if (!Number.isInteger(value)) {
      throw new Error('Informe um número inteiro.');
    }
    if (data.modo === 'definir') {
      await api(`/estoque/${product.id}`, { method: 'PUT', body: { quantidade: value } });
    } else {
      await api(`/estoque/${product.id}`, { method: 'PATCH', body: { ajuste: value } });
    }
    toast('Estoque atualizado.');
    onSaved();
  }

  return (
    <Modal title="Estoque" onSubmit={handleSubmit} onClose={onClose}>
      <p>
        Estoque atual de <strong>{product.nome}</strong>: {product.quantidadeEstoque}
      </p>
      <fieldset>
        <legend>Operação</legend>
        <div className="radio-row">
          <label className="check">
            <input type="radio" name="modo" value="definir" defaultChecked />
            Definir quantidade
          </label>
          <label className="check">
            <input type="radio" name="modo" value="ajustar" />
            Ajustar (+ ou −)
          </label>
        </div>
      </fieldset>
      <Field label="Valor" name="valor" type="number" step="1" required />
    </Modal>
  );
}
