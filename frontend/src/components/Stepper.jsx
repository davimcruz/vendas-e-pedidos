import Icon from './Icon';

export default function Stepper({ value, itemName, removeLabel, canDecrease, canIncrease, onDecrease, onIncrease, onRemove, canRemove = true }) {
  const suffix = itemName ? ` de ${itemName}` : '';
  return (
    <div className="stepper">
      <button type="button" aria-label={`Diminuir quantidade${suffix}`} disabled={!canDecrease} onClick={onDecrease}>
        −
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label={`Aumentar quantidade${suffix}`} disabled={!canIncrease} onClick={onIncrease}>
        +
      </button>
      {onRemove && (
        <button type="button" className="quiet" aria-label={removeLabel} disabled={!canRemove} onClick={onRemove}>
          <Icon name="trash" />
        </button>
      )}
    </div>
  );
}
