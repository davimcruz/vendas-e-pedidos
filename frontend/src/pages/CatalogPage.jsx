import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ChipLinks from '../components/ChipLinks';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import Field from '../components/Field';
import Loading from '../components/Loading';
import Pager from '../components/Pager';
import ProductCard from '../components/ProductCard';
import { useFetch } from '../hooks/useFetch';
import { CATALOG_PAGE_SIZE, PRICE_RANGES } from '../lib/constants';
import { pluralize } from '../lib/format';
import { withPage, withParams } from '../lib/query';

function Hero({ search, onSearch }) {
  return (
    <section className="hero">
      <h1>Encontre, escolha e finalize em poucos toques</h1>
      <form className="hero-search" role="search" key={search} onSubmit={onSearch}>
        <input type="search" name="busca" aria-label="Buscar produtos" placeholder="O que você procura?" defaultValue={search} />
        <button className="dark" type="submit">
          Buscar
        </button>
      </form>
    </section>
  );
}

function PriceFilters({ params, onApply }) {
  const [open, setOpen] = useState(() => window.matchMedia('(min-width: 1025px)').matches);
  const key = `${params.get('precoMin')}-${params.get('precoMax')}`;
  return (
    <details className="filters" open={open} onToggle={(event) => setOpen(event.target.open)}>
      <summary>Filtros</summary>
      <form className="filters-body" key={key} onSubmit={onApply}>
        <Field label="Preço mínimo (R$)" name="precoMin" type="number" min="0" step="any" defaultValue={params.get('precoMin') ?? ''} />
        <Field label="Preço máximo (R$)" name="precoMax" type="number" min="0" step="any" defaultValue={params.get('precoMax') ?? ''} />
        <button className="primary" type="submit">
          Aplicar filtros
        </button>
        <Link className="button" to="/">
          Limpar
        </Link>
      </form>
    </details>
  );
}

function Results({ data, error, loading, page, linkToPage }) {
  if (error) {
    return <ErrorMessage error={error} />;
  }
  if (loading) {
    return <Loading>Carregando… (o servidor pode levar até 1 minuto na primeira vez)</Loading>;
  }
  if (data.dados.length === 0) {
    return (
      <EmptyState
        text="Nenhum produto encontrado. Tente outra busca ou limpe os filtros."
        action="Ver todos os produtos"
        to="/"
      />
    );
  }
  return (
    <>
      <ul className="grid">
        {data.dados.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
      <Pager page={page} total={data.paginacao.total} limit={data.paginacao.limite} linkTo={linkToPage} />
    </>
  );
}

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('pagina')) || 1;
  const apiParams = new URLSearchParams(params);
  apiParams.set('pagina', page);
  apiParams.set('limite', CATALOG_PAGE_SIZE);
  const { data, error, loading } = useFetch(`/produtos?${apiParams}`);

  const linkToPage = (target) => `?${withPage(params, target)}`;

  const handleSearch = (event) => {
    event.preventDefault();
    setParams(withParams(params, { busca: new FormData(event.target).get('busca').trim() }));
  };

  const handleFilters = (event) => {
    event.preventDefault();
    const { precoMin, precoMax } = Object.fromEntries(new FormData(event.target));
    setParams(withParams(params, { precoMin, precoMax }));
  };

  const isRangeActive = (range) =>
    Number(params.get('precoMin')) === (range.min ?? 0) && Number(params.get('precoMax') ?? 0) === (range.max ?? 0);

  const chips = PRICE_RANGES.map((range) => ({
    label: range.label,
    to: `?${withParams(params, { precoMin: range.min, precoMax: range.max })}`,
    active: isRangeActive(range),
  }));

  return (
    <>
      <Hero search={params.get('busca') ?? ''} onSearch={handleSearch} />
      <div className="catalog">
        <PriceFilters params={params} onApply={handleFilters} />
        <section aria-live="polite">
          <div className="results-head">
            <h2>Produtos</h2>
            {data && <span className="hint">{pluralize(data.paginacao.total, 'produto', 'produtos')}</span>}
          </div>
          <ChipLinks label="Faixa de preço" items={chips} />
          <Results data={data} error={error} loading={loading} page={page} linkToPage={linkToPage} />
        </section>
      </div>
    </>
  );
}
