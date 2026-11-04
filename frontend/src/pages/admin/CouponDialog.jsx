import Field from '../../components/Field';
import Modal from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function CouponDialog({ coupon, onClose, onSaved }) {
  const { api } = useAuth();
  const toast = useToast();
  const isEditing = coupon !== null;

  async function handleSubmit(data) {
    const body = { tipo: data.tipo, desconto: Number(data.desconto), status: data.status, expiraEm: data.expiraEm || null };
    if (isEditing) {
      await api(`/cupons/${encodeURIComponent(coupon.codigo)}`, { method: 'PUT', body });
      toast('Cupom salvo.');
    } else {
      await api('/cupons', { method: 'POST', body: { ...body, codigo: data.codigo } });
      toast('Cupom criado.');
    }
    onSaved();
  }

  return (
    <Modal
      title={isEditing ? `Editar cupom ${coupon.codigo}` : 'Novo cupom'}
      submitLabel={isEditing ? 'Salvar' : 'Criar cupom'}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      {!isEditing && <Field label="Código" name="codigo" required maxLength={20} placeholder="Ex.: BEMVINDO10" />}
      <div className="field-row">
        <Field label="Tipo" name="tipo" as="select" defaultValue={coupon?.tipo ?? 'percentual'}>
          <option value="percentual">Percentual (%)</option>
          <option value="fixo">Valor fixo (R$)</option>
        </Field>
        <Field label="Desconto" name="desconto" type="number" min="0" step="0.01" required defaultValue={coupon?.desconto ?? ''} />
      </div>
      <div className="field-row">
        <Field label="Situação" name="status" as="select" defaultValue={coupon?.status ?? 'ativo'}>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </Field>
        <Field label="Validade (opcional)" name="expiraEm" type="date" defaultValue={coupon?.expiraEm?.slice(0, 10) ?? ''} />
      </div>
    </Modal>
  );
}
