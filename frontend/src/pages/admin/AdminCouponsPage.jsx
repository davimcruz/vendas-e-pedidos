import { useState } from 'react';
import { Cell, DataTable } from '../../components/DataTable';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import Loading from '../../components/Loading';
import StatusPill from '../../components/StatusPill';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { formatDateUtc, money } from '../../lib/format';
import AdminHead from './AdminHead';
import CouponDialog from './CouponDialog';

const HEADERS = ['Código', 'Desconto', 'Validade', 'Situação', 'Ações'];

function Validity({ expiresAt }) {
  if (!expiresAt) {
    return 'Sem validade';
  }
  const date = formatDateUtc(expiresAt);
  if (new Date(expiresAt) < new Date()) {
    return (
      <>
        {date} <span className="tag">Expirado</span>
      </>
    );
  }
  return date;
}

function CouponRow({ coupon, onEdit, onToggle }) {
  const isActive = coupon.status === 'ativo';
  const discount = coupon.tipo === 'percentual' ? `${coupon.desconto}%` : money(coupon.desconto);
  return (
    <tr>
      <Cell label="Código">
        <strong>{coupon.codigo}</strong>
      </Cell>
      <Cell label="Desconto">{discount}</Cell>
      <Cell label="Validade">
        <Validity expiresAt={coupon.expiraEm} />
      </Cell>
      <Cell label="Situação">
        <StatusPill active={isActive} />
      </Cell>
      <Cell label="Ações">
        <div className="actions">
          <button type="button" onClick={onEdit}>
            Editar
          </button>
          <button type="button" onClick={onToggle}>
            {isActive ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      </Cell>
    </tr>
  );
}

export default function AdminCouponsPage() {
  const { api } = useAuth();
  const toast = useToast();
  const { data: coupons, error, loading, reload } = useFetch('/cupons');
  const [dialog, setDialog] = useState(undefined);

  async function handleToggle(coupon) {
    const status = coupon.status === 'ativo' ? 'inativo' : 'ativo';
    try {
      await api(`/cupons/${encodeURIComponent(coupon.codigo)}`, { method: 'PUT', body: { status } });
      toast(`Cupom ${coupon.codigo} atualizado.`);
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
    if (coupons.length === 0) {
      return <EmptyState text="Nenhum cupom cadastrado. Crie o primeiro no botão acima." />;
    }
    return (
      <DataTable headers={HEADERS}>
        {coupons.map((coupon) => (
          <CouponRow key={coupon.codigo} coupon={coupon} onEdit={() => setDialog(coupon)} onToggle={() => handleToggle(coupon)} />
        ))}
      </DataTable>
    );
  }

  return (
    <>
      <AdminHead title="Cupons">
        <button type="button" className="primary" onClick={() => setDialog(null)}>
          Novo cupom
        </button>
      </AdminHead>
      {renderTable()}
      {dialog !== undefined && <CouponDialog coupon={dialog} onClose={() => setDialog(undefined)} onSaved={reload} />}
    </>
  );
}
