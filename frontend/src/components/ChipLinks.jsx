import { Link } from 'react-router-dom';

export default function ChipLinks({ label, items }) {
  return (
    <nav className="chips" aria-label={label}>
      {items.map((item) => (
        <Link key={item.label} className="chip" to={item.to} aria-current={item.active ? 'true' : undefined}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
