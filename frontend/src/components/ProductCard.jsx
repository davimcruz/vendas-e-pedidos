import { Link } from 'react-router-dom';
import { money } from '../lib/format';
import Thumb from './Thumb';

function StockTag({ stock }) {
  if (stock === 0) {
    return <div className="tag">Esgotado</div>;
  }
  if (stock <= 5) {
    return <div className="tag">Últimas unidades</div>;
  }
  return null;
}

export default function ProductCard({ product }) {
  return (
    <Link className="card" to={`/produto/${product.id}`}>
      <Thumb id={product.id} />
      <div className="card-info">
        <strong>{product.nome}</strong>
        <span className="price">{money(product.preco)}</span>
        <StockTag stock={product.quantidadeEstoque} />
      </div>
    </Link>
  );
}
