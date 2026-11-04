export default function SummaryRow({ label, value, total }) {
  return (
    <div className={total ? 'summary-row total' : 'summary-row'}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
