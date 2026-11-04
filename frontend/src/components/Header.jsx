import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useMatch, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Icon from './Icon';

function MenuPanel({ onClose }) {
  const { cliente, isAdmin, logout } = useAuth();
  return (
    <div className="menu-panel" id="menu-panel">
      <div className="menu-user">
        <span className="avatar">{cliente.nome.trim().slice(0, 1).toUpperCase()}</span>
        <div>
          <strong>{cliente.nome}</strong>
          <small>{cliente.email}</small>
        </div>
      </div>
      <Link to="/pedidos" onClick={onClose}>
        <Icon name="receipt" />
        Meus pedidos
      </Link>
      {isAdmin && (
        <Link to="/admin/produtos" onClick={onClose}>
          <Icon name="shield" />
          Administração
        </Link>
      )}
      <button type="button" className="menu-item" onClick={logout}>
        <Icon name="logout" />
        Sair
      </button>
    </div>
  );
}

export default function Header() {
  const { cliente } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const onCartPage = useMatch('/carrinho');
  const onCheckoutPage = useMatch('/checkout');
  const inCart = onCartPage || onCheckoutPage;
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!headerRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }
    document.addEventListener('click', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('click', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  function handleSearch(event) {
    event.preventDefault();
    const busca = new FormData(event.target).get('busca').trim();
    navigate(busca ? `/?${new URLSearchParams({ busca })}` : '/');
  }

  return (
    <header className="topbar" ref={headerRef}>
      <div className="topbar-inner">
        <Link className="brand" to="/" aria-label="UP Shoop, ir para o início">
          <span className="brand-mark">
            <Icon name="bag" />
          </span>
          <span className="brand-name">UP Shoop</span>
        </Link>
        <form className="topbar-search" role="search" onSubmit={handleSearch}>
          <Icon name="search" />
          <input type="search" name="busca" placeholder="Buscar produtos" aria-label="Buscar produtos" />
        </form>
        <nav className="topbar-nav" aria-label="Principal">
          <NavLink className="nav-link" to="/" end aria-label="Início">
            <Icon name="home" />
            <span>Início</span>
          </NavLink>
          <Link className="nav-link" to="/carrinho" aria-label="Carrinho de compras" {...(inCart && { 'aria-current': 'page' })}>
            <Icon name="bag" />
            <span>Carrinho</span>
            {count > 0 && <b className="badge">{count}</b>}
          </Link>
          <button
            type="button"
            className="nav-link"
            aria-label="Menu de opções"
            aria-expanded={menuOpen}
            aria-controls="menu-panel"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name="menu" className="menu-icon" />
            <span className="avatar">{cliente.nome.trim().slice(0, 1).toUpperCase()}</span>
            <span>Menu</span>
          </button>
        </nav>
      </div>
      {menuOpen && <MenuPanel onClose={() => setMenuOpen(false)} />}
    </header>
  );
}
