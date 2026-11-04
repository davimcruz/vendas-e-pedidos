export default function AdminHead({ title, children }) {
  return (
    <div className="admin-head">
      <h1>{title}</h1>
      <div className="actions">{children}</div>
    </div>
  );
}
