import { Link } from 'react-router-dom';

export default function Pager({ page, total, limit, linkTo }) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) {
    return null;
  }
  return (
    <nav className="pager" aria-label="Paginação">
      {page > 1 && (
        <Link className="button" to={linkTo(page - 1)}>
          Anterior
        </Link>
      )}
      <span>
        Página {page} de {pages}
      </span>
      {page < pages && (
        <Link className="button" to={linkTo(page + 1)}>
          Próxima
        </Link>
      )}
    </nav>
  );
}
