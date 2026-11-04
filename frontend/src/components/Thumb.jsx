export default function Thumb({ id }) {
  return (
    <div className={`thumb tone-${id % 3}`} aria-hidden="true">
      <svg viewBox="0 0 120 120">
        <path d="M60 14l42 21-42 21-42-21z" fill="#fff" />
        <path d="M18 35l42 21v50L18 85z" fill="rgb(121,177,240)" />
        <path d="M102 35L60 56v50l42-21z" fill="rgb(121,177,240)" />
        <path d="M102 35L60 56v50l42-21z" fill="#000" opacity=".16" />
        <path d="M39 24.5l42 21v12l-42-21z" fill="#000" opacity=".1" />
      </svg>
    </div>
  );
}
