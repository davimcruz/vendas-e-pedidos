import { Link } from 'react-router-dom';
import Thumb from './Thumb';

export default function EmptyState({ title, text, action, to, art = 0 }) {
  return (
    <div className="empty">
      <Thumb id={art} />
      {title && <h1>{title}</h1>}
      <p>{text}</p>
      {action && (
        <Link className="button primary" to={to}>
          {action}
        </Link>
      )}
    </div>
  );
}
