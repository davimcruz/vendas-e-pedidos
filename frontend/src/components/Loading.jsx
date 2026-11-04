export default function Loading({ children = 'Carregando…' }) {
  return <p className="hint">{children}</p>;
}
