import { useEffect, useState, useCallback } from 'react';
import { fetchSheetCSV, clearSheetCache } from '../lib/googleSheets';
import { SHEET_URLS } from '../config/sheetsConfig';

/**
 * Loads the PROFILING_PENGELUAR tab (a separate, large Google Sheet — one
 * row per registered producer) on its own, since it's only needed to join
 * MARKET_FLOW rows to a real producer state via No_Siri_Borang, not for
 * anything else on the page.
 */
export function useProfilingPengeluar() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => {
    clearSheetCache();
    setReloadToken((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchSheetCSV(SHEET_URLS.PROFILING_PENGELUAR);
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) setError(err.message || String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [reloadToken]);

  return { rows, loading, error, refresh };
}
