export default function OptionGroup({ legend, name, values, value, onChange }) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      <div className="options">
        {values.map((option) => (
          <label key={option}>
            <input type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
