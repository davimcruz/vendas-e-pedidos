import { Link, NavLink, Outlet } from 'react-router-dom';
import Icon from '../../components/Icon';

const SECTIONS = [
  { to: 'produtos', label: 'Produtos', icon: 'package' },
  { to: 'pedidos', label: 'Pedidos', icon: 'receipt' },
  { to: 'cupons', label: 'Cupons', icon: 'coupon' },
  { to: 'relatorios', label: 'Relatórios', icon: 'chart' },
];

export default function AdminLayout() {
  return (
    <div className="admin">
      <nav className="admin-nav" aria-label="Administração">
        {SECTIONS.map((section) => (
          <NavLink key={section.to} to={section.to}>
            <Icon name={section.icon} />
            {section.label}
          </NavLink>
        ))}
        <Link className="leave" to="/">
          ← Voltar à loja
        </Link>
      </nav>
      <section>
        <Outlet />
      </section>
    </div>
  );
}
