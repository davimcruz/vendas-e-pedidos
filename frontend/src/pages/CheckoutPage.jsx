import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage';
import Icon from '../components/Icon';
import SummaryRow from '../components/SummaryRow';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { PAYMENTS } from '../lib/constants';
import { money } from '../lib/format';
import { calculateTotals, simulateShipping } from '../lib/pricing';

function ShippingStep({ shipping, onCalculate }) {
  const [error, setError] = useState(null);

  function handleSubmit(event) {
    event.preventDefault();
    const cep = new FormData(event.target).get('cep').replace(/\D/g, '');
    if (cep.length !== 8) {
      setError(new Error('CEP inválido. Digite os 8 números do CEP.'));
      onCalculate(null);
      return;
    }
    setError(null);
    onCalculate(simulateShipping(cep));
  }

  return (
    <section className="block" aria-labelledby="step-shipping">
      <h2 id="step-shipping">
        <span className="step-number">1</span>Frete
      </h2>
      <form className="inline-form" noValidate onSubmit={handleSubmit}>
        <input name="cep" inputMode="numeric" maxLength={9} placeholder="CEP (ex.: 01310-100)" aria-label="CEP" autoComplete="postal-code" />
        <button type="submit">Calcular</button>
      </form>
      <div aria-live="polite">
        <ErrorMessage error={error} />
        {shipping !== null && (
          <p>
            Frete: <strong>{money(shipping)}</strong>
          </p>
        )}
      </div>
    </section>
  );
}

function CouponStep({ coupon, onApply }) {
  const { api } = useAuth();
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    const code = new FormData(event.target).get('cupom').trim();
    if (!code) {
      return;
    }
    try {
      onApply(await api('/cupons/validar', { method: 'POST', body: { codigo: code } }));
      setError(null);
    } catch (applyError) {
      onApply(null);
      setError(applyError);
    }
  }

  return (
    <section className="block" aria-labelledby="step-coupon">
      <h2 id="step-coupon">
        <span className="step-number">2</span>Cupom de desconto
      </h2>
      <form className="inline-form" onSubmit={handleSubmit}>
        <input name="cupom" placeholder="Código do cupom" aria-label="Código do cupom" />
        <button type="submit">Aplicar</button>
      </form>
      <div aria-live="polite">
        <ErrorMessage error={error} />
        {coupon && (
          <p>
            Cupom <strong>{coupon.codigo}</strong> aplicado.
          </p>
        )}
      </div>
    </section>
  );
}

function PaymentStep({ payment, onSelect }) {
  return (
    <section className="block" aria-labelledby="step-payment">
      <h2 id="step-payment">
        <span className="step-number">3</span>Pagamento
      </h2>
      <div className="pay-options" role="radiogroup" aria-label="Método de pagamento">
        {PAYMENTS.map((option) => (
          <label key={option.id}>
            <input type="radio" name="pagamento" value={option.id} checked={payment === option.id} onChange={() => onSelect(option.id)} />
            <span>
              <Icon name={option.icon} />
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}

export default function CheckoutPage() {
  const { api, cliente } = useAuth();
  const { lines, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [shipping, setShipping] = useState(null);
  const [coupon, setCoupon] = useState(null);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(false);

  if (lines.length === 0 && !placed) {
    return <Navigate to="/carrinho" replace />;
  }

  const totals = calculateTotals(subtotal, coupon, shipping);

  async function handleFinish() {
    setError(null);
    if (shipping === null) {
      setError(new Error('Calcule o frete informando o CEP.'));
      return;
    }
    if (!payment) {
      setError(new Error('Selecione um método de pagamento.'));
      return;
    }
    setSubmitting(true);
    try {
      const quantities = new Map();
      lines.forEach((line) => quantities.set(line.produtoId, (quantities.get(line.produtoId) ?? 0) + line.quantidade));
      const order = await api('/pedidos', {
        method: 'POST',
        body: {
          clienteId: cliente.id,
          itens: [...quantities].map(([produtoId, quantidade]) => ({ produtoId, quantidade })),
          frete: shipping,
          cupom: coupon?.codigo ?? null,
        },
      });
      setPlaced(true);
      navigate(`/pedido/${order.id}?novo=1`);
      clear();
    } catch (finishError) {
      setError(finishError);
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Finalizar compra</h1>
      </div>
      <div className="checkout">
        <div>
          <ShippingStep shipping={shipping} onCalculate={setShipping} />
          <CouponStep coupon={coupon} onApply={setCoupon} />
          <PaymentStep payment={payment} onSelect={setPayment} />
        </div>
        <section className="block" aria-labelledby="step-summary">
          <h2 id="step-summary">Resumo</h2>
          {lines.map((line) => (
            <SummaryRow
              key={`${line.produtoId}-${line.cor}-${line.tamanho}`}
              label={`${line.quantidade}× ${line.nome} (${line.cor}, ${line.tamanho})`}
              value={money(line.preco * line.quantidade)}
            />
          ))}
          <SummaryRow label="Subtotal" value={money(totals.subtotal)} />
          <SummaryRow label={coupon ? `Desconto (${coupon.codigo})` : 'Desconto'} value={`− ${money(totals.discount)}`} />
          <SummaryRow label="Frete" value={shipping === null ? 'a calcular' : money(totals.frete)} />
          <SummaryRow total label="Total" value={money(totals.total)} />
          <ErrorMessage error={error} />
          <button className="primary wide" type="button" disabled={submitting} onClick={handleFinish}>
            Finalizar compra
          </button>
        </section>
      </div>
    </>
  );
}
