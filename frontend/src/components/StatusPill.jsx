export default function StatusPill({ active }) {
  if (active) {
    return <span className="status status-pago">Ativo</span>;
  }
  return <span className="status status-cancelado">Inativo</span>;
}
