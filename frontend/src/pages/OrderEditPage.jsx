import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage';
import Field from '../components/Field';
import Loading from '../components/Loading';
import Stepper from '../components/Stepper';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { money } from '../lib/format';

function useEditableOrder(id) {
  const { api } = useAuth();
  const [state, setState] = useState({ id: null, order: null, lines: [], error: null });

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const order = await api(`/pedidos/${id}`);
        const products = await Promise.all(order.itens.map((item) => api(`/produtos/${item.produtoId}`)));
        const lines = order.itens.map((item, index) => ({ ...item, estoque: products[index].quantidadeEstoque }));
        if (!ignore) {
          setState({ id, order, lines, error: null });
        }
      } catch (error) {
        if (!ignore) {
          setState({ id, order: null, lines: [], error });
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [api, id]);

  const setLines = (update) => setState((current) => ({ ...current, lines: update(current.lines) }));
  return { ...state, loading: state.id !== id, setLines };
}

export default function OrderEditPage() {
  const { id } = useParams();
  const { api } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { order, lines, setLines, error, loading } = useEditableOrder(id);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);

  if (error) {
    return <ErrorMessage error={error} />;
  }
  if (loading) {
    return <Loading />;
  }
  if (order.status !== 'aguardando_pagamento') {
    return <Navigate to={`/pedido/${id}`} replace />;
  }

  const changeQuantity = (index, delta) =>
    setLines((current) => current.map((line, position) => (position === index ? { ...line, quantidade: line.quantidade + delta } : line)));

  const removeLine = (index) => setLines((current) => current.filter((line, position) => position !== index));

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await api(`/pedidos/${id}`, {
        method: 'PUT',
        body: {
          itens: lines.map(({ produtoId, quantidade }) => ({ produtoId, quantidade })),
          frete: order.frete,
          cupom: new FormData(event.target).get('cupom').trim() || null,
        },
      });
      toast(`Pedido #${id} atualizado.`);
      navigate(`/pedido/${id}`);
    } catch (error) {
      setSaveError(error);
      setSaving(false);
    }
  }

  return (
    <>
      <Link className="back" to={`/pedido/${id}`}>
        ← Voltar ao pedido
      </Link>
      <div className="page-head">
        <h1>Editar pedido #{id}</h1>
      </div>
      <div className="order-layout">
        <div>
          {lines.map((line, index) => (
            <div className="edit-line" key={line.produtoId}>
              <div>
                <strong>{line.nome}</strong>
                <br />
                <span className="hint">
                  {money(line.precoUnitario)} · {line.estoque} em estoque
                </span>
              </div>
              <Stepper
                value={line.quantidade}
                itemName={line.nome}
                removeLabel={`Remover ${line.nome} do pedido`}
                canDecrease={line.quantidade > 1}
                canIncrease={line.quantidade < line.estoque}
                canRemove={lines.length > 1}
                onDecrease={() => changeQuantity(index, -1)}
                onIncrease={() => changeQuantity(index, 1)}
                onRemove={() => removeLine(index)}
              />
            </div>
          ))}
        </div>
        <form className="block" onSubmit={handleSubmit}>
          <h2>Cupom e frete</h2>
          <Field label="Cupom (deixe vazio para remover)" name="cupom" defaultValue={order.cupom ?? ''} />
          <p className="hint">Frete mantido: {money(order.frete)}</p>
          <ErrorMessage error={saveError} />
          <button className="primary wide" type="submit" disabled={saving}>
            Salvar alterações
          </button>
        </form>
      </div>
    </>
  );
}
