import Field from '../../components/Field';
import Modal from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function ProductDialog({ product, onClose, onSaved }) {
  const { api } = useAuth();
  const toast = useToast();
  const isEditing = product !== null;

  async function handleSubmit(data) {
    const body = { nome: data.nome, descricao: data.descricao.trim() || null, preco: Number(data.preco) };
    if (isEditing) {
      await api(`/produtos/${product.id}`, { method: 'PUT', body });
      toast('Produto salvo.');
    } else {
      await api('/produtos', { method: 'POST', body: { ...body, quantidadeEstoque: Number(data.quantidadeEstoque) } });
      toast('Produto criado.');
    }
    onSaved();
  }

  return (
    <Modal
      title={isEditing ? 'Editar produto' : 'Novo produto'}
      submitLabel={isEditing ? 'Salvar' : 'Criar produto'}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <Field label="Nome" name="nome" required minLength={2} maxLength={160} defaultValue={product?.nome ?? ''} />
      <Field label="Descrição" name="descricao" as="textarea" defaultValue={product?.descricao ?? ''} />
      <div className="field-row">
        <Field label="Preço (R$)" name="preco" type="number" min="0" step="0.01" required defaultValue={product?.preco ?? ''} />
        {!isEditing && <Field label="Estoque inicial" name="quantidadeEstoque" type="number" min="0" step="1" required defaultValue="0" />}
      </div>
    </Modal>
  );
}
