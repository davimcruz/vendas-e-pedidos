export default function Field({ label, name, as: Control = 'input', hint, children, ...props }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <Control id={name} name={name} {...props}>
        {children}
      </Control>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
