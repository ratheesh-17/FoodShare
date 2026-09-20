import { useState, useCallback, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';

/**
 * useAPI — authenticated GET hook using the shared api.js interceptor
 */
export const useAPI = (url, options = {}) => {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError]         = useState(null);

  // Use reactive user.id from AuthContext so hook re-fetches on user switch
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const fetchData = useCallback(async (silent = false) => {
    if (!url) return;
    if (!localStorage.getItem('token')) return;  // no token — skip, don't 401
    if (!silent) setLoading(true);
    if (!silent) setError(null);
    try {
      const response = await api.get(url, options.config || {});
      setData(response.data);
    } catch (err) {
      // Silent polls never update error state — avoids UI disruption
      if (!silent) {
        setError(err.response?.data?.detail || err.message || 'An error occurred');
      }
    } finally {
      if (!silent) setLoading(false);
      setInitialLoad(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, userId]);

  useEffect(() => {
    if (options.autoFetch === false) return;
    setData(null);
    fetchData();
  }, [fetchData, options.autoFetch]);

  useEffect(() => {
    if (!options.pollInterval) return;
    const id = setInterval(() => fetchData(true), options.pollInterval);
    return () => clearInterval(id);
  }, [fetchData, options.pollInterval]);

  return { data, loading, initialLoad, error, refetch: fetchData };
};

/**
 * useMutate — authenticated POST/PATCH/DELETE hook
 */
export const useMutate = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const mutate = useCallback(async (method, url, data = null, config = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api({ method: method.toLowerCase(), url, data, ...config });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'An error occurred';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error };
};

export default useAPI;
