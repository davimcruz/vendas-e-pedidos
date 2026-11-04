import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage';
import Loading from '../components/Loading';
import OptionGroup from '../components/OptionGroup';
import Stepper from '../components/Stepper';
import Thumb from '../components/Thumb';
import { useCart } from '../context/CartContext';
import { useFetch } from '../hooks/useFetch';
import { COLORS, SIZES } from '../lib/constants';
import { money } from '../lib/format';

function StockInfo({ available }) {
  if (available === 0) {
    return <p className="error">Sem estoque disponível.</p>;
  }
  if (available === 1) {
    return <p className="hint">1 unidade disponível</p>;
  }
  return <p className="hint">{available} unidades disponíveis</p>;
}

function ProductForm({ product }) {
  const navigate = useNavigate();
  const cart = useCart();
  const stock = product.quantidadeEstoque ?? 0;
  const available = Math.max(stock - cart.quantityOf(product.id), 0);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[0]);
  const [quantity, setQuantity] = useState(Math.min(1, available));

  function handleSubmit(event) {
    event.preventDefault();
    cart.add({
      produtoId: product.id,
      nome: product.nome,
      preco: product.preco,
      estoque: stock,
      cor: color,
      tamanho: size,
      quantidade: quantity,
    });
    navigate('/carrinho');
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>{product.nome}</h1>
      <p className="product-price">{money(product.preco)}</p>
      <p>{product.descricao}</p>
      <StockInfo available={available} />
      <OptionGroup legend="Cor" name="cor" values={COLORS} value={color} onChange={setColor} />
      <OptionGroup legend="Tamanho" name="tamanho" values={SIZES} value={size} onChange={setSize} />
      <div className="field">
        <label>Quantidade</label>
        <Stepper
          value={quantity}
          canDecrease={quantity > 1}
          canIncrease={quantity < available}
          onDecrease={() => setQuantity(quantity - 1)}
          onIncrease={() => setQuantity(quantity + 1)}
        />
      </div>
      <button className="primary wide" type="submit" disabled={available === 0}>
        Adicionar ao carrinho
      </button>
    </form>
  );
}

export default function ProductPage() {
  const { id } = useParams();
  const { data: product, error, loading } = useFetch(`/produtos/${encodeURIComponent(id)}`);

  if (error) {
    return <ErrorMessage error={error} />;
  }
  if (loading) {
    return <Loading />;
  }
  return (
    <>
      <Link className="back" to="/">
        ← Voltar aos produtos
      </Link>
      <article className="product">
        <Thumb id={product.id} />
        <ProductForm key={product.id} product={product} />
      </article>
    </>
  );
}
