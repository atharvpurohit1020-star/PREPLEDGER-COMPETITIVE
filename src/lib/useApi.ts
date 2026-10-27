import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from './api';

export interface ApiState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
}

/** Fetch JSON for a URL; refetches when the URL changes. Pass null to skip. */
export function useApi<T = any>(url: string | null): ApiState<T> {
  const [state, setState] = useState<{ data: T | null; error: ApiError | null; loading: boolean }>({ data: null, error: null, loading: !!url });
  const [nonce, setNonce] = useState(0);
  const current = useRef(url);
  useEffect(() => {
    current.current = url;
    if (!url) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    api
      .get<T>(url)
      .then((data) => current.current === url && setState({ data, error: null, loading: false }))
      .catch((error) => current.current === url && setState({ data: null, error, loading: false }));
  }, [url, nonce]);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}
