import { ORDER_PROGRESS, STATUS_LABELS } from '../lib/constants';

function stepState(index, current) {
  if (index < current) {
    return 'done';
  }
  if (index === current) {
    return 'current';
  }
  return '';
}

export default function OrderSteps({ status }) {
  if (status === 'cancelado') {
    return <div className="banner">Este pedido foi cancelado.</div>;
  }
  const current = ORDER_PROGRESS.indexOf(status);
  return (
    <ol className="steps" aria-label="Andamento do pedido">
      {ORDER_PROGRESS.map((step, index) => {
        const state = stepState(index, current);
        return (
          <li key={step} className={state} aria-current={state === 'current' ? 'step' : undefined}>
            {STATUS_LABELS[step]}
          </li>
        );
      })}
    </ol>
  );
}
