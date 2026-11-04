import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function useFetch(path) {
  const { api } = useAuth();
  const [state, setState] = useState({ path: null, data: null, error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let ignore = false;
    api(path)
      .then((data) => !ignore && setState({ path, data, error: null }))
      .catch((error) => !ignore && setState({ path, data: null, error }));
    return () => {
      ignore = true;
    };
  }, [api, path, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);
  const isCurrent = state.path === path;

  return {
    data: isCurrent ? state.data : null,
    error: isCurrent ? state.error : null,
    loading: !isCurrent || (state.data === null && state.error === null),
    reload,
  };
}
