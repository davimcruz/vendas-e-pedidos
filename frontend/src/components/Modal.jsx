import { useEffect, useRef, useState } from 'react';
import ErrorMessage from './ErrorMessage';

export default function Modal({ title, submitLabel = 'Salvar', onSubmit, onClose, children }) {
  const dialogRef = useRef(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) {
      dialog.showModal();
    }
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(Object.fromEntries(new FormData(event.target)));
      onClose();
    } catch (submitError) {
      setError(submitError);
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="dialog" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <h2>{title}</h2>
        {children}
        <ErrorMessage error={error} />
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary" disabled={saving}>
            {submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
