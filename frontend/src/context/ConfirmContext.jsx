import { createContext, useCallback, useContext, useState } from 'react';
import Modal from '../components/Modal';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);

  const confirm = useCallback(
    ({ title, text, label }) =>
      new Promise((resolve) => {
        setRequest({ title, text, label, resolve });
      }),
    [],
  );

  function finish(answer) {
    request.resolve(answer);
    setRequest(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <Modal
          title={request.title}
          submitLabel={request.label}
          onSubmit={async () => request.resolve(true)}
          onClose={() => finish(false)}
        >
          <p>{request.text}</p>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
