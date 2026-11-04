import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import Stepper from '../components/Stepper';
import SummaryRow from '../components/SummaryRow';
import Thumb from '../components/Thumb';
import { lineKey, useCart } from '../context/CartContext';
import { money } from '../lib/format';

function CartLine({ line }) {
  const cart = useCart();
  return (
    <div className="cart-line">
      <Thumb id={line.produtoId} />
      <div>
        <strong>{line.nome}</strong>
        <br />
        <span className="hint">
          {line.cor} · {line.tamanho}
        </span>
        <br />
        <span className="price">{money(line.preco)}</span>
      </div>
      <div className="row">
        <Stepper
          value={line.quantidade}
          itemName={line.nome}
          removeLabel="Remover produto do carrinho"
          canDecrease={line.quantidade > 1}
          canIncrease={cart.quantityOf(line.produtoId) < line.estoque}
          onDecrease={() => cart.changeQuantity(line, -1)}
          onIncrease={() => cart.changeQuantity(line, 1)}
          onRemove={() => cart.remove(line)}
        />
      </div>
    </div>
  );
}

export default function CartPage() {
  const { lines, subtotal } = useCart();

  if (lines.length === 0) {
    return (
      <EmptyState
        art={1}
        title="Seu carrinho está vazio"
        text="Escolha um produto para começar."
        action="Ver produtos"
        to="/"
      />
    );
  }
  return (
    <>
      <div className="page-head">
        <h1>Carrinho</h1>
      </div>
      <div className="cart-layout">
        <div>
          {lines.map((line) => (
            <CartLine key={lineKey(line)} line={line} />
          ))}
        </div>
        <aside className="block">
          <h2>Resumo</h2>
          <SummaryRow total label="Subtotal" value={money(subtotal)} />
          <p className="hint">Frete e cupom são calculados no próximo passo.</p>
          <Link className="button primary wide" to="/checkout">
            Continuar para o pagamento
          </Link>
        </aside>
      </div>
    </>
  );
}
