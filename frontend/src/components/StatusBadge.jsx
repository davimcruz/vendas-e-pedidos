import { STATUS_LABELS } from '../lib/constants';

export default function StatusBadge({ status }) {
  return <span className={`status status-${status}`}>{STATUS_LABELS[status]}</span>;
}
